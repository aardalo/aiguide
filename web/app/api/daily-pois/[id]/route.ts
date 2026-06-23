/**
 * Daily POI Detail API
 * Location: app/api/daily-pois/[id]/route.ts
 *
 * PATCH /api/daily-pois/:id — update a POI
 * DELETE /api/daily-pois/:id — remove a POI
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getSessionUser, assertTripAccess, subResourceAccessErrorResponse as accessErrorResponse } from '@/lib/auth/access';

const poiUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  notes: z.string().max(1000).nullable().optional(),
  category: z.enum(['poi', 'parkup']).optional(),
  deviceId: z.string().cuid().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = poiUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: validation.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.dailyPoi.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'POI not found' }, { status: 404 });
    }

    const { id: userId } = await getSessionUser();
    await assertTripAccess(userId, existing.tripId, 'edit');

    const { deviceId, ...updateData } = validation.data;

    const updated = await prisma.dailyPoi.update({
      where: { id },
      data: {
        ...updateData,
        lastModifiedByDeviceId: deviceId || null,
      },
      include: {
        lastModifiedByDevice: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const ae = accessErrorResponse(err);
    if (ae) return ae;
    console.error('[PATCH /api/daily-pois/:id] Error:', err);
    return NextResponse.json({ error: 'Failed to update POI' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let deviceId: string | undefined;

  try {
    const body = await request.json();
    deviceId = body?.deviceId;
  } catch {
    // DELETE may not have a body, which is fine
  }

  try {
    const existing = await prisma.dailyPoi.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'POI not found' }, { status: 404 });
    }

    const { id: userId } = await getSessionUser();
    await assertTripAccess(userId, existing.tripId, 'edit');

    // Optionally update lastModifiedByDeviceId before deletion for audit trail
    if (deviceId) {
      await prisma.dailyPoi.update({
        where: { id },
        data: { lastModifiedByDeviceId: deviceId },
      });
    }
    
    await prisma.dailyPoi.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const ae = accessErrorResponse(err);
    if (ae) return ae;
    console.error('[DELETE /api/daily-pois/:id] Error:', err);
    return NextResponse.json({ error: 'Failed to delete POI' }, { status: 500 });
  }
}
