# Task: TASK-014 Recompute and persist route after waypoint move

## Metadata
- **Priority**: P1
- **Status**: done

## Goal
Recalculate route after manual waypoint changes and persist resulting state.

## Implementation notes
- `PATCH /api/route-waypoints/:id` in `app/api/route-waypoints/[id]/route.ts`.
- **Via-point semantics** (key design decision): only `isManual=true` waypoints are used as routing handles. Auto-generated (`isManual=false`) waypoints are visual markers on the current polyline; they become stale after any reroute and must be regenerated.
- On each move:
  1. Route through `[from, ...isManual via-points (with moved one updated), to]`.
  2. Update segment polyline / distance / duration.
  3. Mark moved waypoint `isManual=true` at new position.
  4. Delete all `isManual=false` waypoints (stale after polyline change).
  5. Regenerate auto waypoints with `generateDistanceWaypoints` on new polyline.
- `isManual` field added to `RouteWaypoint` model (`prisma/schema.prisma`), migration `20260303193558_add_waypoint_is_manual`.

## Definition of done
- [x] Code complete
- [x] Tests pass
- [x] Docs updated

## Links
- Epic: [EPIC-002](../epics/EPIC-002-plan-mode-daily-routing.md)
- Story: [STORY-007](../stories/STORY-007-manually-adjust-waypoint-and-recompute.md)
