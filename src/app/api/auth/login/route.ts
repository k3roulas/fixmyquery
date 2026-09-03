import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJsonBody } from '@/lib/api';
import { verifyPassword } from '@/lib/auth/password';
import { setSessionCookie } from '@/lib/auth/session';
import { findUserByEmail } from '@/lib/auth/users-service';

const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await parseJsonBody(req, LoginInput);
  if (!body.ok) return body.response;

  const user = await findUserByEmail(body.data.email.toLowerCase());
  if (!user || !(await verifyPassword(body.data.password, user.passwordHash))) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  if (user.emailVerifiedAt === null) {
    return NextResponse.json(
      { error: 'Please verify your email first — check your inbox for the link' },
      { status: 403 }
    );
  }

  await setSessionCookie({ userId: user.id, email: user.email });
  return NextResponse.json({ email: user.email });
}
