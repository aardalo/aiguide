/**
 * OSRM routing provider.
 * Location: src/lib/routing/osrm.ts
 *
 * Docs: https://project-osrm.org/docs/v5.24.0/api/
 * Works with any OSRM server; defaults to the public demo at
 * http://router.project-osrm.org when no base URL is configured.
 *
 * Coordinate order for OSRM: {longitude},{latitude} in the URL path.
 */

import type { RouteRequest, RouteResult, RouteLeg, RouteStep, RoutingProvider, RoutingPreferences } from './types';

const OSRM_AVOID_MAP: Partial<Record<NonNullable<RoutingPreferences['avoid']>[number], string>> = {
  ferries: 'ferry',
  motorways: 'motorway',
  tolls: 'toll',
  // unpavedRoads: not supported by OSRM — silently skipped
};

interface OsrmManeuver {
  location: [number, number]; // [longitude, latitude]
}

interface OsrmStep {
  duration: number;       // seconds for this step
  maneuver: OsrmManeuver;
}

interface OsrmLeg {
  steps: OsrmStep[];
}

interface OsrmRoute {
  distance: number;   // metres
  duration: number;   // seconds
  geometry: string;   // Google-encoded polyline (precision 5)
  legs: OsrmLeg[];
}

interface OsrmResponse {
  code: string;       // "Ok" on success
  message?: string;   // error message when code !== "Ok"
  routes: OsrmRoute[];
}

export class OsrmProvider implements RoutingProvider {
  readonly id = 'osrm';
  readonly displayName = 'OSRM';

  constructor(private readonly baseUrl: string) {}

  /** No API key required for OSRM — the "key" is the base URL. */
  validateApiKey(_apiKey: string): string | null {
    return null;
  }

  async getRoute(request: RouteRequest): Promise<RouteResult> {
    if (request.waypoints.length < 2) {
      throw new Error('At least two waypoints are required');
    }

    const profile = 'driving'; // OSRM profile
    const coordinates = request.waypoints
      .map((wp) => `${wp.longitude},${wp.latitude}`)
      .join(';');

    const avoidItems = (request.preferences?.avoid ?? [])
      .map((a) => OSRM_AVOID_MAP[a])
      .filter(Boolean) as string[];
    const excludeParam = avoidItems.length > 0 ? `&exclude=${avoidItems.join(',')}` : '';
    const url = `${this.baseUrl.replace(/\/$/, '')}/route/v1/${profile}/${coordinates}?overview=full&geometries=polyline&steps=true${excludeParam}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OSRM error ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as OsrmResponse;

    if (data.code !== 'Ok' || data.routes.length === 0) {
      throw new Error(`OSRM: ${data.message ?? data.code ?? 'No route found'}`);
    }

    const route = data.routes[0];

    // Parse turn-point steps for waypoint generation (STORY-006).
    // Each step's maneuver.location is where you ARE at the START of that step.
    // Accumulate duration AFTER recording the coordinate so that cumulativeDurationSeconds
    // represents the elapsed time when you ARRIVE at the maneuver point, not when you leave.
    // Iterate over all legs so multi-waypoint routes are covered in full.
    const routeSteps: RouteStep[] = [];
    let cumulativeDurationSeconds = 0;
    for (const leg of route.legs) {
      for (const step of leg.steps ?? []) {
        routeSteps.push({
          coordinate: [step.maneuver.location[1], step.maneuver.location[0]], // [lat, lng]
          cumulativeDurationSeconds, // time of ARRIVAL at this maneuver point
        });
        cumulativeDurationSeconds += step.duration; // add AFTER: duration to traverse this step
      }
    }

    const legs: RouteLeg[] = [
      {
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        encodedPolyline: route.geometry,
        routeSteps: routeSteps.length > 0 ? routeSteps : undefined,
      },
    ];

    return {
      legs,
      totalDistanceMeters: route.distance,
      totalDurationSeconds: route.duration,
    };
  }
}
