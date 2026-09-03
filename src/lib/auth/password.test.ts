import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('roundtrips a correct password', async () => {
    const stored = await hashPassword('correct horse battery');
    expect(stored.startsWith('scrypt:')).toBe(true);
    expect(await verifyPassword('correct horse battery', stored)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const stored = await hashPassword('correct horse battery');
    expect(await verifyPassword('wrong password', stored)).toBe(false);
  });

  it('salts: same password hashes differently', async () => {
    const a = await hashPassword('same-password');
    const b = await hashPassword('same-password');
    expect(a).not.toBe(b);
  });

  it('rejects malformed stored hashes', async () => {
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('x', 'bcrypt:deadbeef')).toBe(false);
  });
});
