/**
 * Daily Destination API Route Handlers
 * Location: app/api/daily-destinations/route.ts
 * Task: TASK-009
 * 
 * Endpoints:
 * - GET /api/daily-destinations?tripId=xxx - List daily destinations for a trip
 * - POST /api/daily-destinations - Create a new daily destination
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  dailyDestinationCreateSchema,
  dailyDestinationResponseSchema,
} from "@/lib/schemas/trip";

/**
 * GET /api/daily-destinations?tripId=xxx
 * List all daily destinations for a trip
 */
export async function GET(request: NextRequest) {
  try {
    const tripId = request.nextUrl.searchParams.get("tripId");

    if (!tripId) {
      return NextResponse.json(
        { error: "tripId query parameter is required" },
        { status: 400 }
      );
    }

    // Verify trip exists
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 }
      );
    }

    const destinations = await prisma.dailyDestination.findMany({
      where: { tripId },
      orderBy: { dayDate: "asc" },
    });

    return NextResponse.json(destinations, { status: 200 });
  } catch (error) {
    console.error("[GET /api/daily-destinations] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/daily-destinations
 * Create a new daily destination for a trip
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request payload
    const validation = dailyDestinationCreateSchema.safeParse(body);
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

    // tripId must be provided in the request body
    const tripId = (body as any).tripId;
    if (!tripId) {
      return NextResponse.json(
        { error: "tripId is required" },
        { status: 400 }
      );
    }

    // Verify trip exists
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 }
      );
    }

    // Validate day date is within trip date range
    const dayDate = new Date(data.dayDate);
    if (dayDate < trip.startDate || dayDate > trip.stopDate) {
      return NextResponse.json(
        {
          error: "Day date must be within trip start and stop dates",
        },
        { status: 400 }
      );
    }

    // Create daily destination
    const destination = await prisma.dailyDestination.create({
      data: {
        tripId,
        dayDate,
        name: data.name,
        municipality: data.municipality ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        notes: data.notes ?? null,
        branchId: data.branchId ?? null,
      },
    });

    return NextResponse.json(destination, { status: 201 });
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
    console.error("[POST /api/daily-destinations] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
