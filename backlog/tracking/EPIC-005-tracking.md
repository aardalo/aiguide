# Tracking: EPIC-005 RUN Mode Daily Replanning, Events, Scoring, and Weather Awareness

## Status
- Overall: planned

## Progress
- Completed:
  - Epic definition and decomposition into stories/tasks
  - Story set created: STORY-015, STORY-016, STORY-017
  - Task set created: TASK-037 through TASK-048
- In progress:
  - None
- Next:
  - Prioritize implementation sequence for RUN shell, events, scoring, and weather integration

## Stories
1. [STORY-015: Record RUN mode daily events](../stories/STORY-015-record-run-mode-daily-events.md)
2. [STORY-016: Score RUN mode day outcomes](../stories/STORY-016-score-run-mode-day.md)
3. [STORY-017: Weather-aware RUN mode replanning](../stories/STORY-017-weather-aware-run-mode-replanning.md)

## Tasks
- [TASK-037](../tasks/TASK-037-add-run-mode-shell-and-active-day-context.md)
- [TASK-038](../tasks/TASK-038-add-run-day-event-model-and-migration.md)
- [TASK-039](../tasks/TASK-039-implement-run-event-crud-apis.md)
- [TASK-040](../tasks/TASK-040-build-run-day-timeline-ui.md)
- [TASK-041](../tasks/TASK-041-add-run-day-score-model-and-migration.md)
- [TASK-042](../tasks/TASK-042-implement-run-scoring-apis-and-overall-score-computation.md)
- [TASK-043](../tasks/TASK-043-build-run-day-scoring-ui.md)
- [TASK-044](../tasks/TASK-044-add-weather-provider-abstraction-and-normalization.md)
- [TASK-045](../tasks/TASK-045-implement-weather-aware-replan-api-flow.md)
- [TASK-046](../tasks/TASK-046-build-run-weather-panel-and-replan-action-ui.md)
- [TASK-047](../tasks/TASK-047-persist-weather-snapshots-for-replans.md)
- [TASK-048](../tasks/TASK-048-add-automated-tests-for-run-mode-operations.md)

## Risks / blockers
- Weather provider selection and access limits not finalized
- RUN mode lifecycle transitions depend on active-trip definition in app state

## Decisions
- RUN mode has dedicated epic ownership (EPIC-005)
- Event recording, scoring, and weather-aware replanning are first-class RUN concerns
- Weather failures degrade gracefully and must not block baseline replanning
