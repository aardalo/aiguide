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

    // Update trip
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.planMode !== undefined) updateData.planMode = data.planMode;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.stopDate !== undefined) updateData.stopDate = new Date(data.stopDate);
    if (data.routingPreferences !== undefined) {
      updateData.routingPreferences = data.routingPreferences ? JSON.stringify(data.routingPreferences) : null;
    }

    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: updateData,
    });

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
