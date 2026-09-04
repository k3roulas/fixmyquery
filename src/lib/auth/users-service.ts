import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, verificationTokens } from '@/lib/db/schema';

import { generateToken, hashToken, isTokenUsable, TOKEN_TTL_MS } from './tokens';

export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user ?? null;
}

export async function findUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function createUserWithVerificationToken(
  email: string,
  passwordHash: string
): Promise<{ user: typeof users.$inferSelect; token: string } | null> {
  const [user] = await db.insert(users).values({ email, passwordHash }).returning();
  if (!user) return null;

  const token = generateToken();
  await db.insert(verificationTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });
  return { user, token };
}

export type ConsumeTokenResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'already-used' };

export async function consumeVerificationToken(token: string): Promise<ConsumeTokenResult> {
  const [record] = await db
    .select()
    .from(verificationTokens)
    .where(eq(verificationTokens.tokenHash, hashToken(token)))
    .limit(1);
  if (!record) {
    return { ok: false, reason: 'invalid' };
  }

  const usable = isTokenUsable({ expiresAt: record.expiresAt, consumedAt: record.consumedAt });
  if (!usable.ok) {
    return { ok: false, reason: usable.reason };
  }

  await db
    .update(verificationTokens)
    .set({ consumedAt: new Date() })
    .where(eq(verificationTokens.id, record.id));
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, record.userId));
  return { ok: true, userId: record.userId };
}
