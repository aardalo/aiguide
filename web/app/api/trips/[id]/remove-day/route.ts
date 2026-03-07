import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const removeDaySchema = z.object({
  date: z.string().date(),
});

/**
 * POST /api/trips/[id]/remove-day
 * Remove a day from the trip.
 * Deletes the destination, POIs and route segment for that date,
 * shifts all subsequent records back by 1 day,
 * then shrinks the trip's stopDate by 1 day.
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

  const parsed = removeDaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { date } = parsed.data;

  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  const dateObj = new Date(date + 'T00:00:00Z');
  const tripStart = new Date(trip.startDate);
  const tripStop = new Date(trip.stopDate);

  if (dateObj < tripStart || dateObj > tripStop) {
    return NextResponse.json(
      { error: 'date must be within the trip date range' },
      { status: 400 },
    );
  }

  // Don't allow removing the last remaining day
  const startStr = tripStart.toISOString().split('T')[0];
  const stopStr = tripStop.toISOString().split('T')[0];
  if (startStr === stopStr) {
    return NextResponse.json(
      { error: 'Cannot remove the only day of the trip' },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    // Delete destination, POIs, and route segments/waypoints for this date
    const destForDate = await tx.dailyDestination.findFirst({
      where: { tripId: id, dayDate: dateObj },
    });

    if (destForDate) {
      // Delete waypoints for any route segment on this date
      const segForDate = await tx.routeSegment.findFirst({
        where: { tripId: id, dayDate: dateObj },
      });
      if (segForDate) {
        await tx.routeWaypoint.deleteMany({ where: { segmentId: segForDate.id } });
      }
      await tx.routeSegment.deleteMany({ where: { tripId: id, dayDate: dateObj } });
      await tx.dailyPoi.deleteMany({ where: { tripId: id, dayDate: dateObj } });
      await tx.dailyDestination.delete({ where: { id: destForDate.id } });
    } else {
      // Even without a destination there may be POIs or segments
      const segForDate = await tx.routeSegment.findFirst({
        where: { tripId: id, dayDate: dateObj },
      });
      if (segForDate) {
        await tx.routeWaypoint.deleteMany({ where: { segmentId: segForDate.id } });
      }
      await tx.routeSegment.deleteMany({ where: { tripId: id, dayDate: dateObj } });
      await tx.dailyPoi.deleteMany({ where: { tripId: id, dayDate: dateObj } });
    }

    // Shift all records after this date back by 1 day (process forwards to avoid unique constraint clash)
    const destsToShift = await tx.dailyDestination.findMany({
      where: { tripId: id, dayDate: { gt: dateObj } },
      orderBy: { dayDate: 'asc' },
    });

    for (const dest of destsToShift) {
      const newDate = new Date(dest.dayDate);
      newDate.setUTCDate(newDate.getUTCDate() - 1);
      await tx.dailyDestination.update({
        where: { id: dest.id },
        data: { dayDate: newDate },
      });
    }

    const poisToShift = await tx.dailyPoi.findMany({
      where: { tripId: id, dayDate: { gt: dateObj } },
      orderBy: { dayDate: 'asc' },
    });

    for (const poi of poisToShift) {
      const newDate = new Date(poi.dayDate);
      newDate.setUTCDate(newDate.getUTCDate() - 1);
      await tx.dailyPoi.update({
        where: { id: poi.id },
        data: { dayDate: newDate },
      });
    }

    const segsToShift = await tx.routeSegment.findMany({
      where: { tripId: id, dayDate: { gt: dateObj } },
      orderBy: { dayDate: 'asc' },
    });

    for (const seg of segsToShift) {
      const newDate = new Date(seg.dayDate);
      newDate.setUTCDate(newDate.getUTCDate() - 1);
      await tx.routeSegment.update({
        where: { id: seg.id },
        data: { dayDate: newDate },
      });
    }

    // Shrink trip stopDate by 1 day
    const newStopDate = new Date(tripStop);
    newStopDate.setUTCDate(newStopDate.getUTCDate() - 1);
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
