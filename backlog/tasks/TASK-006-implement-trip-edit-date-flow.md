# Task: TASK-006 Implement trip edit date flow

## Metadata
- **Priority**: P0
- **Status**: complete

## Goal
Allow updating start and stop dates for an existing trip.

## Implementation notes
- Build edit UI path from trip detail/list using Next.js client components.
- Add `PATCH /api/trips/:id` API handler.
- Persist changes via Prisma and reflect in UI immediately.

## Definition of done
- [x] Code complete
- [x] Tests pass
- [x] Docs updated

## Links
- Epic: [EPIC-001](../epics/EPIC-001-web-map-trip-planning.md)
- Story: [STORY-003A](../stories/STORY-003A-edit-existing-trip.md)
