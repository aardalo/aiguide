# Epic #2: PLAN Mode with Daily Destinations and Adjustable Routing

## Metadata
- **Priority**: P1
- **Status**: planned

## Problem
After creating a trip, users need a structured planning mode to define where they will end each day and automatically generate realistic travel routes between daily endpoints. Current trip management does not support per-day destination planning, route timing estimates, or editable intermediate route control points.

## Outcome
Deliver a trip PLAN mode where a user can:

1. Enable PLAN mode for a trip
2. Add one destination per trip day
3. Auto-generate route segments from the previous night’s destination to the current night’s destination
4. See estimated distance and transit time per segment/day
5. Get generated waypoints near major intersections roughly every 30 minutes of travel
6. Manually move waypoints and re-shape route results

## Scope

### In scope
- PLAN mode toggle/state on trip
- Daily itinerary model with per-day destination
- Route segment generation between consecutive overnight destinations
- Distance and transit-time estimates for each segment
- Automatic waypoint generation cadence targeting ~30-minute intervals
- Manual waypoint drag/edit and route recomputation
- Persistence of daily destinations, generated waypoints, and manual adjustments

### Out of scope
- Multi-modal optimization beyond selected mode
- Weather/traffic prediction intelligence
- Multi-user collaborative editing
- Offline route computation
- Turn-by-turn navigation UI

## User value
- Plan trips day-by-day with clear overnight destinations
- Understand expected travel effort (distance + duration)
- Fine-tune routes manually without losing auto-planning benefits

## Functional requirements
- Trip includes a `plan_mode` state.
- User can define destination for each day in trip range.
- Day N route starts from Day N-1 overnight destination and ends at Day N destination.
- Route engine returns distance and transit time estimates.
- System generates waypoints approximately every 30 minutes near major intersections.
- User can drag/move waypoint and trigger route recalculation.
- Manual waypoint changes persist and remain associated with the day/segment.

## Non-functional requirements
- Route generation feedback should complete within acceptable UI latency for normal segment lengths.
- All route computations should be deterministic for same inputs and mode.
- Waypoint editing should be keyboard/mouse accessible where feasible.
- Error states (no route found, provider error) must be user-visible and recoverable.

## Acceptance criteria
- [ ] PLAN mode can be enabled/disabled per trip.
- [ ] User can add/edit daily destination for each day in trip timeline.
- [ ] System generates route from previous night destination to current night destination.
- [ ] Route details show estimated distance and transit time.
- [ ] Waypoints are auto-created at major intersections around each 30-minute interval.
- [ ] User can manually move at least one waypoint and route recomputes accordingly.
- [ ] Recomputed route updates distance/transit estimates.
- [ ] Route + waypoint state persists after refresh/reload.

## Success metrics
- 95%+ route-generation success for valid origin/destination pairs in test dataset
- 100% coverage of manual waypoint move flow in automated tests
- < 3% user-visible failures due to recoverable provider/runtime errors in QA runs

## Dependencies
- Routing engine/provider supporting route polyline and intersection-aware waypointing
- Map UI supporting draggable markers/waypoints
- Backend model and APIs for day plan and route segment persistence

## Risks and mitigations
- Risk: “major intersection every 30 minutes” may vary by provider granularity
  - Mitigation: define tolerance window (e.g., 20–40 minutes) and fallback heuristic
- Risk: waypoint drag may produce invalid/unroutable segments
  - Mitigation: validate snap-to-road and show corrective error/revert behavior
- Risk: route recalculation latency impacts UX
  - Mitigation: asynchronous recalculation with loading state and optimistic waypoint update

## Milestones
1. PLAN mode and day-destination data model
2. Route generation with distance/time estimates
3. Automatic waypoint generation cadence
4. Manual waypoint move + recomputation + persistence
5. End-to-end tests and error handling hardening

## Related stories
- [STORY-004: Enable PLAN mode and daily itinerary](../stories/STORY-004-enable-plan-mode-and-daily-itinerary.md)
- [STORY-005: Generate daily route with distance/time estimates](../stories/STORY-005-generate-daily-route-with-estimates.md)
- [STORY-006: Generate interval waypoints at major intersections](../stories/STORY-006-generate-interval-waypoints-at-intersections.md)
- [STORY-007: Manually adjust waypoint and recompute route](../stories/STORY-007-manually-adjust-waypoint-and-recompute.md)

## Related tasks
- [TASK-008: Add PLAN mode to trip model](../tasks/TASK-008-add-plan-mode-to-trip-model.md)
- [TASK-009: Add daily destination model and APIs](../tasks/TASK-009-add-daily-destination-model-and-apis.md)
- [TASK-010: Implement route generation service per day segment](../tasks/TASK-010-implement-route-generation-service-per-day-segment.md)
- [TASK-011: Surface distance and transit time in UI](../tasks/TASK-011-surface-distance-and-transit-time-in-ui.md)
- [TASK-012: Implement intersection-aware waypoint generation](../tasks/TASK-012-implement-intersection-aware-waypoint-generation.md)
- [TASK-013: Add draggable waypoint UI interactions](../tasks/TASK-013-add-draggable-waypoint-ui-interactions.md)
- [TASK-014: Recompute and persist route after waypoint move](../tasks/TASK-014-recompute-and-persist-route-after-waypoint-move.md)
- [TASK-015: Add validation and failure-handling flows](../tasks/TASK-015-add-validation-and-failure-handling-flows.md)
- [TASK-016: Add automated tests for PLAN mode routing](../tasks/TASK-016-add-automated-tests-for-plan-mode-routing.md)
