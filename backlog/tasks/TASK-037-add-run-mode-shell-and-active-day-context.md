# Task: TASK-037 Add RUN mode shell and active-day context

## Metadata
- **Priority**: P2
- **Status**: planned

## Goal
Provide a dedicated RUN mode shell with active trip-day context and mode-specific navigation.

## Implementation notes
- Add `/run/*` route group and mode-aware app shell integration.
- Resolve active trip and day index from trip lifecycle state.
- Add fallback UX for missing active trip/day context.

## Definition of done
- [ ] Code complete
- [ ] Tests pass
- [ ] Docs updated

## Links
- Epic: [EPIC-005](../epics/EPIC-005-run-mode-daily-replanning-events-and-weather.md)
- Story: [STORY-015](../stories/STORY-015-record-run-mode-daily-events.md)
