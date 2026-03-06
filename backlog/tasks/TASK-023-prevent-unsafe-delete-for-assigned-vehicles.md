# Task: TASK-023 Prevent unsafe delete for assigned vehicles

## Metadata
- **Priority**: P1
- **Status**: planned

## Goal
Avoid broken trip references when deleting vehicles in use.

## Implementation notes
- Block delete for vehicles assigned to active trips, or require reassignment.
- Provide clear guidance to user when delete is prevented.
- Add backend guardrail and matching UI behavior.

## Definition of done
- [ ] Code complete
- [ ] Tests pass
- [ ] Docs updated

## Links
- Epic: [EPIC-003](../epics/EPIC-003-global-vehicle-setup-and-plan-mode-selection.md)
- Story: [STORY-010](../stories/STORY-010-select-vehicle-for-trip-in-plan-mode.md)
