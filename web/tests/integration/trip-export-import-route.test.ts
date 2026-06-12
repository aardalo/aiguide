/**
 * Integration tests for the export and import route handlers.
 *  - GET  /api/trips/[id]/export
 *  - POST /api/trips/import
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      trip: { findUnique: vi.fn(), create: vi.fn() },
      branch: { findMany: vi.fn(), create: vi.fn() },
      dailyDestination: { findMany: vi.fn(), create: vi.fn() },
      dailyPoi: { findMany: vi.fn(), create: vi.fn(), createMany: vi.fn() },
      routeSegment: { findMany: vi.fn(), create: vi.fn() },
      routeWaypoint: { createMany: vi.fn() },
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

import { GET } from '../../app/api/trips/[id]/export/route';
import { POST } from '../../app/api/trips/import/route';
import { buildExportEnvelope } from '@/lib/trip-export/serialize';
import { assertTripAccess, accessErrorResponse, AccessError } from '@/lib/auth/access';

function tripRow() {
  return {
    id: 'trip_1',
    title: 'Norway Road Trip',
    description: 'Scenic',
    startDate: new Date('2026-06-01T00:00:00.000Z'),
    stopDate: new Date('2026-06-02T00:00:00.000Z'),
    planMode: false,
    routingPreferences: JSON.stringify({ avoid: ['tolls'] }),
  };
}

function destRow() {
  return {
    id: 'dest_1',
    dayDate: new Date('2026-06-01T00:00:00.000Z'),
    name: 'Oslo',
    municipality: 'Oslo',
    latitude: 59.91,
    longitude: 10.75,
    notes: null,
    isLayover: false,
    branchId: null,
  };
}

describe('GET /api/trips/[id]/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a valid export envelope as a file download', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(tripRow());
    mockPrisma.branch.findMany.mockResolvedValue([]);
    mockPrisma.dailyDestination.findMany.mockResolvedValue([destRow()]);
    mockPrisma.dailyPoi.findMany.mockResolvedValue([]);
    mockPrisma.routeSegment.findMany.mockResolvedValue([]);

    const response = await GET({} as never, {
      params: Promise.resolve({ id: 'trip_1' }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toContain('attachment');
    const body = await response.json();
    expect(body.kind).toBe('trip-planner-export');
    expect(body.data.trip.title).toBe('Norway Road Trip');
    expect(body.data.dailyDestinations).toHaveLength(1);
    expect(body.schema.version).toBeGreaterThanOrEqual(1);
  });

  it('returns 404 when the trip does not exist', async () => {
    mockPrisma.trip.findUnique.mockResolvedValue(null);

    const response = await GET({} as never, {
      params: Promise.resolve({ id: 'missing' }),
    });

    expect(response.status).toBe(404);
  });
});

describe('POST /api/trips/import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function validDocument() {
    return buildExportEnvelope({
      trip: tripRow(),
      branches: [],
      dailyDestinations: [destRow()],
      dailyPois: [],
      routeSegments: [],
    });
  }

  function makeRequest(body: unknown) {
    return new Request('http://localhost:3000/api/trips/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('imports a valid file as a new trip (201)', async () => {
    // $transaction invokes its callback with the mock prisma as tx.
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
    mockPrisma.trip.create.mockResolvedValue({ id: 'new_trip' });
    mockPrisma.dailyDestination.create.mockResolvedValue({ id: 'new_dest' });

    const response = await POST(
      makeRequest({ document: validDocument(), mode: 'new' }) as never,
    );

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.tripId).toBe('new_trip');
    expect(json.created.destinations).toBe(1);
  });

  it('rejects an unrecognized document (400)', async () => {
    const response = await POST(
      makeRequest({ document: { not: 'an export' }, mode: 'new' }) as never,
    );
    expect(response.status).toBe(400);
  });

  it('rejects a newer format version (409)', async () => {
    const doc = validDocument() as Record<string, unknown>;
    (doc as any).formatVersion = 9999;

    const response = await POST(
      makeRequest({ document: doc, mode: 'new' }) as never,
    );
    expect(response.status).toBe(409);
    const json = await response.json();
    expect(json.code).toBe('unsupported_version');
  });

  it('requires targetTripId when mode is merge (400)', async () => {
    const response = await POST(
      makeRequest({ document: validDocument(), mode: 'merge' }) as never,
    );
    expect(response.status).toBe(400);
  });

  it('rejects merge into a trip the user cannot edit (403) and never runs the import', async () => {
    vi.mocked(assertTripAccess).mockRejectedValueOnce(new AccessError(403, 'Forbidden'));
    vi.mocked(accessErrorResponse).mockImplementationOnce((e: unknown) =>
      e instanceof AccessError
        ? (new Response(JSON.stringify({ error: e.message }), {
            status: e.status,
            headers: { 'Content-Type': 'application/json' },
          }) as never)
        : null,
    );

    const response = await POST(
      makeRequest({
        document: validDocument(),
        mode: 'merge',
        targetTripId: 'cltarget0000000000000001',
      }) as never,
    );

    expect(response.status).toBe(403);
    expect(assertTripAccess).toHaveBeenCalledWith('test-user', 'cltarget0000000000000001', 'edit');
    // The import engine must never run for an unauthorized merge.
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns 404 when merge target is not found', async () => {
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
    mockPrisma.trip.findUnique.mockResolvedValue(null);

    const response = await POST(
      makeRequest({
        document: validDocument(),
        mode: 'merge',
        targetTripId: 'cltarget0000000000000001',
      }) as never,
    );

    expect(response.status).toBe(404);
  });
});
