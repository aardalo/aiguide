import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      trip: {
        findUnique: vi.fn(),
      },
      branch: {
        count: vi.fn(),
        create: vi.fn(),
      },
      dailyDestination: {
        create: vi.fn(),
      },
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

import { POST } from '../../app/api/branches/route';

describe('POST /api/branches', () => {
  const tripId = 'cmmgxarqq00ehxodpy3mi8vi8';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects fork start day outside trip range', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue({
      id: tripId,
      startDate: new Date('2026-06-19T00:00:00.000Z'),
      stopDate: new Date('2026-07-11T00:00:00.000Z'),
    });

    const request = new Request('http://localhost:3000/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, dayDate: '2026-06-01' }),
    });

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('dayDate must be within trip start and stop dates');
    expect(mockPrisma.branch.create).not.toHaveBeenCalled();
    expect(mockPrisma.dailyDestination.create).not.toHaveBeenCalled();
  });

  it('creates branch and anchored branch destination for valid day', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue({
      id: tripId,
      startDate: new Date('2026-06-19T00:00:00.000Z'),
      stopDate: new Date('2026-07-11T00:00:00.000Z'),
    });
    mockPrisma.branch.count.mockResolvedValue(0);
    mockPrisma.branch.create.mockResolvedValue({
      id: 'branch-1',
      tripId: 'trip-1',
      name: 'Branch 1',
      color: '#2563eb',
      sortOrder: 0,
      anchorDayDate: new Date('2026-06-20T00:00:00.000Z'),
    });
    mockPrisma.dailyDestination.create.mockResolvedValue({ id: 'dest-1' });

    const request = new Request('http://localhost:3000/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, dayDate: '2026-06-20' }),
    });

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.id).toBe('branch-1');
    expect(json.anchorDayDate).toBe('2026-06-20T00:00:00.000Z');
    expect(mockPrisma.branch.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tripId,
        anchorDayDate: new Date('2026-06-20T00:00:00.000Z'),
      }),
    });
    expect(mockPrisma.dailyDestination.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tripId,
        branchId: 'branch-1',
        dayDate: new Date('2026-06-20T00:00:00.000Z'),
      }),
    });
  });
});
