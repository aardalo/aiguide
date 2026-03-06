/**
 * Unit tests for the waypoint generation algorithms.
 * Location: tests/unit/waypoints.test.ts
 * Story: STORY-006
 */

import { describe, it, expect } from 'vitest';
import {
  generateDistanceWaypoints,
  generateIntervalWaypoints,
  polylineToRouteSteps,
} from '@/lib/routing/waypoints';
import type { RouteStep } from '@/lib/routing/types';

const step = (lat: number, lng: number, cumulativeSeconds: number): RouteStep => ({
  coordinate: [lat, lng],
  cumulativeDurationSeconds: cumulativeSeconds,
});

const MIN = 60; // seconds in a minute

// '???A?A' decodes to [(0,0), (0,1e-5), (0,2e-5)]:
//   '??' → first point (0,0); '?A' → dlat=0, dlng=1; '?A' → dlat=0, dlng=1.
// At the equator, 1e-5 degree ≈ 1.11 m, so each segment is ~1.11 m
// and the full polyline is ~2.22 m.
const TWO_SEGMENT_POLYLINE = '???A?A';

// ─── generateDistanceWaypoints ────────────────────────────────────────────────

describe('generateDistanceWaypoints', () => {
  it('returns [] for an empty polyline', () => {
    expect(generateDistanceWaypoints('', 3600)).toEqual([]);
  });

  it('returns [] for a single-coordinate polyline', () => {
    // '??' decodes to [(0,0)] — length < 2
    expect(generateDistanceWaypoints('??', 3600)).toEqual([]);
  });

  it('returns [] when route is shorter than one cadence interval', () => {
    // TWO_SEGMENT_POLYLINE is ~2.22 m; default cadence is 50 000 m
    expect(generateDistanceWaypoints(TWO_SEGMENT_POLYLINE, 3600)).toEqual([]);
  });

  it('places one waypoint per cadence interval', () => {
    // ~2.22 m route with 1 m cadence → floor(2.22/1) = 2 intervals
    const result = generateDistanceWaypoints(TWO_SEGMENT_POLYLINE, 100, 1);
    expect(result).toHaveLength(2);
  });

  it('snaps each waypoint to the nearest decoded polyline vertex', () => {
    // Target 1 m: vertex 1 at ~1.11 m (error 0.11 m) vs vertex 0 at 0 m (error 1 m) → vertex 1
    // Target 2 m: vertex 2 at ~2.22 m (error 0.22 m) vs vertex 1 at ~1.11 m (error 0.89 m) → vertex 2
    const result = generateDistanceWaypoints(TWO_SEGMENT_POLYLINE, 100, 1);
    expect(result[0].latitude).toBeCloseTo(0, 10);
    expect(result[0].longitude).toBeCloseTo(1e-5, 10); // vertex 1
    expect(result[1].latitude).toBeCloseTo(0, 10);
    expect(result[1].longitude).toBeCloseTo(2e-5, 10); // vertex 2
  });

  it('returned coordinates are exact polyline vertices (no interpolation)', () => {
    // The only coordinates that should appear are (0,0), (0,1e-5), (0,2e-5)
    const result = generateDistanceWaypoints(TWO_SEGMENT_POLYLINE, 100, 1);
    for (const wp of result) {
      // lat must be exactly 0 (a decoded vertex value)
      expect(wp.latitude).toBe(0);
    }
  });

  it('assigns targetDurationSeconds proportional to the distance target', () => {
    // TWO_SEGMENT_POLYLINE total dist ≈ 2.22 m, totalDuration = 100 s, cadence = 1 m
    // k=1: targetDist=1m, targetDuration = (1/totalDist)*100 ≈ 45s
    // k=2: targetDist=2m, targetDuration = (2/totalDist)*100 ≈ 90s
    const result = generateDistanceWaypoints(TWO_SEGMENT_POLYLINE, 100, 1);
    expect(result[0].targetDurationSeconds).toBeGreaterThan(0);
    expect(result[0].targetDurationSeconds).toBeLessThan(result[1].targetDurationSeconds);
    expect(result[1].targetDurationSeconds).toBeLessThan(100);
  });

  it('waypoints are in ascending order along the route', () => {
    const result = generateDistanceWaypoints(TWO_SEGMENT_POLYLINE, 100, 1);
    expect(result).toHaveLength(2);
    expect(result[1].actualDurationSeconds).toBeGreaterThanOrEqual(
      result[0].actualDurationSeconds,
    );
  });

  it('respects a custom cadence — smaller interval → more waypoints', () => {
    // cadence=1m → 2 waypoints; if route were longer this would scale
    const two = generateDistanceWaypoints(TWO_SEGMENT_POLYLINE, 100, 1);
    // cadence=3m (larger than 2.22m) → 0 waypoints
    const zero = generateDistanceWaypoints(TWO_SEGMENT_POLYLINE, 100, 3);
    expect(two.length).toBeGreaterThan(zero.length);
    expect(zero).toHaveLength(0);
  });
});

// ─── polylineToRouteSteps ─────────────────────────────────────────────────────

describe('polylineToRouteSteps', () => {
  it('returns [] for an empty polyline string', () => {
    expect(polylineToRouteSteps('', 3600)).toEqual([]);
  });

  it('produces one step per decoded coordinate', () => {
    const steps = polylineToRouteSteps(TWO_SEGMENT_POLYLINE, 100);
    expect(steps).toHaveLength(3);
  });

  it('assigns t=0 to the first step and t=totalDuration to the last step', () => {
    const steps = polylineToRouteSteps(TWO_SEGMENT_POLYLINE, 120);
    expect(steps[0].cumulativeDurationSeconds).toBe(0);
    expect(steps[2].cumulativeDurationSeconds).toBe(120);
  });

  it('distributes time proportionally to distance — equal segments → midpoint at half duration', () => {
    const steps = polylineToRouteSteps(TWO_SEGMENT_POLYLINE, 100);
    expect(steps[1].cumulativeDurationSeconds).toBeCloseTo(50, 5);
  });

  it('step coordinates match the decoded polyline points', () => {
    const steps = polylineToRouteSteps(TWO_SEGMENT_POLYLINE, 100);
    expect(steps[0].coordinate).toEqual([0, 0]);
    expect(steps[1].coordinate[0]).toBe(0);
    expect(steps[1].coordinate[1]).toBeCloseTo(1e-5);
    expect(steps[2].coordinate[1]).toBeCloseTo(2e-5);
  });

  it('cumulative durations are monotonically non-decreasing', () => {
    const steps = polylineToRouteSteps(TWO_SEGMENT_POLYLINE, 200);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].cumulativeDurationSeconds).toBeGreaterThanOrEqual(
        steps[i - 1].cumulativeDurationSeconds,
      );
    }
  });
});

// ─── generateIntervalWaypoints ────────────────────────────────────────────────

describe('generateIntervalWaypoints', () => {
  it('returns [] when steps array is empty', () => {
    expect(generateIntervalWaypoints(120 * MIN, [])).toEqual([]);
  });

  it('returns [] when total duration is shorter than one cadence interval', () => {
    const steps = [step(48.8, 2.3, 20 * MIN)];
    expect(generateIntervalWaypoints(25 * MIN, steps)).toEqual([]);
  });

  it('generates one waypoint for a route that fits exactly one interval', () => {
    const steps = [step(48.8, 2.3, 28 * MIN), step(48.9, 2.4, 30 * MIN)];
    const result = generateIntervalWaypoints(30 * MIN, steps);
    expect(result).toHaveLength(1);
    expect(result[0].targetDurationSeconds).toBe(30 * MIN);
  });

  it('interpolates between bracketing steps to hit the exact target time', () => {
    const steps = [step(48.8, 2.3, 15 * MIN), step(48.9, 2.4, 50 * MIN)];
    const result = generateIntervalWaypoints(55 * MIN, steps);
    expect(result).toHaveLength(1);
    const fraction = (30 - 15) / (50 - 15);
    expect(result[0].latitude).toBeCloseTo(48.8 + fraction * (48.9 - 48.8));
    expect(result[0].longitude).toBeCloseTo(2.3 + fraction * (2.4 - 2.3));
    expect(result[0].actualDurationSeconds).toBe(30 * MIN);
  });

  it('interpolates across multiple step segments for a multi-interval route', () => {
    const steps = [
      step(48.0, 2.0,   0),
      step(49.0, 3.0, 60 * MIN),
      step(50.0, 4.0, 120 * MIN),
    ];
    const result = generateIntervalWaypoints(130 * MIN, steps);
    expect(result).toHaveLength(4);
    expect(result[0].latitude).toBeCloseTo(48.5);
    expect(result[0].actualDurationSeconds).toBe(30 * MIN);
    expect(result[1].latitude).toBeCloseTo(49.0);
    expect(result[2].latitude).toBeCloseTo(49.5);
    expect(result[2].actualDurationSeconds).toBe(90 * MIN);
  });

  it('clamps to the first step when the target is before the step range', () => {
    const steps = [step(48.8, 2.3, 35 * MIN), step(48.9, 2.4, 65 * MIN)];
    const result = generateIntervalWaypoints(70 * MIN, steps);
    expect(result[0].latitude).toBe(48.8);
    expect(result[0].actualDurationSeconds).toBe(35 * MIN);
  });

  it('clamps to the last step when the target exceeds the step range', () => {
    const steps = [step(48.8, 2.3, 10 * MIN), step(48.9, 2.4, 50 * MIN)];
    const result = generateIntervalWaypoints(90 * MIN, steps);
    expect(result[1].latitude).toBe(48.9);
    expect(result[1].actualDurationSeconds).toBe(50 * MIN);
    expect(result[2].actualDurationSeconds).toBe(50 * MIN);
  });

  it('emits one waypoint per interval — no deduplication', () => {
    const result = generateIntervalWaypoints(65 * MIN, [step(48.8, 2.3, 45 * MIN)]);
    expect(result).toHaveLength(2);
    expect(result[0].targetDurationSeconds).toBe(30 * MIN);
    expect(result[1].targetDurationSeconds).toBe(60 * MIN);
  });

  it('returns waypoints in ascending target-time order', () => {
    const steps = [
      step(48.8, 2.3, 29 * MIN),
      step(48.9, 2.4, 58 * MIN),
      step(49.0, 2.5, 88 * MIN),
    ];
    const result = generateIntervalWaypoints(100 * MIN, steps);
    expect(result).toHaveLength(3);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].targetDurationSeconds).toBeGreaterThan(
        result[i - 1].targetDurationSeconds,
      );
    }
  });

  it('handles unsorted input steps', () => {
    const steps = [step(48.9, 2.4, 50 * MIN), step(48.8, 2.3, 15 * MIN)];
    const result = generateIntervalWaypoints(55 * MIN, steps);
    expect(result).toHaveLength(1);
    expect(result[0].actualDurationSeconds).toBe(30 * MIN);
  });

  it('respects a custom cadence parameter', () => {
    const steps = [step(48.8, 2.3, 0), step(49.2, 2.7, 40 * MIN)];
    const result = generateIntervalWaypoints(45 * MIN, steps, 20 * MIN);
    expect(result).toHaveLength(2);
    expect(result[0].actualDurationSeconds).toBe(20 * MIN);
    expect(result[1].actualDurationSeconds).toBe(40 * MIN);
  });
});
