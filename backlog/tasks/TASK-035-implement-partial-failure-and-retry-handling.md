# Task: TASK-035 Implement partial-failure and retry handling

## Metadata
- **Priority**: P1
- **Status**: planned

## Goal
Make discovery resilient when one or more external sources fail.

## Implementation notes
- Add per-source timeout and retry/backoff logic.
- Return partial results with source error summary.
- Provide user action to retry failed sources.

## Definition of done
- [ ] Code complete
- [ ] Tests pass
- [ ] Docs updated

## Links
- Epic: [EPIC-004](../epics/EPIC-004-vehicle-aware-stay-discovery-and-day-assignment.md)
- Story: [STORY-011](../stories/STORY-011-build-stay-discovery-pipeline-from-known-sources.md)
