# Task: TASK-005 Add date validation client and server

## Metadata
- **Priority**: P0
- **Status**: ready

## Goal
Enforce valid trip date range in both UI and backend.

## Implementation notes
- Reject when `stop_date < start_date`.
- Reuse equivalent validation messages via shared schema constants.
- Add Vitest unit tests for boundary cases (equal dates, missing dates, invalid formats).

## Definition of done
- [ ] Code complete
- [ ] Tests pass
- [ ] Docs updated

## Links
- Epic: [EPIC-001](../epics/EPIC-001-web-map-trip-planning.md)
- Story: [STORY-003](../stories/STORY-003-validate-trip-date-consistency.md)
