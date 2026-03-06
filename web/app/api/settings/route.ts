/**
 * Settings API Route Handlers
 * Location: app/api/settings/route.ts
 *
 * Endpoints:
 * - GET  /api/settings          — List all settings (sensitive values redacted)
 * - PUT  /api/settings          — Upsert a single setting
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { upsertSetting } from '@/lib/settings';
import { settingUpsertSchema } from '@/lib/schemas/routing';

/** Keys whose values must never be returned to the browser. */
const SENSITIVE_KEY_PATTERNS = [/api_key$/i, /api_secret$/i, /password$/i, /token$/i];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((re) => re.test(key));
}

/** GET /api/settings — return all settings; sensitive values replaced with "[SET]" */
export async function GET() {
  try {
    const rows = await prisma.setting.findMany({ orderBy: { key: 'asc' } });
    const safe = rows.map((row) => ({
      key: row.key,
      value: isSensitiveKey(row.key) ? '[SET]' : row.value,
    }));
    return NextResponse.json(safe);
  } catch (err) {
    console.error('[GET /api/settings] Error:', err);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

/** DELETE /api/settings — remove a single setting by key */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const key = body?.key;
    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'key is required' }, { status: 400 });
    }
    await prisma.setting.deleteMany({ where: { key } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/settings] Error:', err);
    return NextResponse.json({ error: 'Failed to delete setting' }, { status: 500 });
  }
}

/** PUT /api/settings — upsert { key, value } */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = settingUpsertSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.flatten() },
        { status: 400 },
      );
    }

    const { key, value } = validation.data;
    await upsertSetting(key, value);

    return NextResponse.json({ key, value: isSensitiveKey(key) ? '[SET]' : value });
  } catch (err) {
    console.error('[PUT /api/settings] Error:', err);
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 });
  }
}
