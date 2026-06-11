/**
 * Trip Import API
 * Location: app/api/trips/import/route.ts
 *
 * Endpoints:
 * - POST /api/trips/import - Import a trip from a versioned JSON export file
 *
 * Request body:
 * {
 *   document: <export envelope JSON>,   // the parsed file contents
 *   mode: 'new' | 'merge',
 *   targetTripId?: string               // required when mode === 'merge'
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { migrateToCurrent, ImportFormatError } from '@/lib/trip-export/migrations';
import { importTrip, ImportError } from '@/lib/trip-export/import';
import { getSessionUser, accessErrorResponse } from '@/lib/auth/access';

const importRequestSchema = z.object({
  document: z.unknown(),
  mode: z.enum(['new', 'merge']),
  targetTripId: z.string().cuid().optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = importRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { document, mode, targetTripId } = parsed.data;

  let userId: string | undefined;
  try {
    const session = await getSessionUser();
    userId = session.id;
  } catch (error) {
    const ae = accessErrorResponse(error);
    if (ae) return ae;
    throw error;
  }

  if (mode === 'merge' && !targetTripId) {
    return NextResponse.json(
      { error: 'targetTripId is required when mode is "merge".' },
      { status: 400 },
    );
  }

  // Validate + migrate the file to the current format version.
  let migration;
  try {
    migration = migrateToCurrent(document);
  } catch (error) {
    if (error instanceof ImportFormatError) {
      const status = error.code === 'unsupported_version' ? 409 : 400;
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status },
      );
    }
    console.error('[POST /api/trips/import] Migration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }

  // Write to the database.
  try {
    const report = await importTrip(prisma, migration.envelope, {
      mode,
      targetTripId,
      ownerId: userId,
    });

    return NextResponse.json(
      {
        ...report,
        warnings: [...migration.warnings, ...report.warnings],
        appliedVersions: migration.appliedVersions,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ImportError) {
      const status = error.code === 'target_not_found' ? 404 : 400;
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status },
      );
    }
    console.error('[POST /api/trips/import] Import error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
