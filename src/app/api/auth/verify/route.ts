import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJsonBody } from '@/lib/api';
import { consumeVerificationToken, findUserById } from '@/lib/auth/users-service';
import { buildEmailVerifiedMessage, notifySlack } from '@/lib/slack';

const VerifyInput = z.object({ token: z.string().min(1, 'Token is required') });

const FAILURE_MESSAGES = {
  invalid: 'Invalid verification link',
  expired: 'This verification link has expired — register again to get a new one',
  'already-used': 'This verification link was already used',
} as const;

export async function POST(req: Request) {
  const body = await parseJsonBody(req, VerifyInput);
  if (!body.ok) return body.response;

  const result = await consumeVerificationToken(body.data.token);
  if (!result.ok) {
    return NextResponse.json({ error: FAILURE_MESSAGES[result.reason] }, { status: 400 });
  }

  const user = await findUserById(result.userId);
  notifySlack(() => buildEmailVerifiedMessage(user?.email ?? result.userId));

  return NextResponse.json({ message: 'Email verified — you can sign in now' });
}
