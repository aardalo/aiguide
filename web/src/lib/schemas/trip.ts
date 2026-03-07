/**
 * Shared Zod validation schemas for Trip entity
 * Location: src/lib/schemas/trip.ts
 * Task: TASK-003, TASK-005
 * 
 * These schemas are used by:
 * - API endpoints (server-side validation)
 * - React forms (client-side validation)
 * - Type generation (TypeScript types from Zod)
 */

import { z } from "zod";

/**
 * Base Trip schema object (without refinements) - for reuse
 */
export const routingPreferencesSchema = z.object({
  avoid: z.array(z.enum(['ferries', 'motorways', 'tolls', 'unpavedRoads'])).optional(),
}).optional();
export type RoutingPreferences = z.infer<typeof routingPreferencesSchema>;

const tripBaseSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or less")
    .optional()
    .or(z.literal("")),
  planMode: z.boolean().optional(),
  routingPreferences: routingPreferencesSchema,
  startDate: z
    .string()
    .date("Start date must be a valid date (YYYY-MM-DD)")
    .describe("Trip start date in YYYY-MM-DD format"),
  stopDate: z
    .string()
    .date("Stop date must be a valid date (YYYY-MM-DD)")
    .describe("Trip stop date in YYYY-MM-DD format"),
});

/**
 * Trip creation schema - includes date validation refinement
 */
export const tripCreateSchema = tripBaseSchema.refine(
  (data) => new Date(data.stopDate) >= new Date(data.startDate),
  {
    message: "Stop date must be equal to or after the start date",
    path: ["stopDate"],
  }
);

/**
 * Partial Trip schema - used for updates (applied before refinement)
 */
export const tripUpdateSchema = tripBaseSchema.partial().refine(
  (data) => {
    // Only validate date range if both dates are provided
    if (data.startDate && data.stopDate) {
      return new Date(data.stopDate) >= new Date(data.startDate);
    }
    return true;
  },
  {
    message: "Stop date must be equal to or after the start date",
    path: ["stopDate"],
  }
);

/**
 * Trip response schema - what API returns
 */
export const tripResponseSchema = tripBaseSchema.extend({
  id: z.string().cuid(),
  description: z.string().nullable(),
  planMode: z.boolean(),
  routingPreferences: routingPreferencesSchema.or(z.null()).optional(),
  createdAt: z.date().or(z.string().datetime()),
  updatedAt: z.date().or(z.string().datetime()),
});

/**
 * Trip list response schema
 */
export const tripListSchema = z.array(tripResponseSchema);

/**
 * Daily Destination Schemas
 */

const dailyDestinationBaseSchema = z.object({
  dayDate: z
    .string()
    .date("Day date must be a valid date (YYYY-MM-DD)")
    .describe("Date of the daily destination"),
  name: z
    .string()
    .min(1, "Destination name is required")
    .max(200, "Name must be 200 characters or less"),
  municipality: z.string().max(200).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  notes: z
    .string()
    .max(1000, "Notes must be 1000 characters or less")
    .nullable()
    .optional(),
});

/**
 * Daily destination creation schema - used for POST
 */
export const dailyDestinationCreateSchema = dailyDestinationBaseSchema;

/**
 * Daily destination update schema - used for PATCH
 */
export const dailyDestinationUpdateSchema = dailyDestinationBaseSchema.partial();

/**
 * Daily destination response schema - what API returns
 * Note: dayDate in response is a date string (from Prisma), not the input format
 */
export const dailyDestinationResponseSchema = z.object({
  id: z.string().cuid(),
  tripId: z.string().cuid(),
  dayDate: z.string(),
  name: z
    .string()
    .min(1, "Destination name is required")
    .max(200, "Name must be 200 characters or less"),
  municipality: z.string().max(200).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  notes: z.string().max(1000, "Notes must be 1000 characters or less").nullable(),
  createdAt: z.date().or(z.string().datetime()),
  updatedAt: z.date().or(z.string().datetime()),
});

/**
 * Daily destination list schema
 */
export const dailyDestinationListSchema = z.array(
  dailyDestinationResponseSchema
);

/**
 * TypeScript types derived from Zod schemas
 */
export type TripCreate = z.infer<typeof tripCreateSchema>;
export type TripUpdate = z.infer<typeof tripUpdateSchema>;
export type TripResponse = z.infer<typeof tripResponseSchema>;
export type TripList = z.infer<typeof tripListSchema>;
export type DailyDestinationCreate = z.infer<
  typeof dailyDestinationCreateSchema
>;
export type DailyDestinationUpdate = z.infer<
  typeof dailyDestinationUpdateSchema
>;
export type DailyDestinationResponse = z.infer<
  typeof dailyDestinationResponseSchema
>;
export type DailyDestinationList = z.infer<typeof dailyDestinationListSchema>;

/**
 * Daily POI Schemas
 */

export const dailyPoiCreateSchema = z.object({
  tripId: z.string().cuid(),
  dayDate: z.string().date("Day date must be a valid date (YYYY-MM-DD)"),
  name: z.string().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  notes: z.string().max(1000).nullable().optional(),
  category: z.enum(['poi', 'parkup']).default('poi'),
});

export const dailyPoiResponseSchema = z.object({
  id: z.string().cuid(),
  tripId: z.string().cuid(),
  dayDate: z.string(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  notes: z.string().nullable(),
  category: z.string().default('poi'),
  createdAt: z.date().or(z.string().datetime()),
  updatedAt: z.date().or(z.string().datetime()),
});

export type DailyPoiCreate = z.infer<typeof dailyPoiCreateSchema>;
export type DailyPoiResponse = z.infer<typeof dailyPoiResponseSchema>;

/**
 * Validation helper functions
 */
export const validateTripCreate = (data: unknown) => {
  return tripCreateSchema.safeParse(data);
};

export const validateTripUpdate = (data: unknown) => {
  return tripUpdateSchema.safeParse(data);
};

/**
 * Date validation helper
 */
export const isValidDateRange = (
  startDate: string,
  stopDate: string
): { valid: boolean; error?: string } => {
  try {
    const start = new Date(startDate);
    const stop = new Date(stopDate);
    
    // Check for invalid dates
    if (isNaN(start.getTime()) || isNaN(stop.getTime())) {
      return { valid: false, error: "Invalid date format" };
    }
    
    if (stop < start) {
      return {
        valid: false,
        error: "Stop date must be equal to or after the start date",
      };
    }
    
    return { valid: true };
  } catch (e) {
    return { valid: false, error: "Date parsing error" };
  }
};
