# Task: TASK-042 Implement RUN scoring APIs and overall score computation

## Metadata
- **Priority**: P2
- **Status**: planned

## Goal
Support create/update/read APIs for RUN day scoring with server-side overall score calculation.

## Implementation notes
- Add score upsert/read endpoints scoped by trip/day.
- Compute `overall_day_score` on backend from sub-scores.
- Enforce score range validation and consistent API errors.

## Definition of done
- [ ] Code complete
- [ ] Tests pass
- [ ] Docs updated

## Links
- Epic: [EPIC-005](../epics/EPIC-005-run-mode-daily-replanning-events-and-weather.md)
- Story: [STORY-016](../stories/STORY-016-score-run-mode-day.md)
