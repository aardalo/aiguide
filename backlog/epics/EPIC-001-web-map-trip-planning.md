# Epic #1: Web Map Trip Planning with Dates

## Metadata
- **Priority**: P0
- **Status**: ready

## Problem
Users cannot currently create and manage trips in a map-based web interface. There is no workflow to create a trip and no way to assign start and stop dates, which prevents itinerary planning, scheduling, and basic timeline visibility.

## Outcome
Deliver a web-based map experience where a user can:

1. Open the map application
2. Create a trip
3. Set and update start and stop dates for that trip
4. Persist and retrieve trip details reliably

## Current implementation snapshot (2026-03-02)
Implemented: map entry, trip create/read/update/delete APIs, Prisma trip model, shared validation, map-embedded list/detail/edit flows, automated test assets.
Remaining to match backlog acceptance: dedicated `/trips`, `/trips/:id`, `/trips/:id/edit` route-based UX.

## Scope

### In scope
- Web map shell page and initialization
- Trip creation flow (name + optional description)
- `startDate` and `stopDate` fields on trip creation/edit
- Validation rules for date consistency
- Save/retrieve trip data from backend persistence
- Basic trip detail view showing map context and date range

### Out of scope
- Route optimization
- Multi-user collaboration
- Notifications/reminders
- Offline mode
- Advanced map drawing tools

## User value
- Quickly create planned trips in a visual map-centric workspace
- Understand trip schedule with explicit `startDate` and `stopDate`
- Reduce planning errors through date validation

## Functional requirements
- User can create a trip from the map page.
- Trip requires a title.
- Trip supports `startDate` and `stopDate`.
- System enforces `stopDate >= startDate`.
- Trip can be edited to change dates.
- Trip list/detail persists after refresh.

## Non-functional requirements
- Standard web accessibility for form inputs and labels.
- Form actions should provide clear success/error feedback.
- Dates stored in ISO 8601 date format (`YYYY-MM-DD`).

## Node.js web implementation plan

### Proposed stack
- Runtime: Node.js 22 LTS
- Language: TypeScript
- Web app: Next.js (App Router)
- API layer: Next.js Route Handlers (Node runtime)
- ORM/data access: Prisma
- Database: PostgreSQL
- Validation: Zod (shared schema for client/server)
- Tests: Vitest (unit/integration) + Playwright (E2E)

### API shape (initial)
- `POST /api/trips` create trip
- `GET /api/trips` list trips
- `GET /api/trips/:id` trip detail
- `PATCH /api/trips/:id` update title/start/stop dates

### Data model (initial)
- `Trip(id, title, description?, startDate, stopDate, createdAt, updatedAt)`

### Delivery sequence
1. Scaffold Next.js + Prisma + PostgreSQL baseline
2. Implement trip model/migration and API endpoints
3. Build map page and create/edit trip forms
4. Add shared date validation and user feedback
5. Add automated tests and QA checklist

## Acceptance criteria
- [ ] A map page is accessible from the main app entry point.
- [ ] A “Create Trip” action opens a form with title, start date, and stop date.
- [ ] Submitting valid data creates a trip and displays it in list/detail.
- [ ] Submitting invalid date ranges is blocked with a user-facing validation message.
- [ ] Editing an existing trip allows changing start/stop dates and saving updates.
- [ ] Created/edited trips remain available after page reload.

## Success metrics
- 95%+ successful trip creation rate in QA scenarios
- 0 critical defects related to invalid date persistence
- Trip create/edit/date flows covered by automated tests

## Dependencies
- Map rendering component/library in web UI
- Backend endpoint(s) for trip CRUD
- Shared date validation utility and API contract
- Node.js web infrastructure (Next.js + Prisma + PostgreSQL)

## Risks and mitigations
- Risk: timezone confusion when converting dates
  - Mitigation: store date-only values and avoid implicit timezone conversion
- Risk: inconsistent front-end/back-end validation behavior
  - Mitigation: duplicate core date rules in both layers with shared test cases

## Milestones
1. Map shell with create-trip entry point
2. Backend trip model + create/read/update endpoints
3. Front-end trip form with date validation
4. Persistence verification + end-to-end test coverage

## Related stories
- [STORY-001A: Setup database infrastructure](../stories/STORY-001A-setup-database-infrastructure.md)
- [STORY-001: Web map shell and trip entry point](../stories/STORY-001-map-shell-and-trip-entry.md)
- [STORY-002: Create trip with start/stop dates](../stories/STORY-002-create-trip-with-dates.md)
- [STORY-002A: Display trip list and detail view](../stories/STORY-002A-display-trip-list-and-detail.md)
- [STORY-003: Validate trip date consistency](../stories/STORY-003-validate-trip-date-consistency.md)
- [STORY-003A: Edit existing trip details](../stories/STORY-003A-edit-existing-trip.md)
- [STORY-003B: Add automated tests for trip workflows](../stories/STORY-003B-automated-tests-for-trip-workflows.md)

## Related tasks
- [TASK-001: Build map page scaffold](../tasks/TASK-001-build-map-page-scaffold.md)
- [TASK-002: Implement trip data model and migration](../tasks/TASK-002-implement-trip-model-and-migration.md)
- [TASK-003: Add trip create API endpoint](../tasks/TASK-003-add-trip-create-api-endpoint.md)
- [TASK-004: Build create trip form with date fields](../tasks/TASK-004-build-create-trip-form-with-date-fields.md)
- [TASK-005: Add date validation client and server](../tasks/TASK-005-add-date-validation-client-and-server.md)
- [TASK-006: Implement trip edit date flow](../tasks/TASK-006-implement-trip-edit-date-flow.md)
- [TASK-007: Add tests for trip create and date rules](../tasks/TASK-007-add-tests-for-trip-create-and-date-rules.md)
