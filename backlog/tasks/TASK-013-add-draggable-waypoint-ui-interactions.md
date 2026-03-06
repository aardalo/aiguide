# Task: TASK-013 Add draggable waypoint UI interactions

## Metadata
- **Priority**: P1
- **Status**: done

## Goal
Allow user to move generated waypoints on the map.

## Implementation notes
- Waypoints rendered as Leaflet `divIcon` draggable markers.
- `dragend` fires `onWaypointMovedRef.current(id, lat, lng)` → calls `PATCH /api/route-waypoints/:id`.
- Auto-generated waypoints: terracotta circle 10 px. Manually placed: blue circle 12 px (`isManual` flag from DB).
- Map zoom is preserved during drag using a counter-based `skipFitBoundsRef` (incremented by 2 per move: once for immediate redraw, once for DailyDestinations re-fetch callback).

## Definition of done
- [x] Code complete
- [x] Tests pass
- [x] Docs updated

## Links
- Epic: [EPIC-002](../epics/EPIC-002-plan-mode-daily-routing.md)
- Story: [STORY-007](../stories/STORY-007-manually-adjust-waypoint-and-recompute.md)
