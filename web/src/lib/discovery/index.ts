import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import type { DiscoveredExperience, DiscoveryResult, AiProviderId } from './types';
import { chunkRoute, buildSystemPrompt, buildUserPrompt, buildAreaUserPrompt, type BoundsArea } from './prompt';
import { callOpenAi } from './openai';
import { callClaude } from './claude';
import { callClaudeBatch } from './claude-batch';
import { getCachedDiscoveries, getCachedExperiencesNearRoute, cacheDiscoveredExperiences, type AiProvider } from './graph';
import { searchForChunk, searchForBounds } from './searxng';
import { refineCoordinatesViaGoogle } from './geocode-refine';

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

/** Progress callback for streaming status updates to the client. */
export type ProgressCallback = (message: string) => void;

/** Options passed through from the API route to control model and batch mode. */
export interface DiscoveryOptions {
  model?: string;
  useBatch?: boolean;
  searxngBaseUrl?: string;
  googleApiKey?: string;
  onProgress?: ProgressCallback;
}

/**
 * Call the appropriate AI provider for discovery.
 */
async function callAiProvider(
  provider: AiProviderId,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  model?: string,
): Promise<{ experiences: DiscoveredExperience[]; promptTokens: number; completionTokens: number }> {
  if (provider === 'claude') {
    return callClaude(apiKey, systemPrompt, userPrompt, model);
  }
  return callOpenAi(apiKey, systemPrompt, userPrompt, model);
}

/**
 * Discover must-see experiences along a trip's route using the configured AI provider.
 *
 * 1. Loads the trip's DailyDestinations and RouteSegments from Prisma
 * 2. Checks Neo4j cache for existing results
 * 3. Chunks the route and calls the AI provider for each chunk
 * 4. Deduplicates, persists to Neo4j, and returns results
 */
export async function discoverExperiences(
  tripId: string,
  apiKey: string,
  aiProvider: AiProviderId = 'chatgpt',
  options: DiscoveryOptions = {},
): Promise<DiscoveryResult> {
  const graphProvider: AiProvider = aiProvider;

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

  // Check Neo4j cache (provider-specific)
  const cached = await getCachedDiscoveries(queryKey, graphProvider);
  if (cached) {
    return {
      experiences: cached,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      cached: true,
      aiProvider,
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
      aiProvider,
    };
  }

  // Load already-cached AI experiences near this route to avoid re-researching
  const cachedNearby = await getCachedExperiencesNearRoute(destinations);
  // Cap the exclusion list to avoid bloating the prompt (each entry ~30 tokens)
  const knownPlaces = cachedNearby.slice(0, 50).map((e) => ({ name: e.name, country: e.country }));

  const progress = options.onProgress ?? (() => {});
  const providerLabel = aiProvider === 'claude' ? 'Claude' : 'ChatGPT';
  const modelLabel = options.model || (aiProvider === 'claude' ? 'claude-sonnet-4' : 'gpt-4o');

  // Pre-fetch search results from SearXNG (if configured)
  const knownNames = knownPlaces.map((p) => p.name);
  let searchContexts: string[] = [];
  if (options.searxngBaseUrl) {
    progress(`Searching SearXNG for ${chunks.length} route chunk${chunks.length > 1 ? 's' : ''}...`);
    searchContexts = await Promise.all(
      chunks.map((chunk) => searchForChunk(options.searxngBaseUrl!, chunk, knownNames)), // eslint-disable-line @typescript-eslint/no-non-null-assertion -- checked above
    );
    const totalSearchResults = searchContexts.reduce((sum, ctx) => sum + (ctx ? ctx.split('\n').filter((l) => /^\d+\./.test(l)).length : 0), 0);
    progress(`SearXNG: ${totalSearchResults} results from ${chunks.length} chunk${chunks.length > 1 ? 's' : ''}`);
  }

  // Call AI provider for each chunk
  const systemPrompt = buildSystemPrompt();
  const allExperiences: DiscoveredExperience[] = [];
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  const knownOrUndefined = knownPlaces.length > 0 ? knownPlaces : undefined;

  if (options.useBatch && aiProvider === 'claude' && chunks.length > 0) {
    // Batch mode: submit all chunks as a single Anthropic batch
    const userPrompts = chunks.map((chunk, i) =>
      buildUserPrompt(chunk, knownOrUndefined, searchContexts[i] || undefined),
    );
    const totalChars = userPrompts.reduce((sum, p) => sum + p.length, 0) + systemPrompt.length;
    progress(`Sending ${(totalChars / 1000).toFixed(1)}k chars to ${providerLabel} batch (${modelLabel})...`);
    const result = await callClaudeBatch(apiKey, systemPrompt, userPrompts, options.model);
    allExperiences.push(...result.experiences);
    totalPromptTokens += result.promptTokens;
    totalCompletionTokens += result.completionTokens;
  } else {
    // Sequential mode
    for (let i = 0; i < chunks.length; i++) {
      const userPrompt = buildUserPrompt(chunks[i], knownOrUndefined, searchContexts[i] || undefined);
      const totalChars = userPrompt.length + systemPrompt.length;
      progress(`Sending chunk ${i + 1}/${chunks.length} (${(totalChars / 1000).toFixed(1)}k chars) to ${providerLabel} (${modelLabel})...`);
      const result = await callAiProvider(aiProvider, apiKey, systemPrompt, userPrompt, options.model);
      allExperiences.push(...result.experiences);
      totalPromptTokens += result.promptTokens;
      totalCompletionTokens += result.completionTokens;
    }
  }

  // Deduplicate new results against each other and against cached experiences
  let deduplicated = deduplicateExperiences([...allExperiences])
    .filter((exp) =>
      !cachedNearby.some(
        (cached) =>
          haversineKm(cached.approximateLat, cached.approximateLng, exp.approximateLat, exp.approximateLng) < 5 &&
          cached.name.toLowerCase().includes(exp.name.toLowerCase().slice(0, 10)),
      ),
    );

  // Refine coordinates via Google Places (if key configured)
  if (options.googleApiKey && deduplicated.length > 0) {
    const { refined } = await refineCoordinatesViaGoogle(deduplicated, options.googleApiKey, progress);
    deduplicated = refined;
  }

  // Cache new discoveries in Neo4j (tagged with the provider)
  if (deduplicated.length > 0) {
    await cacheDiscoveredExperiences(deduplicated, queryKey, graphProvider);
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
    aiProvider,
  };
}

/**
 * Discover must-see experiences within a map viewport (bounds) using the configured AI provider.
 * Follows the same cache-avoidance pattern as the trip-based version.
 */
export async function discoverExperiencesByBounds(
  bounds: BoundsArea,
  apiKey: string,
  aiProvider: AiProviderId = 'chatgpt',
  options: DiscoveryOptions = {},
): Promise<DiscoveryResult> {
  const graphProvider: AiProvider = aiProvider;

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

  // Check exact cache first (provider-specific)
  const cached = await getCachedDiscoveries(queryKey, graphProvider);
  if (cached) {
    return {
      experiences: cached,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      cached: true,
      aiProvider,
    };
  }

  // Build virtual destinations from bounds corners for the nearby-cache lookup
  const cornerPoints = [
    { lat: bounds.south, lng: bounds.west },
    { lat: bounds.south, lng: bounds.east },
    { lat: bounds.north, lng: bounds.west },
    { lat: bounds.north, lng: bounds.east },
  ];

  // Load already-cached AI experiences in this area
  const cachedNearby = await getCachedExperiencesNearRoute(cornerPoints, 0);
  const knownPlaces = cachedNearby.slice(0, 50).map((e) => ({ name: e.name, country: e.country }));

  const progress = options.onProgress ?? (() => {});
  const providerLabel = aiProvider === 'claude' ? 'Claude' : 'ChatGPT';
  const modelLabel = options.model || (aiProvider === 'claude' ? 'claude-sonnet-4' : 'gpt-4o');

  // Pre-fetch search results from SearXNG (if configured)
  let searchContext: string | undefined;
  if (options.searxngBaseUrl) {
    progress('Searching SearXNG for visible area...');
    const knownNames = knownPlaces.map((p) => p.name);
    const rawContext = await searchForBounds(options.searxngBaseUrl, bounds, knownNames);
    searchContext = rawContext || undefined;
    const searchResultCount = rawContext ? rawContext.split('\n').filter((l) => /^\d+\./.test(l)).length : 0;
    progress(`SearXNG: ${searchResultCount} results`);
  }

  // Call AI provider
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildAreaUserPrompt(bounds, knownPlaces.length > 0 ? knownPlaces : undefined, searchContext);
  const totalChars = userPrompt.length + systemPrompt.length;
  progress(`Sending ${(totalChars / 1000).toFixed(1)}k chars to ${providerLabel} (${modelLabel})...`);
  const result = options.useBatch && aiProvider === 'claude'
    ? await callClaudeBatch(apiKey, systemPrompt, [userPrompt], options.model)
    : await callAiProvider(aiProvider, apiKey, systemPrompt, userPrompt, options.model);

  // Deduplicate against cached
  let deduplicated = deduplicateExperiences(result.experiences)
    .filter((exp) =>
      !cachedNearby.some(
        (c) =>
          haversineKm(c.approximateLat, c.approximateLng, exp.approximateLat, exp.approximateLng) < 5 &&
          c.name.toLowerCase().includes(exp.name.toLowerCase().slice(0, 10)),
      ),
    );

  // Refine coordinates via Google Places (if key configured)
  if (options.googleApiKey && deduplicated.length > 0) {
    const { refined } = await refineCoordinatesViaGoogle(deduplicated, options.googleApiKey, progress);
    deduplicated = refined;
  }

  if (deduplicated.length > 0) {
    await cacheDiscoveredExperiences(deduplicated, queryKey, graphProvider);
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
    aiProvider,
  };
}
