# Story: STORY-016 Score RUN mode day outcomes
## Metadata
- **Priority**: P2
- **Status**: planned
## User story
As a traveler in RUN mode, I want to score each trip day based on how it went, so that I can evaluate route quality and improve future planning decisions.

## Mode ownership
- Primary mode: RUN
- Secondary modes: PLAN

## Acceptance criteria
- [ ] RUN mode day summary supports entering `navigation_score`, `comfort_score`, `reliability_score`, and optional notes.
- [ ] Score values are validated against a defined numeric range (for example 1-5).
- [ ] `overall_day_score` is computed and displayed from sub-scores.
- [ ] Day scoring can be edited for the active day and persists after reload.
- [ ] Score history is visible per day for the trip.
- [ ] Invalid score inputs are blocked with clear validation messages.

## Dependencies
- [STORY-015: Record RUN mode daily events](STORY-015-record-run-mode-daily-events.md)
- RUN mode day summary UI
- Persistence for run-day scoring

## Technical notes
- Add `run_day_score` model keyed by `(trip_id, day_index)`.
- Suggested fields: `navigation_score`, `comfort_score`, `reliability_score`, `overall_day_score`, `notes`, `updated_at`.
- Compute overall score in backend for consistency.
- Keep scoring scale configurable via SETUP preferences in future iteration.

## Related tasks
- [TASK-041: Add run-day score model and migration](../tasks/TASK-041-add-run-day-score-model-and-migration.md)
- [TASK-042: Implement RUN scoring APIs and overall score computation](../tasks/TASK-042-implement-run-scoring-apis-and-overall-score-computation.md)
- [TASK-043: Build RUN day scoring UI](../tasks/TASK-043-build-run-day-scoring-ui.md)
- [TASK-048: Add automated tests for RUN mode operations](../tasks/TASK-048-add-automated-tests-for-run-mode-operations.md)

## Epic
[EPIC-005: RUN Mode Daily Replanning, Events, Scoring, and Weather Awareness](../epics/EPIC-005-run-mode-daily-replanning-events-and-weather.md)
