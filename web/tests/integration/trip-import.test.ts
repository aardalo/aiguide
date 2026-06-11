/**
 * Integration tests for the trip import engine (src/lib/trip-export/import.ts).
 *
 * Uses a lightweight in-memory fake of the Prisma client so the engine's
 * ID remapping, dedup, and date-range logic can be exercised without a DB.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { importTrip, ImportError } from '@/lib/trip-export/import';
import { migrateToCurrent } from '@/lib/trip-export/migrations';
import {
  buildExportEnvelope,
  type SerializeInput,
} from '@/lib/trip-export/serialize';
import type { ExportEnvelope } from '@/lib/trip-export/format';

// ─── In-memory fake Prisma ──────────────────────────────────────────────────────

interface Row {
  id: string;
  [key: string]: unknown;
}

class FakeTable {
  rows: Row[] = [];
  private seq = 0;
  constructor(private prefix: string) {}

  private nextId() {
    this.seq += 1;
    return `${this.prefix}_${this.seq}`;
  }

  create({ data }: { data: Record<string, unknown> }) {
    const row: Row = { id: this.nextId(), ...data };
    this.rows.push(row);
    return Promise.resolve(row);
  }

  createMany({ data }: { data: Record<string, unknown>[] }) {
    for (const d of data) this.rows.push({ id: this.nextId(), ...d });
    return Promise.resolve({ count: data.length });
  }

  findMany({ where }: { where?: Record<string, unknown> } = {}) {
    if (!where) return Promise.resolve([...this.rows]);
    return Promise.resolve(
      this.rows.filter((r) =>
        Object.entries(where).every(([k, v]) => r[k] === v),
      ),
    );
  }

  findUnique({ where }: { where: { id: string } }) {
    return Promise.resolve(this.rows.find((r) => r.id === where.id) ?? null);
  }
}

class FakeDb {
  trip = new FakeTable('trip');
  branch = new FakeTable('branch');
  dailyDestination = new FakeTable('dest');
  dailyPoi = new FakeTable('poi');
  routeSegment = new FakeTable('seg');
  routeWaypoint = new FakeTable('wp');

  $transaction<T>(cb: (tx: FakeDb) => Promise<T>): Promise<T> {
    return cb(this);
  }

  /** Seed an existing trip (dates as Date for the merge range logic). */
  seedTrip(id: string, startDate: string, stopDate: string) {
    this.trip.rows.push({
      id,
      title: 'Existing Trip',
      description: null,
      startDate: new Date(startDate),
      stopDate: new Date(stopDate),
      planMode: false,
      routingPreferences: null,
    });
  }
}

// ─── Fixtures ───────────────────────────────────────────────────────────────────

function sampleInput(): SerializeInput {
  return {
    trip: {
      id: 'trip_src',
      title: 'Norway Road Trip',
      description: 'Scenic',
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      stopDate: new Date('2026-06-03T00:00:00.000Z'),
      planMode: false,
      routingPreferences: JSON.stringify({ avoid: ['tolls'] }),
    },
    branches: [
      {
        id: 'branch_src',
        name: 'Coastal detour',
        color: '#ff0000',
        sortOrder: 1,
        anchorDayDate: new Date('2026-06-02T00:00:00.000Z'),
      },
    ],
    dailyDestinations: [
      {
        id: 'dest_a',
        dayDate: new Date('2026-06-01T00:00:00.000Z'),
        name: 'Oslo',
        municipality: 'Oslo',
        latitude: 59.91,
        longitude: 10.75,
        notes: null,
        isLayover: false,
        branchId: null,
      },
      {
        id: 'dest_b',
        dayDate: new Date('2026-06-02T00:00:00.000Z'),
        name: 'Bergen',
        municipality: 'Bergen',
        latitude: 60.39,
        longitude: 5.32,
        notes: null,
        isLayover: false,
        branchId: null,
      },
    ],
    dailyPois: [
      {
        id: 'poi_a',
        dayDate: new Date('2026-06-01T00:00:00.000Z'),
        name: 'Vigeland Park',
        latitude: 59.927,
        longitude: 10.7,
        notes: null,
        category: 'poi',
        branchId: null,
      },
    ],
    routeSegments: [
      {
        id: 'seg_a',
        dayDate: new Date('2026-06-02T00:00:00.000Z'),
        fromDestinationId: 'dest_a',
        toDestinationId: 'dest_b',
        provider: 'osrm',
        distanceMeters: 463000,
        durationSeconds: 25200,
        encodedPolyline: 'abc',
        branchId: null,
        waypoints: [
          {
            id: 'wp_a',
            sequenceIndex: 0,
            latitude: 59.95,
            longitude: 9.0,
            targetDurationSeconds: 0,
            actualDurationSeconds: 0,
            isManual: false,
          },
        ],
      },
    ],
  };
}

function sampleEnvelope(): ExportEnvelope {
  // Round-trip through migrateToCurrent to mirror the real import path.
  return migrateToCurrent(buildExportEnvelope(sampleInput())).envelope;
}

describe('importTrip — new mode', () => {
  let db: FakeDb;
  beforeEach(() => {
    db = new FakeDb();
  });

  it('creates a brand-new trip with all children', async () => {
    const report = await importTrip(
      db as never,
      sampleEnvelope(),
      { mode: 'new', ownerId: 'test-owner' },
    );

    expect(report.mode).toBe('new');
    expect(db.trip.rows).toHaveLength(1);
    expect(report.created.branches).toBe(1);
    expect(report.created.destinations).toBe(2);
    expect(report.created.pois).toBe(1);
    expect(report.created.segments).toBe(1);
    expect(report.created.waypoints).toBe(1);
  });

  it('remaps segment from/to destination references to the new IDs', async () => {
    await importTrip(db as never, sampleEnvelope(), { mode: 'new', ownerId: 'test-owner' });

    const seg = db.routeSegment.rows[0];
    const destIds = db.dailyDestination.rows.map((r) => r.id);
    // from/to must point at freshly-created destination IDs, not the source IDs.
    expect(destIds).toContain(seg.fromDestinationId);
    expect(destIds).toContain(seg.toDestinationId);
    expect(seg.fromDestinationId).not.toBe('dest_a');
    expect(seg.toDestinationId).not.toBe('dest_b');
  });

  it('stringifies routing preferences and stores dates', async () => {
    await importTrip(db as never, sampleEnvelope(), { mode: 'new', ownerId: 'test-owner' });
    const trip = db.trip.rows[0];
    expect(trip.routingPreferences).toBe(JSON.stringify({ avoid: ['tolls'] }));
    expect(trip.startDate).toBeInstanceOf(Date);
  });
});

describe('importTrip — merge mode', () => {
  let db: FakeDb;
  beforeEach(() => {
    db = new FakeDb();
  });

  it('throws target_not_found when the target trip is missing', async () => {
    await expect(
      importTrip(db as never, sampleEnvelope(), {
        mode: 'merge',
        targetTripId: 'missing',
      }),
    ).rejects.toBeInstanceOf(ImportError);
  });

  it('throws invalid_options when targetTripId is omitted', async () => {
    await expect(
      importTrip(db as never, sampleEnvelope(), { mode: 'merge' }),
    ).rejects.toMatchObject({ code: 'invalid_options' });
  });

  it('merges in-range days into an existing trip', async () => {
    db.seedTrip('target_1', '2026-06-01', '2026-06-03');

    const report = await importTrip(db as never, sampleEnvelope(), {
      mode: 'merge',
      targetTripId: 'target_1',
    });

    expect(report.mode).toBe('merge');
    expect(report.tripId).toBe('target_1');
    expect(report.created.destinations).toBe(2);
    expect(report.created.pois).toBe(1);
    expect(report.created.segments).toBe(1);
    // No new trip should be created.
    expect(db.trip.rows).toHaveLength(1);
  });

  it('skips days outside the target trip range', async () => {
    // Target only covers the first day.
    db.seedTrip('target_1', '2026-06-01', '2026-06-01');

    const report = await importTrip(db as never, sampleEnvelope(), {
      mode: 'merge',
      targetTripId: 'target_1',
    });

    expect(report.created.destinations).toBe(1); // only Oslo (06-01)
    expect(report.skipped.outOfRangeDays).toBeGreaterThan(0);
    // Bergen (06-02) and its segment are out of range.
    expect(report.created.segments).toBe(0);
  });

  it('skips duplicate destinations and places on re-merge', async () => {
    db.seedTrip('target_1', '2026-06-01', '2026-06-03');

    // First merge populates the trip.
    await importTrip(db as never, sampleEnvelope(), {
      mode: 'merge',
      targetTripId: 'target_1',
    });

    // Second merge of the same file should add nothing.
    const second = await importTrip(db as never, sampleEnvelope(), {
      mode: 'merge',
      targetTripId: 'target_1',
    });

    expect(second.created.destinations).toBe(0);
    expect(second.created.pois).toBe(0);
    expect(second.created.segments).toBe(0);
    expect(second.skipped.destinations).toBe(2);
    expect(second.skipped.pois).toBe(1);
    expect(second.skipped.segments).toBe(1);
  });

  it('reuses an existing branch with the same name', async () => {
    db.seedTrip('target_1', '2026-06-01', '2026-06-03');
    // Pre-create a branch with the same name as the import.
    db.branch.rows.push({
      id: 'existing_branch',
      tripId: 'target_1',
      name: 'Coastal detour',
      color: '#00ff00',
      sortOrder: 0,
      anchorDayDate: new Date('2026-06-02'),
    });

    const report = await importTrip(db as never, sampleEnvelope(), {
      mode: 'merge',
      targetTripId: 'target_1',
    });

    expect(report.created.branches).toBe(0);
    expect(report.skipped.branches).toBe(1);
    // Still only the one pre-existing branch row.
    expect(db.branch.rows).toHaveLength(1);
  });
});
