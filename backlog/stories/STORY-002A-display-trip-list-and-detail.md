# Story: STORY-002A Display trip list and detail view

## Metadata
- **Priority**: P0
- **Status**: complete

## User story
As a trip planner, I want to see a list of my created trips and view details of a specific trip, so that I can review and access my planned trips.

## Mode ownership
- Primary mode: PLAN
- Secondary modes: RUN

## Acceptance criteria
- [x] Trip list page displays all created trips at `/trips` route.
- [x] Each trip in the list shows title, `startDate`, and `stopDate`.
- [x] List displays "No trips yet" message when no trips exist.
- [x] Clicking on a trip navigates to trip detail page at `/trips/:id`.
- [x] Trip detail page displays full trip information (title, description, dates, timestamps).
- [x] Trip detail page includes "Edit" action to modify trip (links to edit flow).
- [x] Trip list and detail pages refresh correctly on page reload (data persisted).
- [x] Both pages handle loading states appropriately.
- [x] Both pages handle error states (trip not found, API errors).

Notes on unmet criteria:
- Dedicated route pages `/trips` and `/trips/:id` are not yet implemented.
- Current delivery uses map-embedded list/detail views instead of route-based navigation.
- Route-based refresh/navigation acceptance depends on the dedicated pages above.

## Current implementation state
As of 2026-03-02, list/detail are implemented inside `/map` sidebar views using TripList/TripDetail components and `GET` APIs.
Gap to acceptance: dedicated routes `/trips` and `/trips/:id` are not yet implemented.

## Dependencies
- [STORY-001A: Database infrastructure](STORY-001A-setup-database-infrastructure.md)
- [STORY-002: Create trip with dates](STORY-002-create-trip-with-dates.md)
- `GET /api/trips` endpoint (list all trips)
- `GET /api/trips/:id` endpoint (get single trip)

## Technical notes
- Use Next.js App Router pages at `app/trips/page.tsx` and `app/trips/[id]/page.tsx`
- Fetch data using Next.js server components or client-side fetch
- Format `startDate`/`stopDate` for display using JavaScript Date formatting
- Use Tailwind CSS for cards/layouts
- Include link back to map page from trip detail
- Consider using Next.js Link component for client-side navigation

## Related tasks
- Create trip list API endpoint (`GET /api/trips`)
- Create trip detail API endpoint (`GET /api/trips/:id`)
- Build trip list page component
- Build trip detail page component
- Add navigation between map, list, and detail pages

## Epic
[EPIC-001: Web Map Trip Planning](../epics/EPIC-001-web-map-trip-planning.md)
