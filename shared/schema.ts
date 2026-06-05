import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"), // 'trialing'|'active'|'past_due'|'canceled'|null
  trialEndsAt: integer("trial_ends_at"), // unix ms timestamp
  shippingAddress: text("shipping_address"), // JSON string
  physicalCardShipped: integer("physical_card_shipped").default(0),
});

export const cards = sqliteTable("cards", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id),
  slug: text("slug").notNull().unique(),
  fullName: text("full_name").notNull().default(""),
  jobTitle: text("job_title"),
  company: text("company"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  linkedin: text("linkedin"),
  twitter: text("twitter"),
  instagram: text("instagram"),
  bio: text("bio"),
  photoDataUrl: text("photo_data_url"),
  accentColor: text("accent_color").notNull().default("#0ea5e9"),
  updatedAt: integer("updated_at").notNull(),
  // v2 customization fields
  layoutStyle: text("layout_style").default("minimal"), // 'minimal'|'photo_forward'|'bold'
  backgroundColor: text("background_color").default("#0a0a0a"),
  textColor: text("text_color").default("#ffffff"),
  backgroundPhotoUrl: text("background_photo_url"),
  profilePhotoUrl: text("profile_photo_url"),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at").notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCardSchema = createInsertSchema(cards).omit({
  id: true,
  userId: true,
  updatedAt: true,
});

export const updateCardSchema = insertCardSchema.partial().extend({
  slug: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9-]+$/i, "Slug must be lowercase alphanumeric with hyphens")
    .transform((s) => s.toLowerCase())
    .optional(),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Card = typeof cards.$inferSelect;
export type InsertCard = z.infer<typeof insertCardSchema>;
export type UpdateCard = z.infer<typeof updateCardSchema>;
export type Session = typeof sessions.$inferSelect;
