# Story: STORY-003 Validate trip date consistency

## Metadata
- **Priority**: P0
- **Status**: complete

## User story
As a trip planner, I want the system to validate that `stopDate` is not earlier than `startDate`, so that I can maintain consistent and logical trip schedules.

## Mode ownership
- Primary mode: PLAN
- Secondary modes: RUN

## Acceptance criteria
- [x] Trip creation form validates that `stopDate >= startDate` before submission.
- [x] Client-side validation displays immediate feedback when dates are invalid.
- [x] Server-side API validates date consistency and returns 400 error if violated.
- [x] Error message clearly states "Stop date must be on or after start date".
- [x] Same validation applies when editing existing trip dates.
- [x] Validation works correctly for same-day trips (`startDate == stopDate`).
- [x] Validation blocks submission when dates are invalid (cannot create invalid trip).

## Dependencies
- [STORY-002: Create trip with dates](STORY-002-create-trip-with-dates.md)
- Shared Zod validation schema for date rules

## Technical notes
- Implement validation using Zod schema: `z.object({ startDate: z.string(), stopDate: z.string() }).refine(...)`
- Apply schema on both client (before API call) and server (in API route)
- Use ISO date string comparison for validation (`stopDate >= startDate`)
- Display validation errors inline near date fields
- Disable/prevent form submission when validation fails
- Return structured error response from API: `{ error: "Validation failed", details: [...] }`

## Related tasks
- [TASK-005: Add date validation client and server](../tasks/TASK-005-add-date-validation-client-and-server.md)
- Create shared validation utilities module
- Add validation tests for edge cases

## Epic
[EPIC-001: Web Map Trip Planning](../epics/EPIC-001-web-map-trip-planning.md)
