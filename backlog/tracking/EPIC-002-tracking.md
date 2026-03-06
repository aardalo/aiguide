# Tracking: EPIC-002 PLAN Mode with Daily Routing

## Status
- Overall: on-track

## Progress
- Completed:
  - Epic decomposition into stories and tasks
  - STORY-005: Route generation service (TASK-010 complete; TASK-011 UI surfacing pending)
  - STORY-006: Distance-based waypoint generation (50 km snap-to-polyline-vertex)
  - STORY-007: Manual waypoint drag with reroute and auto-waypoint regeneration
  - TASK-010: Route generation service (OSRM, ORS, Google, Mapbox providers)
  - TASK-012: `generateDistanceWaypoints` — Haversine distance, binary search, vertex snap
  - TASK-013: Draggable waypoint UI (Leaflet divIcon, `isManual` colour coding)
  - TASK-014: Reroute and persist after waypoint move (via-point semantics, auto-waypoint regeneration)
  - TASK-016: Automated unit tests for waypoint generation (26 waypoint tests, 187 total)
- In progress:
  - STORY-005: TASK-011 (surface distance/time in UI) still pending
- Next:
  - TASK-049: Make waypoint interval distance configurable (P3 backlog)

## Risks / blockers
- None active

## Decisions
- Waypoint cadence changed from 30-minute time-based to **50 km distance-based** to guarantee on-road placement and provide uniform editing handles regardless of road speed.
- **Via-point semantics**: `isManual=true` waypoints are routing handles preserved across reroutes; `isManual=false` waypoints are visual markers regenerated on every polyline change to stay on the current road.
- Configurable waypoint interval deferred to TASK-049 (P3).
