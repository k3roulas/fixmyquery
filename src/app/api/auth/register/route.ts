import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendVerificationEmail } from '@/lib/auth/mailer';
import { hashPassword } from '@/lib/auth/password';
import { generateToken, hashToken, TOKEN_TTL_MS } from '@/lib/auth/tokens';
import { db } from '@/lib/db';
import { users, verificationTokens } from '@/lib/db/schema';

const RegisterInput = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = RegisterInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json(
      { error: 'An account with this email already exists' },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const [user] = await db.insert(users).values({ email, passwordHash }).returning();
  if (!user) {
    return NextResponse.json({ error: 'Could not create account' }, { status: 500 });
  }

  const token = generateToken();
  await db.insert(verificationTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });

  const origin = new URL(req.url).origin;
  try {
    await sendVerificationEmail(email, `${origin}/verify?token=${token}`);
  } catch (err) {
    console.error('verification email failed', err);
    return NextResponse.json(
      { error: 'Account created but the verification email could not be sent' },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: 'Check your email to verify your account' }, { status: 201 });
}
