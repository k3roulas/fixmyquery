import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJsonBody } from '@/lib/api';
import { verifyPassword } from '@/lib/auth/password';
import { setSessionCookie } from '@/lib/auth/session';
import { findUserByEmail } from '@/lib/auth/users-service';
import {
  buildLoginAttemptMessage,
  buildLoginFailedMessage,
  buildLoginSuccessMessage,
  notifySlack,
} from '@/lib/slack';

const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await parseJsonBody(req, LoginInput);
  if (!body.ok) return body.response;

  notifySlack(() => buildLoginAttemptMessage(body.data.email));

  const user = await findUserByEmail(body.data.email.toLowerCase());
  if (!user || !(await verifyPassword(body.data.password, user.passwordHash))) {
    notifySlack(() => buildLoginFailedMessage(body.data.email, 'invalid email or password'));
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  if (user.emailVerifiedAt === null) {
    notifySlack(() => buildLoginFailedMessage(user.email, 'email not verified'));
    return NextResponse.json(
      { error: 'Please verify your email first — check your inbox for the link' },
      { status: 403 }
    );
  }

  await setSessionCookie({ userId: user.id, email: user.email });
  notifySlack(() => buildLoginSuccessMessage(user.email));
  return NextResponse.json({ email: user.email });
}
