# Story: STORY-007 Manually adjust waypoint and recompute route

## Metadata
- **Priority**: P1
- **Status**: done

## User story
As a trip planner, I want to move generated waypoints manually, so that I can customize route shape and see updated time/distance estimates.

## Mode ownership
- Primary mode: PLAN
- Secondary modes: RUN

## Acceptance criteria
- [x] User can drag/move waypoint on map.
- [x] Route recomputes after waypoint move.
- [x] Updated route distance/time is displayed.
- [x] Updated waypoint/route state persists.

## Implementation notes
- Manually moved waypoints are marked `isManual=true` (blue); auto-generated waypoints stay terracotta.
- **Via-point semantics**: only `isManual=true` waypoints act as routing handles on subsequent moves. Auto-generated waypoints are visual markers only and are regenerated on the new polyline after every reroute, preventing stale positions from distorting re-routes.
- Map zoom level is preserved during drag (counter-based `skipFitBoundsRef`).

## Dependencies
- Draggable map waypoint controls (Leaflet)
- Route recomputation API

## Related tasks
- [TASK-013: Add draggable waypoint UI interactions](../tasks/TASK-013-add-draggable-waypoint-ui-interactions.md)
- [TASK-014: Recompute and persist route after waypoint move](../tasks/TASK-014-recompute-and-persist-route-after-waypoint-move.md)
- [TASK-016: Add automated tests for PLAN mode routing](../tasks/TASK-016-add-automated-tests-for-plan-mode-routing.md)
