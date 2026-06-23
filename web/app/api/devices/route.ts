/**
 * Devices Collection API
 * Location: app/api/devices/route.ts
 *
 * Endpoints:
 * - GET /api/devices - List devices belonging to the current user
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, accessErrorResponse } from "@/lib/auth/access";

/**
 * GET /api/devices
 * List devices registered by the current user, ordered by most recently seen.
 */
export async function GET() {
  try {
    const { id: userId } = await getSessionUser();

    const devices = await prisma.device.findMany({
      where: { userId },
      orderBy: { lastSeenAt: "desc" },
    });

    return NextResponse.json(
      {
        devices: devices.map((device) => ({
          id: device.id,
          name: device.name,
          lastSeenAt: device.lastSeenAt.toISOString(),
          createdAt: device.createdAt.toISOString(),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    const ae = accessErrorResponse(error);
    if (ae) return ae;
    console.error("[GET /api/devices] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
