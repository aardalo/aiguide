import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const insertDaySchema = z.object({
  afterDate: z.string().date(),
});

/**
 * POST /api/trips/[id]/insert-day
 * Insert a blank day after the given date.
 * Shifts all subsequent destinations, POIs and route segments forward by 1 day,
 * then extends the trip's stopDate by 1 day.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = insertDaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { afterDate } = parsed.data;

  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  const afterDateObj = new Date(afterDate + 'T00:00:00Z');
  const tripStop = new Date(trip.stopDate);

  // afterDate must be within the trip range
  const tripStart = new Date(trip.startDate);
  if (afterDateObj < tripStart || afterDateObj > tripStop) {
    return NextResponse.json(
      { error: 'afterDate must be within the trip date range' },
      { status: 400 },
    );
  }

  // Shift dates in a transaction: process from the last date backwards
  // to avoid unique constraint violations on (tripId, dayDate)
  const newStopDate = new Date(tripStop);
  newStopDate.setUTCDate(newStopDate.getUTCDate() + 1);

  await prisma.$transaction(async (tx) => {
    // Find all dates that need shifting (strictly after afterDate)
    const destsToShift = await tx.dailyDestination.findMany({
      where: { tripId: id, dayDate: { gt: afterDateObj } },
      orderBy: { dayDate: 'desc' },
    });

    const poisToShift = await tx.dailyPoi.findMany({
      where: { tripId: id, dayDate: { gt: afterDateObj } },
      orderBy: { dayDate: 'desc' },
    });

    const segsToShift = await tx.routeSegment.findMany({
      where: { tripId: id, dayDate: { gt: afterDateObj } },
      orderBy: { dayDate: 'desc' },
    });

    // Shift destinations (backwards to avoid unique constraint clash)
    for (const dest of destsToShift) {
      const newDate = new Date(dest.dayDate);
      newDate.setUTCDate(newDate.getUTCDate() + 1);
      await tx.dailyDestination.update({
        where: { id: dest.id },
        data: { dayDate: newDate },
      });
    }

    // Shift POIs
    for (const poi of poisToShift) {
      const newDate = new Date(poi.dayDate);
      newDate.setUTCDate(newDate.getUTCDate() + 1);
      await tx.dailyPoi.update({
        where: { id: poi.id },
        data: { dayDate: newDate },
      });
    }

    // Shift route segments
    for (const seg of segsToShift) {
      const newDate = new Date(seg.dayDate);
      newDate.setUTCDate(newDate.getUTCDate() + 1);
      await tx.routeSegment.update({
        where: { id: seg.id },
        data: { dayDate: newDate },
      });
    }

    // Extend trip stopDate
    await tx.trip.update({
      where: { id },
      data: { stopDate: newStopDate },
    });
  });

  const updatedTrip = await prisma.trip.findUnique({ where: { id } });
  return NextResponse.json({
    ...updatedTrip,
    routingPreferences: updatedTrip?.routingPreferences
      ? JSON.parse(updatedTrip.routingPreferences)
      : null,
  });
}
