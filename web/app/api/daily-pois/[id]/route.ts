/**
 * Daily POI Detail API
 * Location: app/api/daily-pois/[id]/route.ts
 *
 * DELETE /api/daily-pois/:id — remove a POI
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const existing = await prisma.dailyPoi.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'POI not found' }, { status: 404 });
    }
    await prisma.dailyPoi.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/daily-pois/:id] Error:', err);
    return NextResponse.json({ error: 'Failed to delete POI' }, { status: 500 });
  }
}
