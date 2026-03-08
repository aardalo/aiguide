/**
 * Nominatim (OpenStreetMap) geocoding provider.
 * Location: src/lib/geocoding/nominatim.ts
 *
 * Docs: https://nominatim.org/release-docs/develop/api/Search/
 * No API key required. Rate limit: 1 req/sec (handled by Neo4j cache TTL).
 */

import type { PlaceResult } from '@/lib/schemas/geocoding';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'TripPlanner/1.0';

interface NominatimResult {
  place_id: number;
  display_name: string;
  name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

/** Search Nominatim for places matching the query. Returns up to `limit` results. */
export async function searchNominatim(query: string, limit = 5): Promise<PlaceResult[]> {
  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Nominatim error ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as NominatimResult[];

  return data.map((r) => ({
    placeId: String(r.place_id),
    name: extractShortName(r),
    displayName: r.display_name,
    latitude: parseFloat(r.lat),
    longitude: parseFloat(r.lon),
    type: r.type ?? 'unknown',
    importance: r.importance ?? 0,
  }));
}

/** Extract a short readable name from a Nominatim result. */
function extractShortName(r: NominatimResult): string {
  // Prefer the explicit `name` field; fall back to first segment of display_name
  if (r.name && r.name.trim().length > 0) return r.name.trim();
  return r.display_name.split(',')[0].trim();
}
