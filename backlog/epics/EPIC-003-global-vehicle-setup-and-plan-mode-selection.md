# Epic #3: Global Vehicle Setup and Vehicle Selection in PLAN Mode

## Metadata
- **Priority**: P1
- **Status**: planned

## Problem
Trip planning currently lacks vehicle context. Users need a global setup page to define multiple vehicles (with dimensions and speed characteristics) and then select a specific vehicle in PLAN mode so routing and planning behavior can align with the selected vehicle profile.

## Outcome
Deliver vehicle configuration and usage capabilities where a user can:

1. Open a global setup page
2. Create and manage multiple vehicles
3. Define vehicle dimensions and speed characteristics (average and maximum speed)
4. Select one vehicle for a trip in PLAN mode
5. Persist vehicle settings and trip-to-vehicle assignment

## Scope

### In scope
- Global setup page for vehicle management
- Vehicle CRUD (create, list, update, delete with safeguards)
- Vehicle fields: name, dimensions, average speed, maximum speed
- Validation of dimensions and speed constraints
- PLAN mode trip UI for selecting a vehicle
- Persistence and retrieval of selected vehicle per trip

### Out of scope
- Advanced fleet analytics
- Fuel/consumption simulation
- Live telematics integration
- Vehicle sharing permissions/multi-tenant management

## User value
- Configure realistic vehicle profiles once and reuse across trips
- Align plan calculations with actual vehicle capabilities
- Reduce planning errors from unrealistic speed assumptions

## Functional requirements
- System has a global setup page for vehicle management.
- User can define multiple vehicles.
- Each vehicle stores dimensions (length, width, height).
- Each vehicle stores `average_speed` and `maximum_speed`.
- Validation enforces `maximum_speed >= average_speed` and positive dimensions.
- In PLAN mode, a trip can be assigned a selected vehicle.
- Selected vehicle persists and reloads with trip context.

## Non-functional requirements
- Form interactions should provide clear validation feedback.
- Vehicle CRUD operations should be reliable and auditable.
- Selection changes should propagate predictably in PLAN mode context.

## Acceptance criteria
- [ ] Global setup page is available and reachable in the app.
- [ ] User can add at least two distinct vehicles with dimensions and speeds.
- [ ] Invalid speed/dimension values are rejected with clear messages.
- [ ] Vehicle list supports edit and delete (with safe handling when in use).
- [ ] In PLAN mode, user can choose a vehicle for the trip.
- [ ] Chosen vehicle is shown in trip PLAN mode context and persists after reload.
- [ ] Vehicle selection API and UI are covered by automated tests.

## Success metrics
- 100% validation coverage for speed/dimension constraints
- 95%+ successful vehicle assignment to PLAN mode trips in QA flows
- 0 critical defects related to invalid trip-vehicle references

## Dependencies
- Existing trip and PLAN mode data model (EPIC-002)
- Backend persistence for global vehicle entities
- Front-end navigation/settings framework

## Risks and mitigations
- Risk: deleting vehicle used by active trips creates dangling references
  - Mitigation: prevent delete when assigned, or require reassignment flow
- Risk: speed units ambiguity
  - Mitigation: define explicit unit (e.g., km/h) and enforce consistently
- Risk: dimensions not used consistently in future routing constraints
  - Mitigation: centralize vehicle profile contract and schema validation

## Milestones
1. Global setup vehicle CRUD data model + APIs
2. Setup page UI for vehicle management
3. PLAN mode vehicle selector and persistence
4. Validation hardening and tests

## Related stories
- [STORY-008: Build global setup page for vehicles](../stories/STORY-008-build-global-setup-page-for-vehicles.md)
- [STORY-009: Manage vehicle dimensions and speed constraints](../stories/STORY-009-manage-vehicle-dimensions-and-speed-constraints.md)
- [STORY-010: Select vehicle for trip in PLAN mode](../stories/STORY-010-select-vehicle-for-trip-in-plan-mode.md)

## Related tasks
- [TASK-017: Add vehicle domain model and migration](../tasks/TASK-017-add-vehicle-domain-model-and-migration.md)
- [TASK-018: Implement vehicle CRUD APIs](../tasks/TASK-018-implement-vehicle-crud-apis.md)
- [TASK-019: Build global setup vehicles UI](../tasks/TASK-019-build-global-setup-vehicles-ui.md)
- [TASK-020: Add vehicle validation rules and messaging](../tasks/TASK-020-add-vehicle-validation-rules-and-messaging.md)
- [TASK-021: Add PLAN mode trip vehicle selector UI](../tasks/TASK-021-add-plan-mode-trip-vehicle-selector-ui.md)
- [TASK-022: Persist trip vehicle selection backend flow](../tasks/TASK-022-persist-trip-vehicle-selection-backend-flow.md)
- [TASK-023: Prevent unsafe delete for assigned vehicles](../tasks/TASK-023-prevent-unsafe-delete-for-assigned-vehicles.md)
- [TASK-024: Add tests for vehicle setup and trip selection](../tasks/TASK-024-add-tests-for-vehicle-setup-and-trip-selection.md)
