/**
 * Neo4j graph cache for geocoding results.
 * Location: src/lib/geocoding/graph.ts
 *
 * Stores Place nodes and GeoSearch nodes in the graf database.
 * Cache TTL: 7 days per search query.
 *
 * Schema:
 *   (:Place { placeId, name, displayName, lat, lon, type, importance, updatedAt })
 *   (:GeoSearch { queryKey, expiresAt })-[:RETURNED]->(:Place)
 */

import { openSession } from '@/lib/neo4j';
import type { PlaceResult } from '@/lib/schemas/geocoding';

const CACHE_TTL_DAYS = 7;

/** Normalize a search query to a stable cache key. */
function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * Look up cached geocoding results for a query.
 * Returns null if no valid cache entry exists.
 */
export async function searchGraphCache(query: string): Promise<PlaceResult[] | null> {
  const session = await openSession();
  if (!session) return null;

  const queryKey = normalizeQuery(query);

  try {
    const result = await session.run(
      `
      MATCH (g:GeoSearch { queryKey: $queryKey })-[:RETURNED]->(p:Place)
      WHERE g.expiresAt > datetime()
      RETURN p
      ORDER BY p.importance DESC
      `,
      { queryKey },
    );

    if (result.records.length === 0) return null;

    return result.records.map((record) => {
      const p = record.get('p').properties;
      return {
        placeId: p.placeId,
        name: p.name,
        displayName: p.displayName,
        latitude: typeof p.lat === 'object' ? p.lat.toNumber() : Number(p.lat),
        longitude: typeof p.lon === 'object' ? p.lon.toNumber() : Number(p.lon),
        type: p.type,
        importance: typeof p.importance === 'object' ? p.importance.toNumber() : Number(p.importance),
      } satisfies PlaceResult;
    });
  } catch (err) {
    console.warn('[geocoding/graph] Cache lookup failed:', err);
    return null;
  } finally {
    await session.close();
  }
}

/**
 * Store geocoding results in the graph cache.
 * Creates/merges Place nodes and a GeoSearch node linked to them.
 */
export async function cacheResults(query: string, results: PlaceResult[]): Promise<void> {
  if (results.length === 0) return;

  const session = await openSession();
  if (!session) return;

  const queryKey = normalizeQuery(query);
  const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Upsert each Place node
    for (const r of results) {
      await session.run(
        `
        MERGE (p:Place { placeId: $placeId })
        SET p.name        = $name,
            p.displayName = $displayName,
            p.lat         = $lat,
            p.lon         = $lon,
            p.type        = $type,
            p.importance  = $importance,
            p.updatedAt   = datetime()
        `,
        {
          placeId: r.placeId,
          name: r.name,
          displayName: r.displayName,
          lat: r.latitude,
          lon: r.longitude,
          type: r.type,
          importance: r.importance,
        },
      );
    }

    // Upsert GeoSearch node and link to all Place nodes
    await session.run(
      `
      MERGE (g:GeoSearch { queryKey: $queryKey })
      SET g.expiresAt = datetime($expiresAt)
      WITH g
      UNWIND $placeIds AS placeId
        MATCH (p:Place { placeId: placeId })
        MERGE (g)-[:RETURNED]->(p)
      `,
      {
        queryKey,
        expiresAt,
        placeIds: results.map((r) => r.placeId),
      },
    );
  } catch (err) {
    console.warn('[geocoding/graph] Cache write failed:', err);
  } finally {
    await session.close();
  }
}
