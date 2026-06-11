/**
 * Devices Collection API
 * Location: app/api/devices/route.ts
 *
 * Endpoints:
 * - GET /api/devices - List all registered devices (most recently seen first)
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/devices
 * List all registered devices, ordered by most recently seen.
 *
 * Response:
 * {
 *   devices: Array<{
 *     id: string
 *     sessionId: string
 *     name: string
 *     lastSeenAt: ISO 8601 datetime
 *     createdAt: ISO 8601 datetime
 *   }>
 * }
 */
export async function GET() {
  try {
    const devices = await prisma.device.findMany({
      orderBy: { lastSeenAt: "desc" },
    });

    return NextResponse.json(
      {
        devices: devices.map((device) => ({
          id: device.id,
          sessionId: device.sessionId,
          name: device.name,
          lastSeenAt: device.lastSeenAt.toISOString(),
          createdAt: device.createdAt.toISOString(),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/devices] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
