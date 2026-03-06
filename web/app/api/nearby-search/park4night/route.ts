import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { searchNearbyCache, cacheNearbyPlaces } from '@/lib/nearby/graph';
import type { NearbyPlace } from '@/lib/nearby/types';

/** Haversine distance in metres. */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Map Park4Night boolean amenity fields to display labels. */
const P4N_AMENITIES: Record<string, string> = {
  point_eau:   'Water',
  eau_noire:   'Black water dump',
  eau_usee:    'Grey water dump',
  wc_public:   'Toilets',
  douche:      'Showers',
  electricite: 'Electricity',
  wifi:        'WiFi',
  poubelle:    'Waste bins',
  boulangerie: 'Bakery nearby',
  piscine:     'Pool',
  laverie:     'Laundry',
  gaz:         'Gas',
  lavage:      'Car wash',
  animaux:     'Pets allowed',
};

/** Map P4N type codes to English labels (from their /api/places/filters/type endpoint). */
const P4N_TYPE_LABELS: Record<string, string> = {
  PN:     'Surrounded by nature',
  P:      'Parking lot day/night',
  AR:     'Rest area',
  APN:    'Picnic area',
  ACC_G:  'Free motorhome area',
  ACC_P:  'Paying motorhome area',
  ACC_PR: 'Private car park for campers',
  OR:     'Off-road',
  F:      'On the farm',
  C:      'Camping',
  ASS:    'Service area without parking',
  PJ:     'Daytime parking only',
  EP:     'Homestays accommodation',
  DS:     'Extra services',
  PSS:    'MH parking without services',
};

const bodySchema = z.object({
  lat: z.number(),
  lng: z.number(),
  radiusMeters: z.number().min(100).max(50_000),
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
  const { lat, lng, radiusMeters } = parsed.data;

  // Phase 1: Neo4j graph cache
  const cached = await searchNearbyCache(lat, lng, radiusMeters, 'park4night');
  const cachedIds = new Set(cached.map((p) => p.placeId));

  // Phase 2: Park4Night API
  const freshPlaces: NearbyPlace[] = [];
  try {
    const url = `https://guest.park4night.com/services/V4.1/lieuxGetFilter.php?latitude=${lat}&longitude=${lng}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      // Response is either an array or an object with a `lieux` array
      const places: any[] = Array.isArray(data) ? data : (data.lieux ?? []);

      for (const p of places) {
        const pLat = parseFloat(p.latitude);
        const pLng = parseFloat(p.longitude);
        if (isNaN(pLat) || isNaN(pLng)) continue;

        // Filter by radius (P4N has no radius param)
        if (haversineMeters(lat, lng, pLat, pLng) > radiusMeters) continue;

        const placeId = `p4n:${p.id}`;
        if (cachedIds.has(placeId)) continue;

        // Build amenity list from boolean fields
        const amenities: string[] = [];
        for (const [field, label] of Object.entries(P4N_AMENITIES)) {
          if (p[field] === 1 || p[field] === '1') {
            amenities.push(label);
          }
        }

        // Build address from available parts
        const addrParts = [p.ville, p.code_postal, p.pays].filter(Boolean);

        const rating = parseFloat(p.note_moyenne);
        const ratingCount = parseInt(p.nb_commentaires, 10);

        // Build icon URL from P4N CDN using the place's type code
        const code = (p.code as string) || '';
        const iconUrl = code
          ? `https://cdn6.park4night.com/images/bitmap/icons/pins/pins_${code.toLowerCase()}@4x.png`
          : undefined;
        const typeLabel = P4N_TYPE_LABELS[code] || 'Park4Night';

        freshPlaces.push({
          placeId,
          name: p.name || p.titre || `Park4Night #${p.id}`,
          lat: pLat,
          lng: pLng,
          type: typeLabel,
          provider: 'p4n',
          website:     p.site_internet || undefined,
          phone:       p.tel || undefined,
          address:     addrParts.length > 0 ? addrParts.join(', ') : undefined,
          rating:      isNaN(rating) ? undefined : rating,
          ratingCount: isNaN(ratingCount) ? undefined : ratingCount,
          description: p.description_en || p.description_fr || undefined,
          amenities:   amenities.length > 0 ? amenities : undefined,
          iconUrl,
        });
      }
    } else {
      console.warn('[nearby-search/park4night] API returned', res.status);
    }
  } catch (err) {
    console.warn('[nearby-search/park4night] API error:', err);
  }

  // Cache new results
  await cacheNearbyPlaces(freshPlaces);

  return NextResponse.json({ places: [...cached, ...freshPlaces] });
}
