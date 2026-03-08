import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { branchUpdateSchema } from '@/lib/schemas/trip';

/**
 * PATCH /api/branches/[id]
 * Update branch properties (name, color, sortOrder).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = branchUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await prisma.branch.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[PATCH /api/branches/[id]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/branches/[id]
 * Delete a branch and all its destinations, segments, POIs (via cascade).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const existing = await prisma.branch.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    await prisma.branch.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/branches/[id]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
