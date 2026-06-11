# Tracking: EPIC-001 Web Map Trip Planning with Dates

## Status
- Overall: active (trip edit/timeline workflow delivered and verified)
- Sprint: Sprint 1 implementation delivered for trip create, edit, validation, and daily-itinerary timeline flows

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
  - STORY-003A: Edit existing trip details via map-embedded edit flow, including derived start-date timeline shifting
  - STORY-003B: Fresh execution evidence captured for trip workflow tests in current environment
  - Trip timeline model implemented: start date is the anchor, stop date is derived, insert/remove-day shifts downstream dates
  - Fork/branch anchor model implemented with guarded route generation and branch date validation
- In progress:
  - STORY-002A: Display trip list and detail view (route-based pages pending)
- Next:
  - Implement dedicated route pages `/trips`, `/trips/:id`, `/trips/:id/edit`
  - Decide whether to retain map-embedded edit as the long-term UX or add route-based edit pages as a separate enhancement
  - Review Prisma migration history cleanup (`20260608170605_add_branch_anchor_day_date`) before shipping

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
- Prisma migration history contains an extra drift-reconciliation migration that is non-blocking but should be reviewed before shipping

## Decisions
- Date-only scheduling fields (`YYYY-MM-DD`)
- Single-trip create flow first, optimization/features deferred
- Node.js 22 + TypeScript + Next.js + Prisma + PostgreSQL for EPIC-001 delivery
- Sprint 1 focuses on complete CRUD + validation for trip entities
- Map interactions deferred to future sprints
- Trip start date is the journey anchor; stop date is derived from timeline length
- Single-day date edits affect only that day and return explicit 4xx errors on conflicts/range violations
- Fork branches persist an anchor day and cannot schedule destinations or generate segments before that anchor

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
