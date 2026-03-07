/**
 * Daily POIs API
 * Location: app/api/daily-pois/route.ts
 *
 * GET  /api/daily-pois?tripId=xxx  — list all POIs for a trip
 * POST /api/daily-pois             — create a new POI
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dailyPoiCreateSchema } from '@/lib/schemas/trip';

export async function GET(request: NextRequest) {
  const tripId = request.nextUrl.searchParams.get('tripId');
  if (!tripId) {
    return NextResponse.json({ error: 'tripId query parameter is required' }, { status: 400 });
  }
  try {
    const pois = await prisma.dailyPoi.findMany({
      where: { tripId },
      orderBy: [{ dayDate: 'asc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json(pois);
  } catch (err) {
    console.error('[GET /api/daily-pois] Error:', err);
    return NextResponse.json({ error: 'Failed to load POIs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = dailyPoiCreateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: validation.error.flatten() },
      { status: 400 },
    );
  }

  const { tripId, dayDate, name, latitude, longitude, notes, category } = validation.data;

  try {
    const poi = await prisma.dailyPoi.create({
      data: {
        tripId,
        dayDate: new Date(dayDate),
        name,
        latitude,
        longitude,
        notes: notes ?? null,
        category,
      },
    });
    return NextResponse.json(poi, { status: 201 });
  } catch (err) {
    console.error('[POST /api/daily-pois] Error:', err);
    return NextResponse.json({ error: 'Failed to create POI' }, { status: 500 });
  }
}
