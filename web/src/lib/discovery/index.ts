import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import type { DiscoveredExperience, DiscoveryResult } from './types';
import { chunkRoute, buildSystemPrompt, buildUserPrompt, buildAreaUserPrompt, type BoundsArea } from './prompt';
import { callOpenAi } from './openai';
import { getCachedDiscoveries, getCachedExperiencesNearRoute, cacheDiscoveredExperiences } from './graph';

/**
 * Haversine distance in km between two lat/lng points.
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Deduplicate experiences from overlapping chunks.
 * Two experiences are considered duplicates if they have similar names
 * and are within 5 km of each other. Keeps the one with higher stars.
 */
function deduplicateExperiences(
  experiences: DiscoveredExperience[],
): DiscoveredExperience[] {
  const result: DiscoveredExperience[] = [];

  for (const exp of experiences) {
    const duplicate = result.find(
      (existing) =>
        haversineKm(
          existing.approximateLat,
          existing.approximateLng,
          exp.approximateLat,
          exp.approximateLng,
        ) < 5 &&
        existing.name.toLowerCase().includes(exp.name.toLowerCase().slice(0, 10)),
    );

    if (duplicate) {
      // Keep the one with higher stars
      if (exp.michelinStars > duplicate.michelinStars) {
        const idx = result.indexOf(duplicate);
        result[idx] = exp;
      }
    } else {
      result.push(exp);
    }
  }

  return result;
}

/**
 * Build a stable cache key from the trip's destination coordinates.
 */
function buildQueryKey(
  destinations: Array<{ lat: number; lng: number }>,
): string {
  const coords = destinations
    .map((d) => `${d.lat.toFixed(4)},${d.lng.toFixed(4)}`)
    .join('|');
  return createHash('sha256').update(coords).digest('hex').slice(0, 16);
}

/**
 * Discover must-see experiences along a trip's route using ChatGPT.
 *
 * 1. Loads the trip's DailyDestinations and RouteSegments from Prisma
 * 2. Checks Neo4j cache for existing results
 * 3. Chunks the route and calls OpenAI for each chunk
 * 4. Deduplicates, persists to Neo4j, and returns results
 */
export async function discoverExperiences(
  tripId: string,
  apiKey: string,
): Promise<DiscoveryResult> {
  // Load trip data
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      dailyDestinations: { orderBy: { dayDate: 'asc' } },
      routeSegments: true,
    },
  });

  if (!trip) {
    throw new Error(`Trip not found: ${tripId}`);
  }

  const destinations = trip.dailyDestinations
    .filter((d) => d.latitude != null && d.longitude != null)
    .map((d) => ({
      name: d.municipality ? `${d.name}, ${d.municipality}` : d.name,
      lat: d.latitude!,
      lng: d.longitude!,
      dayDate: d.dayDate.toISOString().slice(0, 10),
    }));

  if (destinations.length < 2) {
    throw new Error('Trip needs at least 2 destinations with coordinates');
  }

  // Build cache key from destination coordinates
  const queryKey = buildQueryKey(destinations);

  // Check Neo4j cache
  const cached = await getCachedDiscoveries(queryKey);
  if (cached) {
    return {
      experiences: cached,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      cached: true,
    };
  }

  // Build segment distance map (dayDate → distance in km)
  const segmentDistances = new Map<string, number>();
  for (const seg of trip.routeSegments) {
    const dateStr = seg.dayDate.toISOString().slice(0, 10);
    segmentDistances.set(dateStr, seg.distanceMeters / 1000);
  }

  // Chunk the route
  const chunks = chunkRoute(destinations, segmentDistances);
  if (chunks.length === 0) {
    return {
      experiences: [],
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      cached: false,
    };
  }

  // Load already-cached ChatGPT experiences near this route to avoid re-researching
  const cachedNearby = await getCachedExperiencesNearRoute(destinations);
  const knownPlaces = cachedNearby.map((e) => ({ name: e.name, country: e.country }));

  // Call OpenAI for each chunk sequentially
  const systemPrompt = buildSystemPrompt();
  const allExperiences: DiscoveredExperience[] = [];
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  for (const chunk of chunks) {
    const userPrompt = buildUserPrompt(chunk, knownPlaces.length > 0 ? knownPlaces : undefined);
    const result = await callOpenAi(apiKey, systemPrompt, userPrompt);
    allExperiences.push(...result.experiences);
    totalPromptTokens += result.promptTokens;
    totalCompletionTokens += result.completionTokens;
  }

  // Deduplicate new results against each other and against cached experiences
  const deduplicated = deduplicateExperiences([...allExperiences])
    .filter((exp) =>
      !cachedNearby.some(
        (cached) =>
          haversineKm(cached.approximateLat, cached.approximateLng, exp.approximateLat, exp.approximateLng) < 5 &&
          cached.name.toLowerCase().includes(exp.name.toLowerCase().slice(0, 10)),
      ),
    );

  // Cache new discoveries in Neo4j
  if (deduplicated.length > 0) {
    await cacheDiscoveredExperiences(deduplicated, queryKey);
  }

  // Combine cached nearby + new discoveries, sort by stars then name
  const combined = [...cachedNearby, ...deduplicated];
  combined.sort((a, b) => b.michelinStars - a.michelinStars || a.name.localeCompare(b.name));

  return {
    experiences: combined,
    tokenUsage: {
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
      totalTokens: totalPromptTokens + totalCompletionTokens,
    },
    cached: false,
  };
}

/**
 * Discover must-see experiences within a map viewport (bounds) using ChatGPT.
 * Follows the same cache-avoidance pattern as the trip-based version.
 */
export async function discoverExperiencesByBounds(
  bounds: BoundsArea,
  apiKey: string,
): Promise<DiscoveryResult> {
  // Build a cache key from the rounded bounds (snap to ~0.1 degree grid)
  const roundedBounds = {
    south: Math.floor(bounds.south * 10) / 10,
    west: Math.floor(bounds.west * 10) / 10,
    north: Math.ceil(bounds.north * 10) / 10,
    east: Math.ceil(bounds.east * 10) / 10,
  };
  const queryKey = createHash('sha256')
    .update(`bounds:${roundedBounds.south},${roundedBounds.west},${roundedBounds.north},${roundedBounds.east}`)
    .digest('hex')
    .slice(0, 16);

  // Check exact cache first
  const cached = await getCachedDiscoveries(queryKey);
  if (cached) {
    return {
      experiences: cached,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      cached: true,
    };
  }

  // Build virtual destinations from bounds corners for the nearby-cache lookup
  const cornerPoints = [
    { lat: bounds.south, lng: bounds.west },
    { lat: bounds.south, lng: bounds.east },
    { lat: bounds.north, lng: bounds.west },
    { lat: bounds.north, lng: bounds.east },
  ];

  // Load already-cached ChatGPT experiences in this area
  const cachedNearby = await getCachedExperiencesNearRoute(cornerPoints, 0);
  const knownPlaces = cachedNearby.map((e) => ({ name: e.name, country: e.country }));

  // Call OpenAI
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildAreaUserPrompt(bounds, knownPlaces.length > 0 ? knownPlaces : undefined);
  const result = await callOpenAi(apiKey, systemPrompt, userPrompt);

  // Deduplicate against cached
  const deduplicated = deduplicateExperiences(result.experiences)
    .filter((exp) =>
      !cachedNearby.some(
        (c) =>
          haversineKm(c.approximateLat, c.approximateLng, exp.approximateLat, exp.approximateLng) < 5 &&
          c.name.toLowerCase().includes(exp.name.toLowerCase().slice(0, 10)),
      ),
    );

  if (deduplicated.length > 0) {
    await cacheDiscoveredExperiences(deduplicated, queryKey);
  }

  const combined = [...cachedNearby, ...deduplicated];
  combined.sort((a, b) => b.michelinStars - a.michelinStars || a.name.localeCompare(b.name));

  return {
    experiences: combined,
    tokenUsage: {
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.promptTokens + result.completionTokens,
    },
    cached: false,
  };
}
