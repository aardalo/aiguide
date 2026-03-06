# Story: STORY-002 Create trip with start/stop dates

## Metadata
- **Priority**: P0
- **Status**: complete

## User story
As a trip planner, I want to create a trip with a title, start date, and stop date, so that my trip has a clear schedule and identity.

## Mode ownership
- Primary mode: PLAN

## Acceptance criteria
- [x] Trip creation form includes required `title` field and `startDate`, `stopDate` fields.
- [x] Form validates that `startDate` and `stopDate` are provided.
- [x] Valid submission sends data to `POST /api/trips` endpoint.
- [x] API endpoint creates a persisted trip record in the database.
- [x] Successful creation returns trip data with generated ID and timestamps.
- [x] Form displays success message and clears/closes after successful creation.
- [x] Form displays error message if API call fails.
- [x] Created trip can be verified by querying `GET /api/trips/:id`.

## Dependencies
- [STORY-001A: Database infrastructure](STORY-001A-setup-database-infrastructure.md)
- [STORY-001: Map shell and trip entry](STORY-001-map-shell-and-trip-entry.md)
- Zod validation schema (shared between client and server)

## Technical notes
- Use Next.js Route Handler for `POST /api/trips`
- Prisma client for database insert
- Zod schema for request validation (title required, dates in ISO format)
- Return 201 Created with trip JSON on success
- Return 400 Bad Request with validation errors on failure
- Form can use React state or form library (e.g., react-hook-form)
- Date inputs use HTML5 date input type

## Related tasks
- [TASK-002: Implement trip data model and migration](../tasks/TASK-002-implement-trip-model-and-migration.md)
- [TASK-003: Add trip create API endpoint](../tasks/TASK-003-add-trip-create-api-endpoint.md)
- [TASK-004: Build create trip form with date fields](../tasks/TASK-004-build-create-trip-form-with-date-fields.md)

## Epic
[EPIC-001: Web Map Trip Planning](../epics/EPIC-001-web-map-trip-planning.md)
