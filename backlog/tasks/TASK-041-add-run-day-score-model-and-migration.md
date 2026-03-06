# Task: TASK-041 Add run-day score model and migration

## Metadata
- **Priority**: P2
- **Status**: planned

## Goal
Persist per-day RUN scoring values with a stable schema keyed by trip/day.

## Implementation notes
- Add `run_day_score` table/model keyed by `(trip_id, day_index)`.
- Include `navigation_score`, `comfort_score`, `reliability_score`, `overall_day_score`, `notes`.
- Add migration and constraints for valid score range.

## Definition of done
- [ ] Code complete
- [ ] Tests pass
- [ ] Docs updated

## Links
- Epic: [EPIC-005](../epics/EPIC-005-run-mode-daily-replanning-events-and-weather.md)
- Story: [STORY-016](../stories/STORY-016-score-run-mode-day.md)
