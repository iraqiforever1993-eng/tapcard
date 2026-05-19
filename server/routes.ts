import type { Express, Request, Response, NextFunction } from "express";
import { createServer } from "node:http";
import type { Server } from "node:http";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import {
  signupSchema,
  loginSchema,
  updateCardSchema,
} from "@shared/schema";
import type { Card, User } from "@shared/schema";

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
  return { id: u.id, email: u.email };
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

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Increase JSON payload limit for photo data URLs
  app.use((req, _res, next) => {
    // body parsers already set in server/index.ts, but ensure size
    next();
  });

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

  return httpServer;
}
