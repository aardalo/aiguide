import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { searchNearbyCache, cacheNearbyPlaces } from '@/lib/nearby/graph';
import { getSetting, SETTING_KEYS } from '@/lib/settings';
import type { NearbyPlace } from '@/lib/nearby/types';

const TRIPADVISOR_BASE = 'https://api.content.tripadvisor.com/api/v1';

const VALID_CATEGORIES = ['hotels', 'restaurants', 'attractions'] as const;

const bodySchema = z.object({
  lat: z.number(),
  lng: z.number(),
  radiusMeters: z.number().min(100).max(50_000),
  category: z.enum(VALID_CATEGORIES).optional(),
});

interface TaLocation {
  location_id: string;
  name: string;
  distance: string;
  bearing: string;
  address_obj?: {
    street1?: string;
    city?: string;
    state?: string;
    country?: string;
    postalcode?: string;
    address_string?: string;
  };
}

interface TaLocationDetails {
  location_id: string;
  name: string;
  latitude: string;
  longitude: string;
  rating: string;
  num_reviews: string;
  web_url: string;
  phone?: string;
  website?: string;
  address_obj?: {
    address_string?: string;
  };
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

  const apiKey =
    process.env.TRIPADVISOR_API_KEY ?? (await getSetting(SETTING_KEYS.TRIPADVISOR_API_KEY));
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Tripadvisor API key not configured' },
      { status: 400 },
    );
  }

  // Phase 1: Neo4j graph cache
  const cacheType = category ? `tripadvisor:${category}` : 'tripadvisor';
  const cached = await searchNearbyCache(lat, lng, radiusMeters, cacheType);
  const cachedIds = new Set(cached.map((p) => p.placeId));

  // Phase 2: Tripadvisor nearby search API
  const freshPlaces: NearbyPlace[] = [];
  try {
    const radiusKm = Math.round(radiusMeters / 1000);
    const url = new URL(`${TRIPADVISOR_BASE}/location/nearby_search`);
    url.searchParams.set('latLong', `${lat},${lng}`);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('radius', String(Math.max(1, radiusKm)));
    url.searchParams.set('radiusUnit', 'km');
    url.searchParams.set('language', 'en');
    if (category) {
      url.searchParams.set('category', category);
    }

    const origin = request.headers.get('origin') || request.headers.get('referer') || 'http://localhost:3000';
    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        Referer: origin,
      },
    });

    if (res.status === 429) {
      console.warn('[nearby-search/tripadvisor] Rate limited (429)');
      return NextResponse.json(
        { error: 'Tripadvisor rate limit exceeded. Try again later.', places: cached },
        { status: 429 },
      );
    }

    if (res.status === 401 || res.status === 403) {
      const body = await res.text();
      console.warn('[nearby-search/tripadvisor] Auth failed:', res.status, body);
      return NextResponse.json(
        { error: `Tripadvisor API key rejected (${res.status}). Check your key in Settings.`, places: cached },
        { status: 200 },
      );
    }

    if (res.ok) {
      const data = await res.json();
      const locations: TaLocation[] = data.data ?? [];

      // Fetch details for each location to get coordinates, ratings, web_url
      const detailPromises = locations
        .filter((loc) => !cachedIds.has(`ta:${loc.location_id}`))
        .map(async (loc): Promise<NearbyPlace | null> => {
          try {
            const detailUrl = new URL(
              `${TRIPADVISOR_BASE}/location/${loc.location_id}/details`,
            );
            detailUrl.searchParams.set('key', apiKey);
            detailUrl.searchParams.set('language', 'en');

            const detailRes = await fetch(detailUrl.toString(), {
              headers: { Accept: 'application/json' },
            });

            if (!detailRes.ok) return null;

            const detail: TaLocationDetails = await detailRes.json();
            const pLat = parseFloat(detail.latitude);
            const pLng = parseFloat(detail.longitude);
            if (isNaN(pLat) || isNaN(pLng)) return null;

            const rating = parseFloat(detail.rating);
            const numReviews = parseInt(detail.num_reviews, 10);

            return {
              placeId: `ta:${loc.location_id}`,
              name: detail.name || loc.name,
              lat: pLat,
              lng: pLng,
              type: cacheType,
              provider: 'tripadvisor',
              website: detail.website ?? undefined,
              phone: detail.phone ?? undefined,
              address: detail.address_obj?.address_string ?? loc.address_obj?.address_string ?? undefined,
              rating: isNaN(rating) ? undefined : rating,
              ratingCount: isNaN(numReviews) ? undefined : numReviews,
              webUrl: detail.web_url ?? undefined,
            };
          } catch (err) {
            console.warn(`[nearby-search/tripadvisor] Detail fetch failed for ${loc.location_id}:`, err);
            return null;
          }
        });

      const resolved = await Promise.all(detailPromises);
      for (const place of resolved) {
        if (place) freshPlaces.push(place);
      }
    } else {
      console.warn('[nearby-search/tripadvisor] API returned', res.status);
    }
  } catch (err) {
    console.warn('[nearby-search/tripadvisor] API error:', err);
  }

  // Cache new results
  await cacheNearbyPlaces(freshPlaces);

  return NextResponse.json({ places: [...cached, ...freshPlaces] });
}
