import type { Express, Request, Response, NextFunction } from "express";
import { createServer } from "node:http";
import type { Server } from "node:http";
import bcrypt from "bcryptjs";
import { storage, db } from "./storage";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  signupSchema,
  loginSchema,
  updateCardSchema,
} from "@shared/schema";
import type { Card, User } from "@shared/schema";
import { randomUUID } from "node:crypto";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import express from "express"; // used for express.static
import Stripe from "stripe";

// Stripe is optional — only initialised when STRIPE_SECRET_KEY is set
let stripeClient: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-05-28.basil" as any,
  });
}

interface AuthedRequest extends Request {
  userId?: string;
}

function generateSlug(): string {
  // 8-char base36 from random
  return Math.random().toString(36).slice(2, 10).replace(/[^a-z0-9]/g, "x");
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const session = storage.getSessionByToken(token);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  req.userId = session.userId;
  next();
}

function publicUser(u: User) {
  const now = Date.now();
  const isActive =
    u.subscriptionStatus === "trialing" ||
    u.subscriptionStatus === "active";
  const isTrialing =
    u.subscriptionStatus === "trialing" &&
    u.trialEndsAt != null &&
    u.trialEndsAt > now;

  return {
    id: u.id,
    email: u.email,
    subscriptionStatus: u.subscriptionStatus ?? null,
    trialEndsAt: u.trialEndsAt ?? null,
    isActive,
    isTrialing,
    stripeCustomerId: u.stripeCustomerId ?? null,
  };
}

function escapeVCard(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function buildVCard(card: Card): string {
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];
  const fullName = card.fullName || "Contact";
  lines.push(`FN:${escapeVCard(fullName)}`);
  const parts = fullName.trim().split(/\s+/);
  const first = parts.shift() || "";
  const last = parts.join(" ");
  lines.push(`N:${escapeVCard(last)};${escapeVCard(first)};;;`);
  if (card.jobTitle) lines.push(`TITLE:${escapeVCard(card.jobTitle)}`);
  if (card.company) lines.push(`ORG:${escapeVCard(card.company)}`);
  if (card.phone) lines.push(`TEL;TYPE=CELL:${card.phone}`);
  if (card.email) lines.push(`EMAIL:${card.email}`);
  if (card.website) lines.push(`URL:${card.website}`);
  if (card.linkedin) lines.push(`URL;TYPE=LinkedIn:${card.linkedin}`);
  if (card.twitter) lines.push(`URL;TYPE=Twitter:${card.twitter}`);
  if (card.instagram) lines.push(`URL;TYPE=Instagram:${card.instagram}`);
  if (card.bio) lines.push(`NOTE:${escapeVCard(card.bio)}`);
  if (card.photoDataUrl && card.photoDataUrl.startsWith("data:image/")) {
    const m = card.photoDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (m) {
      const type = m[1].toUpperCase();
      const b64 = m[2];
      lines.push(`PHOTO;ENCODING=b;TYPE=${type === "JPG" ? "JPEG" : type}:${b64}`);
    }
  }
  lines.push("END:VCARD");
  return lines.join("\r\n") + "\r\n";
}

// Ensure uploads directory exists
const UPLOADS_DIR = join(process.cwd(), "server", "uploads");
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Serve uploads directory
  app.use("/uploads", express.static(UPLOADS_DIR));

  // ─── Webhook route (uses rawBody captured by global verify in server/index.ts) ───
  app.post(
    "/api/billing/webhook",
    async (req, res) => {
      if (!stripeClient) return res.status(503).json({ error: "Stripe not configured" });
      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) return res.status(503).json({ error: "Webhook secret not set" });

      // rawBody is set by the verify function in server/index.ts
      const rawBody = (req as any).rawBody as Buffer | string | undefined;
      if (!rawBody) {
        return res.status(400).json({ error: "No raw body available" });
      }

      let event: Stripe.Event;
      try {
        event = stripeClient.webhooks.constructEvent(rawBody, sig, webhookSecret);
      } catch (err: any) {
        return res.status(400).json({ error: `Webhook signature failed: ${err.message}` });
      }

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const customerId = session.customer as string;
            const subscriptionId = session.subscription as string;
            const userId = session.metadata?.userId;
            if (userId) {
              // Fetch subscription to get trial info
              const sub = await stripeClient.subscriptions.retrieve(subscriptionId);
              storage.updateUser(userId, {
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                subscriptionStatus: sub.status as string,
                trialEndsAt: sub.trial_end ? sub.trial_end * 1000 : null,
                shippingAddress: session.shipping_details
                  ? JSON.stringify(session.shipping_details)
                  : null,
              });
            }
            break;
          }
          case "customer.subscription.updated": {
            const sub = event.data.object as Stripe.Subscription;
            const user = await findUserByCustomerId(sub.customer as string);
            if (user) {
              storage.updateUser(user.id, {
                subscriptionStatus: sub.status as string,
                stripeSubscriptionId: sub.id,
                trialEndsAt: sub.trial_end ? sub.trial_end * 1000 : null,
              });
            }
            break;
          }
          case "customer.subscription.deleted": {
            const sub = event.data.object as Stripe.Subscription;
            const user = await findUserByCustomerId(sub.customer as string);
            if (user) {
              storage.updateUser(user.id, {
                subscriptionStatus: "canceled",
              });
            }
            break;
          }
          case "invoice.payment_failed": {
            const inv = event.data.object as Stripe.Invoice;
            const user = await findUserByCustomerId(inv.customer as string);
            if (user) {
              storage.updateUser(user.id, {
                subscriptionStatus: "past_due",
              });
            }
            break;
          }
        }
      } catch (err) {
        console.error("Webhook handler error", err);
      }

      res.json({ received: true });
    }
  );

  app.post("/api/auth/signup", async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
    }
    const { email, password } = parsed.data;
    if (storage.getUserByEmail(email.toLowerCase())) {
      return res.status(400).json({ error: "Email already registered" });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = storage.createUser(email.toLowerCase(), hash);
    // generate unique slug
    let slug = generateSlug();
    while (storage.slugExists(slug)) slug = generateSlug();
    const card = storage.createCard(user.id, slug);
    const session = storage.createSession(user.id);
    res.json({ token: session.token, user: publicUser(user), card });
  });

  app.post("/api/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input" });
    }
    const { email, password } = parsed.data;
    const user = storage.getUserByEmail(email.toLowerCase());
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    let card = storage.getCardByUserId(user.id);
    if (!card) {
      let slug = generateSlug();
      while (storage.slugExists(slug)) slug = generateSlug();
      card = storage.createCard(user.id, slug);
    }
    const session = storage.createSession(user.id);
    res.json({ token: session.token, user: publicUser(user), card });
  });

  app.post("/api/auth/logout", (req, res) => {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token) storage.deleteSession(token);
    res.json({ ok: true });
  });

  app.get("/api/me", requireAuth, (req: AuthedRequest, res) => {
    const user = storage.getUserById(req.userId!);
    if (!user) return res.status(404).json({ error: "Not found" });
    const card = storage.getCardByUserId(user.id);
    res.json({ user: publicUser(user), card });
  });

  app.patch("/api/cards/me", requireAuth, (req: AuthedRequest, res) => {
    const parsed = updateCardSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
    }
    const data = parsed.data;
    if (data.slug) {
      if (storage.slugExists(data.slug, req.userId)) {
        return res.status(400).json({ error: "Slug is already taken" });
      }
    }
    const card = storage.updateCard(req.userId!, data as Partial<Card>);
    if (!card) return res.status(404).json({ error: "Card not found" });
    res.json({ card });
  });

  app.get("/api/cards/by-slug/:slug", (req, res) => {
    const card = storage.getCardBySlug(req.params.slug.toLowerCase());
    if (!card) return res.status(404).json({ error: "Card not found" });
    res.json({ card });
  });

  app.get("/api/cards/:slug/vcard", (req, res) => {
    const card = storage.getCardBySlug(req.params.slug.toLowerCase());
    if (!card) return res.status(404).send("Not found");
    const vcf = buildVCard(card);
    res.setHeader("Content-Type", "text/vcard; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${card.slug}.vcf"`,
    );
    res.send(vcf);
  });

  // ─── Photo upload ────────────────────────────────────────────────────────────
  app.post("/api/upload", requireAuth, (req: AuthedRequest, res) => {
    try {
      const { dataUrl, type } = req.body as { dataUrl: string; type?: string };
      if (!dataUrl) return res.status(400).json({ error: "No dataUrl provided" });

      // Validate base64 data URL
      const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!match) return res.status(400).json({ error: "Invalid image format" });

      const ext = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, "base64");

      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: "Image too large (max 5MB)" });
      }

      const filename = `${randomUUID()}.${ext}`;
      const filepath = join(UPLOADS_DIR, filename);
      writeFileSync(filepath, buffer);

      const url = `/uploads/${filename}`;
      res.json({ url });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Upload failed" });
    }
  });

  // ─── Billing routes ──────────────────────────────────────────────────────────
  app.post("/api/billing/create-checkout-session", requireAuth, async (req: AuthedRequest, res) => {
    if (!stripeClient) return res.status(503).json({ error: "Stripe not configured" });

    const user = storage.getUserById(req.userId!);
    if (!user) return res.status(404).json({ error: "User not found" });

    const subscriptionPriceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
    const cardPriceId = process.env.STRIPE_CARD_PRICE_ID;
    const baseUrl = req.headers.origin || process.env.APP_URL || "https://tapcard-e4j5.onrender.com";

    if (!subscriptionPriceId) {
      return res.status(503).json({ error: "STRIPE_SUBSCRIPTION_PRICE_ID not set" });
    }

    try {
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
        {
          price: subscriptionPriceId,
          quantity: 1,
        },
      ];

      if (cardPriceId) {
        lineItems.push({
          price: cardPriceId,
          quantity: 1,
        });
      }

      const session = await stripeClient.checkout.sessions.create({
        mode: "subscription",
        line_items: lineItems,
        subscription_data: {
          trial_period_days: 7,
          metadata: { userId: user.id },
        },
        shipping_address_collection: {
          allowed_countries: ["US"],
        },
        customer_email: user.stripeCustomerId ? undefined : user.email,
        customer: user.stripeCustomerId || undefined,
        metadata: { userId: user.id },
        success_url: `${baseUrl}/#/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/#/checkout`,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/billing/portal", requireAuth, async (req: AuthedRequest, res) => {
    if (!stripeClient) return res.status(503).json({ error: "Stripe not configured" });

    const user = storage.getUserById(req.userId!);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: "No billing account found" });
    }

    const baseUrl = req.headers.origin || process.env.APP_URL || "https://tapcard-e4j5.onrender.com";

    try {
      const portalSession = await stripeClient.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${baseUrl}/#/dashboard`,
      });
      res.json({ url: portalSession.url });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return httpServer;
}

// Helper: find a user by their Stripe customer ID
function findUserByCustomerId(customerId: string) {
  return db.select().from(users).where(eq(users.stripeCustomerId, customerId)).get();
}
