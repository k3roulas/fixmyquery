import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/routes';

import type { SessionPayload } from './session';
import { getSession } from './session';

// Page-level auth guard. src/proxy.ts bounces unauthenticated navigation early,
// but middleware is a UX layer, not a security boundary — this is the authoritative check.
export async function requireSession(next: string = ROUTES.app): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  return session;
}
