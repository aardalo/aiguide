# Task: TASK-033 Persist prioritized options and selected stay per day

## Metadata
- **Priority**: P1
- **Status**: planned

## Goal
Store option ordering and selected stay for each trip day.

## Implementation notes
- Add day-level persistence model for option ids and rank positions.
- Store selected stay reference and metadata snapshot.
- Ensure idempotent updates for repeated reordering.

## Definition of done
- [ ] Code complete
- [ ] Tests pass
- [ ] Docs updated

## Links
- Epic: [EPIC-004](../epics/EPIC-004-vehicle-aware-stay-discovery-and-day-assignment.md)
- Story: [STORY-013](../stories/STORY-013-let-user-prioritize-and-select-stay-options.md)
- Story: [STORY-014](../stories/STORY-014-assign-selected-stay-to-relevant-trip-day.md)
