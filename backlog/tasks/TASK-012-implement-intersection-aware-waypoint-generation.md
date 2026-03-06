# Task: TASK-012 Implement distance-based waypoint generation

## Metadata
- **Priority**: P1
- **Status**: done

## Goal
Place automatic waypoints at regular distance intervals along each day's route, guaranteed to lie on the road geometry.

## Implementation notes
- Original plan (intersection-aware, 30-minute cadence) was revised: OSRM intersection metadata was too sparse for reliable placement on long highway stretches.
- Implemented `generateDistanceWaypoints(encodedPolyline, totalDurationSeconds, cadenceMeters=50_000)` in `src/lib/routing/waypoints.ts`.
- Algorithm: decode polyline → compute Haversine cumulative distances → for each `k × 50 km` target, binary-search for bracketing vertex pair, snap to the nearer vertex. No interpolation — every returned coordinate is an exact decoded polyline point.
- Configurable interval is hardcoded at 50 km; user-facing setting tracked in TASK-049.

## Definition of done
- [x] Code complete
- [x] Tests pass (`tests/unit/waypoints.test.ts` — 26 tests)
- [x] Docs updated

## Links
- Epic: [EPIC-002](../epics/EPIC-002-plan-mode-daily-routing.md)
- Story: [STORY-006](../stories/STORY-006-generate-interval-waypoints-at-intersections.md)
