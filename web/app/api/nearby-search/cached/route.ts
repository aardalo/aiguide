import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { searchCachedByBounds } from '@/lib/nearby/graph';

const querySchema = z.object({
  south: z.coerce.number().min(-90).max(90),
  west: z.coerce.number().min(-180).max(180),
  north: z.coerce.number().min(-90).max(90),
  east: z.coerce.number().min(-180).max(180),
});

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { south, west, north, east } = parsed.data;
  const places = await searchCachedByBounds(south, west, north, east);
  return NextResponse.json({ places });
}
