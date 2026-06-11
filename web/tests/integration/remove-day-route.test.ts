import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      trip: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/auth/access', () => ({
  getSessionUser: vi.fn(async () => ({ id: 'test-user' })),
  assertTripAccess: vi.fn(async () => {}),
  accessErrorResponse: vi.fn(() => null),
  AccessError: class AccessError extends Error { constructor(public status: number, m: string){ super(m); } },
}));

import { POST } from '../../app/api/trips/[id]/remove-day/route';

describe('POST /api/trips/[id]/remove-day', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes the selected day across all branches', async () => {
    const tripId = 'cmmgxarqq00ehxodpy3mi8vi8';
    const trip = {
      id: tripId,
      startDate: new Date('2026-06-19T00:00:00.000Z'),
      stopDate: new Date('2026-06-22T00:00:00.000Z'),
      routingPreferences: null,
    };

    mockPrisma.trip.findUnique
      .mockResolvedValueOnce(trip)
      .mockResolvedValueOnce(trip);

    const tx = {
      routeSegment: {
        findMany: vi.fn()
          .mockResolvedValueOnce([
            { id: 'seg-main' },
            { id: 'seg-branch' },
          ])
          .mockResolvedValueOnce([]),
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        update: vi.fn().mockResolvedValue(undefined),
      },
      routeWaypoint: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      dailyPoi: {
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue(undefined),
      },
      dailyDestination: {
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue(undefined),
      },
      branch: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue(undefined),
      },
      trip: {
        update: vi.fn().mockResolvedValue(trip),
      },
    } as unknown as {
      routeSegment: { findMany: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
      routeWaypoint: { deleteMany: ReturnType<typeof vi.fn> };
      dailyPoi: { deleteMany: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
      dailyDestination: { deleteMany: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
      branch: { findMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
      trip: { update: ReturnType<typeof vi.fn> };
    };

    mockPrisma.$transaction.mockImplementation(async (callback: (arg: typeof tx) => unknown) => {
      return await callback(tx);
    });

    const request = new Request(`http://localhost:3000/api/trips/${tripId}/remove-day`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-06-20' }),
    });

    const response = await POST(request as any, { params: Promise.resolve({ id: tripId }) });
    expect(response.status).toBe(200);

    expect(tx.dailyDestination.deleteMany).toHaveBeenCalledWith({
      where: { tripId, dayDate: new Date('2026-06-20T00:00:00.000Z') },
    });

    expect(tx.routeWaypoint.deleteMany).toHaveBeenCalledTimes(2);
  });
});
