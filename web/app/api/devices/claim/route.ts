import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionUser, accessErrorResponse } from '@/lib/auth/access';

const claimSchema = z.object({ sessionId: z.string().min(1).max(100) });

export async function POST(request: Request) {
  try {
    const { id: userId } = await getSessionUser();
    const parsed = claimSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.flatten() }, { status: 400 });
    }
    await prisma.device.updateMany({
      where: { sessionId: parsed.data.sessionId },
      data: { userId },
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const ae = accessErrorResponse(error);
    if (ae) return ae;
    console.error('[POST /api/devices/claim] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
