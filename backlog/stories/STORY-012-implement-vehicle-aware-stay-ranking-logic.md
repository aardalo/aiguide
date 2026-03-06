# Story: STORY-012 Implement vehicle-aware stay ranking logic

## Metadata
- **Priority**: P1
- **Status**: planned

## User story
As a planner, I want stay options ranked according to my selected vehicle setup, so that the most relevant options appear first.

## Mode ownership
- Primary mode: PLAN
- Secondary modes: RUN, SETUP

## Acceptance criteria
- [ ] Self-sustained vehicle mode prioritizes camping and parkup style options.
- [ ] Car/bike without tent prioritizes hotels, cabins, and B&B style options.
- [ ] Ranking rationale can be surfaced to user.

## Dependencies
- EPIC-003 vehicle capability metadata
- Normalized stay classification data

## Related tasks
- [TASK-030: Implement vehicle-aware ranking policy engine](../tasks/TASK-030-implement-vehicle-aware-ranking-policy-engine.md)
- [TASK-031: Add preference overrides and ranking explanations](../tasks/TASK-031-add-preference-overrides-and-ranking-explanations.md)
