import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { user: { create: vi.fn() } },
}));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth/password', () => ({ hashPassword: vi.fn(async () => '$argon2id$hash') }));

import { POST } from '../../app/api/auth/register/route';
import { Prisma } from '@prisma/client';

function req(body: unknown) {
  return new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a user with a lowercased email and hashed password', async () => {
    mockPrisma.user.create.mockResolvedValue({ id: 'u1', email: 'a@b.com', name: null });
    const res = await POST(req({ email: 'A@B.com', password: 'longenough' }));
    expect(res.status).toBe(201);
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: { email: 'a@b.com', passwordHash: '$argon2id$hash', name: null },
    });
    const json = await res.json();
    expect(json).toMatchObject({ id: 'u1', email: 'a@b.com' });
    expect(json.passwordHash).toBeUndefined();
  });

  it('rejects a short password with 400', async () => {
    const res = await POST(req({ email: 'a@b.com', password: 'short' }));
    expect(res.status).toBe(400);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('returns 409 on duplicate email', async () => {
    mockPrisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '5' }),
    );
    const res = await POST(req({ email: 'a@b.com', password: 'longenough' }));
    expect(res.status).toBe(409);
  });
});
