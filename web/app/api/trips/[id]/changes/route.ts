/**
 * Trip Changes Detection API
 * Location: app/api/trips/[id]/changes/route.ts
 * 
 * Endpoints:
 * - GET /api/trips/{tripId}/changes - Get all changes since a timestamp
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const changesQuerySchema = z.object({
  since: z.string().datetime().optional(),
  deviceId: z.string().cuid().optional(),
});

type ChangeItem = {
  id: string;
  type: string; // 'trip' | 'destination' | 'poi' | 'route_segment' | 'route_waypoint'
  tripId: string;
  updatedAt: string;
  lastModifiedByDeviceId: string | null;
  deviceName: string | null;
};

/**
 * GET /api/trips/{tripId}/changes
 * Get all changes for a trip since a given timestamp
 * 
 * Query parameters:
 * - since: ISO 8601 datetime (optional) - Only return changes after this time. Default: 5 minutes ago
 * - deviceId: cuid (optional) - Filter changes by specific device (for UI display)
 * 
 * Response:
 * {
 *   changes: Array of ChangeItem objects
 *   lastSyncTime: ISO 8601 datetime - Current server time for next sync
 * }
 * 
 * ChangeItem:
 * {
 *   id: string - Entity ID
 *   type: string - Entity type
 *   tripId: string
 *   updatedAt: string - ISO 8601
 *   lastModifiedByDeviceId: string | null
 *   deviceName: string | null - Human-readable device name
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params;
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const sinceStr = searchParams.get("since");
    const deviceIdFilter = searchParams.get("deviceId");

    // Default: return changes from last 5 minutes if no timestamp provided
    const since = sinceStr ? new Date(sinceStr) : new Date(Date.now() - 5 * 60 * 1000);

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

    // Collect all changes across all entities
    const changes: ChangeItem[] = [];

    // Get changed trip metadata
    if (trip.updatedAt > since) {
      const device = trip.lastModifiedByDeviceId
        ? await prisma.device.findUnique({
            where: { id: trip.lastModifiedByDeviceId },
          })
        : null;

      changes.push({
        id: trip.id,
        type: "trip",
        tripId: trip.id,
        updatedAt: trip.updatedAt.toISOString(),
        lastModifiedByDeviceId: trip.lastModifiedByDeviceId,
        deviceName: device?.name || null,
      });
    }

    // Get changed daily destinations
    const destinations = await prisma.dailyDestination.findMany({
      where: {
        tripId,
        updatedAt: { gt: since },
      },
      include: {
        lastModifiedByDevice: true,
      },
    });

    changes.push(
      ...destinations.map((d) => ({
        id: d.id,
        type: "destination",
        tripId: d.tripId,
        updatedAt: d.updatedAt.toISOString(),
        lastModifiedByDeviceId: d.lastModifiedByDeviceId,
        deviceName: d.lastModifiedByDevice?.name || null,
      }))
    );

    // Get changed daily POIs
    const pois = await prisma.dailyPoi.findMany({
      where: {
        tripId,
        updatedAt: { gt: since },
      },
      include: {
        lastModifiedByDevice: true,
      },
    });

    changes.push(
      ...pois.map((p) => ({
        id: p.id,
        type: "poi",
        tripId: p.tripId,
        updatedAt: p.updatedAt.toISOString(),
        lastModifiedByDeviceId: p.lastModifiedByDeviceId,
        deviceName: p.lastModifiedByDevice?.name || null,
      }))
    );

    // Get changed route segments
    const segments = await prisma.routeSegment.findMany({
      where: {
        tripId,
        updatedAt: { gt: since },
      },
      include: {
        lastModifiedByDevice: true,
      },
    });

    changes.push(
      ...segments.map((s) => ({
        id: s.id,
        type: "route_segment",
        tripId: s.tripId,
        updatedAt: s.updatedAt.toISOString(),
        lastModifiedByDeviceId: s.lastModifiedByDeviceId,
        deviceName: s.lastModifiedByDevice?.name || null,
      }))
    );

    // Get changed route waypoints
    const waypoints = await prisma.routeWaypoint.findMany({
      where: {
        segment: {
          tripId,
        },
        updatedAt: { gt: since },
      },
      include: {
        segment: true,
        lastModifiedByDevice: true,
      },
    });

    changes.push(
      ...waypoints.map((w) => ({
        id: w.id,
        type: "route_waypoint",
        tripId: w.segment.tripId,
        updatedAt: w.updatedAt.toISOString(),
        lastModifiedByDeviceId: w.lastModifiedByDeviceId,
        deviceName: w.lastModifiedByDevice?.name || null,
      }))
    );

    // Sort by updatedAt descending
    changes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json(
      {
        changes,
        lastSyncTime: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/trips/[id]/changes] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
