/**
 * Trip Detail API Route Handlers
 * Location: app/api/trips/[id]/route.ts
 * Task: TASK-003
 * 
 * Endpoints:
 * - GET /api/trips/[id] - Get a specific trip
 * - PATCH /api/trips/[id] - Update a trip
 * - DELETE /api/trips/[id] - Delete a trip
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tripUpdateSchema } from "@/lib/schemas/trip";
import {
  ALLOW_TRIP_DELETE_ENV,
  ALLOW_TRIP_DELETE_HEADER,
  ALLOW_TRIP_DELETE_VALUE,
  canBypassTripDeleteSafeguard,
  isMarkedTestTrip,
  isNonProductionEnvironment,
} from "@/lib/trip-delete-safeguard";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toUtcDateOnly = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const addUtcDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

/**
 * GET /api/trips/[id]
 * Retrieve a specific trip by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const trip = await prisma.trip.findUnique({
      where: { id },
    });

    if (!trip) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 }
      );
    }

    const parsed = {
      ...trip,
      routingPreferences: trip.routingPreferences ? JSON.parse(trip.routingPreferences) : null,
    };
    return NextResponse.json(parsed, { status: 200 });
  } catch (error) {
    console.error("[GET /api/trips/[id]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/trips/[id]
 * Update a trip (title, description, dates)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate request payload
    const validation = tripUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if trip exists
    const existingTrip = await prisma.trip.findUnique({
      where: { id },
    });

    if (!existingTrip) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 }
      );
    }

    const existingStart = toUtcDateOnly(existingTrip.startDate);
    const existingStop = toUtcDateOnly(existingTrip.stopDate);
    const requestedStart = data.startDate !== undefined ? toUtcDateOnly(data.startDate) : null;
    const hasStartUpdate = requestedStart !== null;
    const dayOffset = hasStartUpdate
      ? Math.round((requestedStart.getTime() - existingStart.getTime()) / MS_PER_DAY)
      : 0;
    const hasStartShift = hasStartUpdate && dayOffset !== 0;

    // Stop date is derived from timeline length when start date shifts.
    // If start date is unchanged, reject explicit stop-date changes and ask
    // clients to use insert/remove-day actions to alter trip duration.
    if (data.stopDate !== undefined && !hasStartShift) {
      const requestedStop = toUtcDateOnly(data.stopDate);
      if (requestedStop.getTime() !== existingStop.getTime()) {
        return NextResponse.json(
          {
            error:
              "Stop date is derived from the journey timeline. To change trip length, insert or remove days.",
          },
          { status: 400 }
        );
      }
    }

    const baseUpdateData: Record<string, unknown> = {};
    if (data.title !== undefined) baseUpdateData.title = data.title;
    if (data.description !== undefined) baseUpdateData.description = data.description || null;
    if (data.planMode !== undefined) baseUpdateData.planMode = data.planMode;
    if (data.routingPreferences !== undefined) {
      baseUpdateData.routingPreferences = data.routingPreferences
        ? JSON.stringify(data.routingPreferences)
        : null;
    }

    let updatedTrip;

    if (!hasStartShift) {
      if (hasStartUpdate && requestedStart) {
        baseUpdateData.startDate = requestedStart;
      }

      updatedTrip = await prisma.trip.update({
        where: { id },
        data: baseUpdateData,
      });
    } else {
      const shiftForward = dayOffset > 0;

      updatedTrip = await prisma.$transaction(async (tx) => {
        const [destinations, pois, segments, branches] = await Promise.all([
          tx.dailyDestination.findMany({
            where: { tripId: id },
            orderBy: { dayDate: shiftForward ? "desc" : "asc" },
          }),
          tx.dailyPoi.findMany({
            where: { tripId: id },
            orderBy: { dayDate: shiftForward ? "desc" : "asc" },
          }),
          tx.routeSegment.findMany({
            where: { tripId: id },
            orderBy: { dayDate: shiftForward ? "desc" : "asc" },
          }),
          tx.branch.findMany({
            where: { tripId: id },
            orderBy: { anchorDayDate: shiftForward ? "desc" : "asc" },
          }),
        ]);

        for (const destination of destinations) {
          await tx.dailyDestination.update({
            where: { id: destination.id },
            data: { dayDate: addUtcDays(destination.dayDate, dayOffset) },
          });
        }

        for (const poi of pois) {
          await tx.dailyPoi.update({
            where: { id: poi.id },
            data: { dayDate: addUtcDays(poi.dayDate, dayOffset) },
          });
        }

        for (const segment of segments) {
          await tx.routeSegment.update({
            where: { id: segment.id },
            data: { dayDate: addUtcDays(segment.dayDate, dayOffset) },
          });
        }

        for (const branch of branches) {
          await tx.branch.update({
            where: { id: branch.id },
            data: { anchorDayDate: addUtcDays(branch.anchorDayDate, dayOffset) },
          });
        }

        return tx.trip.update({
          where: { id },
          data: {
            ...baseUpdateData,
            startDate: requestedStart!,
            stopDate: addUtcDays(existingStop, dayOffset),
          },
        });
      });
    }

    const parsed = {
      ...updatedTrip,
      routingPreferences: updatedTrip.routingPreferences ? JSON.parse(updatedTrip.routingPreferences) : null,
    };
    return NextResponse.json(parsed, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/trips/[id]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trips/[id]
 * Delete a trip
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if trip exists
    const existingTrip = await prisma.trip.findUnique({
      where: { id },
    });

    if (!existingTrip) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 }
      );
    }

    if (
      isNonProductionEnvironment() &&
      !isMarkedTestTrip(existingTrip) &&
      !canBypassTripDeleteSafeguard(request.headers)
    ) {
      return NextResponse.json(
        {
          error:
            "Trip deletion is blocked in development and test environments unless the trip is marked as a test trip or you explicitly override the safeguard.",
          code: "trip_delete_blocked_in_non_production",
          override: {
            header: `${ALLOW_TRIP_DELETE_HEADER}: ${ALLOW_TRIP_DELETE_VALUE}`,
            env: `${ALLOW_TRIP_DELETE_ENV}=true`,
          },
        },
        { status: 403 }
      );
    }

    // Delete trip
    const deletedTrip = await prisma.trip.delete({
      where: { id },
    });

    return NextResponse.json(deletedTrip, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/trips/[id]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
