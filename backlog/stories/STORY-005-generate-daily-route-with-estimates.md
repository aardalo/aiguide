# Story: STORY-005 Generate daily route with distance/time estimates

## Metadata
- **Priority**: P1
- **Status**: in-progress

## User story
As a trip planner, I want a route generated from last night’s destination to tonight’s destination, so that I can understand daily travel distance and duration.

## Mode ownership
- Primary mode: PLAN
- Secondary modes: RUN

## Acceptance criteria
- [x] For day N, route origin is day N-1 overnight destination.
- [x] For day N, route destination is day N overnight destination.
- [ ] Route output displays estimated distance and transit time. *(routes render on map but distance/time not shown in sidebar UI — TASK-011 pending)*

## Dependencies
- Routing provider integration
- Itinerary day sequencing

## Related tasks
- [TASK-010: Implement route generation service per day segment](../tasks/TASK-010-implement-route-generation-service-per-day-segment.md)
- [TASK-011: Surface distance and transit time in UI](../tasks/TASK-011-surface-distance-and-transit-time-in-ui.md)
