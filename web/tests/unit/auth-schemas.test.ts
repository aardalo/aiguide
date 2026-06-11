import { describe, expect, it } from 'vitest';
import { registerSchema, loginSchema } from '@/lib/schemas/auth';

describe('registerSchema', () => {
  it('accepts a valid email + 8-char password', () => {
    expect(registerSchema.safeParse({ email: 'a@b.com', password: '12345678' }).success).toBe(true);
  });
  it('rejects passwords shorter than 8', () => {
    expect(registerSchema.safeParse({ email: 'a@b.com', password: '1234567' }).success).toBe(false);
  });
  it('rejects invalid emails', () => {
    expect(registerSchema.safeParse({ email: 'nope', password: '12345678' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('requires a non-empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});
