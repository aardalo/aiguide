/**
 * Geocoding API Route Handler
 * Location: app/api/geocode/route.ts
 *
 * Endpoints:
 * - GET /api/geocode?q={query}&limit={1-10}
 *   Returns an array of PlaceResult matching the query.
 *   Checks Neo4j graph cache first; falls back to Nominatim.
 */

import { NextRequest, NextResponse } from 'next/server';
import { geocodeQuerySchema } from '@/lib/schemas/geocoding';
import { geocodeQuery } from '@/lib/geocoding';

/** GET /api/geocode?q=Paris&limit=5 */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const validation = geocodeQuerySchema.safeParse(params);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: validation.error.flatten() },
      { status: 400 },
    );
  }

  const { q, limit } = validation.data;

  try {
    const results = await geocodeQuery(q, limit ?? 5);
    return NextResponse.json(results);
  } catch (err) {
    console.error('[GET /api/geocode] Error:', err);
    return NextResponse.json(
      { error: 'Geocoding service unavailable' },
      { status: 503 },
    );
  }
}
