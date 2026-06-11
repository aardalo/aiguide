import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      trip: {
        findUnique: vi.fn(),
      },
      device: {
        findUnique: vi.fn(),
      },
      dailyDestination: {
        findMany: vi.fn(),
      },
      dailyPoi: {
        findMany: vi.fn(),
      },
      routeSegment: {
        findMany: vi.fn(),
      },
      routeWaypoint: {
        findMany: vi.fn(),
      },
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { GET } from '../../app/api/trips/[id]/changes/route';

const TRIP_ID = 'cltrip0000000000000000001';

function emptyEntityMocks() {
  mockPrisma.dailyDestination.findMany.mockResolvedValue([]);
  mockPrisma.dailyPoi.findMany.mockResolvedValue([]);
  mockPrisma.routeSegment.findMany.mockResolvedValue([]);
  mockPrisma.routeWaypoint.findMany.mockResolvedValue([]);
}

describe('GET /api/trips/[id]/changes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when the trip does not exist', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(null);

    const request = new Request(
      `http://localhost:3000/api/trips/${TRIP_ID}/changes`
    );
    const response = await GET(request as any, {
      params: Promise.resolve({ id: TRIP_ID }),
    });

    expect(response.status).toBe(404);
  });

  it('returns a POI change with device attribution', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue({
      id: TRIP_ID,
      updatedAt: new Date('2020-01-01T00:00:00.000Z'),
      lastModifiedByDeviceId: null,
    });
    emptyEntityMocks();
    mockPrisma.dailyPoi.findMany.mockResolvedValue([
      {
        id: 'poi-1',
        tripId: TRIP_ID,
        updatedAt: new Date('2026-06-10T12:00:00.000Z'),
        lastModifiedByDeviceId: 'device-1',
        lastModifiedByDevice: { name: 'My Phone' },
      },
    ]);

    const since = '2026-06-10T11:00:00.000Z';
    const request = new Request(
      `http://localhost:3000/api/trips/${TRIP_ID}/changes?since=${since}`
    );
    const response = await GET(request as any, {
      params: Promise.resolve({ id: TRIP_ID }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.changes).toHaveLength(1);
    expect(json.changes[0]).toMatchObject({
      id: 'poi-1',
      type: 'poi',
      tripId: TRIP_ID,
      lastModifiedByDeviceId: 'device-1',
      deviceName: 'My Phone',
    });
    expect(json.lastSyncTime).toBeTruthy();
    // The `since` filter is forwarded to the entity queries
    expect(mockPrisma.dailyPoi.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tripId: TRIP_ID,
          updatedAt: { gt: new Date(since) },
        }),
      })
    );
  });

  it('aggregates and sorts changes from multiple entity types by updatedAt desc', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue({
      id: TRIP_ID,
      updatedAt: new Date('2020-01-01T00:00:00.000Z'),
      lastModifiedByDeviceId: null,
    });
    emptyEntityMocks();
    mockPrisma.dailyDestination.findMany.mockResolvedValue([
      {
        id: 'dest-1',
        tripId: TRIP_ID,
        updatedAt: new Date('2026-06-10T09:00:00.000Z'),
        lastModifiedByDeviceId: 'device-1',
        lastModifiedByDevice: { name: 'Phone' },
      },
    ]);
    mockPrisma.routeSegment.findMany.mockResolvedValue([
      {
        id: 'seg-1',
        tripId: TRIP_ID,
        updatedAt: new Date('2026-06-10T15:00:00.000Z'),
        lastModifiedByDeviceId: 'device-2',
        lastModifiedByDevice: { name: 'Laptop' },
      },
    ]);

    const request = new Request(
      `http://localhost:3000/api/trips/${TRIP_ID}/changes?since=2026-06-10T00:00:00.000Z`
    );
    const response = await GET(request as any, {
      params: Promise.resolve({ id: TRIP_ID }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.changes).toHaveLength(2);
    // Newest first: route segment (15:00) before destination (09:00)
    expect(json.changes[0].id).toBe('seg-1');
    expect(json.changes[0].type).toBe('route_segment');
    expect(json.changes[1].id).toBe('dest-1');
  });
});
