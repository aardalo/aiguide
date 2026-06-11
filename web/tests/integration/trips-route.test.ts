import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      trip: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      dailyDestination: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
      dailyPoi: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
      routeSegment: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
      branch: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/auth/access', () => ({
  getSessionUser: vi.fn(async () => ({ id: 'me' })),
  assertTripAccess: vi.fn(async () => {}),
  accessErrorResponse: vi.fn(() => null),
}));

import { PATCH } from '../../app/api/trips/[id]/route';
import { GET, POST } from '../../app/api/trips/route';

describe('PATCH /api/trips/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shifts dated records and stopDate when startDate changes', async () => {
    const existingTrip = {
      id: 'trip-1',
      title: 'Trip',
      description: null,
      planMode: true,
      startDate: new Date('2026-08-01T00:00:00.000Z'),
      stopDate: new Date('2026-08-03T00:00:00.000Z'),
      routingPreferences: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    mockPrisma.trip.findUnique.mockResolvedValue(existingTrip);

    const tx = {
      dailyDestination: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'd3', dayDate: new Date('2026-08-03T00:00:00.000Z') },
          { id: 'd2', dayDate: new Date('2026-08-02T00:00:00.000Z') },
          { id: 'd1', dayDate: new Date('2026-08-01T00:00:00.000Z') },
        ]),
        update: vi.fn().mockResolvedValue(undefined),
      },
      dailyPoi: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'p1', dayDate: new Date('2026-08-02T00:00:00.000Z') },
        ]),
        update: vi.fn().mockResolvedValue(undefined),
      },
      routeSegment: {
        findMany: vi.fn().mockResolvedValue([
          { id: 's1', dayDate: new Date('2026-08-03T00:00:00.000Z') },
        ]),
        update: vi.fn().mockResolvedValue(undefined),
      },
      branch: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'b1', anchorDayDate: new Date('2026-08-02T00:00:00.000Z') },
        ]),
        update: vi.fn().mockResolvedValue(undefined),
      },
      trip: {
        update: vi.fn().mockResolvedValue({
          ...existingTrip,
          startDate: new Date('2026-08-03T00:00:00.000Z'),
          stopDate: new Date('2026-08-05T00:00:00.000Z'),
        }),
      },
    };

    mockPrisma.$transaction.mockImplementation(async (callback: (arg: typeof tx) => unknown) => {
      return await callback(tx);
    });

    const request = new Request('http://localhost:3000/api/trips/trip-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: '2026-08-03' }),
    });

    const response = await PATCH(request as any, { params: Promise.resolve({ id: 'trip-1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

    expect(tx.dailyDestination.findMany).toHaveBeenCalledWith({
      where: { tripId: 'trip-1' },
      orderBy: { dayDate: 'desc' },
    });

    expect(tx.branch.update).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: { anchorDayDate: new Date('2026-08-04T00:00:00.000Z') },
    });

    expect(tx.trip.update).toHaveBeenCalledWith({
      where: { id: 'trip-1' },
      data: expect.objectContaining({
        startDate: new Date('2026-08-03T00:00:00.000Z'),
        stopDate: new Date('2026-08-05T00:00:00.000Z'),
      }),
    });

    expect(tx.dailyDestination.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { dayDate: new Date('2026-08-03T00:00:00.000Z') },
    });

    expect(json.startDate).toBe('2026-08-03T00:00:00.000Z');
    expect(json.stopDate).toBe('2026-08-05T00:00:00.000Z');
  });

  it('rejects stopDate-only edits because stopDate is derived', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue({
      id: 'trip-1',
      title: 'Trip',
      description: null,
      planMode: true,
      startDate: new Date('2026-08-01T00:00:00.000Z'),
      stopDate: new Date('2026-08-03T00:00:00.000Z'),
      routingPreferences: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const request = new Request('http://localhost:3000/api/trips/trip-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stopDate: '2026-08-10' }),
    });

    const response = await PATCH(request as any, { params: Promise.resolve({ id: 'trip-1' }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('Stop date is derived from the journey timeline');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.trip.update).not.toHaveBeenCalled();
  });
});

describe('GET/POST /api/trips ownership', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('GET /api/trips scopes to owner-or-shared trips and includes only the requesting user\'s share role', async () => {
    mockPrisma.trip.findMany.mockResolvedValue([
      {
        id: 'trip-1',
        title: 'My Trip',
        description: null,
        planMode: false,
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        stopDate: new Date('2026-09-05T00:00:00.000Z'),
        routingPreferences: null,
        ownerId: 'me',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        shares: [],
      },
    ]);

    const request = new Request('http://localhost:3000/api/trips', {
      method: 'GET',
    });

    const response = await GET(request as any);
    expect(response.status).toBe(200);

    expect(mockPrisma.trip.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ ownerId: 'me' }, { shares: { some: { userId: 'me' } } }] },
        orderBy: { createdAt: 'desc' },
        include: { shares: { where: { userId: 'me' }, select: { role: true } } },
      })
    );

    const body = await response.json();
    expect(body).toHaveLength(1);
    // shares array should be passed through (only the requesting user's own share row)
    expect(body[0].shares).toEqual([]);
  });

  it('POST /api/trips stamps ownerId from session', async () => {
    const now = new Date();
    mockPrisma.trip.create.mockResolvedValue({
      id: 'new-trip',
      title: 'My Trip',
      description: null,
      planMode: false,
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      stopDate: new Date('2026-09-05T00:00:00.000Z'),
      routingPreferences: null,
      ownerId: 'me',
      createdAt: now,
      updatedAt: now,
    });

    const request = new Request('http://localhost:3000/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'My Trip',
        startDate: '2026-09-01',
        stopDate: '2026-09-05',
      }),
    });

    const response = await POST(request as any);
    expect(response.status).toBe(201);

    expect(mockPrisma.trip.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: 'me' }),
      })
    );
  });
});
