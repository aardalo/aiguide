# Task: TASK-029 Build deduplication and source attribution stage

## Metadata
- **Priority**: P1
- **Status**: planned

## Goal
Merge overlapping stay candidates while retaining source traceability.

## Implementation notes
- Deduplicate by geospatial/name similarity heuristics.
- Keep multi-source reference list for merged entries.
- Expose provenance metadata to UI/debug logs.

## Definition of done
- [ ] Code complete
- [ ] Tests pass
- [ ] Docs updated

## Links
- Epic: [EPIC-004](../epics/EPIC-004-vehicle-aware-stay-discovery-and-day-assignment.md)
- Story: [STORY-011](../stories/STORY-011-build-stay-discovery-pipeline-from-known-sources.md)
