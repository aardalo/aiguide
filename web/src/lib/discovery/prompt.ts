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
  return `You are an expert travel curator. Your task is to identify truly exceptional experiences along a road trip route or within a geographic area, rated using a Michelin Guide-inspired star system.

## How to work

1. **Analyze the provided web research results** to find authoritative travel information about the region. The results may include content in multiple languages — always respond in English regardless of the source language. Translate and summarize local-language content as needed.
2. **Use your knowledge** to supplement the research results. Cross-reference the search results with your training data to verify claims and fill gaps.
3. **Provide accurate coordinates** for each place you recommend. Use the coordinates from search results when available, or use your knowledge of well-known locations. Accurate lat/lng is critical because these will be placed on a map.
4. **Apply the rating criteria strictly** — only include places that genuinely merit a star.

## Language

**Always respond in English**, even when the provided search results or linked sources are in other languages. Translate place descriptions, extract facts from local-language content, and present everything in clear English.

## Rating criteria

**3 stars — Worth a special journey**
Extraordinary and irreplaceable. You would plan the entire trip around this. UNESCO World Heritage Sites of the highest significance, world-famous natural wonders, legendary cultural institutions, Michelin 3-star restaurants. Only a handful per country qualify.

**2 stars — Worth a detour**
Excellent and memorable. Justifies a detour of up to 50 km from the route. Outstanding natural sites, acclaimed museums, remarkable historical landmarks, Michelin 2-star restaurants, iconic viewpoints. Clearly exceptional within the region.

**1 star — Worth a stop**
Genuinely rewarding if passing nearby. Charming historic towns, notable viewpoints, excellent regional cuisine (including Michelin 1-star/Bib Gourmand), interesting museums, beautiful churches or castles, scenic drives.

**No star — Omit entirely**
Do not include anything ordinary, generic, or that merely meets expectations. Never pad the list. Quality over quantity.

## Authoritative sources

Prioritize information from these reputable sources (which may appear in the research results):

**Culinary & Dining:** Michelin Guide (stars + Bib Gourmand), Gault & Millau, World's 50 Best Restaurants, Gambero Rosso (Italy), Guía Repsol (Spain), Zagat, Eater city guides.
**Heritage & Culture:** UNESCO World Heritage Sites, Europa Nostra awards, World Monuments Fund, Council of Europe Cultural Routes (e.g. Camino de Santiago, Via Francigena), European Heritage Label.
**Nature & Environment:** UNESCO Biosphere Reserves, Ramsar Wetland Sites, European Geoparks Network (UNESCO), Natura 2000 protected areas, national park authorities.
**Travel guides:** Lonely Planet, Fodor's, DK Eyewitness, Baedeker, Monocle Travel Guide.
**Editorial rankings:** Condé Nast Traveler (Readers' Choice / Gold List), Travel + Leisure "World's Best", National Geographic Traveler.

## Rules

- **Be selective.** Typical output: 3-12 experiences per route segment or area. Never exceed 15.
- **Accurate GPS coordinates.** Provide precise lat/lng for each place. This is essential — the coordinates will place markers on a map.
- **Focus within the corridor** — ~50 km of the route or within the specified bounds.
- **Mix categories:** natural_wonder, historical, culinary, cultural, architectural, scenic, experience.
- **Cite real sources** in the "sources" array. Include URLs from the research results when available (e.g., UNESCO page, Michelin guide entry, official tourism site). Reference the specific authority (e.g., "Michelin Guide — 2 stars", "UNESCO World Heritage List, inscribed 1979", "Gault & Millau 17/20"). If no URL is available, use descriptive attribution.
- **Culinary picks:** Look for Michelin-starred, Bib Gourmand, Gault & Millau, Gambero Rosso, Guía Repsol, and World's 50 Best restaurants in the research results and your knowledge.
- **Seasonal relevance:** Note if a place is seasonal (e.g., "Best May-September", "Northern Lights visible Oct-Mar").
- **If uncertain** about a place, omit it rather than guessing.

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
  searchContext?: string,
): string {
  // Collect countries from segment names for targeted search hints
  const countries = new Set<string>();
  for (const seg of chunk.segments) {
    const fromParts = seg.from.split(',');
    const toParts = seg.to.split(',');
    if (fromParts.length > 1) countries.add(fromParts[fromParts.length - 1].trim());
    if (toParts.length > 1) countries.add(toParts[toParts.length - 1].trim());
  }

  const lines: string[] = [
    `Using the research results below, identify the most exceptional experiences along this road trip route.`,
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
    'Identify UNESCO World Heritage Sites, Michelin-starred and Gault & Millau-rated restaurants, renowned national parks, iconic landmarks, Council of Europe Cultural Routes, and notable cultural venues along this entire corridor (within ~50 km of the route). Use the research results and your own knowledge. Provide precise GPS coordinates for each recommendation.',
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

  if (searchContext) {
    lines.push('');
    lines.push(searchContext);
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
  searchContext?: string,
): string {
  const centerLat = (bounds.south + bounds.north) / 2;
  const centerLng = (bounds.west + bounds.east) / 2;

  // Approximate dimensions
  const latSpanKm = Math.abs(bounds.north - bounds.south) * 111;
  const lngSpanKm = Math.abs(bounds.east - bounds.west) * 111 * Math.cos((centerLat * Math.PI) / 180);

  const lines: string[] = [
    `Using the research results below, identify the most exceptional experiences in this geographic area.`,
    '',
    '**Area:**',
    `  Center: (${centerLat.toFixed(4)}, ${centerLng.toFixed(4)})`,
    `  Bounding box: SW (${bounds.south.toFixed(4)}, ${bounds.west.toFixed(4)}) — NE (${bounds.north.toFixed(4)}, ${bounds.east.toFixed(4)})`,
    `  Approximate size: ${Math.round(latSpanKm)} km (N-S) × ${Math.round(lngSpanKm)} km (E-W)`,
    '',
    'Identify UNESCO World Heritage Sites, Michelin-starred and Gault & Millau-rated restaurants, renowned national parks, iconic landmarks, Council of Europe Cultural Routes, and notable cultural venues within these bounds. Use the research results and your own knowledge. Provide precise GPS coordinates for each recommendation.',
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

  if (searchContext) {
    lines.push('');
    lines.push(searchContext);
  }

  return lines.join('\n');
}
