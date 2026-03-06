# Architecture Note: ARCH-002 PLAN mode routing and adjustable waypoint model

## Context
EPIC-002 introduces day-by-day route planning where generated waypoints can be manually adjusted while retaining deterministic route behavior.
This capability is primarily owned by PLAN mode, with selective reuse in RUN mode for day-of-trip replanning.

## Decision
Use a route-segment model per trip day with explicit waypoint sets:
- Segment key: `(trip_id, day_index)`
- Inputs: `origin`, `destination`, `waypoints[]`, `travel_mode`
- Outputs: geometry/polyline, distance, transit_time, generation metadata

Waypoint strategy:
- Auto-generate waypoints at ~30-minute intervals near major intersections
- Store `source = auto|manual` for each waypoint
- Recompute route whenever manual waypoint set changes

## Alternatives considered
- Purely automatic routing without editable waypoints: insufficient user control
- Fully manual waypoint entry without auto generation: too high planning effort

## Consequences
- Improved route customization and transparency
- Increased model/API complexity for segment + waypoint versioning

## Follow-ups
- Define conflict strategy if itinerary day destination changes after manual waypoint edits
- Add rate limiting/debounce policy for repeated recomputations during drag

## Caching and graph integration

**Route segment caching** (per ARCH-005):
- RouteSegment nodes stored in Neo4j graph database
- Cache key: `(origin_place_id, destination_place_id, travel_mode, waypoints_hash)`
- TTL: 7 days (routes change infrequently)
- Benefits:
  - Avoid redundant routing API calls for repeated trips
  - Fast lookup for similar routes across trips
  - Historical route comparison ("this route used to be faster")

**Implementation timeline**:
- Sprint 2-3: Basic routing API integration (no caching)
- Sprint 4-5: Add Neo4j route segment caching layer
- Sprint 6+: Route recommendations based on historical segments

## Related architecture notes
- [ARCH-005: Graph database for places and caching](ARCH-005-graph-database-for-places-and-caching.md)
- [ARCH-007: UI mode architecture (PLAN, RUN, SETUP)](ARCH-007-ui-modes-plan-run-setup.md)
