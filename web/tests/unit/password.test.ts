import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('password hashing', () => {
  it('produces an argon2 hash that is not the plaintext', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(hash).not.toBe('correct horse battery');
    expect(hash.startsWith('$argon2')).toBe(true);
  });

  it('verifies a correct password', async () => {
    const hash = await hashPassword('s3cret-password');
    expect(await verifyPassword(hash, 's3cret-password')).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('s3cret-password');
    expect(await verifyPassword(hash, 'wrong-password')).toBe(false);
  });

  it('returns false (does not throw) on a malformed hash', async () => {
    expect(await verifyPassword('not-a-hash', 'whatever')).toBe(false);
  });
});
