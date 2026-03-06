# Tracking: EPIC-001 Web Map Trip Planning with Dates

## Status
- Overall: ready (implementation partially delivered)
- Sprint: Sprint 1 partially delivered; backlog reconciliation in progress

## Progress
- Completed:
  - STORY-001A: Setup database infrastructure
  - STORY-001: Map shell and trip entry point
  - STORY-002: Create trip with start/stop dates
  - STORY-003: Validate trip date consistency
  - STORY-004: Enable plan mode and daily itinerary
  - Core implementation artifacts for API, schema, and map-embedded workflows delivered
  - TASK-052: Tripadvisor nearby search (settings, API route, modal, context menu, markers, popup)
  - TASK-053: Foursquare nearby search (settings, API route with new Places API, modal, context menu, markers)
  - TASK-054: Status bar with message history (crossfade animation, history dropdown, detail popup)
- In progress:
  - STORY-002A: Display trip list and detail view (route-based pages pending)
  - STORY-003A: Edit existing trip details (route-based edit page pending)
  - STORY-003B: Automated tests for trip workflows (fresh execution evidence pending)
- Next:
  - Implement dedicated route pages `/trips`, `/trips/:id`, `/trips/:id/edit`
  - Re-run and record automated test execution evidence for current environment
  - Promote in-progress stories to complete after route and test evidence closure

## Sprint 1 Stories
1. [STORY-001A: Setup database infrastructure](../stories/STORY-001A-setup-database-infrastructure.md)
2. [STORY-001: Map shell and trip entry point](../stories/STORY-001-map-shell-and-trip-entry.md)
3. [STORY-002: Create trip with dates](../stories/STORY-002-create-trip-with-dates.md)
4. [STORY-002A: Display trip list and detail](../stories/STORY-002A-display-trip-list-and-detail.md)
5. [STORY-003: Validate trip date consistency](../stories/STORY-003-validate-trip-date-consistency.md)
6. [STORY-003A: Edit existing trip](../stories/STORY-003A-edit-existing-trip.md)
7. [STORY-003B: Automated tests](../stories/STORY-003B-automated-tests-for-trip-workflows.md)

**Sprint Plan**: [Sprint 1 Plan](SPRINT-001-plan.md)

## Nearby Search Tasks (outside sprint structure)
- [TASK-052: Search Tripadvisor nearby](../tasks/TASK-052-search-tripadvisor-nearby.md) — **complete**
- [TASK-053: Search Foursquare nearby](../tasks/TASK-053-search-foursquare-nearby.md) — **complete**
- [TASK-054: Status bar with history](../tasks/TASK-054-status-bar-with-history.md) — **complete**
- [TASK-050: Configurable nearby search radius cap](../tasks/TASK-050-configurable-nearby-search-radius-cap.md) — planned
- [TASK-051: Nearby search area caching with coverage gap detection](../tasks/TASK-051-nearby-search-area-caching-with-coverage-gap-detection.md) — planned

## Risks / blockers
- Dedicated route-based trip pages are not yet implemented (`/trips`, `/trips/:id`, `/trips/:id/edit`)
- Fresh automated test execution evidence is pending for STORY-003B completion

## Decisions
- Date-only scheduling fields (`YYYY-MM-DD`)
- Single-trip create flow first, optimization/features deferred
- Node.js 22 + TypeScript + Next.js + Prisma + PostgreSQL for EPIC-001 delivery
- Sprint 1 focuses on complete CRUD + validation for trip entities
- Map interactions deferred to future sprints

## Architecture updates (March 2, 2026)
- **ARCH-005 created**: Graph database architecture for places and caching
- **Hybrid approach**: PostgreSQL (transactional) + Neo4j (relationships/cache)
- **Sprint 1 impact**: None - proceeds with PostgreSQL only
- **Sprint 2+**: Neo4j infrastructure and sync implementation planned
- **ARCH-006 created**: Ollama-based AI integration for extraction, planning assistance, and freshness-aware refresh prioritization
- **ARCH-007 created**: UI mode architecture with PLAN (future planning), RUN (day-of-trip replanning/events/scoring/weather), and SETUP (global preferences/vehicles/credentials)

## Mode coverage snapshot
- PLAN: STORY-001A, STORY-001, STORY-002, STORY-002A, STORY-003, STORY-003A, STORY-003B, STORY-004, STORY-005, STORY-006, STORY-007, STORY-010, STORY-011, STORY-012, STORY-013, STORY-014
- SETUP: STORY-008, STORY-009
- RUN (secondary): STORY-001A, STORY-002A, STORY-003, STORY-003A, STORY-003B, STORY-004, STORY-005, STORY-006, STORY-007, STORY-011, STORY-012, STORY-013, STORY-014
- RUN (primary) moved to [EPIC-005](../epics/EPIC-005-run-mode-daily-replanning-events-and-weather.md): STORY-015, STORY-016, STORY-017
