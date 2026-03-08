import { z } from 'zod';

export const discoveryRequestSchema = z.object({
  tripId: z.string().min(1, 'tripId is required'),
});

export const discoveryBoundsRequestSchema = z.object({
  bounds: z.object({
    south: z.number().min(-90).max(90),
    west: z.number().min(-180).max(180),
    north: z.number().min(-90).max(90),
    east: z.number().min(-180).max(180),
  }),
});

export type DiscoveryRequest = z.infer<typeof discoveryRequestSchema>;

const experienceCategorySchema = z.enum([
  'natural_wonder',
  'historical',
  'culinary',
  'cultural',
  'architectural',
  'scenic',
  'experience',
]);

export const discoveredExperienceSchema = z.object({
  name: z.string().min(1),
  michelinStars: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  category: experienceCategorySchema,
  description: z.string().min(1),
  reasoning: z.string().min(1),
  approximateLat: z.number().min(-90).max(90),
  approximateLng: z.number().min(-180).max(180),
  nearestCity: z.string().min(1),
  country: z.string().min(1),
  estimatedDetourKm: z.number().min(0),
  seasonalNotes: z.string().optional(),
  sources: z.array(z.string()).optional(),
});

/** Schema for validating the ChatGPT JSON response */
export const chatGptResponseSchema = z.object({
  experiences: z.array(discoveredExperienceSchema),
});

export const discoveryResponseSchema = z.object({
  experiences: z.array(discoveredExperienceSchema),
  tokenUsage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
  }),
  cached: z.boolean(),
  aiProvider: z.enum(['chatgpt', 'claude']),
});
