/**
 * Route Waypoints API — single-waypoint update
 * Location: app/api/route-waypoints/[id]/route.ts
 *
 * PATCH /api/route-waypoints/:id
 *   Move an interval waypoint to a new position and recompute the owning
 *   route segment.  STORY-007.
 *
 * Via-point semantics:
 *   - isManual=true  waypoints are USER-PLACED routing handles.  They act as
 *     via-points every time the segment is re-routed.
 *   - isManual=false waypoints are AUTO-GENERATED visual markers (every 50 km).
 *     They are NOT routing via-points — they live only on the current polyline
 *     and must be regenerated whenever the polyline changes.
 *
 * On each move:
 *   1. Route through [from, ...manual via-points (with moved one updated), to].
 *   2. Update segment polyline/distance/duration.
 *   3. Mark the moved waypoint as manual.
 *   4. Delete all auto-generated (isManual=false) waypoints — they are stale.
 *   5. Regenerate auto waypoints on the new polyline.
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

    const { latitude: newLat, longitude: newLng } = validation.data;

    // Find waypoint and its owning segment, including all sibling waypoints
    const waypoint = await prisma.routeWaypoint.findUnique({
      where: { id },
      include: {
        segment: {
          include: { waypoints: { orderBy: { sequenceIndex: 'asc' } } },
        },
      },
    });

    if (!waypoint) {
      return NextResponse.json({ error: 'Waypoint not found' }, { status: 404 });
    }

    const segment = waypoint.segment;

    // Resolve from-coordinates (either home or a DailyDestination)
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

    // Build via-points from MANUAL waypoints only (in sequence order).
    // Auto-generated waypoints are NOT routing handles — they are visual markers
    // on the current polyline and become stale whenever the route changes.
    // The moved waypoint becomes manual (whether it was before or not).
    const manualViaPoints = segment.waypoints
      .filter((wp) => wp.isManual || wp.id === id)
      .map((wp) =>
        wp.id === id
          ? { latitude: newLat, longitude: newLng }
          : { latitude: wp.latitude, longitude: wp.longitude },
      );

    // Recompute route: from → [manual via-points] → to
    const result = await provider.getRoute({
      waypoints: [fromCoords, ...manualViaPoints, toCoords],
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

    // Persist the moved waypoint at its new position and mark it manual
    await prisma.routeWaypoint.update({
      where: { id },
      data: { latitude: newLat, longitude: newLng, isManual: true },
    });

    // Remove all auto-generated waypoints — they were placed on the old polyline
    await prisma.routeWaypoint.deleteMany({
      where: { segmentId: segment.id, isManual: false },
    });

    // Regenerate auto waypoints on the new polyline.
    // Use sequenceIndexes above the highest existing manual index to avoid conflicts.
    if (encodedPolyline) {
      const autoWaypoints = generateDistanceWaypoints(
        encodedPolyline,
        result.totalDurationSeconds,
      );
      if (autoWaypoints.length > 0) {
        const maxManualIdx = segment.waypoints
          .filter((wp) => wp.isManual || wp.id === id)
          .reduce((max, wp) => Math.max(max, wp.sequenceIndex), -1);

        await prisma.routeWaypoint.createMany({
          data: autoWaypoints.map((wp, i) => ({
            segmentId: segment.id,
            sequenceIndex: maxManualIdx + 1 + i,
            latitude: wp.latitude,
            longitude: wp.longitude,
            targetDurationSeconds: wp.targetDurationSeconds,
            actualDurationSeconds: wp.actualDurationSeconds,
            isManual: false,
          })),
        });
      }
    }

    // Return the updated segment with all waypoints
    const updatedSegment = await prisma.routeSegment.findUnique({
      where: { id: segment.id },
      include: { waypoints: { orderBy: { sequenceIndex: 'asc' } } },
    });

    return NextResponse.json(updatedSegment);
  } catch (err) {
    console.error('[PATCH /api/route-waypoints/:id] Error:', err);
    return NextResponse.json({ error: 'Failed to update waypoint' }, { status: 500 });
  }
}
