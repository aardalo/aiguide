/**
 * Device Registration API
 * Location: app/api/devices/register/route.ts
 * 
 * Endpoints:
 * - POST /api/devices/register - Register or update a device
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { auth } from '../../../../auth';

const registerSchema = z.object({
  sessionId: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
});

type RegisterRequest = z.infer<typeof registerSchema>;

/**
 * POST /api/devices/register
 * Register a device or update its lastSeenAt timestamp
 * 
 * Request body:
 * {
 *   sessionId: string (required) - Unique session identifier for this device
 *   name: string (required) - Human-readable name (e.g., "Chrome on Linux")
 * }
 * 
 * Response:
 * {
 *   id: string - Device ID
 *   sessionId: string
 *   name: string
 *   lastSeenAt: ISO 8601 datetime
 *   createdAt: ISO 8601 datetime
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request payload
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { sessionId, name } = validation.data;

    const session = await auth();
    const userId = session?.user?.id;

    // Try to find existing device by sessionId
    let device = await prisma.device.findUnique({
      where: { sessionId },
    });

    if (device) {
      // Update lastSeenAt for existing device
      device = await prisma.device.update({
        where: { sessionId },
        data: {
          lastSeenAt: new Date(),
          // Optionally update name if provided and different
          ...(name && name !== device.name ? { name } : {}),
          ...(userId ? { userId } : {}),
        },
      });
    } else {
      // Create new device
      device = await prisma.device.create({
        data: {
          sessionId,
          name,
          lastSeenAt: new Date(),
          ...(userId ? { userId } : {}),
        },
      });
    }

    return NextResponse.json(
      {
        id: device.id,
        sessionId: device.sessionId,
        name: device.name,
        lastSeenAt: device.lastSeenAt.toISOString(),
        createdAt: device.createdAt.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/devices/register] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
