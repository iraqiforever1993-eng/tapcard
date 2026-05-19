import { users, cards, sessions } from "@shared/schema";
import type { User, Card, Session } from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, gt } from "drizzle-orm";
import { randomUUID } from "node:crypto";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

// Create tables manually for simplicity (no migrations)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
    slug TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL DEFAULT '',
    job_title TEXT,
    company TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    linkedin TEXT,
    twitter TEXT,
    instagram TEXT,
    bio TEXT,
    photo_data_url TEXT,
    accent_color TEXT NOT NULL DEFAULT '#0ea5e9',
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL
  );
`);

export const db = drizzle(sqlite);

export interface IStorage {
  // users
  createUser(email: string, passwordHash: string): User;
  getUserByEmail(email: string): User | undefined;
  getUserById(id: string): User | undefined;

  // cards
  createCard(userId: string, slug: string): Card;
  getCardByUserId(userId: string): Card | undefined;
  getCardBySlug(slug: string): Card | undefined;
  updateCard(userId: string, patch: Partial<Card>): Card | undefined;
  slugExists(slug: string, excludeUserId?: string): boolean;

  // sessions
  createSession(userId: string): Session;
  getSessionByToken(token: string): Session | undefined;
  deleteSession(token: string): void;
}

export class DatabaseStorage implements IStorage {
  createUser(email: string, passwordHash: string): User {
    return db
      .insert(users)
      .values({
        id: randomUUID(),
        email,
        passwordHash,
        createdAt: Date.now(),
      })
      .returning()
      .get();
  }
  getUserByEmail(email: string): User | undefined {
    return db.select().from(users).where(eq(users.email, email)).get();
  }
  getUserById(id: string): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  createCard(userId: string, slug: string): Card {
    return db
      .insert(cards)
      .values({
        id: randomUUID(),
        userId,
        slug,
        fullName: "",
        accentColor: "#0ea5e9",
        updatedAt: Date.now(),
      })
      .returning()
      .get();
  }
  getCardByUserId(userId: string): Card | undefined {
    return db.select().from(cards).where(eq(cards.userId, userId)).get();
  }
  getCardBySlug(slug: string): Card | undefined {
    return db.select().from(cards).where(eq(cards.slug, slug)).get();
  }
  updateCard(userId: string, patch: Partial<Card>): Card | undefined {
    const existing = this.getCardByUserId(userId);
    if (!existing) return undefined;
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      cleaned[k] = v;
    }
    cleaned.updatedAt = Date.now();
    return db
      .update(cards)
      .set(cleaned)
      .where(eq(cards.userId, userId))
      .returning()
      .get();
  }
  slugExists(slug: string, excludeUserId?: string): boolean {
    const row = db.select().from(cards).where(eq(cards.slug, slug)).get();
    if (!row) return false;
    if (excludeUserId && row.userId === excludeUserId) return false;
    return true;
  }

  createSession(userId: string): Session {
    const token = randomUUID() + randomUUID();
    return db
      .insert(sessions)
      .values({
        id: randomUUID(),
        userId,
        token,
        expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
      })
      .returning()
      .get();
  }
  getSessionByToken(token: string): Session | undefined {
    return db
      .select()
      .from(sessions)
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, Date.now())))
      .get();
  }
  deleteSession(token: string): void {
    db.delete(sessions).where(eq(sessions.token, token)).run();
  }
}

export const storage = new DatabaseStorage();
