/**
 * OpenRouteService routing provider.
 * Location: src/lib/routing/ors.ts
 *
 * Docs: https://openrouteservice.org/dev/#/api-docs/v2/directions/{profile}/json/post
 * Coordinate order for ORS: [longitude, latitude]
 */

import type {
  Coordinate,
  RouteLeg,
  RouteRequest,
  RouteResult,
  RoutingProvider,
  RoutingPreferences,
} from './types';

const ORS_BASE_URL = 'https://api.openrouteservice.org';

const ORS_AVOID_MAP: Partial<Record<NonNullable<RoutingPreferences['avoid']>[number], string>> = {
  ferries: 'ferries',
  motorways: 'motorways',
  tolls: 'tollways',
  unpavedRoads: 'unpavedroads',
};

/** Map our profile names to ORS profile identifiers. */
const PROFILE_MAP: Record<NonNullable<RouteRequest['profile']>, string> = {
  'driving-car': 'driving-car',
  'driving-hgv': 'driving-hgv',
  'cycling-regular': 'cycling-regular',
  'foot-walking': 'foot-walking',
};

export class OrsProvider implements RoutingProvider {
  readonly id = 'ors';
  readonly displayName = 'OpenRouteService';

  constructor(private readonly apiKey: string) {}

  validateApiKey(apiKey: string): string | null {
    if (!apiKey || apiKey.trim().length === 0) {
      return 'API key is required';
    }
    // ORS keys are typically 40-character hex strings, but allow any non-empty string
    if (apiKey.trim().length < 8) {
      return 'API key appears too short';
    }
    return null;
  }

  async getRoute(request: RouteRequest): Promise<RouteResult> {
    if (request.waypoints.length < 2) {
      throw new Error('At least two waypoints are required');
    }

    const profile = PROFILE_MAP[request.profile ?? 'driving-car'];
    const url = `${ORS_BASE_URL}/v2/directions/${profile}/json`;

    // ORS expects [longitude, latitude] pairs
    const coordinates = request.waypoints.map(
      (wp: Coordinate) => [wp.longitude, wp.latitude] as [number, number],
    );

    const avoidFeatures = (request.preferences?.avoid ?? [])
      .map((a) => ORS_AVOID_MAP[a])
      .filter(Boolean) as string[];
    const body = {
      coordinates,
      // Request encoded polyline geometry per segment
      geometry: true,
      geometry_simplify: false,
      instructions: false,
      ...(avoidFeatures.length > 0 && { options: { avoid_features: avoidFeatures } }),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json, application/geo+json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new Error(`ORS API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as OrsDirectionsResponse;
    return parseOrsResponse(data);
  }
}

// ─── ORS response types (minimal) ────────────────────────────────────────────

interface OrsSegment {
  distance: number; // metres
  duration: number; // seconds
}

interface OrsRoute {
  summary: {
    distance: number;
    duration: number;
  };
  segments: OrsSegment[];
  /** Google-encoded polyline for the full route (precision 5). */
  geometry: string;
}

interface OrsDirectionsResponse {
  routes: OrsRoute[];
}

// ─── Parse ────────────────────────────────────────────────────────────────────

function parseOrsResponse(data: OrsDirectionsResponse): RouteResult {
  if (!data.routes || data.routes.length === 0) {
    throw new Error('ORS returned no routes');
  }

  const route = data.routes[0];

  const legs: RouteLeg[] = route.segments.map((seg) => ({
    distanceMeters: seg.distance,
    durationSeconds: seg.duration,
    // ORS returns a single polyline for the full route, not per-segment.
    // We attach it only to the first leg; callers that need per-leg geometry
    // should use a provider that supports it.
  }));

  // Attach the full-route polyline to the first leg.
  // ORS always returns a single polyline for the entire route, so this works
  // regardless of the number of waypoints (legs) in the request.
  if (route.geometry) {
    legs[0].encodedPolyline = route.geometry;
  }

  return {
    legs,
    totalDistanceMeters: route.summary.distance,
    totalDurationSeconds: route.summary.duration,
  };
}
