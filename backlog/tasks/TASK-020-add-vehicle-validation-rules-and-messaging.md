# Task: TASK-020 Add vehicle validation rules and messaging

## Metadata
- **Priority**: P1
- **Status**: planned

## Goal
Enforce consistent constraints for dimensions and speed values.

## Implementation notes
- Validate positive numbers for all dimensions.
- Validate `maximum_speed >= average_speed`.
- Standardize user-facing validation error messages.

## Definition of done
- [ ] Code complete
- [ ] Tests pass
- [ ] Docs updated

## Links
- Epic: [EPIC-003](../epics/EPIC-003-global-vehicle-setup-and-plan-mode-selection.md)
- Story: [STORY-009](../stories/STORY-009-manage-vehicle-dimensions-and-speed-constraints.md)
