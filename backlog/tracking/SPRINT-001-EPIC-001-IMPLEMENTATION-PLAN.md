# Sprint 1: EPIC-001 Implementation Plan

**Epic**: [EPIC #1: Web Map Trip Planning with Dates](../epics/EPIC-001-web-map-trip-planning.md)  
**Priority**: P0 (Sprint 1 Foundation)  
**Target**: Ready-to-merge on first iteration  
**Kickoff Date**: March 2, 2026  
**Planned Duration**: 2 weeks  

---

## 1. Overview & Scope

Deploy a web-based trip planning application with a map interface where users can:
- Create trips with title, `startDate`, and `stopDate`
- View and manage trip list/detail
- Persist trip data reliably in PostgreSQL
- Validate date consistency (`stopDate >= startDate`)

**In Scope**: Map shell, trip CRUD, date validation, persistence  
**Out of Scope**: Route optimization, collaboration, notifications, map drawing tools

---

## 2. Tech Stack & Setup

### Core Dependencies
```
Node.js 22 LTS
TypeScript 5.x
Next.js 15 (App Router)
Prisma ORM 5.x
PostgreSQL 16+
Zod ^3.22 (validation)
Vitest + Playwright (testing)
Docker Compose (dev environment)
```

### Development Environment
```yaml
Services:
  - PostgreSQL 16: Database persistence
  - Next.js Dev Server: App runtime (hot reload)
  - (Optional) pgAdmin or DBeaver: DB inspection
```

### Prerequisite Setup Tasks

#### Task 0A: Initialize Development Environment (0.5 day)
- [ ] Clone/setup git repository
- [ ] Install Node.js 22 LTS
- [ ] Create `.env.local` with database URL: `postgresql://user:pass@localhost:5432/trip_planner_dev`
- [ ] Install npm dependencies: `npm install`
- [ ] Spin up PostgreSQL via Docker Compose: `docker-compose up -d`
- [ ] Verify database connectivity: `npx prisma db push --skip-generate`
- [ ] Start dev server: `npm run dev`
- [ ] Verify `/app` route accessible at `http://localhost:3000`

---

## 3. Task Breakdown & Sequencing

### Phase 1: Backend Foundation (Days 1-2)

#### **TASK-002: Implement Trip Data Model and Migration** (1 day)
**Priority**: P0 | **Status**: ready | **Story**: [STORY-001A](../stories/STORY-001A-setup-database-infrastructure.md)

**Objective**: Create persistent Trip entity in PostgreSQL via Prisma ORM.

**Subtasks**:
1. [ ] Define Prisma `Trip` schema in `prisma/schema.prisma`:
   ```prisma
   model Trip {
     id        String   @id @default(cuid())
     title     String
     description String?
     startDate  DateTime @db.Date
     stopDate   DateTime @db.Date
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt

     @@index([createdAt])
   }
   ```
2. [ ] Create migration: `npx prisma migrate dev --name add_trip_model`
3. [ ] Generate Prisma client: `npx prisma generate`
4. [ ] Add unit test: `tests/trip.schema.test.ts` validates Prisma model structure
5. [ ] Document in `docs/SCHEMA.md` with examples

**Definition of Done**:
- ✅ Migration file created and applies cleanly
- ✅ Prisma client regenerated
- ✅ Unit test validates Trip fields and types
- ✅ Local PostgreSQL updated successfully

---

#### **TASK-003: Add Trip Create/Read/Update/Delete API Endpoints** (1.5 days)
**Priority**: P0 | **Status**: ready | **Story**: [STORY-002](../stories/STORY-002-create-trip-with-dates.md), [STORY-003](../stories/STORY-003-validate-trip-date-consistency.md)

**Objective**: Expose REST API endpoints for trip operations.

**Subtasks**:
1. [ ] Create shared Zod schema in `src/lib/schemas/trip.ts`:
   ```typescript
   const tripSchema = z.object({
     title: z.string().min(1, "Title required").max(200),
     description: z.string().optional(),
     startDate: z.string().date("Invalid startDate"),
     stopDate: z.string().date("Invalid stopDate"),
   }).refine(
     (data) => new Date(data.stopDate) >= new Date(data.startDate),
     { message: "stopDate must be >= startDate", path: ["stopDate"] }
   );
   ```
2. [ ] Implement `POST /api/trips` handler in `app/api/trips/route.ts`:
   - Parse JSON body
   - Validate against Zod schema
   - Persist with Prisma
   - Return 201 with created resource or 400 with validation errors
3. [ ] Implement `GET /api/trips` handler:
   - Query all trips sorted by creation date descending
   - Return 200 with trips array
4. [ ] Implement `GET /api/trips/[id]` handler:
   - Query trip by ID
   - Return 200 with trip or 404 if not found
5. [ ] Implement `PATCH /api/trips/[id]` handler:
   - Validate update payload against partial Zod schema
   - Update and return modified trip or 404
6. [ ] Document API contract in `docs/API.md` with cURL examples
7. [ ] Add integration tests in `tests/api/trips.test.ts`:
   - Create trip with valid dates
   - Create trip with invalid dates (expect 400)
   - `stopDate` before `startDate` (expect 400 with clear message)
   - Get non-existent trip (expect 404)
   - Update trip dates
8. [ ] Test with Postman/Insomnia or cURL examples

**Definition of Done**:
- ✅ All CRUD endpoints working and tested
- ✅ Date validation enforced on server
- ✅ Error responses include clear messages
- ✅ Integration tests pass (100% endpoint coverage)
- ✅ API documented with examples

---

### Phase 2: Frontend UI (Days 2-3)

#### **TASK-001: Build Map Page Scaffold** (0.5 day)
**Priority**: P0 | **Status**: ready | **Story**: [STORY-001](../stories/STORY-001-map-shell-and-trip-entry.md)

**Objective**: Create base map page layout with trip entry point.

**Subtasks**:
1. [ ] Create Next.js App Router page: `app/map/page.tsx` or `app/page.tsx`
2. [ ] Add map container placeholder:
   ```tsx
   export default function MapPage() {
     return (
       <div className="flex flex-col h-screen">
         <header className="bg-blue-600 text-white p-4">
           <h1>Trip Planner</h1>
         </header>
         <div id="map-container" className="flex-1 bg-gray-100">
           {/* Map component will mount here */}
         </div>
       </div>
     );
   }
   ```
3. [ ] Add "Create Trip" button in header (modal/form to be added next task)
4. [ ] Test page loads without errors in `tests/map-page.test.ts`

**Definition of Done**:
- ✅ Page renders without console errors
- ✅ "Create Trip" button visible and clickable
- ✅ Visual hierarchy clear (header, map container)
- ✅ Unit test passes

---

#### **TASK-004: Build Create Trip Form with Date Fields** (1.5 days)
**Priority**: P0 | **Status**: ready | **Story**: [STORY-002](../stories/STORY-002-create-trip-with-dates.md)

**Objective**: Implement UI form for trip creation with client-side and server-side validation.

**Subtasks**:
1. [ ] Create React form component: `src/components/CreateTripForm.tsx`:
   - Title text input (required)
   - Description textarea (optional)
   - Start date input (`<input type="date">`)
   - Stop date input (`<input type="date">`)
   - Submit button
   - Cancel button
2. [ ] Add client-side validation using Zod (shared schema from TASK-003):
   - Show validation errors inline
   - Disable submit if form invalid
   - Clear errors on field focus
3. [ ] Implement form submission:
   - POST to `/api/trips` with form data
   - Show loading state during request
   - Show success toast/alert on 201
   - Show error toast/alert on validation failure (400)
   - Redirect to trip detail or list after success
4. [ ] Add modal wrapper: `src/components/CreateTripModal.tsx`
   - Opens when user clicks "Create Trip" button
   - Closes on cancel or success
5. [ ] Add input styling (Tailwind or CSS-in-JS)
6. [ ] Test in `tests/components/CreateTripForm.test.tsx`:
   - Form renders with empty initial state
   - Title required validation
   - Date range validation (stop >= start)
   - Form submission and API call
   - Error handling
7. [ ] Test in browser with manual QA checklist

**Definition of Done**:
- ✅ Form renders and accepts input
- ✅ Client-side validation prevents invalid submissions
- ✅ API call succeeds and returns created trip
- ✅ Form resets/closes on success
- ✅ Error messages clear and helpful
- ✅ Component tests pass

---

#### **TASK-005: Add Date Validation (Client & Server)** (0.5 day)
**Priority**: P0 | **Status**: ready | **Story**: [STORY-003](../stories/STORY-003-validate-trip-date-consistency.md)

**Objective**: Ensure date consistency validated at both client and server layers.

**Subtasks**:
1. [ ] Consolidate shared validation in `src/lib/schemas/trip.ts` (started in TASK-003)
2. [ ] Add client-side validation helpers in `src/lib/validation.ts`:
   ```typescript
   export const validateDateRange = (startDate: string, stopDate: string) => {
     const start = new Date(startDate);
     const stop = new Date(stopDate);
     return stop >= start ? null : "Stop date must be >= start date";
   };
   ```
3. [ ] Server-side validation re-uses Zod schema (TASK-003)
4. [ ] Add test file `tests/lib/validation.test.ts`:
   - Valid date ranges pass
   - Invalid ranges fail with message
   - Boundary cases (same date, etc.)
5. [ ] Document validation rules in `docs/VALIDATION.md`

**Definition of Done**:
- ✅ Shared validation logic documented
- ✅ Client-side validation prevents submission
- ✅ Server-side validation rejects bad data
- ✅ Error messages consistent across layers
- ✅ Tests achieve 100% coverage of validation functions

---

#### **TASK-006: Implement Trip List and Detail Views** (1 day)
**Priority**: P0 | **Status**: ready | **Story**: [STORY-002A](../stories/STORY-002A-display-trip-list-and-detail.md), [STORY-003A](../stories/STORY-003A-edit-existing-trip.md)

**Objective**: Display and manage trip information.

**Subtasks**:
1. [ ] Create Trip List component: `src/components/TripList.tsx`:
   - Fetch trips from `GET /api/trips`
   - Display title, start/stop dates, created date
   - Link to trip detail view
   - Add "New Trip" button
   - Handle loading/error states
2. [ ] Create Trip Detail component: `src/components/TripDetail.tsx`:
   - Fetch specific trip from `GET /api/trips/[id]`
   - Display all trip fields
   - Add "Edit" button
   - Add "Delete" button (confirm before delete)
   - Show back link to list
3. [ ] Create Edit Trip Modal/Form:
   - Similar to create form but pre-populated
   - PATCH request on submit
   - Validate same as create
4. [ ] Add routes:
   - `/trips` → List view
   - `/trips/[id]` → Detail view
5. [ ] Test `tests/components/TripList.test.tsx` and `tests/components/TripDetail.test.tsx`:
   - Data fetching and rendering
   - Navigation between views
   - Edit workflow
   - Error states

**Definition of Done**:
- ✅ List displays all trips or empty state
- ✅ Detail shows trip information
- ✅ Edit form populates correctly and updates
- ✅ Navigation between views works
- ✅ Component tests pass

---

### Phase 3: Integration & Testing (Days 3-4)

#### **TASK-007: Add Automated Tests for Trip Create/Edit/Date Workflows** (1.5 days)
**Priority**: P0 | **Status**: ready | **Story**: [STORY-003B](../stories/STORY-003B-automated-tests-for-trip-workflows.md)

**Objective**: Comprehensive test coverage for trip workflows.

**Subtasks**:
1. [ ] **Unit Tests** (`tests/unit/`):
   - Zod schemas validation (valid/invalid cases)
   - Date validation helpers
   - Component logic (form state, etc.)
   - Target: >= 85% code coverage

2. [ ] **Integration Tests** (`tests/integration/`):
   - Trip CRUD API endpoints
   - Multiple trips in database
   - Concurrent requests handling
   - Error recovery

3. [ ] **E2E Tests** (`tests/e2e/`) with Playwright:
   - User journey: Create trip → View list → View detail → Edit → Verify persistence
   - Invalid submission flow (validation error display)
   - Date range validation flow
   - Refresh persistence check
   - Multiple browser contexts
   - Target: >= 3 happy path + 2 error path scenarios

4. [ ] Create `.github/workflows/test.yml` for CI/CD:
   - Run on push and PR
   - Run unit tests
   - Run integration tests (with test database)
   - Run E2E tests (headless browser)
   - Report coverage

5. [ ] Add test database snapshot/cleanup:
   - Each test clears trip table before run
   - Parallel test isolation

6. [ ] Document testing strategy in `docs/TESTING.md`

**Definition of Done**:
- ✅ Unit tests 85%+ coverage
- ✅ Integration tests all endpoints
- ✅ E2E tests user workflows
- ✅ CI/CD workflow passes
- ✅ Test documentation complete

---

## 4. Development Workflow

### Branching Strategy
```
main (production)
  ← develop (integration branch)
      ← feature/TASK-001 (individual task branch)
      ← feature/TASK-002
      ... etc
```

### Commit Hygiene
```
Format: [EPIC-001] TASK-XXX: Brief description

Example: [EPIC-001] TASK-002: Add Trip Prisma model and migration
```

### Code Review Checklist
- [ ] Follows TypeScript best practices
- [ ] Tests pass (unit + integration + E2E)
- [ ] No console errors/warnings
- [ ] PR description links to task/story
- [ ] Database migrations safe (backward compatible)
- [ ] API contract matches documentation
- [ ] Validation rules consistent (client/server)

---

## 5. Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Timezone confusion with dates | Use date-only format (YYYY-MM-DD), avoid implicit conversions |
| Inconsistent validation (client/server) | Shared Zod schema in repo; test both layers with same cases |
| Database migration failures | Test migrations locally first; use `prisma migrate verify` before merge |
| API contract drift | Document in `docs/API.md` before implementation; validate in tests |
| Performance issues with large trip counts | Index `createdAt` and `userId` (prepare for multi-user future) |

---

## 6. Daily Standup Checklist

### Day 1 (Backend Setup + TASK-002)
- [ ] Dev environment initialized (PostgreSQL running, Node/npm working)
- [ ] TASK-002 (Trip model): Prisma schema defined, migration created, tested
- [ ] Ready for TASK-003 (API endpoints)

### Day 2 (API + Frontend Start)
- [ ] TASK-003 (API endpoints): All CRUD endpoints working, integration tests pass
- [ ] TASK-001 (Map page): Page renders, "Create Trip" button visible
- [ ] TASK-004 (Form): Form component created, basic layout done
- [ ] No blockers for frontend integration

### Day 3 (Frontend Integration)
- [ ] TASK-004 (Form): Form submission working, validation integrated
- [ ] TASK-005 (Validation): Shared schemas implemented, both layers validating
- [ ] TASK-006 (List/Detail): Trip list displays, detail view works, edit started
- [ ] Manual testing of full workflow

### Day 4 (Testing + Polish)
- [ ] TASK-007 (Tests): Unit, integration, E2E tests written and passing
- [ ] CI/CD workflow integrated
- [ ] Code review and merge to develop
- [ ] Documentation finalized

---

## 7. Acceptance Criteria Checklist

**EPIC-001 Deliverable**: All 7 stories complete, all 7 tasks merged to main

### User-Facing Criteria
- [ ] Map page accessible at root URL
- [ ] "Create Trip" action opens form
- [ ] Form accepts title, start date, stop date
- [ ] Valid submission creates trip and displays in list
- [ ] Invalid dates rejected with clear message
- [ ] Trip list shows all created trips
- [ ] Trip detail shows all fields
- [ ] Edit form pre-populates and saves changes
- [ ] Trips persist after page reload (F5)
- [ ] No data loss on browser back/forward

### Technical Criteria
- [ ] PostgreSQL schema clean and indexed
- [ ] Prisma migrations idempotent
- [ ] All API endpoints documented with examples
- [ ] Shared Zod schemas for client/server validation
- [ ] 85%+ test coverage (unit + integration)
- [ ] E2E tests cover main user flow
- [ ] No console errors or unhandled rejections
- [ ] Performance acceptable (create/list <500ms)
- [ ] Date handling timezone-safe

### Deployment Criteria
- [ ] Code merged to `main` branch
- [ ] All CI checks passing
- [ ] No database migration blocking issues
- [ ] Ready for staging deployment

---

## 8. Success Metrics

| Metric | Target | Owner |
|--------|--------|-------|
| Test Coverage | 85%+ | QA + Dev |
| API Response Time (Create) | <200ms | Dev |
| E2E Test Pass Rate | 100% | QA |
| Code Review Turnaround | <1 day | Reviewers |
| Bug Escape Rate | 0 critical | QA |

---

## 9. Documentation Deliverables

- [ ] `docs/SETUP.md` - Dev environment initialization
- [ ] `docs/SCHEMA.md` - Database schema with Trip model
- [ ] `docs/API.md` - REST API endpoints with cURL examples
- [ ] `docs/VALIDATION.md` - Date validation rules and error messages
- [ ] `docs/TESTING.md` - Test strategy and running tests
- [ ] `docs/ARCHITECTURE.md` - High-level component architecture
- [ ] `README.md` - Quick start guide for new developers

---

## 10. Appendix: File Structure Created

```
/opt/web/
├── prisma/
│   ├── schema.prisma (Trip model)
│   └── migrations/
│       └── 001_add_trip_model/migration.sql
├── src/
│   ├── app/
│   │   ├── page.tsx (map shell)
│   │   ├── map/
│   │   │   └── page.tsx (if separate route)
│   │   ├── trips/
│   │   │   ├── page.tsx (list)
│   │   │   └── [id]/
│   │   │       └── page.tsx (detail)
│   │   └── api/
│   │       └── trips/
│   │           ├── route.ts (create, list)
│   │           └── [id]/
│   │               └── route.ts (get, update, delete)
│   ├── components/
│   │   ├── CreateTripForm.tsx
│   │   ├── CreateTripModal.tsx
│   │   ├── TripList.tsx
│   │   ├── TripDetail.tsx
│   │   ├── EditTripForm.tsx
│   │   └── MapContainer.tsx
│   └── lib/
│       ├── schemas/
│       │   └── trip.ts (Zod schemas)
│       ├── validation.ts
│       └── prisma.ts (Prisma client singleton)
├── tests/
│   ├── unit/
│   │   ├── schemas.test.ts
│   │   ├── validation.test.ts
│   │   └── components/
│   ├── integration/
│   │   └── api/
│   │       └── trips.test.ts
│   └── e2e/
│       └── trip-workflow.spec.ts
├── docs/
│   ├── SETUP.md
│   ├── SCHEMA.md
│   ├── API.md
│   ├── VALIDATION.md
│   ├── TESTING.md
│   └── ARCHITECTURE.md
├── .github/
│   └── workflows/
│       └── test.yml
└── docker-compose.yml
```

---

## 11. Next Steps

**To Begin Development**:
1. Review this plan with team
2. Set up development environment (Task 0A above)
3. Start TASK-002 (Trip model creation)
4. Schedule daily standups (async or 15-min sync)
5. Track progress in backlog/tracking/SPRINT-001-DAILY-LOG.md (create as work progresses)

**After EPIC-001 Completion**:
- Review lessons learned
- Update team processes based on retrospective
- Begin EPIC-002 (PLAN routing and waypoints)

---

**Last Updated**: March 2, 2026  
**Plan Owner**: Development Lead  
**Status**: Ready for Team Review
