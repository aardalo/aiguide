import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      dailyDestination: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/auth/access', () => {
  class AccessError extends Error { constructor(public status: number, m: string) { super(m); } }
  return {
    AccessError,
    getSessionUser: vi.fn(async () => ({ id: 'test-user' })),
    assertTripAccess: vi.fn(async () => { return; }),
    accessErrorResponse: () => null,
  };
});

import { PATCH } from '../../app/api/daily-destinations/[id]/route';

describe('PATCH /api/daily-destinations/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 409 when another day already uses the requested date', async () => {
    mockPrisma.dailyDestination.findUnique.mockResolvedValue({
      id: 'dest-1',
      tripId: 'trip-1',
      branchId: null,
      dayDate: new Date('2026-06-19T00:00:00.000Z'),
      trip: {
        startDate: new Date('2026-06-19T00:00:00.000Z'),
        stopDate: new Date('2026-07-11T00:00:00.000Z'),
      },
    });
    mockPrisma.dailyDestination.findFirst.mockResolvedValue({ id: 'dest-2' });

    const request = new Request('http://localhost:3000/api/daily-destinations/dest-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayDate: '2026-06-20' }),
    });

    const response = await PATCH(request as any, { params: Promise.resolve({ id: 'dest-1' }) });
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toContain('A destination already exists for this date');
    expect(mockPrisma.dailyDestination.findFirst).toHaveBeenCalledWith({
      where: {
        tripId: 'trip-1',
        dayDate: new Date('2026-06-20T00:00:00.000Z'),
        branchId: null,
        id: { not: 'dest-1' },
      },
      select: { id: true },
    });
    expect(mockPrisma.dailyDestination.update).not.toHaveBeenCalled();
  });

  it('returns 400 when requested day date is outside trip range', async () => {
    mockPrisma.dailyDestination.findUnique.mockResolvedValue({
      id: 'dest-1',
      tripId: 'trip-1',
      branchId: null,
      dayDate: new Date('2026-06-19T00:00:00.000Z'),
      trip: {
        startDate: new Date('2026-06-19T00:00:00.000Z'),
        stopDate: new Date('2026-07-11T00:00:00.000Z'),
      },
    });

    const request = new Request('http://localhost:3000/api/daily-destinations/dest-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayDate: '2026-06-01' }),
    });

    const response = await PATCH(request as any, { params: Promise.resolve({ id: 'dest-1' }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('Day date must be within trip start and stop dates');
    expect(mockPrisma.dailyDestination.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.dailyDestination.update).not.toHaveBeenCalled();
  });
});
