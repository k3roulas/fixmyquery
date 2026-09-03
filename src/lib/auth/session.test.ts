import { beforeAll, describe, expect, it } from 'vitest';

import { signSession, verifySessionToken } from './session';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-for-vitest-only-32chars!';
});

describe('session jwt', () => {
  it('roundtrips a session payload', async () => {
    const token = await signSession({ userId: 'u-123', email: 'a@b.c' });
    const payload = await verifySessionToken(token);
    expect(payload).toEqual({ userId: 'u-123', email: 'a@b.c' });
  });

  it('rejects garbage tokens', async () => {
    expect(await verifySessionToken('not-a-jwt')).toBeNull();
    expect(await verifySessionToken('')).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signSession({ userId: 'u-123', email: 'a@b.c' });
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    // tamper with the payload segment
    const tampered = `${parts[0]}.${parts[1]?.slice(0, -2)}xx.${parts[2]}`;
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it('rejects a token verified under a different secret', async () => {
    const token = await signSession({ userId: 'u-1', email: 'x@y.z' });
    const saved = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'another-secret-entirely-different-value';
    expect(await verifySessionToken(token)).toBeNull();
    process.env.JWT_SECRET = saved;
  });
});
