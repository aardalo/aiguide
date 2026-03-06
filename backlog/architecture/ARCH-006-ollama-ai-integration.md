# Architecture Note: ARCH-006 Ollama-based AI integration

## Context
The planning platform needs AI capabilities that can run with strong data control and low external dependency. With graph-based place and route data (ARCH-005), AI should support:
- Natural-language planning assistance
- Semantic lookup across prior trips and visited places
- Summarization of cached source data
- Refresh prioritization for stale cached data

## Decision
Integrate an Ollama-based AI layer as an internal service in the Node.js architecture.

### AI deployment model
- Run Ollama as a local/private runtime service.
- Expose AI capabilities through backend adapters, not directly from the web client.
- Keep prompts, model routing, and safety checks in server-side code.

### Initial model roles
- Chat/planning assistant model: itinerary reasoning and user-facing guidance
- Extraction model: structure entities from text (places, dates, stopovers, sights)
- Embedding model: semantic retrieval over graph-linked planning content

### Integration boundaries
- PostgreSQL remains source of truth for transactional entities.
- Neo4j remains source for relationship-heavy place/route/cache exploration.
- Ollama is a compute layer for inference only (no authoritative persistence).

## Service architecture

### New backend components
1. AI Gateway service
   - Single integration point for Ollama requests
   - Model routing by task type
   - Timeout, retry, and fallback policies

2. Prompt/Policy service
   - Versioned system prompts
   - Tool-use constraints
   - Output schema enforcement (JSON for structured tasks)

3. Retrieval service
   - Query Neo4j/PostgreSQL context before inference
   - Attach freshness metadata from CachedSource nodes
   - Ground responses with known trip/place context

### API endpoints (initial)
- POST /api/ai/plan-suggest
- POST /api/ai/extract-places
- POST /api/ai/refresh-priority
- POST /api/ai/ask

### Mode-aware endpoint behavior
- PLAN mode: emphasis on itinerary generation and pre-trip tradeoff analysis.
- RUN mode: emphasis on day-of-trip replanning from weather/events and current progress.
- SETUP mode: emphasis on model/runtime diagnostics and policy tuning.

## Data and graph interaction

### AI-assisted graph workflows
- Place extraction: convert notes/free text into canonical Place candidates.
- Similar-history lookup: find prior visited places related to current target city.
- Cache refresh ranking: prioritize stale sources for upcoming trips.

### Freshness-aware AI behavior
- Include fetched_at/expires_at in retrieval context.
- Require freshness flags in AI output:
  - fresh
  - stale
  - refresh_recommended
- AI refresh recommendations feed a background refresh queue.

## Reliability and safety

### Operational controls
- Request timeout per inference call
- Circuit breaker when Ollama is unavailable
- Degrade gracefully to non-AI path for core CRUD flows

### Guardrails
- Restrict model outputs to validated schemas for structured endpoints.
- Keep deterministic validation in application code (dates, IDs, constraints).
- Log prompts/responses with redaction of sensitive user fields.

## Security and privacy
- Prefer local Ollama runtime for data residency.
- Do not send private trip data to external LLM APIs by default.
- Add role-based access for AI endpoints when multi-user auth is active.

## Implementation timeline

### Phase 1 (Sprint 2-3)
- Add AI Gateway and Ollama client adapter.
- Add health endpoint and fallback behavior.
- Introduce one scoped feature: /api/ai/extract-places.

### Phase 2 (Sprint 3-4)
- Add retrieval grounding from Neo4j + PostgreSQL.
- Implement /api/ai/plan-suggest with freshness metadata.
- Add basic evaluation set for prompt/model quality.

### Phase 3 (Sprint 4-5)
- Add /api/ai/refresh-priority for stale source management.
- Integrate refresh queue ranking with CachedSource TTL state.
- Add observability dashboards (latency, failures, usefulness score).

## Alternatives considered
- External hosted LLM APIs only: faster to start, weaker privacy/control.
- Fully rule-based assistant only: predictable but limited semantic utility.

## Consequences

### Benefits
- Strong data control with local/private inference
- Better reuse of graph context in planning guidance
- Practical support for stale-data refresh decisions

### Tradeoffs
- Additional runtime dependency (Ollama)
- Model quality/performance tuning required per task
- Need for evaluation harness and prompt versioning discipline

## Follow-ups
- Define supported Ollama models and minimum hardware profile.
- Add contract tests for schema-safe AI endpoints.
- Define offline behavior for AI features when Ollama is down.

## Related architecture notes
- [ARCH-001: Trip date model](ARCH-001-trip-date-model.md)
- [ARCH-005: Graph database for places and caching](ARCH-005-graph-database-for-places-and-caching.md)
- [ARCH-007: UI mode architecture (PLAN, RUN, SETUP)](ARCH-007-ui-modes-plan-run-setup.md)
