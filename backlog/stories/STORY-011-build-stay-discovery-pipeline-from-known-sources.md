# Story: STORY-011 Build stay discovery pipeline from known sources

## Metadata
- **Priority**: P1
- **Status**: planned

## User story
As a planner, I want stay options collected from known map/search sources near my destination, so that I can evaluate realistic overnight choices.

## Mode ownership
- Primary mode: PLAN
- Secondary modes: RUN

## Acceptance criteria
- [ ] Stay discovery can query configured sources for a destination area.
- [ ] Results are normalized into a shared schema.
- [ ] Source attribution is kept for each option.

## Dependencies
- Connector abstraction and normalized schema

## Related tasks
- [TASK-025: Define normalized stay option schema](../tasks/TASK-025-define-normalized-stay-option-schema.md)
- [TASK-026: Implement source connector abstraction](../tasks/TASK-026-implement-source-connector-abstraction.md)
- [TASK-027: Add Google Maps and web-search connectors](../tasks/TASK-027-add-google-maps-and-web-search-connectors.md)
- [TASK-028: Add Park4Night-style source connector](../tasks/TASK-028-add-park4night-style-source-connector.md)
- [TASK-029: Build deduplication and source attribution stage](../tasks/TASK-029-build-deduplication-and-source-attribution-stage.md)
