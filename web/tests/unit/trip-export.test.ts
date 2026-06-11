/**
 * Unit tests for the trip-export format, serializer, and migration framework.
 */

import { describe, it, expect } from 'vitest';
import {
  buildExportEnvelope,
  buildExportFilename,
  type SerializeInput,
} from '@/lib/trip-export/serialize';
import {
  migrateToCurrent,
  ImportFormatError,
} from '@/lib/trip-export/migrations';
import {
  CURRENT_EXPORT_VERSION,
  EXPORT_KIND,
} from '@/lib/trip-export/format';

function sampleInput(): SerializeInput {
  return {
    trip: {
      id: 'trip_1',
      title: 'Norway Road Trip',
      description: 'A scenic drive',
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      stopDate: new Date('2026-06-03T00:00:00.000Z'),
      planMode: false,
      routingPreferences: JSON.stringify({ avoid: ['tolls'] }),
    },
    branches: [
      {
        id: 'branch_1',
        name: 'Coastal detour',
        color: '#ff0000',
        sortOrder: 1,
        anchorDayDate: new Date('2026-06-02T00:00:00.000Z'),
      },
    ],
    dailyDestinations: [
      {
        id: 'dest_1',
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
        id: 'dest_2',
        dayDate: new Date('2026-06-02T00:00:00.000Z'),
        name: 'Bergen',
        municipality: 'Bergen',
        latitude: 60.39,
        longitude: 5.32,
        notes: 'Fjord city',
        isLayover: false,
        branchId: null,
      },
    ],
    dailyPois: [
      {
        id: 'poi_1',
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
        id: 'seg_1',
        dayDate: new Date('2026-06-02T00:00:00.000Z'),
        fromDestinationId: 'dest_1',
        toDestinationId: 'dest_2',
        provider: 'osrm',
        distanceMeters: 463000,
        durationSeconds: 25200,
        encodedPolyline: 'abc123',
        branchId: null,
        waypoints: [
          {
            id: 'wp_2',
            sequenceIndex: 1,
            latitude: 60.1,
            longitude: 7.0,
            targetDurationSeconds: 0,
            actualDurationSeconds: 0,
            isManual: true,
          },
          {
            id: 'wp_1',
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

describe('buildExportEnvelope', () => {
  it('produces a current-version envelope with self-describing schema', () => {
    const env = buildExportEnvelope(sampleInput());
    expect(env.formatVersion).toBe(CURRENT_EXPORT_VERSION);
    expect(env.kind).toBe(EXPORT_KIND);
    expect(env.schema.version).toBe(CURRENT_EXPORT_VERSION);
    expect(env.schema.entities.trip.fields.title).toBeDefined();
  });

  it('normalizes dates to YYYY-MM-DD and parses routing preferences', () => {
    const env = buildExportEnvelope(sampleInput());
    expect(env.data.trip.startDate).toBe('2026-06-01');
    expect(env.data.trip.stopDate).toBe('2026-06-03');
    expect(env.data.trip.routingPreferences).toEqual({ avoid: ['tolls'] });
    expect(env.data.dailyDestinations[0].dayDate).toBe('2026-06-01');
  });

  it('sorts waypoints by sequenceIndex', () => {
    const env = buildExportEnvelope(sampleInput());
    const wps = env.data.routeSegments[0].waypoints;
    expect(wps.map((w) => w.sequenceIndex)).toEqual([0, 1]);
  });

  it('preserves entity IDs for FK remapping on import', () => {
    const env = buildExportEnvelope(sampleInput());
    expect(env.data.dailyDestinations[0].id).toBe('dest_1');
    expect(env.data.routeSegments[0].fromDestinationId).toBe('dest_1');
    expect(env.data.routeSegments[0].toDestinationId).toBe('dest_2');
  });
});

describe('buildExportFilename', () => {
  it('slugifies the title and stamps the date', () => {
    const name = buildExportFilename(
      'Norway Road Trip!',
      new Date('2026-06-01T12:00:00.000Z'),
    );
    expect(name).toBe('trip-norway-road-trip-20260601.json');
  });

  it('falls back to "trip" for empty titles', () => {
    const name = buildExportFilename('', new Date('2026-06-01T00:00:00.000Z'));
    expect(name).toBe('trip-trip-20260601.json');
  });
});

describe('migrateToCurrent', () => {
  it('accepts a valid current-version export round-trip', () => {
    const env = buildExportEnvelope(sampleInput());
    const result = migrateToCurrent(env);
    expect(result.envelope.formatVersion).toBe(CURRENT_EXPORT_VERSION);
    expect(result.appliedVersions).toEqual([CURRENT_EXPORT_VERSION]);
    expect(result.warnings).toEqual([]);
    expect(result.envelope.data.trip.title).toBe('Norway Road Trip');
  });

  it('refreshes the schema descriptor and drops unknown legacy fields', () => {
    const env = buildExportEnvelope(sampleInput()) as Record<string, unknown>;
    // Inject a stale/legacy top-level field and a legacy entity field.
    (env as any).legacyTopLevel = 'should be dropped';
    (env as any).data.trip.legacyField = 'should be dropped';

    const result = migrateToCurrent(env);
    expect((result.envelope as any).legacyTopLevel).toBeUndefined();
    expect((result.envelope.data.trip as any).legacyField).toBeUndefined();
    expect(result.envelope.schema.version).toBe(CURRENT_EXPORT_VERSION);
  });

  it('rejects a document that is not an export', () => {
    expect(() => migrateToCurrent({ hello: 'world' })).toThrowError(
      ImportFormatError,
    );
    try {
      migrateToCurrent({ hello: 'world' });
    } catch (e) {
      expect((e as ImportFormatError).code).toBe('not_an_export');
    }
  });

  it('rejects a file from a newer app version', () => {
    const env = buildExportEnvelope(sampleInput()) as Record<string, unknown>;
    (env as any).formatVersion = CURRENT_EXPORT_VERSION + 1;
    try {
      migrateToCurrent(env);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ImportFormatError);
      expect((e as ImportFormatError).code).toBe('unsupported_version');
    }
  });

  it('fails validation for a malformed data section', () => {
    const env = buildExportEnvelope(sampleInput()) as Record<string, unknown>;
    (env as any).data.trip.title = 12345; // wrong type
    try {
      migrateToCurrent(env);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ImportFormatError);
      expect((e as ImportFormatError).code).toBe('validation_failed');
    }
  });
});
