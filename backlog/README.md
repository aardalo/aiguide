# Backlog Workspace

This folder is the single source of truth for product and engineering planning artifacts in markdown.

## Folder map

- `epics/`: larger outcomes and initiatives
- `stories/`: user-facing requirements and acceptance criteria
- `tasks/`: implementation-level work items
- `tracking/`: status, metrics, risks, and release tracking
- `architecture/`: technical decisions and design notes
- `research/`: discovery notes, findings, benchmarks, and references

## Naming guidance

- Prefer date or sequence prefixes for sorting, e.g. `2026-03-01-epic-platform-foundation.md`
- Keep one main topic per file
- Link related files using relative markdown links

## Minimal workflow

1. Create or update an epic in `epics/`
2. Break epic into stories in `stories/`
3. Break stories into tasks in `tasks/`
4. Track execution and blockers in `tracking/`
5. Capture architecture decisions in `architecture/`
6. Store investigations in `research/`
