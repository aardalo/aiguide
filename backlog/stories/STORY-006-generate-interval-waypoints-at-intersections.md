# Story: STORY-006 Generate interval waypoints along route

## Metadata
- **Priority**: P1
- **Status**: done

## User story
As a trip planner, I want automatic waypoints placed at regular intervals along each day's route, so that routes have sensible control points for editing and adjustment.

## Mode ownership
- Primary mode: PLAN
- Secondary modes: RUN

## Acceptance criteria
- [x] Route generation creates waypoints at regular distance intervals (50 km).
- [x] Waypoints are guaranteed to lie on the road (snapped to decoded polyline vertices — no off-road interpolation).
- [x] Auto-generated waypoints are visually distinct from manually placed ones (terracotta vs blue).
- [x] Routes shorter than 50 km produce no intermediate waypoints.

## Implementation notes
- Approach changed from 30-minute time-based / intersection-aware to **50 km distance-based snap-to-polyline-vertex** during implementation. Intersection metadata from OSRM was too sparse for reliable placement; distance-based snap to the full decoded polyline guarantees on-road positions.
- Configurable interval (currently hardcoded 50 km) is tracked as a future backlog item: [TASK-049](../tasks/TASK-049-make-waypoint-interval-distance-configurable.md).

## Dependencies
- Route polyline from routing provider (all three providers supply an encoded polyline)

## Related tasks
- [TASK-012: Implement distance-based waypoint generation](../tasks/TASK-012-implement-intersection-aware-waypoint-generation.md)
- [TASK-015: Add validation and failure-handling flows](../tasks/TASK-015-add-validation-and-failure-handling-flows.md)
- [TASK-049: Make waypoint interval distance configurable](../tasks/TASK-049-make-waypoint-interval-distance-configurable.md)
