/**
 * GET /api/map-config
 *
 * Returns the active map provider and the tile API key (unredacted).
 * The key is returned in clear text because it must be embedded in tile request
 * URLs that are already visible in browser DevTools.
 *
 * SECURITY: Any authenticated user can retrieve the map API key via this endpoint.
 * Mitigate key abuse by restricting it at the provider console:
 *   - Mapbox: Dashboard → Tokens → restrict to allowed URLs / referrer domains
 *   - Google Maps: Cloud Console → Credentials → HTTP referrer restrictions
 */

import { NextResponse } from 'next/server';
import { getSetting, SETTING_KEYS } from '@/lib/settings';

export async function GET() {
  const provider =
    process.env.MAP_PROVIDER?.trim() ??
    (await getSetting(SETTING_KEYS.MAP_PROVIDER)) ??
    'osm';

  let tileKey: string | null = null;
  if (provider === 'google') {
    tileKey =
      process.env.GOOGLE_API_KEY ?? (await getSetting(SETTING_KEYS.GOOGLE_API_KEY));
  } else if (provider === 'mapbox') {
    tileKey =
      process.env.MAPBOX_API_KEY ?? (await getSetting(SETTING_KEYS.MAPBOX_API_KEY));
  }

  return NextResponse.json({ provider, tileKey });
}
