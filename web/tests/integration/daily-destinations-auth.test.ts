import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      dailyDestination: {
        create: vi.fn(),
        findUnique: vi.fn(),
      },
      trip: {
        findUnique: vi.fn(),
      },
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/auth/access', () => {
  class AccessError extends Error { constructor(public status: number, m: string) { super(m); } }
  return {
    AccessError,
    getSessionUser: vi.fn(async () => ({ id: 'u' })),
    assertTripAccess: vi.fn(async () => { throw new AccessError(403, 'Forbidden'); }),
    accessErrorResponse: (e: unknown) => (e instanceof AccessError
      ? new Response(JSON.stringify({ error: (e as AccessError).message }), { status: (e as AccessError).status, headers: { 'Content-Type': 'application/json' } })
      : null),
  };
});

import { POST } from '../../app/api/daily-destinations/route';

describe('POST /api/daily-destinations — auth guard', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 403 and does not call prisma.dailyDestination.create when assertTripAccess throws', async () => {
    const request = new Request('http://localhost:3000/api/daily-destinations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId: 'trip-forbidden',
        dayDate: '2026-06-05',
        name: 'Paris',
        latitude: 48.8566,
        longitude: 2.3522,
      }),
    });

    const response = await POST(request as any);

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBe('Forbidden');
    expect(mockPrisma.dailyDestination.create).not.toHaveBeenCalled();
  });
});
