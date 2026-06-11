/**
 * Trip Export/Import Format Definitions
 * Location: src/lib/trip-export/format.ts
 *
 * Defines the versioned JSON envelope used to export and import trips.
 *
 * The envelope carries BOTH:
 *  - `formatVersion`: an integer that drives the import migration chain, and
 *  - `schema`: a self-describing descriptor of every entity/field, so the file
 *    documents its own shape and can be inspected without the app code.
 *
 * Device-tracking fields (lastModifiedByDeviceId and device relations) are
 * never part of the export and are always nulled on import.
 */

import { z } from 'zod';

/**
 * Current export format version. Increment this whenever the export `data`
 * shape changes, and add a migration step in migrations.ts that upgrades the
 * previous version to the new one.
 */
export const CURRENT_EXPORT_VERSION = 1;

/** Discriminator string identifying our export files. */
export const EXPORT_KIND = 'trip-planner-export' as const;

// ─── Date helpers ────────────────────────────────────────────────────────────

/** YYYY-MM-DD calendar date string. */
const dateOnlyString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a YYYY-MM-DD date');

// ─── Routing preferences (mirrors src/lib/schemas/trip.ts) ─────────────────────

export const exportRoutingPreferencesSchema = z
  .object({
    avoid: z
      .array(z.enum(['ferries', 'motorways', 'tolls', 'unpavedRoads']))
      .optional(),
  })
  .nullable();

// ─── Entity shapes in the export `data` section ────────────────────────────────
// IDs are preserved so intra-file relationships (branchId, segment→waypoints,
// and the plain-string from/toDestinationId references) can be remapped on
// import. All audit/device fields are intentionally omitted.

export const exportTripSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  startDate: dateOnlyString,
  stopDate: dateOnlyString,
  planMode: z.boolean().default(false),
  routingPreferences: exportRoutingPreferencesSchema.optional(),
});

export const exportBranchSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  color: z.string(),
  sortOrder: z.number().int().default(0),
  anchorDayDate: dateOnlyString,
});

export const exportDailyDestinationSchema = z.object({
  id: z.string(),
  dayDate: dateOnlyString,
  name: z.string().min(1).max(200),
  municipality: z.string().max(200).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  notes: z.string().nullable().optional(),
  isLayover: z.boolean().default(false),
  branchId: z.string().nullable().optional(),
});

export const exportDailyPoiSchema = z.object({
  id: z.string(),
  dayDate: dateOnlyString,
  name: z.string().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  notes: z.string().nullable().optional(),
  category: z.string().default('poi'),
  branchId: z.string().nullable().optional(),
});

export const exportRouteWaypointSchema = z.object({
  id: z.string(),
  sequenceIndex: z.number().int().nonnegative(),
  latitude: z.number(),
  longitude: z.number(),
  targetDurationSeconds: z.number().nonnegative(),
  actualDurationSeconds: z.number().nonnegative(),
  isManual: z.boolean().default(false),
});

export const exportRouteSegmentSchema = z.object({
  id: z.string(),
  dayDate: dateOnlyString,
  fromDestinationId: z.string(),
  toDestinationId: z.string(),
  provider: z.string(),
  distanceMeters: z.number().nonnegative(),
  durationSeconds: z.number().nonnegative(),
  encodedPolyline: z.string().nullable().optional(),
  branchId: z.string().nullable().optional(),
  waypoints: z.array(exportRouteWaypointSchema).default([]),
});

export const exportDataSchema = z.object({
  trip: exportTripSchema,
  branches: z.array(exportBranchSchema).default([]),
  dailyDestinations: z.array(exportDailyDestinationSchema).default([]),
  dailyPois: z.array(exportDailyPoiSchema).default([]),
  routeSegments: z.array(exportRouteSegmentSchema).default([]),
});

// ─── Self-describing schema descriptor ─────────────────────────────────────────

export interface FieldDescriptor {
  type: string;
  required: boolean;
  nullable?: boolean;
  description?: string;
}

export interface EntityDescriptor {
  fields: Record<string, FieldDescriptor>;
}

export interface SchemaDescriptor {
  version: number;
  entities: Record<string, EntityDescriptor>;
}

/**
 * Human/machine-readable descriptor of the export `data` shape for the current
 * version. Embedded into every export so the file is self-documenting and can
 * assist generic field mapping on import.
 */
export function buildSchemaDescriptor(): SchemaDescriptor {
  return {
    version: CURRENT_EXPORT_VERSION,
    entities: {
      trip: {
        fields: {
          id: { type: 'string', required: true },
          title: { type: 'string', required: true },
          description: { type: 'string', required: false, nullable: true },
          startDate: { type: 'date', required: true, description: 'YYYY-MM-DD' },
          stopDate: { type: 'date', required: true, description: 'YYYY-MM-DD' },
          planMode: { type: 'boolean', required: false },
          routingPreferences: {
            type: 'object',
            required: false,
            nullable: true,
            description: 'Routing avoidance preferences',
          },
        },
      },
      branch: {
        fields: {
          id: { type: 'string', required: true },
          name: { type: 'string', required: true },
          color: { type: 'string', required: true, description: 'Hex color' },
          sortOrder: { type: 'integer', required: false },
          anchorDayDate: { type: 'date', required: true, description: 'YYYY-MM-DD' },
        },
      },
      dailyDestination: {
        fields: {
          id: { type: 'string', required: true },
          dayDate: { type: 'date', required: true, description: 'YYYY-MM-DD' },
          name: { type: 'string', required: true },
          municipality: { type: 'string', required: false, nullable: true },
          latitude: { type: 'number', required: false, nullable: true },
          longitude: { type: 'number', required: false, nullable: true },
          notes: { type: 'string', required: false, nullable: true },
          isLayover: { type: 'boolean', required: false },
          branchId: {
            type: 'string',
            required: false,
            nullable: true,
            description: 'References branch.id; null = main branch',
          },
        },
      },
      dailyPoi: {
        fields: {
          id: { type: 'string', required: true },
          dayDate: { type: 'date', required: true, description: 'YYYY-MM-DD' },
          name: { type: 'string', required: true },
          latitude: { type: 'number', required: true },
          longitude: { type: 'number', required: true },
          notes: { type: 'string', required: false, nullable: true },
          category: { type: 'string', required: false, description: "'poi' | 'parkup'" },
          branchId: {
            type: 'string',
            required: false,
            nullable: true,
            description: 'References branch.id; null = main branch',
          },
        },
      },
      routeSegment: {
        fields: {
          id: { type: 'string', required: true },
          dayDate: { type: 'date', required: true, description: 'YYYY-MM-DD' },
          fromDestinationId: {
            type: 'string',
            required: true,
            description: 'References dailyDestination.id',
          },
          toDestinationId: {
            type: 'string',
            required: true,
            description: 'References dailyDestination.id',
          },
          provider: { type: 'string', required: true },
          distanceMeters: { type: 'number', required: true },
          durationSeconds: { type: 'number', required: true },
          encodedPolyline: { type: 'string', required: false, nullable: true },
          branchId: {
            type: 'string',
            required: false,
            nullable: true,
            description: 'References branch.id; null = main branch',
          },
          waypoints: {
            type: 'array',
            required: false,
            description: 'Nested routeWaypoint objects',
          },
        },
      },
      routeWaypoint: {
        fields: {
          id: { type: 'string', required: true },
          sequenceIndex: { type: 'integer', required: true },
          latitude: { type: 'number', required: true },
          longitude: { type: 'number', required: true },
          targetDurationSeconds: { type: 'number', required: true },
          actualDurationSeconds: { type: 'number', required: true },
          isManual: { type: 'boolean', required: false },
        },
      },
    },
  };
}

const schemaDescriptorSchema = z.object({
  version: z.number().int(),
  entities: z.record(
    z.object({
      fields: z.record(
        z.object({
          type: z.string(),
          required: z.boolean(),
          nullable: z.boolean().optional(),
          description: z.string().optional(),
        }),
      ),
    }),
  ),
});

// ─── Envelope ──────────────────────────────────────────────────────────────────

/**
 * Strict schema for the fully-migrated, current-version envelope. Used to
 * validate the result of the migration chain before import.
 */
export const exportEnvelopeSchema = z.object({
  formatVersion: z.literal(CURRENT_EXPORT_VERSION),
  kind: z.literal(EXPORT_KIND),
  exportedAt: z.string().datetime(),
  app: z
    .object({
      name: z.string().optional(),
      version: z.string().optional(),
    })
    .optional(),
  schema: schemaDescriptorSchema,
  data: exportDataSchema,
});

/**
 * Loose schema for the raw incoming file before migration. Only validates the
 * outer envelope identity and version so we can route it through the migration
 * chain; the `data`/`schema` payloads are migrated and strictly validated after.
 */
export const rawEnvelopeSchema = z.object({
  formatVersion: z.number().int().positive(),
  kind: z.literal(EXPORT_KIND),
  exportedAt: z.string().optional(),
  app: z.unknown().optional(),
  schema: z.unknown().optional(),
  data: z.unknown(),
});

export type ExportTrip = z.infer<typeof exportTripSchema>;
export type ExportBranch = z.infer<typeof exportBranchSchema>;
export type ExportDailyDestination = z.infer<typeof exportDailyDestinationSchema>;
export type ExportDailyPoi = z.infer<typeof exportDailyPoiSchema>;
export type ExportRouteSegment = z.infer<typeof exportRouteSegmentSchema>;
export type ExportRouteWaypoint = z.infer<typeof exportRouteWaypointSchema>;
export type ExportData = z.infer<typeof exportDataSchema>;
export type ExportEnvelope = z.infer<typeof exportEnvelopeSchema>;
export type RawEnvelope = z.infer<typeof rawEnvelopeSchema>;
