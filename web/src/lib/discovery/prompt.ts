import type { RouteChunk } from './types';

const MAX_DESTINATIONS_PER_CHUNK = 5;
const CHUNK_OVERLAP = 1;

/**
 * Split a list of destinations into overlapping chunks for separate API calls.
 * Short routes (<=5 destinations) produce a single chunk.
 */
export function chunkRoute(
  destinations: Array<{ name: string; lat: number; lng: number; dayDate: string }>,
  segmentDistances: Map<string, number>,
): RouteChunk[] {
  if (destinations.length <= 1) return [];

  if (destinations.length <= MAX_DESTINATIONS_PER_CHUNK) {
    return [buildChunk(destinations, segmentDistances)];
  }

  const chunks: RouteChunk[] = [];
  const step = MAX_DESTINATIONS_PER_CHUNK - CHUNK_OVERLAP;

  for (let i = 0; i < destinations.length - 1; i += step) {
    const end = Math.min(i + MAX_DESTINATIONS_PER_CHUNK, destinations.length);
    const slice = destinations.slice(i, end);
    chunks.push(buildChunk(slice, segmentDistances));
    if (end === destinations.length) break;
  }

  return chunks;
}

function buildChunk(
  destinations: Array<{ name: string; lat: number; lng: number; dayDate: string }>,
  segmentDistances: Map<string, number>,
): RouteChunk {
  const segments = [];
  let totalDistanceKm = 0;

  for (let i = 0; i < destinations.length - 1; i++) {
    const from = destinations[i];
    const to = destinations[i + 1];
    const distanceKm = segmentDistances.get(to.dayDate) ?? 0;
    totalDistanceKm += distanceKm;
    segments.push({
      from: from.name,
      fromLat: from.lat,
      fromLng: from.lng,
      to: to.name,
      toLat: to.lat,
      toLng: to.lng,
      distanceKm,
    });
  }

  return { destinations, segments, totalDistanceKm };
}

export function buildSystemPrompt(): string {
  return `You are an expert travel curator with access to web search. Your task is to identify truly exceptional experiences along a road trip route or within a geographic area, rated using a Michelin Guide-inspired star system.

## How to work

1. **Search the web** to find authoritative travel information about the region. Look up UNESCO World Heritage Sites, Michelin-starred restaurants, national parks, renowned museums, and notable landmarks in the area. Cross-reference multiple sources.
2. **Verify coordinates** by searching for each place you recommend. Do not guess GPS coordinates — look them up. Accurate lat/lng is critical because these will be placed on a map.
3. **Apply the rating criteria strictly** — only include places that genuinely merit a star.

## Rating criteria

**3 stars — Worth a special journey**
Extraordinary and irreplaceable. You would plan the entire trip around this. UNESCO World Heritage Sites of the highest significance, world-famous natural wonders, legendary cultural institutions, Michelin 3-star restaurants. Only a handful per country qualify.

**2 stars — Worth a detour**
Excellent and memorable. Justifies a detour of up to 50 km from the route. Outstanding natural sites, acclaimed museums, remarkable historical landmarks, Michelin 2-star restaurants, iconic viewpoints. Clearly exceptional within the region.

**1 star — Worth a stop**
Genuinely rewarding if passing nearby. Charming historic towns, notable viewpoints, excellent regional cuisine (including Michelin 1-star/Bib Gourmand), interesting museums, beautiful churches or castles, scenic drives.

**No star — Omit entirely**
Do not include anything ordinary, generic, or that merely meets expectations. Never pad the list. Quality over quantity.

## Authoritative sources to consult

When searching the web, prioritize these reputable sources:

**Culinary & Dining:** Michelin Guide (stars + Bib Gourmand), Gault & Millau, World's 50 Best Restaurants, Gambero Rosso (Italy), Guía Repsol (Spain), Zagat, Eater city guides.
**Heritage & Culture:** UNESCO World Heritage Sites, Europa Nostra awards, World Monuments Fund, Council of Europe Cultural Routes (e.g. Camino de Santiago, Via Francigena), European Heritage Label.
**Nature & Environment:** UNESCO Biosphere Reserves, Ramsar Wetland Sites, European Geoparks Network (UNESCO), Natura 2000 protected areas, national park authorities.
**Travel guides:** Lonely Planet, Fodor's, DK Eyewitness, Baedeker, Monocle Travel Guide.
**Editorial rankings:** Condé Nast Traveler (Readers' Choice / Gold List), Travel + Leisure "World's Best", National Geographic Traveler.

## Rules

- **Be selective.** Typical output: 3-12 experiences per route segment or area. Never exceed 15.
- **Search for accurate GPS coordinates.** Look up each place to get precise lat/lng. This is essential — the coordinates will place markers on a map.
- **Focus within the corridor** — ~50 km of the route or within the specified bounds.
- **Mix categories:** natural_wonder, historical, culinary, cultural, architectural, scenic, experience.
- **Cite real sources** in the "sources" array. Include URLs from your web searches when available (e.g., UNESCO page, Michelin guide entry, official tourism site). Reference the specific authority (e.g., "Michelin Guide — 2 stars", "UNESCO World Heritage List, inscribed 1979", "Gault & Millau 17/20"). If you cannot find a web source, use descriptive attribution.
- **Culinary picks:** Search the Michelin Guide, Gault & Millau, Gambero Rosso (Italy), Guía Repsol (Spain), and World's 50 Best for restaurants in the area. Include Michelin-starred, Bib Gourmand, and other acclaimed dining experiences.
- **Seasonal relevance:** Note if a place is seasonal (e.g., "Best May-September", "Northern Lights visible Oct-Mar").
- **If uncertain,** search the web rather than guessing. If you still cannot verify a place, omit it.

## Output format

Respond with a JSON object containing a single "experiences" array. Each element must have exactly these fields:
{
  "name": "string — official name of the place or experience",
  "michelinStars": 1 | 2 | 3,
  "category": "natural_wonder" | "historical" | "culinary" | "cultural" | "architectural" | "scenic" | "experience",
  "description": "Why this place is exceptional (2-3 sentences, specific and factual)",
  "reasoning": "Why this specific star rating — reference concrete criteria (1-2 sentences)",
  "approximateLat": number,
  "approximateLng": number,
  "nearestCity": "string",
  "country": "string",
  "estimatedDetourKm": number,
  "seasonalNotes": "string or omit if not seasonal",
  "sources": ["URL or attribution for each claim"]
}

If no experiences meet the criteria, return {"experiences": []}.`;
}

export function buildUserPrompt(
  chunk: RouteChunk,
  knownPlaces?: Array<{ name: string; country: string }>,
): string {
  // Collect countries from segment names for targeted search hints
  const countries = new Set<string>();
  for (const seg of chunk.segments) {
    // Extract country hints from destination names like "Oslo, Norway"
    const fromParts = seg.from.split(',');
    const toParts = seg.to.split(',');
    if (fromParts.length > 1) countries.add(fromParts[fromParts.length - 1].trim());
    if (toParts.length > 1) countries.add(toParts[toParts.length - 1].trim());
  }

  const lines: string[] = [
    `Find the most exceptional experiences along this road trip route. Search the web for each region to ensure accuracy and completeness.`,
    '',
    '**Route:**',
  ];

  for (const seg of chunk.segments) {
    const dist = seg.distanceKm > 0 ? ` (~${Math.round(seg.distanceKm)} km)` : '';
    lines.push(
      `  ${seg.from} (${seg.fromLat.toFixed(4)}, ${seg.fromLng.toFixed(4)}) → ${seg.to} (${seg.toLat.toFixed(4)}, ${seg.toLng.toFixed(4)})${dist}`,
    );
  }

  lines.push('');
  lines.push(`**Total distance:** ~${Math.round(chunk.totalDistanceKm)} km`);

  if (countries.size > 0) {
    lines.push(`**Countries/regions:** ${[...countries].join(', ')}`);
  }

  lines.push('');
  lines.push(
    'Search for UNESCO World Heritage Sites, Michelin-starred and Gault & Millau-rated restaurants, renowned national parks, iconic landmarks, Council of Europe Cultural Routes, and notable cultural venues along this entire corridor (within ~50 km of the route). Consult the authoritative sources listed in your instructions. Look up precise GPS coordinates for each recommendation.',
  );

  if (knownPlaces && knownPlaces.length > 0) {
    lines.push('');
    lines.push('## Already known — DO NOT include these places:');
    for (const p of knownPlaces) {
      lines.push(`- ${p.name} (${p.country})`);
    }
    lines.push('');
    lines.push('These are already in the database. Only return NEW discoveries not listed above.');
  }

  return lines.join('\n');
}

export interface BoundsArea {
  south: number;
  west: number;
  north: number;
  east: number;
}

export function buildAreaUserPrompt(
  bounds: BoundsArea,
  knownPlaces?: Array<{ name: string; country: string }>,
): string {
  const centerLat = (bounds.south + bounds.north) / 2;
  const centerLng = (bounds.west + bounds.east) / 2;

  // Approximate dimensions
  const latSpanKm = Math.abs(bounds.north - bounds.south) * 111;
  const lngSpanKm = Math.abs(bounds.east - bounds.west) * 111 * Math.cos((centerLat * Math.PI) / 180);

  const lines: string[] = [
    `Find the most exceptional experiences in this geographic area. Search the web to identify and verify places.`,
    '',
    '**Area:**',
    `  Center: (${centerLat.toFixed(4)}, ${centerLng.toFixed(4)})`,
    `  Bounding box: SW (${bounds.south.toFixed(4)}, ${bounds.west.toFixed(4)}) — NE (${bounds.north.toFixed(4)}, ${bounds.east.toFixed(4)})`,
    `  Approximate size: ${Math.round(latSpanKm)} km (N-S) × ${Math.round(lngSpanKm)} km (E-W)`,
    '',
    'Search for UNESCO World Heritage Sites, Michelin-starred and Gault & Millau-rated restaurants, renowned national parks, iconic landmarks, Council of Europe Cultural Routes, and notable cultural venues within these bounds. Consult the authoritative sources listed in your instructions. Look up precise GPS coordinates for each recommendation.',
  ];

  if (knownPlaces && knownPlaces.length > 0) {
    lines.push('');
    lines.push('## Already known — DO NOT include these places:');
    for (const p of knownPlaces) {
      lines.push(`- ${p.name} (${p.country})`);
    }
    lines.push('');
    lines.push('These are already in the database. Only return NEW discoveries not listed above.');
  }

  return lines.join('\n');
}
