import { createHash, randomBytes } from 'node:crypto';

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function isTokenUsable(token: {
  expiresAt: Date;
  consumedAt: Date | null;
}): { ok: true } | { ok: false; reason: 'expired' | 'already-used' } {
  if (token.consumedAt !== null) return { ok: false, reason: 'already-used' };
  if (token.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };
  return { ok: true };
}
