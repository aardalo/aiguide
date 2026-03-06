# Task: TASK-044 Add weather provider abstraction and normalization

## Metadata
- **Priority**: P2
- **Status**: planned

## Goal
Introduce a normalized weather provider layer for RUN mode replanning.

## Implementation notes
- Add provider adapter interface and normalized response schema.
- Implement one initial provider adapter with retry/backoff policy.
- Include provider failure states compatible with fallback UX.

## Definition of done
- [ ] Code complete
- [ ] Tests pass
- [ ] Docs updated

## Links
- Epic: [EPIC-005](../epics/EPIC-005-run-mode-daily-replanning-events-and-weather.md)
- Story: [STORY-017](../stories/STORY-017-weather-aware-run-mode-replanning.md)
