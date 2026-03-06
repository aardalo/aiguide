/**
 * Route Segments [id] API
 * Location: app/api/route-segments/[id]/route.ts
 *
 * PATCH /api/route-segments/:id
 *   Insert a via-point into a segment and recompute the route through it.
 *   Used when the user clicks on a polyline to split/reshape the segment. STORY-007.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getActiveRoutingProvider } from '@/lib/routing';
import { generateDistanceWaypoints } from '@/lib/routing/waypoints';
import { getSetting, SETTING_KEYS } from '@/lib/settings';

const patchBodySchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const validation = patchBodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.flatten() },
        { status: 400 },
      );
    }

    const { latitude: viaLat, longitude: viaLng } = validation.data;

    // Find the segment with existing waypoints
    const segment = await prisma.routeSegment.findUnique({
      where: { id },
      include: { waypoints: { orderBy: { sequenceIndex: 'asc' } } },
    });
    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    // Resolve from-coordinates (home or DailyDestination)
    let fromCoords: { latitude: number; longitude: number } | null = null;
    if (segment.fromDestinationId === 'home') {
      const [homeLatStr, homeLngStr] = await Promise.all([
        getSetting(SETTING_KEYS.HOME_LATITUDE),
        getSetting(SETTING_KEYS.HOME_LONGITUDE),
      ]);
      if (homeLatStr && homeLngStr) {
        fromCoords = { latitude: parseFloat(homeLatStr), longitude: parseFloat(homeLngStr) };
      }
    } else {
      const fromDest = await prisma.dailyDestination.findUnique({
        where: { id: segment.fromDestinationId },
        select: { latitude: true, longitude: true },
      });
      if (fromDest?.latitude != null && fromDest?.longitude != null) {
        fromCoords = { latitude: fromDest.latitude, longitude: fromDest.longitude };
      }
    }

    if (!fromCoords) {
      return NextResponse.json(
        { error: 'Cannot resolve from-coordinates for segment' },
        { status: 422 },
      );
    }

    // Resolve to-coordinates (always a DailyDestination)
    const toDest = await prisma.dailyDestination.findUnique({
      where: { id: segment.toDestinationId },
      select: { latitude: true, longitude: true },
    });
    if (!toDest?.latitude || !toDest?.longitude) {
      return NextResponse.json(
        { error: 'Cannot resolve to-coordinates for segment' },
        { status: 422 },
      );
    }
    const toCoords = { latitude: toDest.latitude, longitude: toDest.longitude };

    // Load trip routing preferences
    const trip = await prisma.trip.findUnique({
      where: { id: segment.tripId },
      select: { routingPreferences: true },
    });
    const preferences = trip?.routingPreferences
      ? JSON.parse(trip.routingPreferences)
      : undefined;

    // Load active routing provider
    let provider;
    try {
      provider = await getActiveRoutingProvider();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load routing provider';
      return NextResponse.json({ error: message }, { status: 503 });
    }

    // Collect existing manual waypoints (user-placed routing handles)
    const manualWaypoints = segment.waypoints.filter((wp) => wp.isManual);

    // Recompute route: from → existing manual vias → new via → to
    const result = await provider.getRoute({
      waypoints: [
        fromCoords,
        ...manualWaypoints.map((wp) => ({ latitude: wp.latitude, longitude: wp.longitude })),
        { latitude: viaLat, longitude: viaLng },
        toCoords,
      ],
      preferences,
    });

    const encodedPolyline = result.legs[0]?.encodedPolyline ?? null;

    // Update segment distance/duration/polyline
    await prisma.routeSegment.update({
      where: { id: segment.id },
      data: {
        distanceMeters: result.totalDistanceMeters,
        durationSeconds: result.totalDurationSeconds,
        encodedPolyline,
        provider: provider.id,
      },
    });

    // Persist the new via-point as a manual waypoint (highest sequence index among manuals)
    const maxManualIdx = manualWaypoints.reduce(
      (max, wp) => Math.max(max, wp.sequenceIndex),
      -1,
    );
    const newManualIdx = maxManualIdx + 1;

    // Delete only auto-generated waypoints; preserve existing manual ones
    await prisma.routeWaypoint.deleteMany({
      where: { segmentId: segment.id, isManual: false },
    });

    // Create the new manual via-point
    await prisma.routeWaypoint.create({
      data: {
        segmentId: segment.id,
        sequenceIndex: newManualIdx,
        latitude: viaLat,
        longitude: viaLng,
        targetDurationSeconds: 0,
        actualDurationSeconds: 0,
        isManual: true,
      },
    });

    // Regenerate auto waypoints along the new polyline
    if (encodedPolyline) {
      const autoWaypoints = generateDistanceWaypoints(encodedPolyline, result.totalDurationSeconds);
      if (autoWaypoints.length > 0) {
        await prisma.routeWaypoint.createMany({
          data: autoWaypoints.map((wp, i) => ({
            segmentId: segment.id,
            sequenceIndex: newManualIdx + 1 + i,
            latitude: wp.latitude,
            longitude: wp.longitude,
            targetDurationSeconds: wp.targetDurationSeconds,
            actualDurationSeconds: wp.actualDurationSeconds,
            isManual: false,
          })),
        });
      }
    }

    // Return the updated segment with fresh waypoints
    const updatedSegment = await prisma.routeSegment.findUnique({
      where: { id: segment.id },
      include: { waypoints: { orderBy: { sequenceIndex: 'asc' } } },
    });

    return NextResponse.json(updatedSegment);
  } catch (err) {
    console.error('[PATCH /api/route-segments/:id] Error:', err);
    return NextResponse.json({ error: 'Failed to insert via-point' }, { status: 500 });
  }
}
