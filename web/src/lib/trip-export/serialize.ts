/**
 * Trip Export Serializer
 * Location: src/lib/trip-export/serialize.ts
 *
 * Converts raw Prisma trip rows (the same shape the full-sync query produces)
 * into a versioned export envelope. Strips device-tracking and audit fields and
 * normalizes dates to YYYY-MM-DD calendar strings.
 */

import {
  CURRENT_EXPORT_VERSION,
  EXPORT_KIND,
  buildSchemaDescriptor,
  type ExportEnvelope,
} from './format';

/** Convert a Prisma Date (or ISO string) to a YYYY-MM-DD calendar string. */
function toDateOnly(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString().slice(0, 10);
}

/** Minimal shapes accepted from the database layer (extra fields are ignored). */
interface DbTrip {
  id: string;
  title: string;
  description: string | null;
  startDate: Date | string;
  stopDate: Date | string;
  planMode: boolean;
  /** Stored as a JSON string in the DB, or already-parsed object. */
  routingPreferences: string | Record<string, unknown> | null;
}

interface DbBranch {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  anchorDayDate: Date | string;
}

interface DbDailyDestination {
  id: string;
  dayDate: Date | string;
  name: string;
  municipality: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  isLayover: boolean;
  branchId: string | null;
}

interface DbDailyPoi {
  id: string;
  dayDate: Date | string;
  name: string;
  latitude: number;
  longitude: number;
  notes: string | null;
  category: string;
  branchId: string | null;
}

interface DbRouteWaypoint {
  id: string;
  sequenceIndex: number;
  latitude: number;
  longitude: number;
  targetDurationSeconds: number;
  actualDurationSeconds: number;
  isManual: boolean;
}

interface DbRouteSegment {
  id: string;
  dayDate: Date | string;
  fromDestinationId: string;
  toDestinationId: string;
  provider: string;
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string | null;
  branchId: string | null;
  waypoints: DbRouteWaypoint[];
}

export interface SerializeInput {
  trip: DbTrip;
  branches: DbBranch[];
  dailyDestinations: DbDailyDestination[];
  dailyPois: DbDailyPoi[];
  routeSegments: DbRouteSegment[];
}

function parseRoutingPreferences(
  value: DbTrip['routingPreferences'],
): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

/**
 * Build a current-version export envelope from raw trip rows.
 */
export function buildExportEnvelope(input: SerializeInput): ExportEnvelope {
  const { trip, branches, dailyDestinations, dailyPois, routeSegments } = input;

  return {
    formatVersion: CURRENT_EXPORT_VERSION,
    kind: EXPORT_KIND,
    exportedAt: new Date().toISOString(),
    app: { name: 'trip-planner' },
    schema: buildSchemaDescriptor(),
    data: {
      trip: {
        id: trip.id,
        title: trip.title,
        description: trip.description,
        startDate: toDateOnly(trip.startDate),
        stopDate: toDateOnly(trip.stopDate),
        planMode: trip.planMode,
        routingPreferences: parseRoutingPreferences(trip.routingPreferences),
      },
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        color: b.color,
        sortOrder: b.sortOrder,
        anchorDayDate: toDateOnly(b.anchorDayDate),
      })),
      dailyDestinations: dailyDestinations.map((d) => ({
        id: d.id,
        dayDate: toDateOnly(d.dayDate),
        name: d.name,
        municipality: d.municipality,
        latitude: d.latitude,
        longitude: d.longitude,
        notes: d.notes,
        isLayover: d.isLayover,
        branchId: d.branchId,
      })),
      dailyPois: dailyPois.map((p) => ({
        id: p.id,
        dayDate: toDateOnly(p.dayDate),
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
        notes: p.notes,
        category: p.category,
        branchId: p.branchId,
      })),
      routeSegments: routeSegments.map((s) => ({
        id: s.id,
        dayDate: toDateOnly(s.dayDate),
        fromDestinationId: s.fromDestinationId,
        toDestinationId: s.toDestinationId,
        provider: s.provider,
        distanceMeters: s.distanceMeters,
        durationSeconds: s.durationSeconds,
        encodedPolyline: s.encodedPolyline,
        branchId: s.branchId,
        waypoints: s.waypoints
          .slice()
          .sort((a, b) => a.sequenceIndex - b.sequenceIndex)
          .map((w) => ({
            id: w.id,
            sequenceIndex: w.sequenceIndex,
            latitude: w.latitude,
            longitude: w.longitude,
            targetDurationSeconds: w.targetDurationSeconds,
            actualDurationSeconds: w.actualDurationSeconds,
            isManual: w.isManual,
          })),
      })),
    },
  };
}

/** Build a safe download filename for a trip export. */
export function buildExportFilename(title: string, date = new Date()): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'trip';
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `trip-${slug}-${stamp}.json`;
}
