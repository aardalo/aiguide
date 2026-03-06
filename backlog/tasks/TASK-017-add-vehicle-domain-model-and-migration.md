# Task: TASK-017 Add vehicle domain model and migration

## Metadata
- **Priority**: P1
- **Status**: planned

## Goal
Create persistent vehicle schema that supports dimensions and speed settings.

## Implementation notes
- Add vehicle entity fields: `id`, `name`, `length`, `width`, `height`, `average_speed`, `maximum_speed`.
- Define speed and dimension units in schema contract.
- Create migration for vehicle storage.

## Definition of done
- [ ] Code complete
- [ ] Tests pass
- [ ] Docs updated

## Links
- Epic: [EPIC-003](../epics/EPIC-003-global-vehicle-setup-and-plan-mode-selection.md)
- Story: [STORY-009](../stories/STORY-009-manage-vehicle-dimensions-and-speed-constraints.md)
