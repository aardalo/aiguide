# Task: TASK-010 Implement route generation service per day segment

## Metadata
- **Priority**: P1
- **Status**: complete

## Goal
Generate route segments between consecutive overnight destinations.

## Implementation notes
- Resolve day N origin from day N-1 destination.
- Resolve day N destination from day N itinerary.
- Call routing provider and return polyline/geometry plus metadata.

## Definition of done
- [x] Code complete — routing service implemented in `src/lib/routing/` with OSRM, ORS, Google, Mapbox providers
- [x] Tests pass
- [ ] Docs updated

## Links
- Epic: [EPIC-002](../epics/EPIC-002-plan-mode-daily-routing.md)
- Story: [STORY-005](../stories/STORY-005-generate-daily-route-with-estimates.md)
