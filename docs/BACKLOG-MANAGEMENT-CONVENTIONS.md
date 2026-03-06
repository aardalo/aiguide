# Backlog Management Conventions

**Version**: 1.0 | **Date**: March 2, 2026 | **Initiative**: EPIC-001 Backlog Reconciliation

This document establishes conventions for backlog updates across epics, stories, and tracking docs to maintain consistency and auditable status.

---

## Status Lifecycle

All backlog items follow this state machine:

```
planned → ready → in-progress → complete
         ↘       ↗              ↗
           blocked (any state)
```

### Status Definitions

| Status | Meaning | When to Use |
|--------|---------|------------|
| `planned` | Requirements defined, design phase | Use before work begins; before `ready` |
| `ready` | Fully specified, dependencies met, ready to start | Use when acceptance criteria clear and blockers resolved |
| `in-progress` | Work underway; partially implemented or awaiting evidence | Use during active development or when partial delivery doesn't match scope |
| `complete` | Acceptance criteria met; verified and auditable | Use only when all criteria checked `[x]` or implementation verified |
| `blocked` | Cannot proceed; external dependency or blocker | Temporary state; pair with clear blocker description |

---

## Reconciliation Pattern (Implementation → Backlog)

When implementation is complete or partially delivered:

### 1. **Update Status Based on Implementation Evidence**

```markdown
## Metadata
- **Status**: [Review against implementation evidence]
```

**Mapping**:
- ✅ All acceptance criteria met → `complete`
- ⚠️ Partial delivery (gaps documented) → `in-progress`
- 🚫 Blocker found → `blocked` (with notes)
- ⏳ Awaiting execution evidence → `in-progress` (with "Current implementation state" notes)

### 2. **Mark Acceptance Criteria Checkboxes**

When reconciling with implementation:

```markdown
## Acceptance criteria
- [x] Criterion met and verified
- [ ] Criterion not yet implemented (future scope)
- [ ] Criterion implemented but awaiting route-based delivery
```

Use `[x]` only for verified implementations. If criteria differ from delivery (e.g., map-embedded vs. route-based), keep as `[ ]` and document the gap.

### 3. **Document Current Implementation State** (New Section)

For `in-progress` stories with scope gaps, add after acceptance criteria:

```markdown
## Current implementation state

As of [DATE], [feature] is implemented as [delivery method] using [components/apis].

Gap to acceptance: [what's missing to match backlog criteria].

Related artifacts:
- Implemented in: [file paths]
- Test coverage: [test files]
- Completion tracking: [related task/ticket]
```

**Purpose**: Auditable trail of why story remains `in-progress` despite implementation.

### 4. **Normalize Terminology Across Scope**

When reconciling epics and stories:
- If implementation uses `startDate`/`stopDate` but backlog says `start_date`/`stop_date`, normalize backlog to match implementation
- Apply same normalization consistently across:
  - Epic definition → Functional requirements
  - Story acceptance criteria → Technical notes
  - All tracking/planning documents
- **Rationale**: Single source of truth reduces confusion; implementation naming is authoritative

### 5. **Update Tracking Narrative**

In sprint/epic tracking files, keep status summary aligned:

```markdown
## Progress
- Completed:
  - [STORY-001A]: Setup database (✅ complete)
  - [STORY-001]: Map shell (✅ complete)
- In progress:
  - [STORY-002A]: Route-based trip list (partial: map-embedded delivered)
  - [STORY-003B]: Tests (asset ready; execution evidence pending)
- Next:
  - [STORY-XXX]: Implement dedicated routes
```

---

## Epic-Level Reconciliation

When an epic's implementation state diverges from original acceptance:

### Add Implementation Snapshot Section

```markdown
## Current implementation snapshot (YYYY-MM-DD)

Implemented: [list of delivered features/components]
Remaining to match backlog acceptance: [route/UX/feature gaps]

Related docs:
- Completion reports: [paths]
- Issue tracking: [links]
```

Keep epic status consistent with story statuses:
- If all stories `complete` → epic can advance to `complete`
- If some stories `in-progress` → epic stays `ready` or `in-progress` (explicit choice)

---

## Cross-File Consistency Checklist

When reconciling backlog items, verify:

- [ ] Story status matches implementation evidence (complete/in-progress/ready)
- [ ] All acceptance criteria checkboxes (`[x]` or `[ ]`) reflect implementation
- [ ] "Current implementation state" section present for in-progress stories with gaps
- [ ] Field naming (e.g., startDate vs start_date) consistent across epic/stories/tracking
- [ ] Epic snapshot section updated with current delivery status
- [ ] Tracking narrative mirrors story statuses (no conflicts)
- [ ] Dependencies and blockers documented in tracking file
- [ ] All file links/cross-references working

---

## Example: EPIC-001 Backlog Reconciliation (March 2, 2026)

Following this pattern:

### Stories Marked Complete
- **STORY-001A**: Database infrastructure ✅
  - Status: `complete`
  - All acceptance criteria: `[x]`
  - Evidence: [backlog/tracking/SPRINT-001-TASK-002-003-COMPLETE.md](../backlog/tracking/SPRINT-001-TASK-002-003-COMPLETE.md)

- **STORY-002**: Create trip with dates ✅
  - Status: `complete`
  - All acceptance criteria: `[x]`
  - Evidence: API routes + tests verified

### Stories Marked In-Progress
- **STORY-002A**: Trip list/detail view ⚠️
  - Status: `in-progress`
  - Acceptance criteria: Mix of `[x]` (map-embedded delivery) and `[ ]` (route-based pending)
  - Current implementation state: "Implemented inside `/map` sidebar using TripList/TripDetail components. Gap: dedicated `/trips` and `/trips/:id` routes not yet implemented."

- **STORY-003B**: Automated tests ⚠️
  - Status: `in-progress`
  - Acceptance criteria: Mix of `[x]` (assets written) and `[ ]` (execution evidence pending)
  - Current implementation state: "Test assets (unit/integration/E2E) exist. Gap: fresh execution evidence in current environment required before moving to complete."

### Epic Status
- Status: Kept `ready` (allows for flexibility while accepting partial delivery narrative)
- Implementation snapshot added: Documents what's delivered and what remains

### Tracking Narrative
- Updated from "awaiting Sprint 1 kickoff" to "partially delivered; route-based pages pending"
- Lists completed vs in-progress stories explicitly

---

## When to Reconcile

- **After implementation completion**: Run full reconciliation pass (this document)
- **On sprint reviews/demos**: Spot-check and update status if new evidence found
- **Before handing off to next sprint**: Ensure all open items documented
- **Monthly backlog refinement**: Cross-check backlog vs. actual implementation state

---

## Agent Guidelines

### 🎯 Planner
When creating plans for backlog-related work:
- Check current backlog status for each epic/story
- Document gaps between current state and desired state
- Flag terminology inconsistencies that need reconciliation
- Recommend status updates as part of plan

### ⚙️ Implementer
When implementing features:
- Note which backlog acceptance criteria your change satisfies
- If full criteria not met, flag what's still needed
- When done, notify Reviewer/Planner for backlog reconciliation

### ✅ Reviewer
When reviewing code/PRs for backlog items:
- Check if acceptance criteria match implementation
- Verify terminology is consistent with backlog wording
- Flag if implementation goes beyond scope or leaves gaps
- Recommend backlog updates before merge

### 📚 Documentation
Before finalizing docs:
- Cross-check backlog acceptance criteria
- Use terminology from canonical backlog (start date → `startDate`)
- Link docs to backlog source (epic/story links)
- Flag any discrepancies to Planner

### 🧪 Test
When writing tests for backlog items:
- Test the exact acceptance criteria from backlog
- Document which criteria each test validates
- Report coverage status for backlog updates

### 🚀 DevOps
When setting up infrastructure:
- Check backlog for non–functional requirements (performance, availability, etc.)
- Document how infrastructure satisfies backlog requirements
- Link deployment/config to related backlog items

---

## Summary

Keep backlog truth aligned with implementation by:

1. **Status match**: Reconcile story status with implementation evidence
2. **Criteria clarity**: Mark checkboxes to show what's verified vs. pending
3. **Gap documentation**: Add "Current implementation state" for partial delivery
4. **Terminology unity**: Normalize field naming across all scope docs
5. **Tracking sync**: Update narrative to match story status reality
6. **Audit trail**: Link stories to completion reports/test results for evidence

This ensures future agents can trust the backlog as a reliable source of truth.

