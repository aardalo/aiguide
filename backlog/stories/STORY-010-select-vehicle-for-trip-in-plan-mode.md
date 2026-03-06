# Story: STORY-010 Select vehicle for trip in PLAN mode

## Metadata
- **Priority**: P1
- **Status**: planned

## User story
As a planner, I want to select a vehicle for my PLAN mode trip, so that route planning can use the right vehicle profile.

## Mode ownership
- Primary mode: PLAN
- Secondary modes: SETUP

## Acceptance criteria
- [ ] PLAN mode UI provides a vehicle selector bound to available vehicles.
- [ ] Selecting a vehicle persists to the trip.
- [ ] Selected vehicle is reloaded correctly on revisit.
- [ ] Selecting a deleted/invalid vehicle is prevented or corrected.

## Dependencies
- Vehicle list availability
- Trip PLAN mode persistence

## Related tasks
- [TASK-021: Add PLAN mode trip vehicle selector UI](../tasks/TASK-021-add-plan-mode-trip-vehicle-selector-ui.md)
- [TASK-022: Persist trip vehicle selection backend flow](../tasks/TASK-022-persist-trip-vehicle-selection-backend-flow.md)
- [TASK-023: Prevent unsafe delete for assigned vehicles](../tasks/TASK-023-prevent-unsafe-delete-for-assigned-vehicles.md)
