# Story: STORY-009 Manage vehicle dimensions and speed constraints

## Metadata
- **Priority**: P1
- **Status**: planned

## User story
As a planner, I want to store vehicle dimensions and average/maximum speed with validation, so that I can trust planning assumptions.

## Mode ownership
- Primary mode: SETUP
- Secondary modes: PLAN

## Acceptance criteria
- [ ] Vehicle form includes dimensions (length, width, height) and speed fields.
- [ ] Validation enforces positive dimensions.
- [ ] Validation enforces `maximum_speed >= average_speed`.
- [ ] Clear error feedback is shown on invalid input.

## Dependencies
- Shared validation logic
- Vehicle create/update forms

## Related tasks
- [TASK-017: Add vehicle domain model and migration](../tasks/TASK-017-add-vehicle-domain-model-and-migration.md)
- [TASK-020: Add vehicle validation rules and messaging](../tasks/TASK-020-add-vehicle-validation-rules-and-messaging.md)
