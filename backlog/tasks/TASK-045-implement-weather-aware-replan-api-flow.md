# Task: TASK-045 Implement weather-aware replan API flow

## Metadata
- **Priority**: P2
- **Status**: planned

## Goal
Integrate weather context into RUN route replanning responses.

## Implementation notes
- Extend replan endpoint to attach weather impact classification.
- Keep deterministic route constraints separate from weather advisory scoring.
- Add fallback response path when weather data is unavailable.

## Definition of done
- [ ] Code complete
- [ ] Tests pass
- [ ] Docs updated

## Links
- Epic: [EPIC-005](../epics/EPIC-005-run-mode-daily-replanning-events-and-weather.md)
- Story: [STORY-017](../stories/STORY-017-weather-aware-run-mode-replanning.md)
