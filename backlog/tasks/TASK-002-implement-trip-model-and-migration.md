# Task: TASK-002 Implement trip data model and migration

## Metadata
- **Priority**: P0
- **Status**: ready

## Goal
Define persistent trip entity with title, start date, and stop date.

## Implementation notes
- Add Prisma `Trip` model fields: `id`, `title`, `start_date`, `stop_date`, timestamps.
- Add PostgreSQL migration via Prisma Migrate.
- Use date-only storage format for schedule fields and map to ISO date strings in API.

## Definition of done
- [ ] Code complete
- [ ] Tests pass
- [ ] Docs updated

## Links
- Epic: [EPIC-001](../epics/EPIC-001-web-map-trip-planning.md)
- Story: [STORY-002](../stories/STORY-002-create-trip-with-dates.md)
