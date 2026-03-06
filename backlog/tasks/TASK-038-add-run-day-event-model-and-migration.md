# Task: TASK-038 Add run-day event model and migration

## Metadata
- **Priority**: P2
- **Status**: planned

## Goal
Persist RUN mode operational events by trip/day with a stable schema.

## Implementation notes
- Add `run_day_event` table/model with trip/day foreign keys.
- Include event type enum, timestamp, notes, and metadata fields.
- Add migration and indexes for `(trip_id, day_index, occurred_at)`.

## Definition of done
- [ ] Code complete
- [ ] Tests pass
- [ ] Docs updated

## Links
- Epic: [EPIC-005](../epics/EPIC-005-run-mode-daily-replanning-events-and-weather.md)
- Story: [STORY-015](../stories/STORY-015-record-run-mode-daily-events.md)
