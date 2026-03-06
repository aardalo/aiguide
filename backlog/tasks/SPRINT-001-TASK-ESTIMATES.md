# SPRINT-001 Detailed Task Estimates
## TASK-004 & TASK-006 Analysis

**Estimation Date**: March 2, 2026  
**Estimator Role**: ⚙️ Implementer Agent  
**Project Context**: EPIC-001 (Web Map Trip Planning)

---

# TASK-004 Detailed Estimate: Create Trip Form

## Current State
- ✅ Prisma Trip model defined with `title`, `description`, `startDate`, `stopDate`
- ✅ Zod schemas complete: `tripCreateSchema`, `tripUpdateSchema`, validation helpers
- ✅ Next.js project scaffolded with TypeScript, Tailwind, Vitest, Playwright
- ⏳ **DEPENDENCY**: TASK-003 (POST /api/trips endpoint) must be **complete or in parallel**
- ❓ **UNKNOWN**: Is TASK-001 (map page) done? Where does form live—modal or dedicated page?

## Subtasks & Hours

| # | Subtask | Hours | Risks | Easy Win? |
|---|---------|-------|-------|-----------|
| 1 | Decide: modal vs. dedicated page for form + create component file | 0.5h | Unclear when to open form; design mockup needed | Could be decided now |
| 2 | Build form JSX with title input, startDate, stopDate HTML5 inputs | 1.0h | Date input styling may vary by browser; accessibility labels | Straightforward HTML |
| 3 | Integrate Zod client-side validation with error display per field | 1.0h | Field-level vs form-level validation; error message wording | Schema already exists |
| 4 | Implement form submission handler (call POST /api/trips, handle response) | 1.0h | Assumes POST endpoint working; network error handling omitted if done in integration test | Moderate complexity |
| 5 | Add loading state (disable button, show spinner) + success feedback | 1.0h | Deciding success UX (modal close? toast? redirect?); clearing form state | Pattern-dependent |
| 6 | Style form with Tailwind; ensure responsive layout (mobile) | 0.75h | Date input styling quirks; Tailwind date picker plugins vs. native | Should be quick |
| 7 | Write unit tests for validation (Vitest): valid/invalid date combos | 0.75h | Testing date edge cases (leap years, boundaries) | Schema tests mostly done |
| 8 | Write integration test (Playwright): fill form → submit → API call mocked or hit real endpoint | 1.0h | E2E test setup; mocking/stubbing API calls; test data cleanup | Moderate complexity |
| 9 | Manual QA: visual check, test on mobile, edge cases (long title, past start date) | 0.5h | Unexpected styling quirks; browser inconsistencies | Safe buffer |

## Total Estimate
**Base (sprint plan)**: 6 hours  
**Realistic**: **7.5-8.5 hours**  
**Recommendation**: **ADD 1-2 hours buffer**

### Breakdown of Time Risk
- **Optimistic scenario** (if TASK-003 is done, form UX is pre-decided, no scope creep): **6.5 hours**
- **Realistic scenario** (minor integration snags, discovery of API behavior): **8 hours**
- **Pessimistic scenario** (API not working, date validation edge cases, re-do styling): **10 hours**

## If Over 6 Hours: Scope Reductions
1. **Defer E2E test → QA manual-only** (saves ~1h): Partner with Test Agent to add later
2. **Use simple success toast instead of complex UX flow** (saves ~0.5h): Hard-code redirect to trips list
3. **Use native HTML date inputs without custom styling** (saves ~0.5h): Accept browser defaults

## Risk Factors (Why 6h is Tight)

| Risk | Impact | Mitigation |
|------|--------|-----------|
| POST /api/trips endpoint incomplete or buggy | 1.5-2h debugging/ rework | Verify TASK-003 done before starting |
| Date input styling issues (browser inconsistency) | 1h discovery | Decide early: use Headless UI or native |
| Unclear form placement (modal vs page) | 0.75h discovery | Confirm UX with Product before coding |
| Validation error message wording not matching design | 0.5h copy rework | Agree on error messages upfront |
| Accessibility compliance (wcag) requirements | 1h+ refactor | Include labels/aria from start, don't retrofit |

---

# TASK-006 Detailed Estimate: Trip List & Detail Views

## Current State
- ✅ Prisma Trip model with all fields
- ✅ Zod schemas for responses
- ✅ Next.js App Router structure
- ⏳ **DEPENDENCIES**: 
  - TASK-003 (POST /api/trips) ← for context only
  - TASK-004 (form) ← user navigation links back and forth
  - **NEW**: GET /api/trips endpoint (list) must exist
  - **NEW**: GET /api/trips/:id endpoint (detail) must exist
- ❓ **UNKNOWN**: Edit modal integrated or separate page? Navigation flow?

## Subtasks & Hours

| # | Subtask | Hours | Risks | Easy Win? |
|---|---------|-------|-------|-----------|
| 1 | Create app/trips/page.tsx (list page) component scaffold + layout | 0.5h | Route structure; deciding between SSR vs. client fetch | Straightforward Next.js |
| 2 | Create app/trips/[id]/page.tsx (detail page) component scaffold + layout | 0.5h | Dynamic routes; ID validation | Next.js dynamic routes are standard |
| 3 | Fetch and display trip list (call GET /api/trips; render title, dates) | 1.0h | Assumes GET endpoint working; pagination ignored for MVP | Moderate; assumes API works |
| 4 | Fetch and display trip detail (call GET /api/trips/:id; all fields) | 1.0h | Handling missing/deleted trips; not found state | Similar to list; same complexity |
| 5 | Add empty state ("No trips yet") + loading skeleton or spinner | 0.75h | Skeleton vs. spinner decision; styling consistency | Pattern-dependent but quick |
| 6 | Add error handling (API errors, network failures) + user messages | 0.75h | Which errors to show; retry logic or not | Often underestimated |
| 7 | Format and display dates (YYYY-MM-DD → "Mar 2, 2026" or similar) | 0.5h | Localization (timezone, locale) ignored for MVP | Quick but easy to miss |
| 8 | Add navigation: list → detail clicks, back link, link to map page | 0.75h | Using Next.js Link vs. useRouter; state preservation | Standard patterns |
| 9 | Add "Edit Trip" action/button on detail page (links to edit form/modal) | 0.75h | Unclear where edit modal lives; does it redirect? | Depends on TASK-004 UX |
| 10 | Style with Tailwind: cards, lists, detail layout; responsive | 1.0h | Card design; mobile layout; consistent styling with form | Moderate; may have design inconsistency |
| 11 | Write unit tests (Vitest): date formatting, empty state logic | 0.5h | Mocking fetch; testing conditional rendering | Straightforward |
| 12 | Write integration test (Playwright): navigate list → detail → back | 0.75h | Test data setup; cleanup; mocking API | Moderate; E2E complexity |
| 13 | Manual QA: visual check, test on mobile, error scenarios | 0.5h | Responsive issues; edge cases | Buffer |

## Total Estimate
**Base (sprint plan)**: 6 hours  
**Realistic**: **9.0-9.5 hours**  
**Recommendation**: **ADD 2-3 hours buffer**

### Breakdown of Time Risk
- **Optimistic scenario** (API endpoints working, reuse styling from form, no unexpected edge cases): **7 hours**
- **Realistic scenario** (minor API issues, styling tweaks, edge case discovery): **9 hours**
- **Pessimistic scenario** (GET endpoints buggy, date formatting issues, error handling rework): **11+ hours**

## If Over 6 Hours: Scope Reductions
1. **Defer E2E tests → manual QA only** (saves ~1h): Test Agent adds later
2. **Skip error handling first pass → use basic "Error loading trips" message** (saves ~0.75h): Add granular error messages in SPRINT-002
3. **Defer styling polish → use default Tailwind components** (saves ~0.75h): Design pass in SPRINT-002
4. **Skip empty state design → basic text "No trips" message** (saves ~0.5h): Add designed empty state later
5. **Defer back-to-map link → focus on list/detail core flow** (saves ~0.25h): Add navigation helpers after

**Combined reduction scope**: Changes → ~6-6.5h realistic path

## Risk Factors (Why 6h is Very Tight)

| Risk | Impact | Mitigation |
|------|--------|-----------|
| GET /api/trips or GET /api/trips/:id endpoints buggy or incomplete | 2h debugging | Verify API endpoints **done and tested** before starting |
| Date formatting edge cases (wrong locale, timezone bugs) | 1h discovery + fix | Use clear date format, test with edge dates early |
| Navigation/routing confusion (which page? modal? state?) | 1.5h rework | Nail UX flow: confirm list → detail → edit path |
| Styling inconsistency between list and detail pages | 1h polish | Create shared Tailwind components/utilities upfront |
| Forgetting to handle "trip not found" (404) scenario | 0.5h tech debt | Add to AC before coding |
| Loading state management (fetching list while navigating) | 0.75h debugging | Decide: per-item skeletons or full-page loader? |

---

# Summary: Honest Assessment

## TASK-004: Create Trip Form

| Metric | Estimate |
|--------|----------|
| **Base (sprint plan)** | 6 hours |
| **Realistic** | 7.5-8.5 hours |
| **Buffer needed** | +1.5-2.5 hours |
| **Risk of overrun** | 🟡 Medium-High (4/5) |
| **Can hit 6h?** | **Only** if API is done, form UX pre-decided, and no surprises |

**Decision**: If you want confidence in 6h delivery, commit to:
1. TASK-003 endpoint fully tested and signed off by Day 1
2. Form placement (modal vs page) agreed in kickoff
3. No scope creep (no additional fields, no advanced validation)

## TASK-006: Trip List & Detail Views

| Metric | Estimate |
|--------|----------|
| **Base (sprint plan)** | 6 hours |
| **Realistic** | 9.0-9.5 hours |
| **Buffer needed** | +2.5-3.5 hours |
| **Risk of overrun** | 🔴 High (5/5) |
| **Can hit 6h?** | **Only with aggressive scope cuts** (defer E2E tests, limit error states) |

**Decision**: This task is estimated optimistically. Choose one:
- **Keep 6h estimate** + cut E2E tests + reduce error handling → realistic 6.5-7h
- **Expand to 9h** + do full quality (tests, error states, styling)
- **Split into TASK-006a (list only)** + **TASK-006b (detail view)** → two 3-4h tasks

---

# RISK SCORES

### Overrun Risk Assessment (1-5 scale)

| Task | Risk Score | Confidence | Recommendation |
|------|-----------|-----------|-----------------|
| **TASK-004** | **4/5** 🟡 | Medium | Add 1-2h buffer; verify API done first |
| **TASK-006** | **5/5** 🔴 | Low | Add 2-3h buffer OR reduce scope significantly |

### If Either Task Runs Over (Mitigation Plan)
1. **Day 2 morning**: Detect if API integration slower than expected → defer test coverage
2. **Day 2 afternoon**: Identify styling/edge case issues → simplify initial implementation
3. **Day 3**: If >1h behind, reduce error handling or disable E2E tests → move to SPRINT-002
4. **Escalate** if API endpoints not delivered by Day 1 morning

---

# Dependency Chain Check

```
SPRINT-001 Critical Path:
  TASK-001 (map scaffold)      ✓ Assume done
  TASK-002 (model/migration)   ✓ Done (Prisma schema exists)
  TASK-003 (POST /api/trips)   ⏳ BLOCKER for TASK-004
  TASK-005 (validation)        ✓ Done (Zod schemas complete)
  
  TASK-004 (form)              ⏳ Depends on TASK-003
  ├─→ TASK-006 (list/detail)   ⏳ Depends on Task-003 AND GET /api/trips/:id
  └─→ Navigate back/forth      ⏳ Depends on both being complete

TASK-007 (tests)               ⏳ Depends on TASK-004 + TASK-006 complete
```

**Critical**: Ensure TASK-003 is **100% done and tested** before starting TASK-004.

---

## Final Recommendation to Planner

1. **TASK-004 (Form): Keep 6h estimate with caveats**
   - Doable in 6h IF TASK-003 (API) is ready
   - Realistic range: 6-8h
   - Recommend reserve 1h buffer on team velocity

2. **TASK-006 (List/Detail): Revise to 9h OR reduce scope**
   - Current 6h estimate is risky
   - If hard deadline: defer E2E tests, remove fancy error states
   - Recommend: split into 4.5h (list only) + 4.5h (detail only) for clearer handoffs

3. **Test coverage**: Move TASK-007 to end-of-sprint when form/list are stable

4. **SPRINT-001 confidence**: 70% (depends heavily on TASK-003 delivery)

---

**Prepared by**: ⚙️ Implementer Agent  
**Date**: March 2, 2026  
**Status**: Ready for Planner Review
