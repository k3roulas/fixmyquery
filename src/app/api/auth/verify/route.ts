import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hashToken, isTokenUsable } from '@/lib/auth/tokens';
import { db } from '@/lib/db';
import { users, verificationTokens } from '@/lib/db/schema';

const VerifyInput = z.object({ token: z.string().min(1) });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = VerifyInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  const [record] = await db
    .select()
    .from(verificationTokens)
    .where(eq(verificationTokens.tokenHash, hashToken(parsed.data.token)))
    .limit(1);
  if (!record) {
    return NextResponse.json({ error: 'Invalid verification link' }, { status: 400 });
  }

  const usable = isTokenUsable({ expiresAt: record.expiresAt, consumedAt: record.consumedAt });
  if (!usable.ok) {
    return NextResponse.json(
      {
        error:
          usable.reason === 'expired'
            ? 'This verification link has expired — register again to get a new one'
            : 'This verification link was already used',
      },
      { status: 400 }
    );
  }

  await db
    .update(verificationTokens)
    .set({ consumedAt: new Date() })
    .where(eq(verificationTokens.id, record.id));
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, record.userId));

  return NextResponse.json({ message: 'Email verified — you can sign in now' });
}
