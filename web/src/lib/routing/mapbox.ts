/**
 * Mapbox routing provider.
 * Location: src/lib/routing/mapbox.ts
 *
 * Docs: https://docs.mapbox.com/api/navigation/directions/
 * Uses the Mapbox Directions API v5.
 *
 * Coordinate order: {longitude},{latitude} in the URL path (same as OSRM).
 */

import type { RouteRequest, RouteResult, RouteStep, RoutingProvider } from './types';

export class MapboxProvider implements RoutingProvider {
  readonly id = 'mapbox';
  readonly displayName = 'Mapbox';

  constructor(private readonly apiKey: string) {}

  validateApiKey(key: string): string | null {
    return key.startsWith('pk.') || key.startsWith('sk.')
      ? null
      : 'Mapbox token must start with pk. or sk.';
  }

  async getRoute(request: RouteRequest): Promise<RouteResult> {
    if (request.waypoints.length < 2) {
      throw new Error('At least two waypoints are required');
    }

    const coords = request.waypoints
      .map((w) => `${w.longitude},${w.latitude}`)
      .join(';');

    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}` +
      `?access_token=${this.apiKey}&overview=full&geometries=polyline&steps=true`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Mapbox error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.routes?.length) {
      throw new Error('Mapbox: no route found');
    }

    const route = data.routes[0];

    // Build routeSteps from per-leg steps — same accumulation pattern as OsrmProvider.
    // maneuver.location is [longitude, latitude]; flip to [lat, lng] for RouteStep.
    const routeSteps: RouteStep[] = [];
    let cum = 0;
    for (const leg of route.legs ?? []) {
      for (const step of leg.steps ?? []) {
        const [lng, lat] = step.maneuver.location as [number, number];
        routeSteps.push({ coordinate: [lat, lng], cumulativeDurationSeconds: cum });
        cum += step.duration as number;
      }
    }

    return {
      legs: [
        {
          distanceMeters: route.distance as number,
          durationSeconds: route.duration as number,
          encodedPolyline: route.geometry as string,
          routeSteps: routeSteps.length > 0 ? routeSteps : undefined,
        },
      ],
      totalDistanceMeters: route.distance as number,
      totalDurationSeconds: route.duration as number,
    };
  }
}
