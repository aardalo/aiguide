# Story: STORY-001 Map shell and trip entry point

## Metadata
- **Priority**: P0
- **Status**: complete

## User story
As a trip planner, I want a web map page with a visible action to create a trip, so that I can begin planning directly from the map context.

## Mode ownership
- Primary mode: PLAN

## Acceptance criteria
- [x] Map page is accessible at `/map` route in the web application.
- [x] Map page loads successfully with basic map visualization (placeholder or map component).
- [x] "Create Trip" button/action is prominently visible on the map page.
- [x] "Create Trip" action is keyboard accessible (can be triggered via Enter/Space).
- [x] Clicking "Create Trip" opens a modal or form to create a new trip.
- [x] Basic page layout is responsive and displays correctly on desktop.

## Dependencies
- Next.js App Router structure
- [STORY-001A: Database infrastructure](STORY-001A-setup-database-infrastructure.md)
- Map visualization library or placeholder component

## Technical notes
- Use Next.js App Router page component at `app/map/page.tsx`
- Map component can be a placeholder initially (will be enhanced in later sprints)
- Create Trip form can be modal dialog or inline form
- Use Tailwind CSS for styling and responsive layout

## Related tasks
- [TASK-001: Build map page scaffold](../tasks/TASK-001-build-map-page-scaffold.md)
- [TASK-004: Build create trip form with date fields](../tasks/TASK-004-build-create-trip-form-with-date-fields.md)

## Epic
[EPIC-001: Web Map Trip Planning](../epics/EPIC-001-web-map-trip-planning.md)
