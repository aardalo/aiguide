# Task: TASK-047 Persist weather snapshots for replans

## Metadata
- **Priority**: P2
- **Status**: planned

## Goal
Persist weather snapshots linked to weather-driven replan decisions.

## Implementation notes
- Add `weather_snapshot` persistence model and linkage to replan records.
- Store normalized weather data and retrieval timestamp.
- Ensure snapshots can be referenced from RUN day history/events.

## Definition of done
- [ ] Code complete
- [ ] Tests pass
- [ ] Docs updated

## Links
- Epic: [EPIC-005](../epics/EPIC-005-run-mode-daily-replanning-events-and-weather.md)
- Story: [STORY-017](../stories/STORY-017-weather-aware-run-mode-replanning.md)
