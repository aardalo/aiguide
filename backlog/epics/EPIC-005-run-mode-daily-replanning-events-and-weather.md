# Epic #5: RUN Mode Daily Replanning, Events, Scoring, and Weather Awareness

## Metadata
- **Priority**: P2
- **Status**: planned

## Problem
During an active trip, users need operational support for day-to-day changes. Current planning artifacts are PLAN-oriented and do not provide a dedicated workflow for real-time replanning, event capture, day scoring, and weather-aware decision support.

## Outcome
Deliver a RUN mode where a user can:

1. Open an active trip day in RUN mode
2. Record operational events (delays, incidents, detours, closures, notes)
3. Replan the day route with weather context
4. Score day outcomes for retrospective learning
5. Persist daily operational history for future planning reuse

## Scope

### In scope
- RUN mode shell and active-day context
- Day event timeline capture/edit/delete
- Day scoring model and overall score computation
- Weather-aware replanning with impact flags
- Persistence of run-day events, scores, and weather snapshots
- Graceful fallback behavior for weather provider failures

### Out of scope
- Turn-by-turn live navigation
- Real-time vehicle telemetry integration
- Automatic incident ingestion from third-party feeds
- Predictive multi-day weather optimization

## User value
- Adapt plans safely while traveling
- Preserve what actually happened during each day
- Improve future planning using scored trip-day outcomes

## Functional requirements
- RUN mode exposes active trip day context and timeline.
- User can create/edit/delete run-day events with timestamp and type.
- User can score day outcomes (`navigation`, `comfort`, `reliability`) with computed overall score.
- Weather data is retrieved and shown for route corridor/destination context.
- Replanning includes weather impact indicators and stores weather snapshot metadata.
- All RUN data persists and reloads by trip/day.

## Non-functional requirements
- RUN mode interactions should remain responsive for in-trip usage.
- Weather provider failures should not block baseline route replanning.
- Event and score updates must be reliable and auditable.

## Acceptance criteria
- [ ] RUN mode is accessible for active trips.
- [ ] User can add/edit/delete day events and see chronological timeline ordering.
- [ ] User can score a day and see computed overall score.
- [ ] Replanning shows weather context and impact flags.
- [ ] Weather-triggered replan records a weather snapshot reference.
- [ ] RUN events, scores, and weather-linked replans persist after reload.
- [ ] Provider failures show clear fallback messaging without data loss.

## Success metrics
- 95%+ successful RUN event write operations in QA scenarios
- 95%+ successful weather-aware replan calls with fallback behavior on provider errors
- 100% persistence reliability for run-day scoring in integration tests

## Dependencies
- PLAN mode route generation baseline (EPIC-002)
- UI mode architecture (ARCH-007)
- Optional AI summarization/ranking support (ARCH-006)

## Risks and mitigations
- Risk: weather provider instability affects UX
  - Mitigation: cache snapshots, retry/backoff, fallback to non-weather replan
- Risk: event schema churn during early usage
  - Mitigation: versioned metadata field and additive event-type policy
- Risk: score quality inconsistency across users
  - Mitigation: fixed score scale and guidance copy in UI

## Milestones
1. RUN mode shell + active-day context
2. Day event model, APIs, and timeline UI
3. Day scoring model, API, and summary UI
4. Weather provider integration and weather-aware replan flow
5. Reliability hardening and automated tests

## Related stories
- [STORY-015: Record RUN mode daily events](../stories/STORY-015-record-run-mode-daily-events.md)
- [STORY-016: Score RUN mode day outcomes](../stories/STORY-016-score-run-mode-day.md)
- [STORY-017: Weather-aware RUN mode replanning](../stories/STORY-017-weather-aware-run-mode-replanning.md)

## Related tasks
- [TASK-037: Add RUN mode shell and active-day context](../tasks/TASK-037-add-run-mode-shell-and-active-day-context.md)
- [TASK-038: Add run-day event model and migration](../tasks/TASK-038-add-run-day-event-model-and-migration.md)
- [TASK-039: Implement RUN event CRUD APIs](../tasks/TASK-039-implement-run-event-crud-apis.md)
- [TASK-040: Build RUN day timeline UI](../tasks/TASK-040-build-run-day-timeline-ui.md)
- [TASK-041: Add run-day score model and migration](../tasks/TASK-041-add-run-day-score-model-and-migration.md)
- [TASK-042: Implement RUN scoring APIs and overall score computation](../tasks/TASK-042-implement-run-scoring-apis-and-overall-score-computation.md)
- [TASK-043: Build RUN day scoring UI](../tasks/TASK-043-build-run-day-scoring-ui.md)
- [TASK-044: Add weather provider abstraction and normalization](../tasks/TASK-044-add-weather-provider-abstraction-and-normalization.md)
- [TASK-045: Implement weather-aware replan API flow](../tasks/TASK-045-implement-weather-aware-replan-api-flow.md)
- [TASK-046: Build RUN weather panel and replan action UI](../tasks/TASK-046-build-run-weather-panel-and-replan-action-ui.md)
- [TASK-047: Persist weather snapshots for replans](../tasks/TASK-047-persist-weather-snapshots-for-replans.md)
- [TASK-048: Add automated tests for RUN mode operations](../tasks/TASK-048-add-automated-tests-for-run-mode-operations.md)
