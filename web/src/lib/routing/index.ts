/**
 * Routing provider factory.
 * Location: src/lib/routing/index.ts
 *
 * Resolves the active provider and its API key, constructing a ready-to-use
 * RoutingProvider instance.  Environment variables take precedence over
 * database-stored settings so that deployments can override without a UI.
 *
 * IMPORTANT: Server-side only — imports Prisma indirectly via settings.ts.
 */

import { getSetting, SETTING_KEYS } from '@/lib/settings';
import { GoogleProvider } from './google';
import { MapboxProvider } from './mapbox';
import { OrsProvider } from './ors';
import { OsrmProvider } from './osrm';
import type { RoutingProvider } from './types';
import type { RoutingProviderId } from '@/lib/schemas/routing';

/** Public OSRM demo server — used when no OSRM_BASE_URL is configured. */
const OSRM_DEFAULT_BASE_URL = 'http://router.project-osrm.org';

export type { RoutingProvider } from './types';
export type { RoutingProviderId } from '@/lib/schemas/routing';

/** All registered providers with their env-var key name. */
const PROVIDER_ENV_KEYS: Record<RoutingProviderId, string> = {
  ors: 'ORS_API_KEY',
  mapbox: 'MAPBOX_API_KEY',
  google: 'GOOGLE_API_KEY',
  osrm: 'OSRM_BASE_URL',
};

/** Env var name for the active provider override. */
const ROUTING_PROVIDER_ENV = 'ROUTING_PROVIDER';

/**
 * Resolve the API key / base URL for a provider.
 * Env var wins over DB value.
 */
function resolveProviderKey(
  providerId: RoutingProviderId,
  dbValue: string | null,
): string | null {
  const envValue = process.env[PROVIDER_ENV_KEYS[providerId]];
  if (envValue && envValue.trim().length > 0) {
    return envValue.trim();
  }
  return dbValue;
}

/**
 * Build a configured RoutingProvider for the given provider ID and key.
 * Throws if the provider ID is unknown.
 */
export function buildRoutingProvider(
  providerId: RoutingProviderId,
  apiKey: string,
): RoutingProvider {
  switch (providerId) {
    case 'ors':
      return new OrsProvider(apiKey);
    case 'osrm':
      return new OsrmProvider(apiKey);
    case 'google':
      return new GoogleProvider(apiKey);
    case 'mapbox':
      return new MapboxProvider(apiKey);
    default:
      throw new Error(`Unknown routing provider: ${providerId as string}`);
  }
}

/**
 * Resolve and construct the active routing provider from environment variables
 * and/or database settings.
 *
 * Resolution order:
 *   1. `ROUTING_PROVIDER` env var (provider ID)
 *   2. `routing.provider` DB setting
 *   3. Default: 'osrm' (uses public demo server — no API key required)
 *
 * For the API key / base URL:
 *   1. Provider-specific env var (e.g. `ORS_API_KEY`, `OSRM_BASE_URL`)
 *   2. Provider-specific DB setting (e.g. `ors.api_key`, `osrm.base_url`)
 *   3. OSRM-only: falls back to the public demo server when no URL is set
 */
export async function getActiveRoutingProvider(): Promise<RoutingProvider> {
  // Resolve provider ID.
  // Priority: ROUTING_PROVIDER env var > map.provider (google/mapbox) > routing.provider DB > osrm
  const envProvider = process.env[ROUTING_PROVIDER_ENV]?.trim() as
    | RoutingProviderId
    | undefined;
  const mapProvider = await getSetting(SETTING_KEYS.MAP_PROVIDER);
  const dbProvider = (await getSetting(SETTING_KEYS.ROUTING_PROVIDER)) as
    | RoutingProviderId
    | null;

  let providerId: RoutingProviderId;
  if (envProvider) {
    providerId = envProvider;
  } else if (mapProvider === 'google') {
    providerId = 'google';
  } else if (mapProvider === 'mapbox') {
    providerId = 'mapbox';
  } else {
    providerId = dbProvider ?? 'osrm';
  }

  // Resolve API key / base URL for that provider
  // Note: OSRM stores a base URL (osrm.base_url) rather than an API key
  const PROVIDER_SETTING_KEYS: Record<RoutingProviderId, string> = {
    ors: SETTING_KEYS.ORS_API_KEY,
    mapbox: SETTING_KEYS.MAPBOX_API_KEY,
    google: SETTING_KEYS.GOOGLE_API_KEY,
    osrm: SETTING_KEYS.OSRM_BASE_URL,
  };
  const dbKey = await getSetting(PROVIDER_SETTING_KEYS[providerId]);
  const resolvedKey = resolveProviderKey(providerId, dbKey)
    // OSRM works without explicit configuration — fall back to the public demo server
    ?? (providerId === 'osrm' ? OSRM_DEFAULT_BASE_URL : null);

  if (!resolvedKey) {
    throw new Error(
      `No API key configured for routing provider "${providerId}". ` +
        `Set the ${PROVIDER_ENV_KEYS[providerId]} environment variable or configure it in Settings.`,
    );
  }

  return buildRoutingProvider(providerId, resolvedKey);
}
