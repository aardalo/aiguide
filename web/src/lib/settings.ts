/**
 * Server-side settings access.
 * Location: src/lib/settings.ts
 *
 * IMPORTANT: Never import this module in client components — it uses
 * Prisma directly and will fail in browser context.
 */

import { prisma } from '@/lib/prisma';

/**
 * Well-known setting keys.
 * The active provider key and each provider's API key follow the pattern
 * "<provider_id>.api_key" so new providers can be added without changing
 * this file.
 */
export const SETTING_KEYS = {
  MAP_PROVIDER: 'map.provider',
  ROUTING_PROVIDER: 'routing.provider',
  ORS_API_KEY: 'ors.api_key',
  MAPBOX_API_KEY: 'mapbox.api_key',
  GOOGLE_API_KEY: 'google.api_key',
  OSRM_BASE_URL: 'osrm.base_url',
  HOME_NAME: 'home.name',
  HOME_LATITUDE: 'home.latitude',
  HOME_LONGITUDE: 'home.longitude',
  TRIPADVISOR_API_KEY: 'tripadvisor.api_key',
  FOURSQUARE_API_KEY: 'foursquare.api_key',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

/** Return the stored value for a key, or null if it does not exist. */
export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

/** Create or update a setting. */
export async function upsertSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
