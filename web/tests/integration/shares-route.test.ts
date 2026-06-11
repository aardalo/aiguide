import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    trip: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    tripShare: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth/access', () => ({
  getSessionUser: vi.fn(async () => ({ id: 'owner' })),
  AccessError: class AccessError extends Error { constructor(public status: number, m: string){ super(m);} },
  accessErrorResponse: vi.fn(() => null),
}));

import { GET, POST } from '../../app/api/trips/[id]/shares/route';

function jsonReq(body: unknown) {
  return new Request('http://localhost:3000/api/trips/t1/shares', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}
const ctx = { params: Promise.resolve({ id: 't1' }) };

describe('trip shares', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('owner lists shares', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue({ ownerId: 'owner' });
    mockPrisma.tripShare.findMany.mockResolvedValue([
      { id: 's1', role: 'VIEWER', user: { id: 'u2', email: 'b@b.com', name: null } },
    ]);
    const res = await GET(new Request('http://localhost:3000/api/trips/t1/shares'), ctx);
    expect(res.status).toBe(200);
  });

  it('non-owner cannot list shares (403)', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue({ ownerId: 'someone-else' });
    const res = await GET(new Request('http://localhost:3000/api/trips/t1/shares'), ctx);
    expect(res.status).toBe(403);
  });

  it('POST resolves email to an existing user and creates a share', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue({ ownerId: 'owner' });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u2', email: 'b@b.com' });
    mockPrisma.tripShare.create.mockResolvedValue({ id: 's1', tripId: 't1', userId: 'u2', role: 'EDITOR' });
    const res = await POST(jsonReq({ email: 'B@B.com', role: 'EDITOR' }), ctx);
    expect(res.status).toBe(201);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'b@b.com' } });
  });

  it('POST with unknown email returns 404', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue({ ownerId: 'owner' });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const res = await POST(jsonReq({ email: 'nobody@b.com', role: 'VIEWER' }), ctx);
    expect(res.status).toBe(404);
  });
});
