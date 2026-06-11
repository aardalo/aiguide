import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, AccessError } from '@/lib/auth/access';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; shareId: string }> },
) {
  try {
    const { id: tripId, shareId } = await params;
    const { id: userId } = await getSessionUser();

    const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { ownerId: true } });
    if (!trip) throw new AccessError(404, 'Trip not found');
    if (trip.ownerId !== userId) throw new AccessError(403, 'Only the owner can manage shares');

    const share = await prisma.tripShare.findUnique({ where: { id: shareId }, select: { tripId: true } });
    if (!share || share.tripId !== tripId) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    await prisma.tripShare.delete({ where: { id: shareId } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[DELETE /api/trips/[id]/shares/[shareId]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
