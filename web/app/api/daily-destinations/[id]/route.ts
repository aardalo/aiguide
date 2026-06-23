/**
 * Daily Destination Detail API Route Handlers
 * Location: app/api/daily-destinations/[id]/route.ts
 * Task: TASK-009
 * 
 * Endpoints:
 * - GET /api/daily-destinations/[id] - Get a specific daily destination
 * - PATCH /api/daily-destinations/[id] - Update a daily destination
 * - DELETE /api/daily-destinations/[id] - Delete a daily destination
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dailyDestinationUpdateSchema } from "@/lib/schemas/trip";
import { getSessionUser, assertTripAccess, subResourceAccessErrorResponse as accessErrorResponse } from "@/lib/auth/access";

/**
 * GET /api/daily-destinations/[id]
 * Retrieve a specific daily destination
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const destination = await prisma.dailyDestination.findUnique({
      where: { id },
    });

    if (!destination) {
      return NextResponse.json(
        { error: "Daily destination not found" },
        { status: 404 }
      );
    }

    const { id: userId } = await getSessionUser();
    await assertTripAccess(userId, destination.tripId, 'view');

    return NextResponse.json(destination, { status: 200 });
  } catch (error) {
    const ae = accessErrorResponse(error);
    if (ae) return ae;
    console.error("[GET /api/daily-destinations/[id]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/daily-destinations/[id]
 * Update a daily destination
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const deviceId = (body as Record<string, unknown>).deviceId as string | undefined;
    // Validate request payload
    const validation = dailyDestinationUpdateSchema.safeParse(body);
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

    // Check if daily destination exists
    const existingDestination = await prisma.dailyDestination.findUnique({
      where: { id },
      include: { trip: true, branch: true },
    });

    if (!existingDestination) {
      return NextResponse.json(
        { error: "Daily destination not found" },
        { status: 404 }
      );
    }

    const { id: userId } = await getSessionUser();
    await assertTripAccess(userId, existingDestination.tripId, 'edit');

    // Validate day date is within trip date range if being updated
    if (data.dayDate) {
      const dayDate = new Date(data.dayDate);
      if (
        dayDate < existingDestination.trip.startDate ||
        dayDate > existingDestination.trip.stopDate
      ) {
        return NextResponse.json(
          {
            error:
              "Day date must be within trip start and stop dates",
          },
          { status: 400 }
        );
      }

      if (existingDestination.branchId && existingDestination.branch && dayDate < existingDestination.branch.anchorDayDate) {
        return NextResponse.json(
          { error: "Branch destinations cannot be scheduled before the fork anchor day" },
          { status: 400 }
        );
      }

      const existingForDate = await prisma.dailyDestination.findFirst({
        where: {
          tripId: existingDestination.tripId,
          dayDate,
          branchId: existingDestination.branchId,
          id: { not: id },
        },
        select: { id: true },
      });

      if (existingForDate) {
        return NextResponse.json(
          { error: "A destination already exists for this date. Use Edit to update it." },
          { status: 409 }
        );
      }
    }

    // Layover cannot be the first day of the trip
    if (data.isLayover) {
      const tripStartStr = existingDestination.trip.startDate.toISOString().slice(0, 10);
      const destDateStr = existingDestination.dayDate.toISOString().slice(0, 10);
      if (destDateStr === tripStartStr) {
        return NextResponse.json(
          { error: "The first day of a trip cannot be a layover" },
          { status: 400 }
        );
      }
    }

    // Update daily destination
    const updateData: Record<string, unknown> = {};
    if (data.dayDate !== undefined) updateData.dayDate = new Date(data.dayDate);
    if (data.name !== undefined) updateData.name = data.name;
    if (data.municipality !== undefined) updateData.municipality = data.municipality;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.isLayover !== undefined) updateData.isLayover = data.isLayover;
    if (deviceId) updateData.lastModifiedByDeviceId = deviceId;

    const updatedDestination = await prisma.dailyDestination.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedDestination, { status: 200 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A destination already exists for this date. Use Edit to update it." },
        { status: 409 }
      );
    }
    const ae = accessErrorResponse(error);
    if (ae) return ae;
    console.error("[PATCH /api/daily-destinations/[id]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/daily-destinations/[id]
 * Delete a daily destination
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if daily destination exists
    const existingDestination = await prisma.dailyDestination.findUnique({
      where: { id },
    });

    if (!existingDestination) {
      return NextResponse.json(
        { error: "Daily destination not found" },
        { status: 404 }
      );
    }

    const { id: userId } = await getSessionUser();
    await assertTripAccess(userId, existingDestination.tripId, 'edit');

    // Delete route segments that reference this destination (fromDestinationId
    // and toDestinationId are plain strings, not FK constraints, so no cascade).
    await prisma.routeSegment.deleteMany({
      where: {
        OR: [
          { fromDestinationId: id },
          { toDestinationId: id },
        ],
      },
    });

    // Delete daily destination
    const deletedDestination = await prisma.dailyDestination.delete({
      where: { id },
    });

    return NextResponse.json(deletedDestination, { status: 200 });
  } catch (error) {
    const ae = accessErrorResponse(error);
    if (ae) return ae;
    console.error("[DELETE /api/daily-destinations/[id]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
