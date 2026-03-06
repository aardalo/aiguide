# Story: STORY-017 Weather-aware RUN mode replanning

## Metadata
- **Priority**: P2
- **Status**: planned

## User story
As a traveler in RUN mode, I want replanning to consider current and near-term weather conditions, so that daily route and stop decisions remain safe and practical.

## Mode ownership
- Primary mode: RUN
- Secondary modes: PLAN, SETUP

## Acceptance criteria
- [ ] RUN mode replanning fetches weather for route corridor and destination area.
- [ ] Weather signals (for example precipitation, wind, temperature, alerts) are shown in replanning context.
- [ ] Replanning output includes weather impact flags (for example `low`, `medium`, `high`).
- [ ] User can trigger replan after weather update and see updated route recommendation.
- [ ] Weather snapshot used for replan is recorded in day history.
- [ ] System handles weather provider failure gracefully with fallback messaging.
- [ ] Weather-influenced replan decision can be logged as a RUN event.

## Dependencies
- [STORY-015: Record RUN mode daily events](STORY-015-record-run-mode-daily-events.md)
- [STORY-005: Generate daily route with distance/time estimates](STORY-005-generate-daily-route-with-estimates.md)
- Weather provider integration
- Optional AI assistance from ARCH-006 for weather-impact summarization

## Technical notes
- Add weather provider abstraction and caching strategy.
- Persist a `weather_snapshot` reference with each weather-triggered replan.
- Separate deterministic route constraints from advisory weather scoring.
- Support configurable weather sensitivity defaults from SETUP mode.

## Related tasks
- [TASK-044: Add weather provider abstraction and normalization](../tasks/TASK-044-add-weather-provider-abstraction-and-normalization.md)
- [TASK-045: Implement weather-aware replan API flow](../tasks/TASK-045-implement-weather-aware-replan-api-flow.md)
- [TASK-046: Build RUN weather panel and replan action UI](../tasks/TASK-046-build-run-weather-panel-and-replan-action-ui.md)
- [TASK-047: Persist weather snapshots for replans](../tasks/TASK-047-persist-weather-snapshots-for-replans.md)
- [TASK-048: Add automated tests for RUN mode operations](../tasks/TASK-048-add-automated-tests-for-run-mode-operations.md)

## Epic
[EPIC-005: RUN Mode Daily Replanning, Events, Scoring, and Weather Awareness](../epics/EPIC-005-run-mode-daily-replanning-events-and-weather.md)
