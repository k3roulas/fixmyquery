import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJsonBody } from '@/lib/api';
import { sendVerificationEmail } from '@/lib/auth/mailer';
import { hashPassword } from '@/lib/auth/password';
import { createUserWithVerificationToken, findUserByEmail } from '@/lib/auth/users-service';

const RegisterInput = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(req: Request) {
  const body = await parseJsonBody(req, RegisterInput);
  if (!body.ok) return body.response;

  const email = body.data.email.toLowerCase();

  if (await findUserByEmail(email)) {
    return NextResponse.json(
      { error: 'An account with this email already exists' },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(body.data.password);
  const created = await createUserWithVerificationToken(email, passwordHash);
  if (!created) {
    return NextResponse.json({ error: 'Could not create account' }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  try {
    await sendVerificationEmail(email, `${origin}/verify?token=${created.token}`);
  } catch (err) {
    console.error('verification email failed', err);
    return NextResponse.json(
      { error: 'Account created but the verification email could not be sent' },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: 'Check your email to verify your account' }, { status: 201 });
}
