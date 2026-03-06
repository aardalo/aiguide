# Task: TASK-009 Add daily destination model and APIs

## Metadata
- **Priority**: P1
- **Status**: complete

## Goal
Persist one destination per trip day and expose CRUD operations.

## Implementation notes
- Add daily-destination model keyed by trip and day index/date.
- Add API endpoints for create/update/read day destinations.
- Validate destination references and day boundaries.

## Definition of done
- [x] Code complete
- [x] Tests pass (17 API + schema validations)
- [x] DB migration deployed
- [x] Docs updated

## Completion Summary

### Implementation Details
- **Prisma Model**: DailyDestination with trip FK, day date, coordinates, notes; unique constraint on (tripId, dayDate)
- **API Endpoints**: 
  - POST /api/daily-destinations (create with trip boundary validation)
  - GET /api/daily-destinations?tripId=xxx (list by trip, sorted by date)
  - GET /api/daily-destinations/[id] (get detail)
  - PATCH /api/daily-destinations/[id] (update)
  - DELETE /api/daily-destinations/[id] (delete)
- **Zod Schemas**: Create/update/response schemas with field validation
- **Tests**: 17 integration tests (CRUD, validation, error cases) + 15 unit tests (schema validation)
- **Migration**: 20260302125745_add_daily_destination_model applied successfully

### Test Results
✅ All 17 API integration tests pass
✅ All 15 schema validation tests pass
✅ TypeScript compilation clean

## Links
- Epic: [EPIC-002](../epics/EPIC-002-plan-mode-daily-routing.md)
- Story: [STORY-004](../stories/STORY-004-enable-plan-mode-and-daily-itinerary.md)


