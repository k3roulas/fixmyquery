import { NextResponse } from 'next/server';
import { clearSessionCookie, getSession } from '@/lib/auth/session';
import { buildLogoutMessage, notifySlack } from '@/lib/slack';

export async function POST() {
  const session = await getSession();
  if (session) {
    notifySlack(() => buildLogoutMessage(session.email));
  }
  await clearSessionCookie();
  return NextResponse.json({ message: 'Signed out' });
}
