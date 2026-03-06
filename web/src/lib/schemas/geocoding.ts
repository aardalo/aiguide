/**
 * Zod schemas and TypeScript types for geocoding.
 * Location: src/lib/schemas/geocoding.ts
 */

import { z } from 'zod';

export const geocodeQuerySchema = z.object({
  q: z.string().min(1, 'Query is required').max(500),
  limit: z.coerce.number().min(1).max(10).default(5).optional(),
});

export const placeResultSchema = z.object({
  placeId: z.string(),
  name: z.string(),
  displayName: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  type: z.string(),
  importance: z.number(),
});

export type PlaceResult = z.infer<typeof placeResultSchema>;
