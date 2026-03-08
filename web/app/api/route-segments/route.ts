/**
 * Route Segments API Route Handlers
 * Location: app/api/route-segments/route.ts
 *
 * Endpoints:
 * - GET  /api/route-segments?tripId=xxx  — List persisted segments for a trip
 * - POST /api/route-segments             — Generate (or re-generate) segments for a trip
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveRoutingProvider } from '@/lib/routing';
import { generateDistanceWaypoints } from '@/lib/routing/waypoints';
import { getSetting, SETTING_KEYS } from '@/lib/settings';
import { routeSegmentGenerateSchema } from '@/lib/schemas/routing';

/** GET /api/route-segments?tripId=xxx */
export async function GET(request: NextRequest) {
  const tripId = request.nextUrl.searchParams.get('tripId');
  if (!tripId) {
    return NextResponse.json(
      { error: 'tripId query parameter is required' },
      { status: 400 },
    );
  }

  try {
    const segments = await prisma.routeSegment.findMany({
      where: { tripId },
      orderBy: { dayDate: 'asc' },
      include: { waypoints: { orderBy: { sequenceIndex: 'asc' } } },
    });
    return NextResponse.json(segments);
  } catch (err) {
    console.error('[GET /api/route-segments] Error:', err);
    return NextResponse.json({ error: 'Failed to load route segments' }, { status: 500 });
  }
}

/** POST /api/route-segments — body: { tripId } */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = routeSegmentGenerateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.flatten() },
        { status: 400 },
      );
    }

    const { tripId, branchId } = validation.data;
    const effectiveBranchId = branchId ?? null;

    // Load destinations, home setting, and trip preferences in parallel
    const [allDestinations, homeName, homeLatStr, homeLngStr, trip] = await Promise.all([
      prisma.dailyDestination.findMany({ where: { tripId }, orderBy: { dayDate: 'asc' } }),
      getSetting(SETTING_KEYS.HOME_NAME),
      getSetting(SETTING_KEYS.HOME_LATITUDE),
      getSetting(SETTING_KEYS.HOME_LONGITUDE),
      prisma.trip.findUnique({ where: { id: tripId }, select: { routingPreferences: true } }),
    ]);

    const preferences = trip?.routingPreferences
      ? JSON.parse(trip.routingPreferences)
      : undefined;

    // Separate main-branch and target-branch destinations
    const mainDests = allDestinations.filter((d) => d.branchId === null);
    const targetDests = effectiveBranchId
      ? allDestinations.filter((d) => d.branchId === effectiveBranchId)
      : mainDests;

    // Filter to only destinations that have coordinates
    const withCoords = targetDests.filter(
      (d) => d.latitude !== null && d.longitude !== null,
    );

    // Build ordered route points: home (if set) then destinations
    type RoutePoint = { id: string; name: string; latitude: number; longitude: number; dayDate?: Date };
    const homePoint: RoutePoint | null =
      homeName && homeLatStr && homeLngStr
        ? { id: 'home', name: homeName, latitude: parseFloat(homeLatStr), longitude: parseFloat(homeLngStr) }
        : null;

    const destPoints: RoutePoint[] = withCoords.map((d) => ({
      id: d.id,
      name: d.name,
      latitude: d.latitude!,
      longitude: d.longitude!,
      dayDate: d.dayDate,
    }));

    // For branches: find entry point (main-branch day before) and exit point (main-branch day after)
    let entryPoint: RoutePoint | null = null;
    let exitPoint: RoutePoint | null = null;
    if (effectiveBranchId && destPoints.length > 0) {
      const firstBranchDate = destPoints[0].dayDate!;
      const lastBranchDate = destPoints[destPoints.length - 1].dayDate!;
      const mainWithCoords = mainDests.filter((d) => d.latitude !== null && d.longitude !== null);

      // Entry: last main-branch dest with date < first branch date
      const entryDest = [...mainWithCoords].reverse().find((d) => d.dayDate < firstBranchDate);
      if (entryDest) {
        entryPoint = { id: entryDest.id, name: entryDest.name, latitude: entryDest.latitude!, longitude: entryDest.longitude!, dayDate: entryDest.dayDate };
      }

      // Exit: first main-branch dest with date > last branch date
      const exitDest = mainWithCoords.find((d) => d.dayDate > lastBranchDate);
      if (exitDest) {
        exitPoint = { id: exitDest.id, name: exitDest.name, latitude: exitDest.latitude!, longitude: exitDest.longitude!, dayDate: exitDest.dayDate };
      }
    }

    // Build the full point list
    let allPoints: RoutePoint[];
    if (effectiveBranchId) {
      allPoints = [
        ...(entryPoint ? [entryPoint] : homePoint ? [homePoint] : []),
        ...destPoints,
        ...(exitPoint ? [exitPoint] : []),
      ];
    } else {
      allPoints = homePoint ? [homePoint, ...destPoints] : destPoints;
    }

    if (allPoints.length < 2) {
      return NextResponse.json(
        {
          error:
            withCoords.length === 0
              ? 'Destinations need location coordinates. Search for each destination by name to set its location.'
              : 'At least two route points are required (set a Home location in Settings, or add more destinations).',
          code: 'insufficient_destinations',
        },
        { status: 422 },
      );
    }

    // Resolve the active routing provider
    let provider;
    try {
      provider = await getActiveRoutingProvider();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load routing provider';
      return NextResponse.json({ error: message }, { status: 503 });
    }

    // Generate one segment per consecutive pair of points.
    // When home is set: Home → dest[0], dest[0] → dest[1], etc.
    // Otherwise:        dest[0] → dest[1], dest[1] → dest[2], etc.
    // The "to" point is always a destination (has dayDate); home is only ever the first "from".
    const generated: object[] = [];
    const errors: string[] = [];

    for (let i = 0; i < allPoints.length - 1; i++) {
      const from = allPoints[i];
      const to = allPoints[i + 1] as Required<RoutePoint>; // to always has dayDate

      try {
        // Load any manual via-points already saved for this segment so they are
        // preserved across re-routes (e.g. after a destination coordinate change).
        // For branch segments, the dayDate is the branch dest's date (not the entry/exit point)
        const segDayDate = to.dayDate;

        const existingSegment = await prisma.routeSegment.findFirst({
          where: { tripId, dayDate: segDayDate, branchId: effectiveBranchId },
          include: { waypoints: { where: { isManual: true }, orderBy: { sequenceIndex: 'asc' } } },
        });
        const manualWaypoints = existingSegment?.waypoints ?? [];

        const result = await provider.getRoute({
          waypoints: [
            { latitude: from.latitude, longitude: from.longitude },
            ...manualWaypoints.map((wp) => ({ latitude: wp.latitude, longitude: wp.longitude })),
            { latitude: to.latitude, longitude: to.longitude },
          ],
          preferences,
        });

        const leg = result.legs[0];

        const segData = {
          fromDestinationId: from.id,
          toDestinationId: to.id,
          provider: provider.id,
          distanceMeters: leg.distanceMeters,
          durationSeconds: leg.durationSeconds,
          encodedPolyline: leg.encodedPolyline ?? null,
        };

        // Find-then-create/update (partial unique indexes don't support Prisma upsert)
        let segment;
        if (existingSegment) {
          segment = await prisma.routeSegment.update({
            where: { id: existingSegment.id },
            data: segData,
          });
        } else {
          segment = await prisma.routeSegment.create({
            data: {
              tripId,
              dayDate: segDayDate,
              branchId: effectiveBranchId,
              ...segData,
            },
          });
        }

        // Regenerate auto waypoints every 50 km along the new polyline (STORY-006).
        // Only delete auto-generated waypoints; manual via-points are preserved.
        const waypointData = leg.encodedPolyline
          ? generateDistanceWaypoints(leg.encodedPolyline, leg.durationSeconds)
          : [];
        await prisma.routeWaypoint.deleteMany({ where: { segmentId: segment.id, isManual: false } });
        const maxManualIdx = manualWaypoints.reduce(
          (max, wp) => Math.max(max, wp.sequenceIndex),
          -1,
        );
        if (waypointData.length > 0) {
          await prisma.routeWaypoint.createMany({
            data: waypointData.map((wp, idx) => ({
              segmentId: segment.id,
              sequenceIndex: maxManualIdx + 1 + idx,
              latitude: wp.latitude,
              longitude: wp.longitude,
              targetDurationSeconds: wp.targetDurationSeconds,
              actualDurationSeconds: wp.actualDurationSeconds,
              isManual: false,
            })),
          });
        }

        generated.push(segment);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : `Failed to route ${from.name} → ${to.name}`;
        errors.push(`${from.name} → ${to.name}: ${message}`);
      }
    }

    if (generated.length === 0) {
      return NextResponse.json(
        { error: 'All route segments failed to generate', details: errors },
        { status: 502 },
      );
    }

    // Re-fetch generated segments with nested waypoints for the response
    const segmentsWithWaypoints = await prisma.routeSegment.findMany({
      where: { tripId },
      orderBy: { dayDate: 'asc' },
      include: { waypoints: { orderBy: { sequenceIndex: 'asc' } } },
    });

    return NextResponse.json(
      { segments: segmentsWithWaypoints, errors: errors.length > 0 ? errors : undefined },
      { status: errors.length > 0 ? 207 : 200 },
    );
  } catch (err) {
    console.error('[POST /api/route-segments] Error:', err);
    return NextResponse.json({ error: 'Failed to generate route segments' }, { status: 500 });
  }
}
