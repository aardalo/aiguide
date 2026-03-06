/**
 * Trip API Route Handlers
 * Location: app/api/trips/route.ts
 * Task: TASK-003
 * 
 * Endpoints:
 * - POST /api/trips - Create a new trip
 * - GET /api/trips - List all trips
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tripCreateSchema } from "@/lib/schemas/trip";

/**
 * POST /api/trips
 * Create a new trip
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request payload
    const validation = tripCreateSchema.safeParse(body);
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

    // Create trip in database
    const trip = await prisma.trip.create({
      data: {
        title: data.title,
        description: data.description || null,
        planMode: data.planMode ?? false,
        startDate: new Date(data.startDate),
        stopDate: new Date(data.stopDate),
        routingPreferences: data.routingPreferences ? JSON.stringify(data.routingPreferences) : null,
      },
    });

    const parsed = {
      ...trip,
      routingPreferences: trip.routingPreferences ? JSON.parse(trip.routingPreferences) : null,
    };
    return NextResponse.json(parsed, { status: 201 });
  } catch (error) {
    console.error("[POST /api/trips] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/trips
 * List all trips sorted by creation date (newest first)
 */
export async function GET(request: NextRequest) {
  try {
    const trips = await prisma.trip.findMany({
      orderBy: { createdAt: "desc" },
    });

    const parsed = trips.map((t) => ({
      ...t,
      routingPreferences: t.routingPreferences ? JSON.parse(t.routingPreferences) : null,
    }));
    return NextResponse.json(parsed, { status: 200 });
  } catch (error) {
    console.error("[GET /api/trips] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
