import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString('hex');
    scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(`scrypt:${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

export function verifyPassword(password: string, stored: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const parts = stored.split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
      resolve(false);
      return;
    }
    const [, salt, expectedHex] = parts as [string, string, string];
    const expected = Buffer.from(expectedHex, 'hex');
    scrypt(password, salt, expected.length, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey.length === expected.length && timingSafeEqual(derivedKey, expected));
    });
  });
}
