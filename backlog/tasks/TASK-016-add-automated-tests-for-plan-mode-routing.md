# Task: TASK-016 Add automated tests for PLAN mode routing

## Metadata
- **Priority**: P1
- **Status**: done

## Goal
Add robust coverage for PLAN mode daily route generation and waypoint adjustment behaviour.

## Implementation notes
- Unit tests in `tests/unit/waypoints.test.ts` (26 tests):
  - `generateDistanceWaypoints`: 8 tests — empty input, cadence intervals, vertex snapping, ordering, coordinate identity.
  - `polylineToRouteSteps`: 6 tests — proportional time distribution, coordinate fidelity.
  - `generateIntervalWaypoints`: 12 tests — interpolation, clamping, ordering, custom cadence.
- Integration API tests in `tests/integration/` cover route segment generation and trip CRUD.
- Total suite: 187 tests passing.

## Definition of done
- [x] Code complete
- [x] Tests pass
- [x] Docs updated

## Links
- Epic: [EPIC-002](../epics/EPIC-002-plan-mode-daily-routing.md)
- Story: [STORY-007](../stories/STORY-007-manually-adjust-waypoint-and-recompute.md)
