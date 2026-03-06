# Task: TASK-049 Make waypoint interval distance configurable

## Metadata
- **Priority**: P3
- **Status**: planned

## Goal
Allow the user to configure how frequently auto-generated waypoints appear along a route (currently hardcoded at 50 km).

## Implementation notes
- Add a new setting key `waypoints.interval_km` (integer, default 50) to `src/lib/settings.ts`.
- Expose it in the Settings UI alongside other routing options.
- Read the setting in `app/api/route-segments/route.ts` and pass `cadenceMeters = intervalKm * 1000` to `generateDistanceWaypoints`.
- Also read it in `app/api/route-waypoints/[id]/route.ts` when regenerating auto waypoints after a manual move.
- Reasonable range: 20–200 km.

## Definition of done
- [ ] Setting stored and validated
- [ ] Route generation uses configured value
- [ ] Waypoint-move reroute uses configured value
- [ ] Settings UI shows the field
- [ ] Tests updated

## Links
- Epic: [EPIC-002](../epics/EPIC-002-plan-mode-daily-routing.md)
- Story: [STORY-006](../stories/STORY-006-generate-interval-waypoints-at-intersections.md)
