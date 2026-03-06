# Task: TASK-008 Add PLAN mode to trip model

## Metadata
- **Priority**: P1
- **Status**: complete

## Goal
Enable plan state on trips so UI and APIs can branch behavior for itinerary planning.

## Implementation notes
- Add `plan_mode` boolean or enum state to trip entity.
- Expose read/update fields in trip API contract.
- Ensure backward compatibility for existing trips.

## Definition of done
- [x] Code complete
- [x] Tests pass
- [x] Docs updated

## Links
- Epic: [EPIC-002](../epics/EPIC-002-plan-mode-daily-routing.md)
- Story: [STORY-004](../stories/STORY-004-enable-plan-mode-and-daily-itinerary.md)
