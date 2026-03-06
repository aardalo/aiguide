# Architecture Note: ARCH-001 Trip date model for web map trips

## Context
EPIC-001 requires reliable scheduling fields for trip planning with web map UX.

## Decision
Represent trip schedule with date-only fields:
- `start_date` (`YYYY-MM-DD`)
- `stop_date` (`YYYY-MM-DD`)

Validation rule:
- `stop_date >= start_date`

Implementation stack for EPIC-001:
- Node.js 22 + TypeScript
- Next.js web app and API route handlers
- Prisma ORM with PostgreSQL persistence (transactional domain entities)
- Neo4j graph database for places, routes, and caching (Sprint 2+, see ARCH-005)
- Ollama-based AI gateway for extraction and planning assistance (Sprint 2+, see ARCH-006)
- Zod validation schema shared between API handlers and client forms

**Persistence strategy**:
- Sprint 1: PostgreSQL only for Trip entities (CRUD operations)
- Sprint 2+: Hybrid approach with Neo4j for place relationships and source caching
- Trip entity remains in PostgreSQL as source of truth
- Trip node synced to Neo4j for relationship queries (visited places, route history)

## Alternatives considered
- Datetime fields with timezone: more flexible but introduces timezone complexity for day-level planning.
- Separate duration field only: insufficient for explicit schedule boundaries.

## Consequences
- Simpler UX and validation for itinerary use case.
- If future requirements need precise time-of-day, schema evolution is required.
- Graph database integration deferred to Sprint 2+ (does not block Sprint 1 delivery).

## Follow-ups
- Add shared validation utility across API and UI (Sprint 1).
- Define API error structure for date validation failures (Sprint 1).
- Add Prisma migration and seed strategy for local development (Sprint 1).
- Add Vitest + Playwright test matrix for create/edit flows (Sprint 1).
- Setup Neo4j infrastructure and Trip node sync (Sprint 2, see ARCH-005).

## Related architecture notes
- [ARCH-005: Graph database for places and caching](ARCH-005-graph-database-for-places-and-caching.md)
- [ARCH-006: Ollama-based AI integration](ARCH-006-ollama-ai-integration.md)
