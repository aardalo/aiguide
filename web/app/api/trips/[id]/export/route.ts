/**
 * Trip Export API
 * Location: app/api/trips/[id]/export/route.ts
 *
 * Endpoints:
 * - GET /api/trips/{tripId}/export - Download a trip as a versioned JSON file
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildExportEnvelope, buildExportFilename } from '@/lib/trip-export/serialize';
import { getSessionUser, assertTripAccess, accessErrorResponse } from '@/lib/auth/access';

/**
 * GET /api/trips/{tripId}/export
 * Returns the complete trip as a versioned export envelope, served as a file
 * download (Content-Disposition: attachment).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: tripId } = await params;

    const { id: userId } = await getSessionUser();
    await assertTripAccess(userId, tripId, 'view');

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const [branches, dailyDestinations, dailyPois, routeSegments] =
      await Promise.all([
        prisma.branch.findMany({
          where: { tripId },
          orderBy: { sortOrder: 'asc' },
        }),
        prisma.dailyDestination.findMany({
          where: { tripId },
          orderBy: [{ dayDate: 'asc' }, { branchId: 'asc' }],
        }),
        prisma.dailyPoi.findMany({
          where: { tripId },
          orderBy: [{ dayDate: 'asc' }, { createdAt: 'asc' }],
        }),
        prisma.routeSegment.findMany({
          where: { tripId },
          include: {
            waypoints: { orderBy: { sequenceIndex: 'asc' } },
          },
          orderBy: [{ dayDate: 'asc' }, { branchId: 'asc' }],
        }),
      ]);

    const envelope = buildExportEnvelope({
      trip,
      branches,
      dailyDestinations,
      dailyPois,
      routeSegments,
    });

    const filename = buildExportFilename(trip.title);

    return new NextResponse(JSON.stringify(envelope, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const ae = accessErrorResponse(error);
    if (ae) return ae;
    console.error('[GET /api/trips/[id]/export] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
