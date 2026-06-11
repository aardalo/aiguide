# Task: TASK-006 Implement trip edit date flow

## Metadata
- **Priority**: P0
- **Status**: complete

## Goal
Allow updating an existing trip while preserving journey timeline rules.

## Implementation notes
- Edit flow is implemented in the map-embedded `TripForm` edit mode.
- `PATCH /api/trips/:id` supports partial updates.
- Changing `startDate` shifts all trip day-scoped records by the same offset and shifts derived `stopDate` automatically.
- Direct `stopDate` edits are rejected; trip length changes must happen through insert/remove-day actions.
- Branches persist a fork anchor day and shift with trip-level date changes.
- Single-day destination edits remain isolated and return explicit 400/409 errors for range/conflict violations.
- The temporary “Internal server error” seen during verification was caused by a stale Next.js process after Prisma changes; restarting through `scripts/dev-server.sh restart` resolved it.

## Definition of done
- [x] Code complete
- [x] Tests pass
- [x] Docs updated

## Verification evidence
- Targeted regression suite passes in current environment: 7 files, 44 tests.
- Database migration applied and `prisma migrate status` reports schema up to date.
- Verified live API behavior:
	- title-only trip updates succeed
	- start-date trip updates succeed and shift timeline
	- single-day duplicate date edits return clear `409`
	- out-of-range day edits return clear `400`

## Links
- Epic: [EPIC-001](../epics/EPIC-001-web-map-trip-planning.md)
- Story: [STORY-003A](../stories/STORY-003A-edit-existing-trip.md)
