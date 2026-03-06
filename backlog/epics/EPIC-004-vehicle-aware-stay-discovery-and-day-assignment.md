# Epic #4: Vehicle-Aware Stay Discovery and Day Assignment

## Metadata
- **Priority**: P1
- **Status**: planned

## Problem
Trip planning currently lacks integrated stay discovery tied to vehicle type and daily destinations. Users need the system to collect accommodation options from well-known sources, adapt recommendations to selected vehicle capabilities, allow user prioritization, and attach chosen stays to specific trip days.

## Outcome
Deliver a planning capability where a user can:

1. Discover nearby stay options around a day destination using known services and web search
2. Get recommendations aligned with selected vehicle profile and setup constraints
3. Compare options from camping/parkup and lodging providers
4. Choose, prioritize, and add selected options to the relevant trip day

## Scope

### In scope
- Stay discovery orchestration using known services (for example: Google Maps, Park4Night) and generic web search
- Vehicle-aware classification and ranking rules
- Support for two primary behavior modes:
  - Self-sustained vehicle: prioritize camping, parkups, similar stopover options
  - Car/bike without tent: prioritize hotels, cabins, B&B style stays
- User interface for reviewing options near destination
- User-driven prioritization/reordering of options
- Day-level assignment of selected stay option to trip plan
- Persistence of selected and prioritized options per trip day

### Out of scope
- Automated booking/checkout integrations
- Payment processing
- Real-time availability guarantees
- Dynamic pricing optimization

## Assumptions
- Vehicle profile includes capability flags (for example: self-sustained, has_tent).
- External providers are accessed through permitted APIs, feeds, or compliant search workflows.

## User value
- Faster discovery of relevant places to stay
- Better fit between stay type and actual travel setup
- Clear control over preferred options and final day assignment

## Functional requirements
- For each trip day destination, system can fetch stay candidates from configured discovery sources.
- Source records are normalized into a common stay-option schema.
- Ranking logic adapts to selected vehicle and setup attributes.
- User can inspect options near destination and reorder/prioritize them.
- User can assign one selected option to the relevant day.
- Assignment persists and is visible in day plan summary.

## Non-functional requirements
- Discovery and ranking should complete within acceptable latency for normal query areas.
- Source attribution must be retained for traceability.
- Failure of one source should degrade gracefully, not block all results.
- Data handling must respect provider terms and legal/compliance constraints.

## Acceptance criteria
- [ ] User can trigger stay discovery for a trip day destination.
- [ ] Results include options from configured map/search sources when available.
- [ ] Self-sustained vehicle profile prioritizes camping/parkup style options.
- [ ] Car/bike without tent prioritizes hotels, cabins, B&B style options.
- [ ] User can reorder/prioritize returned options.
- [ ] User can add selected stay to the target trip day.
- [ ] Added stay persists after reload and appears in the day plan details.
- [ ] Source failures show clear partial-result messaging without data loss.

## Success metrics
- 90%+ discovery success in QA scenarios with at least one active source
- 95%+ correct ranking profile behavior in test fixtures (vehicle-mode mapping)
- 100% persistence reliability for day-level stay assignment in integration tests

## Dependencies
- EPIC-002 PLAN mode daily destination model
- EPIC-003 selected vehicle and capability attributes
- Source integration connectors and normalization pipeline

## Risks and mitigations
- Risk: external source rate limits or changing access terms
  - Mitigation: connector abstraction, retry/backoff, fallback source chain
- Risk: inconsistent data quality across sources
  - Mitigation: normalization rules, confidence scoring, deduplication heuristics
- Risk: incorrect stay-type prioritization due to sparse vehicle metadata
  - Mitigation: explicit user preference overrides and transparent ranking reasons

## Milestones
1. Source connector abstraction and normalized stay schema
2. Vehicle-aware ranking policy and preference model
3. Option review UI with prioritization controls
4. Day assignment persistence and trip summary integration
5. Reliability, error handling, and automated tests

## Related stories
- [STORY-011: Build stay discovery pipeline from known sources](../stories/STORY-011-build-stay-discovery-pipeline-from-known-sources.md)
- [STORY-012: Implement vehicle-aware stay ranking logic](../stories/STORY-012-implement-vehicle-aware-stay-ranking-logic.md)
- [STORY-013: Let user prioritize and select stay options](../stories/STORY-013-let-user-prioritize-and-select-stay-options.md)
- [STORY-014: Assign selected stay to relevant trip day](../stories/STORY-014-assign-selected-stay-to-relevant-trip-day.md)

## Related tasks
- [TASK-025: Define normalized stay option schema](../tasks/TASK-025-define-normalized-stay-option-schema.md)
- [TASK-026: Implement source connector abstraction](../tasks/TASK-026-implement-source-connector-abstraction.md)
- [TASK-027: Add Google Maps and web-search connectors](../tasks/TASK-027-add-google-maps-and-web-search-connectors.md)
- [TASK-028: Add Park4Night-style source connector](../tasks/TASK-028-add-park4night-style-source-connector.md)
- [TASK-029: Build deduplication and source attribution stage](../tasks/TASK-029-build-deduplication-and-source-attribution-stage.md)
- [TASK-030: Implement vehicle-aware ranking policy engine](../tasks/TASK-030-implement-vehicle-aware-ranking-policy-engine.md)
- [TASK-031: Add preference overrides and ranking explanations](../tasks/TASK-031-add-preference-overrides-and-ranking-explanations.md)
- [TASK-032: Build stay option review and prioritization UI](../tasks/TASK-032-build-stay-option-review-and-prioritization-ui.md)
- [TASK-033: Persist prioritized options and selected stay per day](../tasks/TASK-033-persist-prioritized-options-and-selected-stay-per-day.md)
- [TASK-034: Add day-plan integration for selected stay](../tasks/TASK-034-add-day-plan-integration-for-selected-stay.md)
- [TASK-035: Implement partial-failure and retry handling](../tasks/TASK-035-implement-partial-failure-and-retry-handling.md)
- [TASK-036: Add automated tests for discovery-ranking-assignment](../tasks/TASK-036-add-automated-tests-for-discovery-ranking-assignment.md)
