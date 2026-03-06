import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { searchNearbyCache, cacheNearbyPlaces } from '@/lib/nearby/graph';
import { getSetting, SETTING_KEYS } from '@/lib/settings';
import type { NearbyPlace } from '@/lib/nearby/types';

const FOURSQUARE_BASE = 'https://places-api.foursquare.com';

/** Foursquare category IDs — top-level groups for the category picker. */
const CATEGORY_IDS: Record<string, string> = {
  food:         '13000',   // Dining and Drinking
  hotels:       '19014',   // Hotels and Motels
  outdoors:     '16000',   // Landmarks and Outdoors
  shopping:     '17000',   // Retail
};

const VALID_CATEGORIES = ['food', 'hotels', 'outdoors', 'shopping'] as const;

const bodySchema = z.object({
  lat: z.number(),
  lng: z.number(),
  radiusMeters: z.number().min(100).max(50_000),
  category: z.enum(VALID_CATEGORIES).optional(),
});

interface FsPlace {
  fsq_place_id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  location?: {
    formatted_address?: string;
  };
  categories?: { fsq_category_id: string; name: string; short_name: string }[];
  tel?: string;
  website?: string;
}

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
  const { lat, lng, radiusMeters, category } = parsed.data;

  const rawKey =
    process.env.FOURSQUARE_API_KEY ?? (await getSetting(SETTING_KEYS.FOURSQUARE_API_KEY));
  const apiKey = rawKey?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Foursquare API key not configured' },
      { status: 400 },
    );
  }

  // Phase 1: Neo4j graph cache
  const cacheType = category ? `foursquare:${category}` : 'foursquare';
  const cached = await searchNearbyCache(lat, lng, radiusMeters, cacheType);
  const cachedIds = new Set(cached.map((p) => p.placeId));

  // Phase 2: Foursquare Places API
  const freshPlaces: NearbyPlace[] = [];
  try {
    const url = new URL(`${FOURSQUARE_BASE}/places/search`);
    url.searchParams.set('ll', `${lat},${lng}`);
    url.searchParams.set('radius', String(Math.round(radiusMeters)));
    url.searchParams.set('limit', '50');
    // Only request Pro-tier fields (free up to 10k/month). Premium fields like rating, hours, photos, tips cost extra.
    url.searchParams.set('fields', 'fsq_place_id,name,latitude,longitude,location,categories,tel,website');
    if (category && CATEGORY_IDS[category]) {
      url.searchParams.set('categories', CATEGORY_IDS[category]);
    }

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Places-Api-Version': '2025-06-17',
      },
    });

    if (res.status === 429) {
      console.warn('[nearby-search/foursquare] Rate limited (429)');
      return NextResponse.json(
        { error: 'Foursquare rate limit exceeded. Try again later.', places: cached },
        { status: 429 },
      );
    }

    if (res.status === 401 || res.status === 403) {
      const text = await res.text();
      console.warn('[nearby-search/foursquare] Auth failed:', res.status, text);
      return NextResponse.json(
        { error: `Foursquare API key rejected (${res.status}). Check your key in Settings.`, places: cached },
        { status: 200 },
      );
    }

    if (res.ok) {
      const data = await res.json();
      const places: FsPlace[] = data.results ?? [];

      for (const p of places) {
        if (p.latitude == null || p.longitude == null) continue;

        const placeId = `fs:${p.fsq_place_id}`;
        if (cachedIds.has(placeId)) continue;

        freshPlaces.push({
          placeId,
          name: p.name,
          lat: p.latitude,
          lng: p.longitude,
          type: cacheType,
          provider: 'foursquare',
          website: p.website ?? undefined,
          phone: p.tel ?? undefined,
          address: p.location?.formatted_address ?? undefined,
        });
      }
    } else {
      const errText = await res.text();
      console.warn('[nearby-search/foursquare] API returned', res.status, errText);
    }
  } catch (err) {
    console.warn('[nearby-search/foursquare] API error:', err);
  }

  // Cache new results
  await cacheNearbyPlaces(freshPlaces);

  return NextResponse.json({ places: [...cached, ...freshPlaces] });
}
