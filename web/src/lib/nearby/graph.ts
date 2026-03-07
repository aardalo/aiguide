import { openSession } from '@/lib/neo4j';
import type { NearbyPlace } from './types';

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Returns all Place nodes of the given type within radiusMeters of (lat, lng).
 * Loads all Places of the type from Neo4j then filters by Haversine distance in JS.
 * Gracefully returns [] if Neo4j is unavailable.
 */
export async function searchNearbyCache(
  lat: number,
  lng: number,
  radiusMeters: number,
  type: string,
): Promise<NearbyPlace[]> {
  const session = await openSession();
  if (!session) return [];
  try {
    const result = await session.run(`MATCH (p:Place { type: $type }) RETURN p`, { type });
    return result.records
      .map((r) => {
        const p = r.get('p').properties;
        const place: NearbyPlace = {
          placeId: p.placeId as string,
          name: ((p.displayName ?? p.name) as string) || (p.placeId as string),
          lat: typeof p.lat === 'object' ? p.lat.toNumber() : Number(p.lat),
          lng: typeof p.lon === 'object' ? p.lon.toNumber() : Number(p.lon),
          type: p.type as string,
        };
        if (p.provider)     place.provider     = p.provider as string;
        if (p.website)      place.website      = p.website as string;
        if (p.phone)        place.phone        = p.phone as string;
        if (p.openingHours) place.openingHours = p.openingHours as string;
        if (p.address)      place.address      = p.address as string;
        if (p.rating != null) place.rating = typeof p.rating === 'object' ? p.rating.toNumber() : Number(p.rating);
        if (p.ratingCount != null) place.ratingCount = typeof p.ratingCount === 'object' ? p.ratingCount.toNumber() : Number(p.ratingCount);
        if (p.description)  place.description  = p.description as string;
        if (p.webUrl)       place.webUrl       = p.webUrl as string;
        if (p.iconUrl)      place.iconUrl      = p.iconUrl as string;
        return place;
      })
      .filter((p) => haversineMeters(lat, lng, p.lat, p.lng) <= radiusMeters);
  } catch (err) {
    console.warn('[nearby/graph] Cache lookup failed:', err);
    return [];
  } finally {
    await session.close();
  }
}

/**
 * Returns all Place nodes within the given lat/lng bounding box.
 * Gracefully returns [] if Neo4j is unavailable.
 */
export async function searchCachedByBounds(
  south: number,
  west: number,
  north: number,
  east: number,
): Promise<NearbyPlace[]> {
  const session = await openSession();
  if (!session) return [];
  try {
    const result = await session.run(
      `MATCH (p:Place)
       WHERE p.lat >= $south AND p.lat <= $north
         AND p.lon >= $west  AND p.lon <= $east
       RETURN p
       LIMIT 500`,
      { south, west, north, east },
    );
    return result.records.map((r) => {
      const p = r.get('p').properties;
      const place: NearbyPlace = {
        placeId: p.placeId as string,
        name: ((p.displayName ?? p.name) as string) || (p.placeId as string),
        lat: typeof p.lat === 'object' ? p.lat.toNumber() : Number(p.lat),
        lng: typeof p.lon === 'object' ? p.lon.toNumber() : Number(p.lon),
        type: p.type as string,
      };
      if (p.provider)     place.provider     = p.provider as string;
      if (p.website)      place.website      = p.website as string;
      if (p.phone)        place.phone        = p.phone as string;
      if (p.openingHours) place.openingHours = p.openingHours as string;
      if (p.address)      place.address      = p.address as string;
      if (p.rating != null) place.rating = typeof p.rating === 'object' ? p.rating.toNumber() : Number(p.rating);
      if (p.ratingCount != null) place.ratingCount = typeof p.ratingCount === 'object' ? p.ratingCount.toNumber() : Number(p.ratingCount);
      if (p.description)  place.description  = p.description as string;
      if (p.webUrl)       place.webUrl       = p.webUrl as string;
      if (p.iconUrl)      place.iconUrl      = p.iconUrl as string;
      if (p.michelinStars != null) place.michelinStars = typeof p.michelinStars === 'object' ? p.michelinStars.toNumber() : Number(p.michelinStars);
      return place;
    });
  } catch (err) {
    console.warn('[nearby/graph] Cached bounds lookup failed:', err);
    return [];
  } finally {
    await session.close();
  }
}

/**
 * Upserts new Place nodes from a nearby search into Neo4j.
 * Uses the existing Place.placeId uniqueness constraint (place_id_unique).
 * Gracefully no-ops if Neo4j is unavailable.
 */
export async function cacheNearbyPlaces(places: NearbyPlace[]): Promise<void> {
  if (places.length === 0) return;
  const session = await openSession();
  if (!session) return;
  try {
    for (const p of places) {
      await session.run(
        `MERGE (n:Place { placeId: $placeId })
         SET n.name         = $name,
             n.displayName  = $name,
             n.lat          = $lat,
             n.lon          = $lng,
             n.type         = $type,
             n.importance   = 0.5,
             n.provider     = $provider,
             n.website      = $website,
             n.phone        = $phone,
             n.openingHours = $openingHours,
             n.address      = $address,
             n.rating       = $rating,
             n.ratingCount  = $ratingCount,
             n.description  = $description,
             n.webUrl       = $webUrl,
             n.iconUrl      = $iconUrl,
             n.updatedAt    = datetime()`,
        {
          placeId: p.placeId,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          type: p.type,
          provider:     p.provider     ?? null,
          website:      p.website      ?? null,
          phone:        p.phone        ?? null,
          openingHours: p.openingHours ?? null,
          address:      p.address      ?? null,
          rating:       p.rating       ?? null,
          ratingCount:  p.ratingCount  ?? null,
          description:  p.description  ?? null,
          webUrl:       p.webUrl       ?? null,
          iconUrl:      p.iconUrl      ?? null,
        },
      );
    }
  } catch (err) {
    console.warn('[nearby/graph] Cache write failed:', err);
  } finally {
    await session.close();
  }
}
