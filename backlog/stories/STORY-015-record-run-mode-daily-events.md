# Story: STORY-015 Record RUN mode daily events

## Metadata
- **Priority**: P2
- **Status**: planned

## User story
As a traveler in RUN mode, I want to record day-to-day travel events (delays, incidents, detours, closures, notes), so that replanning decisions and trip history reflect what actually happened.

## Mode ownership
- Primary mode: RUN
- Secondary modes: PLAN

## Acceptance criteria
- [ ] RUN mode day timeline allows adding an event with type, timestamp, and notes.
- [ ] Event types include at least: `delay`, `incident`, `detour`, `closure`, `note`.
- [ ] Events can be edited and deleted for the active trip day.
- [ ] Events persist and reload correctly after refresh.
- [ ] Event list is ordered chronologically by timestamp.
- [ ] Event form validates required fields and shows clear error feedback.
- [ ] Event entries are linked to trip ID and day index.

## Dependencies
- RUN mode shell/navigation
- Trip day model and active day context
- API persistence for run-day events

## Technical notes
- Add `run_day_event` model with fields: `id`, `trip_id`, `day_index`, `event_type`, `occurred_at`, `notes`, `metadata`, `created_at`, `updated_at`.
- Use server-side validation for enum-based `event_type`.
- Keep event schema append-friendly for future weather/system-generated events.

## Related tasks
- [TASK-037: Add RUN mode shell and active-day context](../tasks/TASK-037-add-run-mode-shell-and-active-day-context.md)
- [TASK-038: Add run-day event model and migration](../tasks/TASK-038-add-run-day-event-model-and-migration.md)
- [TASK-039: Implement RUN event CRUD APIs](../tasks/TASK-039-implement-run-event-crud-apis.md)
- [TASK-040: Build RUN day timeline UI](../tasks/TASK-040-build-run-day-timeline-ui.md)
- [TASK-048: Add automated tests for RUN mode operations](../tasks/TASK-048-add-automated-tests-for-run-mode-operations.md)

## Epic
[EPIC-005: RUN Mode Daily Replanning, Events, Scoring, and Weather Awareness](../epics/EPIC-005-run-mode-daily-replanning-events-and-weather.md)
