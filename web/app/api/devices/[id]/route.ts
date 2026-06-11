/**
 * Single Device API
 * Location: app/api/devices/[id]/route.ts
 *
 * Endpoints:
 * - PATCH /api/devices/[id] - Rename a device
 * - DELETE /api/devices/[id] - Remove a device (sync attribution is set to null)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const updateSchema = z.object({
  name: z.string().min(1).max(200),
});

/**
 * PATCH /api/devices/[id]
 * Rename a registered device.
 *
 * Request body:
 * {
 *   name: string (required) - New human-readable name
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const device = await prisma.device.update({
      where: { id },
      data: { name: validation.data.name },
    });

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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }
    console.error("[PATCH /api/devices/[id]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/devices/[id]
 * Remove a device. Sync attribution on entities is set to null (onDelete: SetNull).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.device.delete({ where: { id } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }
    console.error("[DELETE /api/devices/[id]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
