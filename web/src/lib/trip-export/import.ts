/**
 * Trip Import Engine
 * Location: src/lib/trip-export/import.ts
 *
 * Takes a validated, current-version export envelope and writes it to the
 * database in one transaction. All entity IDs are remapped to fresh values to
 * avoid collisions, and intra-file references (branchId, segment from/to
 * destination ids, nested waypoints) are rewired to the new IDs.
 *
 * Two modes:
 *  - 'new':   create a brand-new trip with all children.
 *  - 'merge': fold the import into an existing target trip, importing only days
 *             within the target's date range and skipping duplicate places.
 *
 * Device-tracking fields are never written (always left null).
 */

import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  ExportEnvelope,
  ExportBranch,
  ExportDailyDestination,
  ExportDailyPoi,
  ExportRouteSegment,
} from './format';

type TxClient = Prisma.TransactionClient;

export interface ImportOptions {
  mode: 'new' | 'merge';
  /** Required when mode is 'merge'. */
  targetTripId?: string;
  /** Owner to assign when creating a new trip (mode === 'new'). */
  ownerId?: string;
}

export interface ImportReport {
  tripId: string;
  mode: 'new' | 'merge';
  created: {
    branches: number;
    destinations: number;
    pois: number;
    segments: number;
    waypoints: number;
  };
  skipped: {
    branches: number;
    destinations: number;
    pois: number;
    segments: number;
    outOfRangeDays: number;
  };
  warnings: string[];
}

export class ImportError extends Error {
  constructor(
    message: string,
    public readonly code: 'target_not_found' | 'invalid_options',
  ) {
    super(message);
    this.name = 'ImportError';
  }
}

/** YYYY-MM-DD from a Date. */
function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Composite dedup key for a POI within a (resolved) branch. */
function poiKey(p: {
  dayDate: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  branchId: string | null;
}): string {
  return [
    p.branchId ?? 'main',
    p.dayDate,
    p.name.trim().toLowerCase(),
    p.latitude.toFixed(5),
    p.longitude.toFixed(5),
    p.category,
  ].join('|');
}

/** One-per-day-per-branch key for destinations and segments. */
function dayBranchKey(dayDate: string, branchId: string | null): string {
  return `${branchId ?? 'main'}|${dayDate}`;
}

function newReport(mode: 'new' | 'merge', tripId: string): ImportReport {
  return {
    tripId,
    mode,
    created: { branches: 0, destinations: 0, pois: 0, segments: 0, waypoints: 0 },
    skipped: {
      branches: 0,
      destinations: 0,
      pois: 0,
      segments: 0,
      outOfRangeDays: 0,
    },
    warnings: [],
  };
}

/**
 * Import a trip from a validated export envelope.
 *
 * @param prisma  A PrismaClient (the function manages its own transaction).
 * @param envelope The migrated, current-version export envelope.
 * @param options Import mode and target.
 */
export async function importTrip(
  prisma: PrismaClient,
  envelope: ExportEnvelope,
  options: ImportOptions,
): Promise<ImportReport> {
  if (options.mode === 'merge' && !options.targetTripId) {
    throw new ImportError(
      'targetTripId is required when mode is "merge".',
      'invalid_options',
    );
  }
  if (options.mode === 'new' && !options.ownerId) {
    throw new ImportError(
      'ownerId is required when mode is "new".',
      'invalid_options',
    );
  }

  return prisma.$transaction(async (tx) => {
    if (options.mode === 'new') {
      return importAsNewTrip(tx, envelope, options.ownerId);
    }
    return mergeIntoTrip(tx, envelope, options.targetTripId!);
  });
}

// ─── New trip ──────────────────────────────────────────────────────────────────

async function importAsNewTrip(
  tx: TxClient,
  envelope: ExportEnvelope,
  ownerId?: string,
): Promise<ImportReport> {
  const { data } = envelope;

  const trip = await tx.trip.create({
    data: {
      title: data.trip.title,
      description: data.trip.description ?? null,
      planMode: data.trip.planMode ?? false,
      startDate: new Date(data.trip.startDate),
      stopDate: new Date(data.trip.stopDate),
      routingPreferences: data.trip.routingPreferences
        ? JSON.stringify(data.trip.routingPreferences)
        : null,
      ownerId: ownerId as string,
    },
  });

  const report = newReport('new', trip.id);

  // Branches: create all, map old id → new id.
  const branchIdMap = new Map<string, string>();
  for (const b of data.branches) {
    const created = await tx.branch.create({
      data: {
        tripId: trip.id,
        name: b.name,
        color: b.color,
        sortOrder: b.sortOrder ?? 0,
        anchorDayDate: new Date(b.anchorDayDate),
      },
    });
    branchIdMap.set(b.id, created.id);
    report.created.branches++;
  }

  const resolveBranch = (oldId: string | null | undefined): string | null =>
    oldId ? branchIdMap.get(oldId) ?? null : null;

  // Destinations: create all, map old id → new id.
  const destIdMap = new Map<string, string>();
  for (const d of data.dailyDestinations) {
    const created = await tx.dailyDestination.create({
      data: {
        tripId: trip.id,
        dayDate: new Date(d.dayDate),
        name: d.name,
        municipality: d.municipality ?? null,
        latitude: d.latitude ?? null,
        longitude: d.longitude ?? null,
        notes: d.notes ?? null,
        isLayover: d.isLayover ?? false,
        branchId: resolveBranch(d.branchId),
      },
    });
    destIdMap.set(d.id, created.id);
    report.created.destinations++;
  }

  // POIs: bulk create.
  if (data.dailyPois.length > 0) {
    await tx.dailyPoi.createMany({
      data: data.dailyPois.map((p) => ({
        tripId: trip.id,
        dayDate: new Date(p.dayDate),
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
        notes: p.notes ?? null,
        category: p.category ?? 'poi',
        branchId: resolveBranch(p.branchId),
      })),
    });
    report.created.pois += data.dailyPois.length;
  }

  // Segments + nested waypoints.
  await createSegments(tx, trip.id, data.routeSegments, resolveBranch, destIdMap, report);

  return report;
}

// ─── Merge ───────────────────────────────────────────────────────────────────

async function mergeIntoTrip(
  tx: TxClient,
  envelope: ExportEnvelope,
  targetTripId: string,
): Promise<ImportReport> {
  const { data } = envelope;

  const target = await tx.trip.findUnique({ where: { id: targetTripId } });
  if (!target) {
    throw new ImportError('Target trip not found.', 'target_not_found');
  }

  const report = newReport('merge', targetTripId);

  const rangeStart = dateOnly(target.startDate);
  const rangeEnd = dateOnly(target.stopDate);
  const inRange = (day: string) => day >= rangeStart && day <= rangeEnd;

  // Existing branches by name (for reuse).
  const existingBranches = await tx.branch.findMany({
    where: { tripId: targetTripId },
  });
  const branchByName = new Map<string, string>();
  for (const b of existingBranches) branchByName.set(b.name, b.id);

  // Resolve branches: reuse by name, else create.
  const branchIdMap = new Map<string, string>();
  for (const b of data.branches) {
    const existingId = branchByName.get(b.name);
    if (existingId) {
      branchIdMap.set(b.id, existingId);
      report.skipped.branches++;
    } else {
      const created = await tx.branch.create({
        data: {
          tripId: targetTripId,
          name: b.name,
          color: b.color,
          sortOrder: b.sortOrder ?? 0,
          anchorDayDate: new Date(b.anchorDayDate),
        },
      });
      branchIdMap.set(b.id, created.id);
      branchByName.set(b.name, created.id);
      report.created.branches++;
    }
  }

  const resolveBranch = (oldId: string | null | undefined): string | null =>
    oldId ? branchIdMap.get(oldId) ?? null : null;

  // Pre-load existing target entities for dedup.
  const [existingDests, existingPois, existingSegments] = await Promise.all([
    tx.dailyDestination.findMany({ where: { tripId: targetTripId } }),
    tx.dailyPoi.findMany({ where: { tripId: targetTripId } }),
    tx.routeSegment.findMany({ where: { tripId: targetTripId } }),
  ]);

  const destByDayBranch = new Map<string, string>();
  for (const d of existingDests) {
    destByDayBranch.set(dayBranchKey(dateOnly(d.dayDate), d.branchId), d.id);
  }
  const existingPoiKeys = new Set<string>();
  for (const p of existingPois) {
    existingPoiKeys.add(
      poiKey({
        dayDate: dateOnly(p.dayDate),
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
        category: p.category,
        branchId: p.branchId,
      }),
    );
  }
  const existingSegmentKeys = new Set<string>();
  for (const s of existingSegments) {
    existingSegmentKeys.add(dayBranchKey(dateOnly(s.dayDate), s.branchId));
  }

  // Resolve destinations: map imported dest id → resolved target dest id
  // (whether matched-existing or newly created).
  const destIdMap = new Map<string, string>();
  for (const d of data.dailyDestinations) {
    if (!inRange(d.dayDate)) {
      report.skipped.outOfRangeDays++;
      report.skipped.destinations++;
      continue;
    }
    const resolvedBranch = resolveBranch(d.branchId);
    const key = dayBranchKey(d.dayDate, resolvedBranch);
    const existingId = destByDayBranch.get(key);
    if (existingId) {
      destIdMap.set(d.id, existingId);
      report.skipped.destinations++;
      continue;
    }
    const created = await tx.dailyDestination.create({
      data: {
        tripId: targetTripId,
        dayDate: new Date(d.dayDate),
        name: d.name,
        municipality: d.municipality ?? null,
        latitude: d.latitude ?? null,
        longitude: d.longitude ?? null,
        notes: d.notes ?? null,
        isLayover: d.isLayover ?? false,
        branchId: resolvedBranch,
      },
    });
    destByDayBranch.set(key, created.id);
    destIdMap.set(d.id, created.id);
    report.created.destinations++;
  }

  // POIs: dedup by composite key.
  for (const p of data.dailyPois) {
    if (!inRange(p.dayDate)) {
      report.skipped.outOfRangeDays++;
      report.skipped.pois++;
      continue;
    }
    const resolvedBranch = resolveBranch(p.branchId);
    const key = poiKey({
      dayDate: p.dayDate,
      name: p.name,
      latitude: p.latitude,
      longitude: p.longitude,
      category: p.category ?? 'poi',
      branchId: resolvedBranch,
    });
    if (existingPoiKeys.has(key)) {
      report.skipped.pois++;
      continue;
    }
    await tx.dailyPoi.create({
      data: {
        tripId: targetTripId,
        dayDate: new Date(p.dayDate),
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
        notes: p.notes ?? null,
        category: p.category ?? 'poi',
        branchId: resolvedBranch,
      },
    });
    existingPoiKeys.add(key);
    report.created.pois++;
  }

  // Segments: dedup by (branch, day); skip duplicates, else create + waypoints.
  for (const s of data.routeSegments) {
    if (!inRange(s.dayDate)) {
      report.skipped.outOfRangeDays++;
      report.skipped.segments++;
      continue;
    }
    const resolvedBranch = resolveBranch(s.branchId);
    const key = dayBranchKey(s.dayDate, resolvedBranch);
    if (existingSegmentKeys.has(key)) {
      report.skipped.segments++;
      continue;
    }
    await createOneSegment(tx, targetTripId, s, resolvedBranch, destIdMap, report);
    existingSegmentKeys.add(key);
  }

  return report;
}

// ─── Shared segment creation ───────────────────────────────────────────────────

async function createSegments(
  tx: TxClient,
  tripId: string,
  segments: ExportRouteSegment[],
  resolveBranch: (oldId: string | null | undefined) => string | null,
  destIdMap: Map<string, string>,
  report: ImportReport,
): Promise<void> {
  for (const s of segments) {
    await createOneSegment(tx, tripId, s, resolveBranch(s.branchId), destIdMap, report);
  }
}

async function createOneSegment(
  tx: TxClient,
  tripId: string,
  s: ExportRouteSegment,
  resolvedBranch: string | null,
  destIdMap: Map<string, string>,
  report: ImportReport,
): Promise<void> {
  // Rewire from/to destination references to the resolved destination IDs.
  // Fall back to the original value if the referenced destination isn't part
  // of this import (keeps behavior consistent with how the source stored it).
  const fromId = destIdMap.get(s.fromDestinationId) ?? s.fromDestinationId;
  const toId = destIdMap.get(s.toDestinationId) ?? s.toDestinationId;

  const segment = await tx.routeSegment.create({
    data: {
      tripId,
      dayDate: new Date(s.dayDate),
      fromDestinationId: fromId,
      toDestinationId: toId,
      provider: s.provider,
      distanceMeters: s.distanceMeters,
      durationSeconds: s.durationSeconds,
      encodedPolyline: s.encodedPolyline ?? null,
      branchId: resolvedBranch,
    },
  });
  report.created.segments++;

  if (s.waypoints.length > 0) {
    await tx.routeWaypoint.createMany({
      data: s.waypoints.map((w) => ({
        segmentId: segment.id,
        sequenceIndex: w.sequenceIndex,
        latitude: w.latitude,
        longitude: w.longitude,
        targetDurationSeconds: w.targetDurationSeconds,
        actualDurationSeconds: w.actualDurationSeconds,
        isManual: w.isManual ?? false,
      })),
    });
    report.created.waypoints += s.waypoints.length;
  }
}

// Re-export entity types for callers/tests.
export type {
  ExportBranch,
  ExportDailyDestination,
  ExportDailyPoi,
  ExportRouteSegment,
};
