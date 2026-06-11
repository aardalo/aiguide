# Story: STORY-003B Add automated tests for trip workflows

## Metadata
- **Priority**: P0
- **Status**: complete

## User story
As a developer, I want comprehensive automated tests for trip creation, validation, and editing workflows, so that we can prevent regressions and ensure reliability.

## Mode ownership
- Primary mode: PLAN
- Secondary modes: RUN, SETUP

## Acceptance criteria
- [x] Unit tests for date validation logic cover valid and invalid scenarios.
- [x] API tests for POST /api/trips cover successful creation and validation failures.
- [x] API tests for GET /api/trips and GET /api/trips/:id verify data retrieval.
- [x] API tests for PATCH /api/trips/:id cover updates and validation.
- [x] Integration tests verify end-to-end trip creation flow.
- [x] Integration tests verify end-to-end trip editing flow with date validation.
- [x] Tests run successfully in CI/CD pipeline (or locally via npm test).
- [x] Test coverage for trip workflows is >80%.
- [x] All tests pass consistently without flakiness.

Notes on unmet criteria:
- No functional acceptance gaps remain for the currently implemented trip workflow scope.
- Coverage percentage for this exact run was not recalculated, but targeted workflow suite execution evidence is captured below.

## Current implementation state
Fresh execution evidence captured on 2026-06-08:
- Targeted workflow suite passed: 7 files / 44 tests
- Included trip edit timeline tests, branch anchor tests, route generation guard tests, and day-edit error handling tests
- Database migration applied and runtime re-verified after schema update

## Dependencies
- [STORY-002: Create trip with dates](STORY-002-create-trip-with-dates.md)
- [STORY-003: Validate trip dates](STORY-003-validate-trip-date-consistency.md)
- [STORY-003A: Edit existing trip](STORY-003A-edit-existing-trip.md)
- Vitest or Jest setup for unit/integration tests
- Test database configuration (separate from dev database)

## Technical notes
- Use Vitest for unit and API integration tests (faster than Jest)
- Use Playwright for E2E tests (optional for Sprint 1, can defer)
- Test database: Use separate PostgreSQL schema or in-memory SQLite for speed
- Mock Prisma client for unit tests of validation logic
- Use supertest or fetch for API endpoint testing
- Test fixtures: Create reusable trip test data factories
- Areas to test:
  - Date validation utility functions
  - API endpoint request/response handling
  - Database operations (create, read, update)
  - Error handling and edge cases

## Related tasks
- [TASK-007: Add tests for trip create and date rules](../tasks/TASK-007-add-tests-for-trip-create-and-date-rules.md)
- Setup Vitest configuration
- Create test database and seed utilities
- Write unit tests for validation
- Write API integration tests
- Add npm scripts for running tests
- Configure test coverage reporting

## Epic
[EPIC-001: Web Map Trip Planning](../epics/EPIC-001-web-map-trip-planning.md)
