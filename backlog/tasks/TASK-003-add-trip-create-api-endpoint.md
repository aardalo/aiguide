# Task: TASK-003 Add trip create API endpoint

## Metadata
- **Priority**: P0
- **Status**: ready

## Goal
Expose API endpoint to create trips with dates.

## Implementation notes
- Add Next.js API route handler for `POST /api/trips`.
- Validate required title and date format with shared Zod schema.
- Persist new trip through Prisma and return normalized JSON resource.

## Definition of done
- [ ] Code complete
- [ ] Tests pass
- [ ] Docs updated

## Links
- Epic: [EPIC-001](../epics/EPIC-001-web-map-trip-planning.md)
- Story: [STORY-002](../stories/STORY-002-create-trip-with-dates.md)
