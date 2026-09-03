import { describe, expect, it } from 'vitest';

import { generateToken, hashToken, isTokenUsable } from './tokens';

describe('tokens', () => {
  it('generates 64-char hex tokens', () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(generateToken()).not.toBe(token);
  });

  it('hashes deterministically and not reversibly-looking', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe('abc');
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });

  it('accepts fresh unconsumed tokens', () => {
    const result = isTokenUsable({
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects expired tokens', () => {
    const result = isTokenUsable({
      expiresAt: new Date(Date.now() - 60_000),
      consumedAt: null,
    });
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects consumed tokens even if not expired', () => {
    const result = isTokenUsable({
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: new Date(Date.now() - 1000),
    });
    expect(result).toEqual({ ok: false, reason: 'already-used' });
  });
});
