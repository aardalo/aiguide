# Story: STORY-003A Edit existing trip details

## Metadata
- **Priority**: P0
- **Status**: complete

## User story
As a trip planner, I want to edit the title, description, `startDate`, and `stopDate` of an existing trip, so that I can update my plans as they change.

## Mode ownership
- Primary mode: PLAN
- Secondary modes: RUN

## Acceptance criteria
- [x] Trip detail page includes "Edit" button that navigates to edit form.
- [x] Edit form at `/trips/:id/edit` loads with current trip data pre-filled.
- [x] Form allows editing of title, description, `startDate`, and `stopDate`.
- [x] Submitting valid changes calls `PATCH /api/trips/:id` endpoint.
- [x] API endpoint updates trip record in database with new values.
- [x] Successful update redirects to trip detail page showing updated data.
- [x] Updated trip data persists after page reload.
- [x] Date validation rules apply to edited dates (per STORY-003).
- [x] Form displays error message if API call fails.
- [x] Cancel button returns to trip detail without saving changes.

Notes on unmet criteria:
- Dedicated route `/trips/:id/edit` is not yet implemented.
- Current edit flow is map-embedded, not route-based detail-to-edit navigation.
- Route-based redirect/cancel behaviors remain pending with dedicated pages.

## Current implementation state
As of 2026-03-02, edit is implemented as in-page edit mode on `/map` with `PATCH /api/trips/:id`.
Gap to acceptance: dedicated `/trips/:id/edit` route and route-based redirect flow are not yet implemented.

## Dependencies
- [STORY-002A: Display trip list and detail](STORY-002A-display-trip-list-and-detail.md)
- [STORY-003: Validate trip dates](STORY-003-validate-trip-date-consistency.md)
- `PATCH /api/trips/:id` endpoint
- Shared Zod validation schema

## Technical notes
- Use Next.js page at `app/trips/[id]/edit/page.tsx`
- Fetch current trip data to pre-populate form (GET /api/trips/:id)
- Use same validation schema as create flow
- PATCH endpoint updates only provided fields (partial update)
- Return 200 OK with updated trip JSON on success
- Return 400 Bad Request for validation errors
- Return 404 Not Found if trip doesn't exist
- Consider using optimistic updates for better UX

## Related tasks
- [TASK-006: Implement trip edit date flow](../tasks/TASK-006-implement-trip-edit-date-flow.md)
- Create PATCH /api/trips/:id endpoint
- Build trip edit form page
- Add navigation from detail to edit page
- Handle update success/error states

## Epic
[EPIC-001: Web Map Trip Planning](../epics/EPIC-001-web-map-trip-planning.md)
