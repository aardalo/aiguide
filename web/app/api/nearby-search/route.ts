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
  type: z.enum(VALID_TYPES),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { lat, lng, radiusMeters, type } = parsed.data;

  // Determine active map provider (for search backend selection)
  const mapProvider = await getSetting(SETTING_KEYS.MAP_PROVIDER);

  // Phase 1: Neo4j graph cache (graceful degradation if unavailable)
  const cached = await searchNearbyCache(lat, lng, radiusMeters, type);
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
            'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.regularOpeningHours.weekdayDescriptions,places.rating,places.userRatingCount',
          },
          body: JSON.stringify({
            locationRestriction: {
              circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
            },
            includedTypes: [type],
            maxResultCount: 20,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          for (const p of (data.places ?? []) as any[]) {
            const placeId = `google:${p.id}`;
            if (cachedIds.has(placeId)) continue;
            const hours: string[] | undefined = p.regularOpeningHours?.weekdayDescriptions;
            freshPlaces.push({
              placeId,
              name: p.displayName?.text ?? p.id,
              lat: p.location.latitude,
              lng: p.location.longitude,
              type,
              website:      p.websiteUri             ?? undefined,
              phone:        p.nationalPhoneNumber     ?? undefined,
              openingHours: hours?.join('\n')          ?? undefined,
              address:      p.formattedAddress        ?? undefined,
              rating:       p.rating                  ?? undefined,
              ratingCount:  p.userRatingCount          ?? undefined,
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
    const osmTags = OSM_TAGS[type];
    if (osmTags) {
      try {
        const query = buildOverpassQuery(osmTags, radiusMeters, lat, lng);
        const res = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
        });

        if (res.ok) {
          const data = await res.json();
          for (const el of (data.elements ?? []) as any[]) {
            const placeId = `osm:${el.type}:${el.id}`;
            if (cachedIds.has(placeId)) continue;
            // Nodes have lat/lon directly; ways/relations expose a computed centre
            const elLat: number | undefined = el.lat ?? el.center?.lat;
            const elLng: number | undefined = el.lon ?? el.center?.lon;
            if (elLat == null || elLng == null) continue;
            const name: string =
              el.tags?.name ||
              el.tags?.['name:en'] ||
              `${type.replace(/_/g, ' ')} ${el.id}`;
            const tags = el.tags ?? {};
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
              type,
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
