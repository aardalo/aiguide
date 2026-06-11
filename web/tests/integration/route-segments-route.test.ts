import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma, mockGetSetting, mockGetActiveRoutingProvider } = vi.hoisted(() => {
  return {
    mockPrisma: {
      dailyDestination: {
        findMany: vi.fn(),
      },
      trip: {
        findUnique: vi.fn(),
      },
      branch: {
        findUnique: vi.fn(),
      },
      routeSegment: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      routeWaypoint: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
    },
    mockGetSetting: vi.fn(),
    mockGetActiveRoutingProvider: vi.fn(),
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/settings', () => ({
  getSetting: mockGetSetting,
  SETTING_KEYS: {
    HOME_NAME: 'home.name',
    HOME_LATITUDE: 'home.latitude',
    HOME_LONGITUDE: 'home.longitude',
  },
}));
vi.mock('@/lib/routing', () => ({
  getActiveRoutingProvider: mockGetActiveRoutingProvider,
}));
vi.mock('@/lib/auth/access', () => ({
  getSessionUser: vi.fn(async () => ({ id: 'test-user' })),
  assertTripAccess: vi.fn(async () => {}),
  accessErrorResponse: vi.fn(() => null),
  AccessError: class AccessError extends Error { constructor(public status: number, m: string){ super(m); } },
}));

import { POST } from '../../app/api/route-segments/route';

describe('POST /api/route-segments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSetting.mockResolvedValue(null);
  });

  it('rejects branch route generation when branch destinations exist before anchor day', async () => {
    const tripId = 'cmmgxarqq00ehxodpy3mi8vi8';
    const branchId = 'cmmgxarqq00ehxodpy3mi8vi9';

    mockPrisma.dailyDestination.findMany.mockResolvedValue([
      {
        id: 'branch-dest-1',
        tripId,
        branchId,
        dayDate: new Date('2026-06-20T00:00:00.000Z'),
        latitude: 1,
        longitude: 1,
        isLayover: false,
        name: 'Branch Early',
      },
      {
        id: 'main-dest-1',
        tripId,
        branchId: null,
        dayDate: new Date('2026-06-19T00:00:00.000Z'),
        latitude: 1,
        longitude: 1,
        isLayover: false,
        name: 'Main Day',
      },
    ]);
    mockPrisma.trip.findUnique.mockResolvedValue({ routingPreferences: null });
    mockPrisma.branch.findUnique.mockResolvedValue({
      id: branchId,
      tripId,
      anchorDayDate: new Date('2026-06-21T00:00:00.000Z'),
    });

    const request = new Request('http://localhost:3000/api/route-segments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, branchId }),
    });

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toContain('Branch route segments cannot be generated before the fork anchor day');
    expect(mockGetActiveRoutingProvider).not.toHaveBeenCalled();
  });
});