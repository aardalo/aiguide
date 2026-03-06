# Story: STORY-004 Enable PLAN mode and daily itinerary

## Metadata
- **Priority**: P1
- **Status**: complete

## User story
As a trip planner, I want to switch a trip into PLAN mode and define a destination per day, so that I can structure my itinerary by overnight stops.

## Mode ownership
- Primary mode: PLAN
- Secondary modes: RUN

## Acceptance criteria
- [x] Trip has a visible PLAN mode toggle/state.
- [x] Daily destination entries can be added/edited for each trip day.
- [x] Daily itinerary persists and reloads correctly.

## Dependencies
- Trip model extension ✅ (TASK-008 complete)
- Daily itinerary persistence ✅ (TASK-009 complete)

## Related tasks
- [TASK-008: Add PLAN mode to trip model](../tasks/TASK-008-add-plan-mode-to-trip-model.md) ✅
- [TASK-009: Add daily destination model and APIs](../tasks/TASK-009-add-daily-destination-model-and-apis.md) ✅

## Implementation Summary

### Completed Features
1. **Plan Mode Toggle**: Added interactive toggle switch in trip detail view that:
   - Updates trip's plan mode via PATCH API
   - Shows loading state during update
   - Persists across page reloads

2. **Daily Destinations Component**: Full-featured itinerary manager with:
   - Display of all trip dates (start to stop date)
   - Visual day numbering and indicators
   - Add/Edit/Delete operations for each day's destination
   - Inline form with validation
   - Support for coordinates (latitude/longitude) and notes
   - Auto-refresh on changes

3. **Form Validation**: Client-side and server-side validation for:
   - Date must be within trip range
   - Required destination name (max 200 chars)
   - Optional coordinates (-90 to 90 lat, -180 to 180 lon)
   - Optional notes (max 1000 chars)

### Test Coverage
- ✅ 13 unit tests for DailyDestinations component
- ✅ 15 unit tests for daily destination schemas
- ✅ 17 integration tests for daily destination API
- **Total**: 45 tests for STORY-004 features

### User Experience
- Seamless toggle between normal and plan mode
- Each day shows as a card with numbered indicator
- Empty days show "No destination set" with quick-add button
- Edit/Delete buttons appear only for days with destinations
- Form opens inline, no modals needed
- Real-time updates after save/delete operations




