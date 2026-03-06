# Task: TASK-039 Implement RUN event CRUD APIs

## Metadata
- **Priority**: P2
- **Status**: planned

## Goal
Expose APIs to create, update, list, and delete RUN mode day events.

## Implementation notes
- Add endpoints scoped by trip/day for event CRUD operations.
- Validate event type/timestamp and enforce trip/day ownership checks.
- Return events in chronological order by `occurred_at`.

## Definition of done
- [ ] Code complete
- [ ] Tests pass
- [ ] Docs updated

## Links
- Epic: [EPIC-005](../epics/EPIC-005-run-mode-daily-replanning-events-and-weather.md)
- Story: [STORY-015](../stories/STORY-015-record-run-mode-daily-events.md)
