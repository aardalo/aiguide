import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { searchNearbyCache, cacheNearbyPlaces } from '@/lib/nearby/graph';
import { getSetting, SETTING_KEYS } from '@/lib/settings';
import type { NearbyPlace } from '@/lib/nearby/types';

const VALID_TYPES = [
  'tourist_attraction',
  'park',
  'rv_park',
  'campground',
  'mobile_home_park',
  'rest_stop',
  'parking',
] as const;

/** Map our place-type names to OSM tag key=value pairs (OR logic within a type). */
const OSM_TAGS: Record<string, Array<{ key: string; value: string }>> = {
  tourist_attraction: [{ key: 'tourism', value: 'attraction' }],
  park:               [{ key: 'leisure', value: 'park' }],
  rv_park:            [{ key: 'tourism', value: 'caravan_site' }],
  campground:         [{ key: 'tourism', value: 'camp_site' }],
  mobile_home_park:   [{ key: 'landuse', value: 'mobile_home_park' }],
  rest_stop:          [{ key: 'highway', value: 'rest_area' }, { key: 'amenity', value: 'rest_area' }],
  parking:            [{ key: 'amenity', value: 'parking' }],
};

function buildOverpassQuery(
  tags: Array<{ key: string; value: string }>,
  radiusMeters: number,
  lat: number,
  lng: number,
): string {
  const around = `around:${radiusMeters},${lat},${lng}`;
  const parts = tags.flatMap(({ key, value }) => [
    `  node["${key}"="${value}"](${around});`,
    `  way["${key}"="${value}"](${around});`,
  ]);
  return `[out:json][timeout:25];\n(\n${parts.join('\n')}\n);\nout center 50;`;
}

const bodySchema = z.object({
  lat: z.number(),
  lng: z.number(),
  radiusMeters: z.number().min(100).max(25_000),
  types: z.array(z.enum(VALID_TYPES)).min(1).max(VALID_TYPES.length),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Support legacy single `type` field by converting to `types` array
  const raw = body as Record<string, unknown>;
  if (raw.type && !raw.types) {
    raw.types = [raw.type];
    delete raw.type;
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { lat, lng, radiusMeters, types } = parsed.data;

  // Determine active map provider (for search backend selection)
  const mapProvider = await getSetting(SETTING_KEYS.MAP_PROVIDER);

  // Phase 1: Neo4j graph cache (graceful degradation if unavailable)
  const cachedByType = await Promise.all(
    types.map((type) => searchNearbyCache(lat, lng, radiusMeters, type)),
  );
  const cached = cachedByType.flat();
  const cachedIds = new Set(cached.map((p) => p.placeId));

  // Phase 2: external search — Google Places when map.provider=google, else Overpass
  const freshPlaces: NearbyPlace[] = [];

  if (mapProvider === 'google') {
    // Google Places API New
    const apiKey =
      process.env.GOOGLE_API_KEY ?? (await getSetting(SETTING_KEYS.GOOGLE_API_KEY));
    if (apiKey) {
      try {
        const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.id,places.types,places.displayName,places.location,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.regularOpeningHours.weekdayDescriptions,places.rating,places.userRatingCount',
          },
          body: JSON.stringify({
            locationRestriction: {
              circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
            },
            includedTypes: types,
            maxResultCount: 20,
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) {
          const data = await res.json();
          for (const p of (data.places ?? []) as Record<string, unknown>[]) {
            const placeId = `google:${p.id}`;
            if (cachedIds.has(placeId)) continue;
            const loc = p.location as Record<string, number>;
            const displayName = p.displayName as Record<string, string> | undefined;
            const hours = (p.regularOpeningHours as Record<string, unknown>)?.weekdayDescriptions as string[] | undefined;
            // Determine which of our requested types this place matches
            const googleTypes = (p.types as string[]) ?? [];
            const placeType = types.find((t) => googleTypes.includes(t)) ?? types[0];
            freshPlaces.push({
              placeId,
              name: displayName?.text ?? String(p.id),
              lat: loc.latitude,
              lng: loc.longitude,
              type: placeType,
              website:      (p.websiteUri as string)             ?? undefined,
              phone:        (p.nationalPhoneNumber as string)     ?? undefined,
              openingHours: hours?.join('\n')                      ?? undefined,
              address:      (p.formattedAddress as string)        ?? undefined,
              rating:       (p.rating as number)                  ?? undefined,
              ratingCount:  (p.userRatingCount as number)          ?? undefined,
            });
          }
        } else {
          console.warn('[nearby-search] Google Places returned', res.status);
        }
      } catch (err) {
        console.warn('[nearby-search] Google Places error:', err);
      }
    }
  } else {
    // Overpass API (OpenStreetMap) — no API key required
    // Combine OSM tags from all selected types into a single query
    const allTags = types.flatMap((t) => OSM_TAGS[t] ?? []);
    if (allTags.length > 0) {
      try {
        const query = buildOverpassQuery(allTags, radiusMeters, lat, lng);
        const res = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(10_000),
        });

        if (res.ok) {
          const data = await res.json();
          for (const el of (data.elements ?? []) as Record<string, unknown>[]) {
            const placeId = `osm:${el.type}:${el.id}`;
            if (cachedIds.has(placeId)) continue;
            // Nodes have lat/lon directly; ways/relations expose a computed centre
            const center = el.center as Record<string, number> | undefined;
            const elLat: number | undefined = (el.lat as number) ?? center?.lat;
            const elLng: number | undefined = (el.lon as number) ?? center?.lon;
            if (elLat == null || elLng == null) continue;
            const tags = (el.tags ?? {}) as Record<string, string>;
            const name: string =
              tags.name ||
              tags['name:en'] ||
              `Place ${el.id}`;
            // Determine which of our requested types this element matches
            const matchedType = types.find((t) =>
              (OSM_TAGS[t] ?? []).some(({ key, value }) => tags[key] === value),
            ) ?? types[0];
            // Build a short address from available OSM addr:* tags
            const addrParts = [
              tags['addr:housenumber'] && tags['addr:street']
                ? `${tags['addr:housenumber']} ${tags['addr:street']}`
                : tags['addr:street'],
              tags['addr:city'],
              tags['addr:postcode'],
            ].filter(Boolean);
            freshPlaces.push({
              placeId,
              name,
              lat: elLat,
              lng: elLng,
              type: matchedType,
              website:      tags.website          ?? undefined,
              phone:        tags.phone            ?? undefined,
              openingHours: tags.opening_hours    ?? undefined,
              address:      addrParts.length > 0 ? addrParts.join(', ') : undefined,
            });
          }
        } else {
          console.warn('[nearby-search] Overpass API returned', res.status);
        }
      } catch (err) {
        console.warn('[nearby-search] Overpass API error:', err);
      }
    }
  }

  // Cache new results for future lookups
  await cacheNearbyPlaces(freshPlaces);

  return NextResponse.json({ places: [...cached, ...freshPlaces] });
}
