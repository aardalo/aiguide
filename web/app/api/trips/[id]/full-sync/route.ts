/**
 * Trip Full Sync API
 * Location: app/api/trips/[id]/full-sync/route.ts
 * 
 * Endpoints:
 * - GET /api/trips/{tripId}/full-sync - Get complete trip state
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/trips/{tripId}/full-sync
 * Get complete trip state including all related entities
 * 
 * Query parameters:
 * - since: ISO 8601 datetime (optional) - For future use (client-side reconciliation)
 * 
 * Response:
 * {
 *   trip: Trip object with all relations
 *   branches: Array of Branch objects
 *   dailyDestinations: Array of DailyDestination objects
 *   dailyPois: Array of DailyPoi objects
 *   routeSegments: Array of RouteSegment objects with waypoints
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params;

    // Verify trip exists
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        lastModifiedByDevice: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 }
      );
    }

    // Get all branches for this trip
    const branches = await prisma.branch.findMany({
      where: { tripId },
      orderBy: { sortOrder: "asc" },
    });

    // Get all daily destinations for this trip
    const dailyDestinations = await prisma.dailyDestination.findMany({
      where: { tripId },
      include: {
        lastModifiedByDevice: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ dayDate: "asc" }, { branchId: "asc" }],
    });

    // Get all daily POIs for this trip
    const dailyPois = await prisma.dailyPoi.findMany({
      where: { tripId },
      include: {
        lastModifiedByDevice: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ dayDate: "asc" }, { createdAt: "asc" }],
    });

    // Get all route segments for this trip
    const routeSegments = await prisma.routeSegment.findMany({
      where: { tripId },
      include: {
        waypoints: {
          orderBy: { sequenceIndex: "asc" },
          include: {
            lastModifiedByDevice: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        lastModifiedByDevice: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ dayDate: "asc" }, { branchId: "asc" }],
    });

    // Serialize trip data (handle JSON fields)
    const serializedTrip = {
      ...trip,
      routingPreferences: trip.routingPreferences
        ? JSON.parse(trip.routingPreferences)
        : null,
    };

    return NextResponse.json(
      {
        trip: serializedTrip,
        branches,
        dailyDestinations,
        dailyPois,
        routeSegments,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/trips/[id]/full-sync] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
