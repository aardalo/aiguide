import { NextResponse } from 'next/server';
import { ShareRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/../auth';

export type AccessLevel = 'view' | 'edit';

export class AccessError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AccessError';
  }
}

/**
 * Resolve the authenticated user id from the session. Throws 401 if absent.
 * Routes are already gated by middleware, but call this to obtain the id and
 * to defend against direct invocation.
 */
export async function getSessionUser(): Promise<{ id: string; isAdmin: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AccessError(401, 'Unauthenticated');
  }
  return { id: session.user.id, isAdmin: session.user.isAdmin === true };
}

/**
 * Throws 403 if the session user is not an admin.
 */
export async function assertAdmin(): Promise<void> {
  const { isAdmin } = await getSessionUser();
  if (!isAdmin) throw new AccessError(403, 'Forbidden');
}

/**
 * Resolve owner + the requesting user's share in a single query.
 * Owner -> full access. EDITOR -> view+edit. VIEWER -> view only.
 * Otherwise 403; missing trip 404.
 */
export async function assertTripAccess(
  userId: string,
  tripId: string,
  level: AccessLevel,
): Promise<void> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { ownerId: true, shares: { where: { userId }, select: { role: true } } },
  });

  if (!trip) throw new AccessError(404, 'Trip not found');
  if (trip.ownerId === userId) return;

  const share = trip.shares[0];
  if (!share) throw new AccessError(403, 'Forbidden');
  if (level === 'view') return;
  if (level === 'edit' && share.role === ShareRole.EDITOR) return;

  throw new AccessError(403, 'Forbidden');
}

/**
 * Map an AccessError to a JSON response. Returns null for non-AccessError so
 * callers can fall through to their generic 500 handler.
 */
export function accessErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof AccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}

/**
 * Like accessErrorResponse, but converts 403 → 404 for sub-resource routes
 * (e.g. /api/daily-destinations/[id]) so that callers cannot distinguish
 * "resource doesn't exist" from "resource exists but you can't access it".
 */
export function subResourceAccessErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof AccessError) {
    const status = error.status === 403 ? 404 : error.status;
    return NextResponse.json({ error: 'Not found' }, { status });
  }
  return null;
}
