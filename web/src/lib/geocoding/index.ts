/**
 * Geocoding entry point.
 * Location: src/lib/geocoding/index.ts
 *
 * Resolution order:
 *   1. Check Neo4j graph cache (7-day TTL per query)
 *   2. Call Nominatim if no cache hit
 *   3. Store Nominatim results in graph cache for future requests
 *
 * If Neo4j is unavailable, falls back to direct Nominatim calls.
 */

import { ensureConstraints } from '@/lib/neo4j';
import { searchGraphCache, cacheResults } from './graph';
import { searchNominatim } from './nominatim';
import type { PlaceResult } from '@/lib/schemas/geocoding';

let constraintsEnsured = false;

async function maybeEnsureConstraints(): Promise<void> {
  if (constraintsEnsured) return;
  await ensureConstraints();
  constraintsEnsured = true;
}

/**
 * Geocode a free-text query, returning up to `limit` place candidates.
 * Returns an empty array when no results are found.
 */
export async function geocodeQuery(query: string, limit = 5): Promise<PlaceResult[]> {
  await maybeEnsureConstraints();

  // 1. Try graph cache
  const cached = await searchGraphCache(query);
  if (cached !== null) {
    return cached.slice(0, limit);
  }

  // 2. Call Nominatim
  const results = await searchNominatim(query, limit);

  // 3. Cache in background (don't await — fire and forget)
  cacheResults(query, results).catch((err) =>
    console.warn('[geocoding] Background cache write failed:', err),
  );

  return results;
}
