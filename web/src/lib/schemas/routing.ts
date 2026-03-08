/**
 * Zod schemas and TypeScript types for routing and settings.
 * Location: src/lib/schemas/routing.ts
 */

import { z } from 'zod';

/** All provider IDs the system knows about. */
export const routingProviderIdSchema = z.enum(['ors', 'mapbox', 'google', 'osrm']);
export type RoutingProviderId = z.infer<typeof routingProviderIdSchema>;

// ─── Settings ────────────────────────────────────────────────────────────────

export const settingUpsertSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().min(1),
});
export type SettingUpsert = z.infer<typeof settingUpsertSchema>;

// ─── Route Waypoints ─────────────────────────────────────────────────────────

export const routeWaypointResponseSchema = z.object({
  id: z.string(),
  segmentId: z.string(),
  sequenceIndex: z.number().int().nonnegative(),
  latitude: z.number(),
  longitude: z.number(),
  targetDurationSeconds: z.number().nonnegative(),
  actualDurationSeconds: z.number().nonnegative(),
  isManual: z.boolean(),
  createdAt: z.date().or(z.string().datetime()),
  updatedAt: z.date().or(z.string().datetime()),
});
export type RouteWaypointResponse = z.infer<typeof routeWaypointResponseSchema>;

// ─── Route Segments ──────────────────────────────────────────────────────────

export const routeSegmentResponseSchema = z.object({
  id: z.string().cuid(),
  tripId: z.string().cuid(),
  dayDate: z.string(),
  fromDestinationId: z.string(),
  toDestinationId: z.string(),
  provider: z.string(),
  distanceMeters: z.number().nonnegative(),
  durationSeconds: z.number().nonnegative(),
  encodedPolyline: z.string().nullable(),
  branchId: z.string().cuid().nullable().optional(),
  waypoints: z.array(routeWaypointResponseSchema),
  createdAt: z.date().or(z.string().datetime()),
  updatedAt: z.date().or(z.string().datetime()),
});
export type RouteSegmentResponse = z.infer<typeof routeSegmentResponseSchema>;

/** POST /api/route-segments — request body */
export const routeSegmentGenerateSchema = z.object({
  tripId: z.string().cuid('tripId must be a valid CUID'),
  branchId: z.string().cuid().nullable().optional(),
});
export type RouteSegmentGenerate = z.infer<typeof routeSegmentGenerateSchema>;
