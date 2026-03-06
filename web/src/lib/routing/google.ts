/**
 * Google Maps Directions API routing provider.
 * Location: src/lib/routing/google.ts
 *
 * Docs: https://developers.google.com/maps/documentation/directions/get-directions
 * Coordinate order for Google: latitude,longitude in query string.
 *
 * Supports ferry routes — Google routes via ferries when they are faster
 * than the land alternative (e.g. Kristiansand → Hirtshals).
 */

import type {
  RouteRequest,
  RouteResult,
  RouteLeg,
  RouteStep,
  RoutingProvider,
  RoutingPreferences,
} from './types';

const GOOGLE_DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';

/** Map our provider-neutral avoid names to Google's avoid values. */
const GOOGLE_AVOID_MAP: Partial<Record<NonNullable<RoutingPreferences['avoid']>[number], string>> = {
  ferries: 'ferries',
  motorways: 'highways',
  tolls: 'tolls',
  // unpavedRoads: not supported by Google Directions API — silently skipped
};

export class GoogleProvider implements RoutingProvider {
  readonly id = 'google';
  readonly displayName = 'Google Maps';

  constructor(private readonly apiKey: string) {}

  validateApiKey(apiKey: string): string | null {
    if (!apiKey || apiKey.trim().length === 0) {
      return 'API key is required';
    }
    if (!apiKey.trim().startsWith('AIza')) {
      return 'Google API key should start with "AIza"';
    }
    return null;
  }

  async getRoute(request: RouteRequest): Promise<RouteResult> {
    if (request.waypoints.length < 2) {
      throw new Error('At least two waypoints are required');
    }

    const [origin, ...rest] = request.waypoints;
    const destination = rest[rest.length - 1];
    const intermediates = rest.slice(0, -1);

    const params = new URLSearchParams({
      origin: `${origin.latitude},${origin.longitude}`,
      destination: `${destination.latitude},${destination.longitude}`,
      mode: 'driving',
      key: this.apiKey,
    });

    if (intermediates.length > 0) {
      params.set(
        'waypoints',
        intermediates.map((wp) => `${wp.latitude},${wp.longitude}`).join('|'),
      );
    }

    const avoidValues = (request.preferences?.avoid ?? [])
      .map((a) => GOOGLE_AVOID_MAP[a])
      .filter(Boolean) as string[];
    if (avoidValues.length > 0) {
      params.set('avoid', avoidValues.join('|'));
    }

    const url = `${GOOGLE_DIRECTIONS_URL}?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google API error ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as GoogleDirectionsResponse;

    if (data.status !== 'OK') {
      throw new Error(`Google Directions: ${data.error_message ?? data.status}`);
    }

    if (!data.routes || data.routes.length === 0) {
      throw new Error('Google Directions returned no routes');
    }

    return parseGoogleResponse(data);
  }
}

// ─── Google response types (minimal) ─────────────────────────────────────────

interface GoogleLatLng {
  lat: number;
  lng: number;
}

interface GoogleStep {
  duration: { value: number };   // seconds for this step
  end_location: GoogleLatLng;
}

interface GoogleLeg {
  distance: { value: number };   // metres
  duration: { value: number };   // seconds
  steps: GoogleStep[];
}

interface GoogleRoute {
  legs: GoogleLeg[];
  overview_polyline: { points: string };
}

interface GoogleDirectionsResponse {
  status: string;
  error_message?: string;
  routes: GoogleRoute[];
}

// ─── Parse ────────────────────────────────────────────────────────────────────

function parseGoogleResponse(data: GoogleDirectionsResponse): RouteResult {
  const route = data.routes[0];

  let totalDistanceMeters = 0;
  let totalDurationSeconds = 0;

  const legs: RouteLeg[] = route.legs.map((leg, idx) => {
    totalDistanceMeters += leg.distance.value;
    totalDurationSeconds += leg.duration.value;

    // Build turn-point steps for interval waypoint generation (STORY-006)
    const routeSteps: RouteStep[] = [];
    let cumulativeDurationSeconds = 0;
    for (const step of leg.steps) {
      cumulativeDurationSeconds += step.duration.value;
      routeSteps.push({
        coordinate: [step.end_location.lat, step.end_location.lng],
        cumulativeDurationSeconds,
      });
    }

    const result: RouteLeg = {
      distanceMeters: leg.distance.value,
      durationSeconds: leg.duration.value,
      routeSteps: routeSteps.length > 0 ? routeSteps : undefined,
    };

    // Attach the overview polyline to the first leg (Google returns one per route)
    if (idx === 0 && route.overview_polyline?.points) {
      result.encodedPolyline = route.overview_polyline.points;
    }

    return result;
  });

  return {
    legs,
    totalDistanceMeters,
    totalDurationSeconds,
  };
}
