# Architecture Note: ARCH-004 Stay discovery, ranking, and day assignment flow

## Context
EPIC-004 requires collecting stay options from multiple sources, ranking by vehicle context, and assigning chosen stays to trip days.
Discovery and ranking are PLAN-first flows, while day-of-trip reassignment under live constraints is a RUN flow.

## Decision
Implement a staged pipeline:
1. Source connectors fetch raw candidates
2. Normalization maps to canonical stay schema
3. Deduplication merges overlapping options with source provenance
4. Ranking engine scores by vehicle profile and preferences
5. UI supports prioritization and selection
6. Assignment persists selected stay to day plan

Data model additions:
- Day-level prioritized option ordering
- Selected stay reference and snapshot metadata
- Source diagnostics for partial failures

## Alternatives considered
- Single-source only approach: simpler but poor coverage and resilience
- Non-persistent ranking state: loses user prioritization intent

## Consequences
- Better quality and flexibility of recommendations
- Added complexity in connector governance and normalization logic

## Follow-ups
- Define provider-specific compliance guardrails per connector
- Add observability for ranking drift and source health

## Source caching and graph integration

**Stay source caching** (per ARCH-005):
- CachedSource nodes stored in Neo4j graph database
- Benefits:
  - Avoid rate limiting from Google Maps Places, Park4Night, and other APIs
  - Fast retrieval of previously discovered POIs
  - Historical stay tracking (places visited across trips)
  - Relationship queries: "Show me all campsites near this city"

**Cache strategy**:
- Query key: Hash of (provider, query_params, location, filters)
- TTL by source type:
  - Google Places: 30 days (business details stable)
  - Park4Night: 3 days (availability changes frequently)
  - General POI search: 14 days
- Freshness indicators in UI: "Last updated X days ago"
- Active refresh for upcoming trip destinations

**Place node relationships**:
- (:Place)-[:SOURCED_FROM]->(:CachedSource) tracks data provenance
- (:Trip)-[:VISITED]->(:Place) enables "I've been here before" queries
- (:Place)-[:CONTAINS]->(:Place) for city/POI hierarchy

**Implementation timeline**:
- Sprint 4-5: Source connectors with Neo4j caching layer
- Sprint 5-6: Place relationship queries and "visited before" feature
- Sprint 6+: Graph-based stay recommendations using historical patterns

## Related architecture notes
- [ARCH-005: Graph database for places and caching](ARCH-005-graph-database-for-places-and-caching.md)
- [ARCH-007: UI mode architecture (PLAN, RUN, SETUP)](ARCH-007-ui-modes-plan-run-setup.md)
