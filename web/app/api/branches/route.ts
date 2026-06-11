import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { branchCreateSchema } from '@/lib/schemas/trip';
import { nextBranchColor } from '@/lib/branches';
import { getSessionUser, assertTripAccess, accessErrorResponse } from '@/lib/auth/access';

/**
 * GET /api/branches?tripId=xxx
 * List all branches for a trip.
 */
export async function GET(request: NextRequest) {
  try {
    const tripId = request.nextUrl.searchParams.get('tripId');
    if (!tripId) {
      return NextResponse.json({ error: 'tripId query parameter is required' }, { status: 400 });
    }

    const { id: userId } = await getSessionUser();
    await assertTripAccess(userId, tripId, 'view');

    const branches = await prisma.branch.findMany({
      where: { tripId },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(branches);
  } catch (error) {
    const ae = accessErrorResponse(error);
    if (ae) return ae;
    console.error('[GET /api/branches] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/branches
 * Create a new branch for a trip, starting at the given day.
 * Body: { tripId, dayDate, name? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = branchCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.flatten() },
        { status: 400 },
      );
    }

    const { tripId, dayDate, name } = validation.data;

    const { id: userId } = await getSessionUser();
    await assertTripAccess(userId, tripId, 'edit');

    // Verify trip exists
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const dayDateObj = new Date(dayDate + 'T00:00:00.000Z');
    const tripStart = new Date(trip.startDate);
    const tripStop = new Date(trip.stopDate);
    if (dayDateObj < tripStart || dayDateObj > tripStop) {
      return NextResponse.json(
        { error: 'dayDate must be within trip start and stop dates' },
        { status: 400 },
      );
    }

    // Count existing branches for color assignment
    const existingCount = await prisma.branch.count({ where: { tripId } });
    const color = nextBranchColor(existingCount);

    const branch = await prisma.branch.create({
      data: {
        tripId,
        name: name || `Branch ${existingCount + 1}`,
        color,
        sortOrder: existingCount,
        anchorDayDate: dayDateObj,
      },
    });

    // Create a blank destination for the branch on the starting day.
    // This first branch destination acts as the fork anchor day.
    await prisma.dailyDestination.create({
      data: {
        tripId,
        dayDate: dayDateObj,
        name: '(unset)',
        branchId: branch.id,
      },
    });

    return NextResponse.json(branch, { status: 201 });
  } catch (error) {
    const ae = accessErrorResponse(error);
    if (ae) return ae;
    console.error('[POST /api/branches] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
