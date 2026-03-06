/**
 * Waypoint generation — STORY-006.
 * Location: src/lib/routing/waypoints.ts
 *
 * Primary: generateDistanceWaypoints
 *   Places waypoints every 50 km along the route polyline by snapping each
 *   distance target to the nearest decoded polyline vertex.  Every waypoint is
 *   therefore an exact road-geometry coordinate — no interpolation, guaranteed
 *   on-road placement.
 *
 * Legacy: generateIntervalWaypoints (time-based, kept for reference/tests)
 */

import type { RouteStep } from './types';
import { decodePolyline } from '../polyline';

export interface GeneratedWaypoint {
  latitude: number;
  longitude: number;
  /** Estimated travel time from route start to this waypoint's distance target */
  targetDurationSeconds: number;
  /** Estimated travel time from route start to the snapped waypoint coordinate */
  actualDurationSeconds: number;
}

// ─── Distance-based waypoints (primary) ──────────────────────────────────────

const DEFAULT_CADENCE_METERS = 50_000; // 50 km

/** Haversine distance between two [lat, lng] points in metres. */
function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6_371_000;
  const φ1 = a[0] * (Math.PI / 180);
  const φ2 = b[0] * (Math.PI / 180);
  const Δφ = (b[0] - a[0]) * (Math.PI / 180);
  const Δλ = (b[1] - a[1]) * (Math.PI / 180);
  const s =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/**
 * Generate waypoints at regular distance intervals along a route polyline.
 *
 * Each waypoint snaps to the nearest decoded polyline vertex, so every
 * returned coordinate is a real road-geometry point — no off-road
 * interpolation.
 *
 * @param encodedPolyline      Google-encoded polyline (precision 5)
 * @param totalDurationSeconds Total travel time for the segment
 * @param cadenceMeters        Distance between waypoints (default: 50 km)
 */
export function generateDistanceWaypoints(
  encodedPolyline: string,
  totalDurationSeconds: number,
  cadenceMeters = DEFAULT_CADENCE_METERS,
): GeneratedWaypoint[] {
  const coords = decodePolyline(encodedPolyline);
  if (coords.length < 2) return [];

  // Cumulative Haversine distances in metres
  const cumDist: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    cumDist.push(cumDist[i - 1] + haversineMeters(coords[i - 1], coords[i]));
  }

  const totalDist = cumDist[cumDist.length - 1];
  const intervalCount = Math.floor(totalDist / cadenceMeters);

  if (intervalCount === 0 || totalDist === 0) return [];

  const waypoints: GeneratedWaypoint[] = [];

  for (let k = 1; k <= intervalCount; k++) {
    const targetDist = k * cadenceMeters;

    // Binary search for the bracketing vertex pair
    let lo = 0;
    let hi = coords.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cumDist[mid] <= targetDist) lo = mid;
      else hi = mid;
    }

    // Pick the vertex whose cumulative distance is closest to targetDist
    const idx =
      Math.abs(cumDist[lo] - targetDist) <= Math.abs(cumDist[hi] - targetDist)
        ? lo
        : hi;

    waypoints.push({
      latitude: coords[idx][0],
      longitude: coords[idx][1],
      targetDurationSeconds: (targetDist / totalDist) * totalDurationSeconds,
      actualDurationSeconds: (cumDist[idx] / totalDist) * totalDurationSeconds,
    });
  }

  return waypoints;
}

// ─── Legacy: time-based waypoints ────────────────────────────────────────────

const DEFAULT_CADENCE_SECONDS = 30 * 60; // 30 minutes

/**
 * Convert a Google-encoded polyline and total duration into a RouteStep array
 * with cumulative durations distributed proportionally to cumulative distance.
 */
export function polylineToRouteSteps(
  encodedPolyline: string,
  totalDurationSeconds: number,
): RouteStep[] {
  const coords = decodePolyline(encodedPolyline);
  if (coords.length === 0) return [];
  if (coords.length === 1) {
    return [{ coordinate: coords[0], cumulativeDurationSeconds: 0 }];
  }

  const cumDist: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const dlat = curr[0] - prev[0];
    const dlng =
      (curr[1] - prev[1]) * Math.cos(((prev[0] + curr[0]) / 2) * (Math.PI / 180));
    cumDist.push(cumDist[i - 1] + Math.sqrt(dlat * dlat + dlng * dlng));
  }

  const totalDist = cumDist[cumDist.length - 1];

  if (totalDist === 0) {
    return coords.map((coordinate, i) => ({
      coordinate,
      cumulativeDurationSeconds: i === 0 ? 0 : totalDurationSeconds,
    }));
  }

  return coords.map((coordinate, i) => ({
    coordinate,
    cumulativeDurationSeconds: (cumDist[i] / totalDist) * totalDurationSeconds,
  }));
}

/**
 * Generate interval waypoints by interpolating along route steps.
 *
 * For on-road placement, pass steps produced by polylineToRouteSteps rather
 * than sparse turn-point steps.
 *
 * @param totalDurationSeconds  Total route duration
 * @param steps                 Route steps with cumulative durations
 * @param cadenceSeconds        Interval between waypoints (default: 30 min)
 * @returns                     Array of waypoints in sequence order
 */
export function generateIntervalWaypoints(
  totalDurationSeconds: number,
  steps: RouteStep[],
  cadenceSeconds = DEFAULT_CADENCE_SECONDS,
): GeneratedWaypoint[] {
  const intervalCount = Math.floor(totalDurationSeconds / cadenceSeconds);

  if (intervalCount === 0 || steps.length === 0) {
    return [];
  }

  const sorted = [...steps].sort(
    (a, b) => a.cumulativeDurationSeconds - b.cumulativeDurationSeconds,
  );

  const waypoints: GeneratedWaypoint[] = [];

  for (let i = 1; i <= intervalCount; i++) {
    const targetTime = i * cadenceSeconds;

    if (targetTime <= sorted[0].cumulativeDurationSeconds) {
      const s = sorted[0];
      waypoints.push({
        latitude: s.coordinate[0],
        longitude: s.coordinate[1],
        targetDurationSeconds: targetTime,
        actualDurationSeconds: s.cumulativeDurationSeconds,
      });
      continue;
    }

    const last = sorted[sorted.length - 1];
    if (targetTime >= last.cumulativeDurationSeconds) {
      waypoints.push({
        latitude: last.coordinate[0],
        longitude: last.coordinate[1],
        targetDurationSeconds: targetTime,
        actualDurationSeconds: last.cumulativeDurationSeconds,
      });
      continue;
    }

    let lo = 0;
    let hi = sorted.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid].cumulativeDurationSeconds <= targetTime) {
        lo = mid;
      } else {
        hi = mid;
      }
    }

    const before = sorted[lo];
    const after = sorted[hi];
    const span = after.cumulativeDurationSeconds - before.cumulativeDurationSeconds;
    const fraction = span > 0 ? (targetTime - before.cumulativeDurationSeconds) / span : 0;

    waypoints.push({
      latitude:  before.coordinate[0] + fraction * (after.coordinate[0] - before.coordinate[0]),
      longitude: before.coordinate[1] + fraction * (after.coordinate[1] - before.coordinate[1]),
      targetDurationSeconds: targetTime,
      actualDurationSeconds: targetTime,
    });
  }

  return waypoints;
}
