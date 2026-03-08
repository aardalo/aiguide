import { openSession } from '@/lib/neo4j';
import type { DiscoveredExperience } from './types';

const CACHE_TTL_HOURS = 720; // 30 days

export type AiProvider = 'chatgpt' | 'claude';

/**
 * Slugify a name + country into a stable placeId.
 * e.g. "The Colosseum", "Italy", "chatgpt" → "chatgpt:the-colosseum-italy"
 * e.g. "The Colosseum", "Italy", "claude"  → "claude:the-colosseum-italy"
 */
function makePlaceId(name: string, country: string, provider: AiProvider): string {
  const slug = `${name}-${country}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${provider}:${slug}`;
}

/**
 * Check Neo4j for cached discovery results matching the given query key and provider.
 * Returns the cached experiences if the CachedSource node exists and hasn't expired.
 * Gracefully returns null if Neo4j is unavailable or cache is stale.
 */
export async function getCachedDiscoveries(
  queryKey: string,
  provider: AiProvider = 'chatgpt',
): Promise<DiscoveredExperience[] | null> {
  const session = await openSession();
  if (!session) return null;

  try {
    const result = await session.run(
      `MATCH (s:CachedSource { provider: $provider, queryKey: $queryKey })
       WHERE s.fetchedAt + duration({ hours: s.ttlHours }) > datetime()
       MATCH (p:Place)-[:SOURCED_FROM]->(s)
       RETURN p`,
      { queryKey, provider },
    );

    if (result.records.length === 0) return null;

    return result.records.map((r) => {
      const p = r.get('p').properties;
      return {
        name: p.name as string,
        michelinStars: toNumber(p.michelinStars) as 1 | 2 | 3,
        category: p.category as DiscoveredExperience['category'],
        description: (p.description as string) ?? '',
        reasoning: (p.reasoning as string) ?? '',
        approximateLat: toNumber(p.lat),
        approximateLng: toNumber(p.lon),
        nearestCity: (p.nearestCity as string) ?? '',
        country: (p.country as string) ?? '',
        estimatedDetourKm: toNumber(p.estimatedDetourKm),
        seasonalNotes: (p.seasonalNotes as string) || undefined,
        sources: p.sources ? JSON.parse(p.sources as string) : undefined,
      };
    });
  } catch (err) {
    console.warn('[discovery/graph] Cache lookup failed:', err);
    return null;
  } finally {
    await session.close();
  }
}

/**
 * Persist discovered experiences as Place nodes in Neo4j with SOURCED_FROM
 * relationship to a CachedSource node. Follows the cacheNearbyPlaces pattern.
 */
export async function cacheDiscoveredExperiences(
  experiences: DiscoveredExperience[],
  queryKey: string,
  provider: AiProvider = 'chatgpt',
): Promise<void> {
  if (experiences.length === 0) return;
  const session = await openSession();
  if (!session) return;

  try {
    // Ensure the CachedSource node exists
    await session.run(
      `MERGE (s:CachedSource { provider: $provider, queryKey: $queryKey })
       SET s.fetchedAt = datetime(),
           s.ttlHours  = $ttlHours`,
      { queryKey, ttlHours: CACHE_TTL_HOURS, provider },
    );

    // Upsert each experience as a Place node
    for (const exp of experiences) {
      const placeId = makePlaceId(exp.name, exp.country, provider);
      await session.run(
        `MERGE (n:Place { placeId: $placeId })
         SET n.name             = $name,
             n.displayName      = $name,
             n.lat              = $lat,
             n.lon              = $lng,
             n.type             = $type,
             n.provider         = $provider,
             n.michelinStars    = $michelinStars,
             n.category         = $category,
             n.description      = $description,
             n.reasoning        = $reasoning,
             n.nearestCity      = $nearestCity,
             n.country          = $country,
             n.estimatedDetourKm = $estimatedDetourKm,
             n.seasonalNotes    = $seasonalNotes,
             n.sources          = $sources,
             n.updatedAt        = datetime()
         WITH n
         MATCH (s:CachedSource { provider: $provider, queryKey: $queryKey })
         MERGE (n)-[:SOURCED_FROM]->(s)`,
        {
          placeId,
          name: exp.name,
          lat: exp.approximateLat,
          lng: exp.approximateLng,
          type: `${provider}:experience`,
          provider,
          michelinStars: exp.michelinStars,
          category: exp.category,
          description: exp.description,
          reasoning: exp.reasoning,
          nearestCity: exp.nearestCity,
          country: exp.country,
          estimatedDetourKm: exp.estimatedDetourKm,
          seasonalNotes: exp.seasonalNotes ?? null,
          sources: exp.sources ? JSON.stringify(exp.sources) : null,
          queryKey,
        },
      );
    }
  } catch (err) {
    console.warn('[discovery/graph] Cache write failed:', err);
  } finally {
    await session.close();
  }
}

/**
 * Find all cached AI experiences (from any AI provider) within a corridor
 * around the given route coordinates. Used to exclude already-known places
 * from new research. Returns place names + approximate coordinates for
 * prompt exclusion.
 */
export async function getCachedExperiencesNearRoute(
  destinations: Array<{ lat: number; lng: number }>,
  corridorKm: number = 80,
): Promise<DiscoveredExperience[]> {
  const session = await openSession();
  if (!session) return [];

  try {
    // Build a bounding box that covers the entire route corridor
    const lats = destinations.map((d) => d.lat);
    const lngs = destinations.map((d) => d.lng);
    const latPadding = corridorKm / 111; // ~111 km per degree latitude
    const lngPadding = corridorKm / (111 * Math.cos((((Math.min(...lats) + Math.max(...lats)) / 2) * Math.PI) / 180));

    const minLat = Math.min(...lats) - latPadding;
    const maxLat = Math.max(...lats) + latPadding;
    const minLng = Math.min(...lngs) - lngPadding;
    const maxLng = Math.max(...lngs) + lngPadding;

    const result = await session.run(
      `MATCH (p:Place)
       WHERE p.provider IN ['chatgpt', 'claude']
         AND p.lat >= $minLat AND p.lat <= $maxLat
         AND p.lon >= $minLng AND p.lon <= $maxLng
       RETURN p`,
      { minLat, maxLat, minLng, maxLng },
    );

    return result.records.map((r) => {
      const p = r.get('p').properties;
      return {
        name: p.name as string,
        michelinStars: toNumber(p.michelinStars) as 1 | 2 | 3,
        category: (p.category as DiscoveredExperience['category']) ?? 'cultural',
        description: (p.description as string) ?? '',
        reasoning: (p.reasoning as string) ?? '',
        approximateLat: toNumber(p.lat),
        approximateLng: toNumber(p.lon),
        nearestCity: (p.nearestCity as string) ?? '',
        country: (p.country as string) ?? '',
        estimatedDetourKm: toNumber(p.estimatedDetourKm),
        seasonalNotes: (p.seasonalNotes as string) || undefined,
        sources: p.sources ? JSON.parse(p.sources as string) : undefined,
      };
    });
  } catch (err) {
    console.warn('[discovery/graph] Nearby cache lookup failed:', err);
    return [];
  } finally {
    await session.close();
  }
}

function toNumber(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === 'object' && 'toNumber' in val) return (val as { toNumber(): number }).toNumber();
  return Number(val);
}
