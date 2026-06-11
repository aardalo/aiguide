/**
 * Password hashing utilities (argon2id via @node-rs/argon2).
 * @node-rs/argon2's default algorithm is Argon2id.
 */
import { hash, verify } from '@node-rs/argon2';

export function hashPassword(plain: string): Promise<string> {
  return hash(plain);
}

export async function verifyPassword(storedHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(storedHash, plain);
  } catch {
    return false;
  }
}
