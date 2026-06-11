import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionUser, AccessError } from '@/lib/auth/access';
import { shareCreateSchema } from '@/lib/schemas/share';

async function assertOwner(userId: string, tripId: string) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { ownerId: true } });
  if (!trip) throw new AccessError(404, 'Trip not found');
  if (trip.ownerId !== userId) throw new AccessError(403, 'Only the owner can manage shares');
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tripId } = await params;
    const { id: userId } = await getSessionUser();
    await assertOwner(userId, tripId);
    const shares = await prisma.tripShare.findMany({
      where: { tripId },
      select: { id: true, role: true, createdAt: true, user: { select: { id: true, email: true, name: true } } },
    });
    return NextResponse.json(shares, { status: 200 });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[GET /api/trips/[id]/shares] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tripId } = await params;
    const { id: userId } = await getSessionUser();
    await assertOwner(userId, tripId);

    const body = await request.json().catch(() => null);
    const parsed = shareCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.flatten() }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const recipient = await prisma.user.findUnique({ where: { email } });
    if (!recipient) return NextResponse.json({ error: 'No such user' }, { status: 404 });
    if (recipient.id === userId) {
      return NextResponse.json({ error: 'You already own this trip' }, { status: 400 });
    }

    const share = await prisma.tripShare.create({
      data: { tripId, userId: recipient.id, role: parsed.data.role },
    });
    return NextResponse.json(share, { status: 201 });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Already shared with this user' }, { status: 409 });
    }
    console.error('[POST /api/trips/[id]/shares] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
