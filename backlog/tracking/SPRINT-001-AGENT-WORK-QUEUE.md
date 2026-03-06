# Agent Work Queue - SPRINT-001

**Generated**: March 2, 2026 | **Sprint**: EPIC-001 Web Map Trip Planning  
**Status**: Ready for agent pickup  

---

## Immediate Actions (Start Now)

### 🎯 Planner Agent - START IMMEDIATELY
**Task**: [PLANNER-001] Verify Sprint Scope & Task Ordering  
**Time**: 1-2 hours  
**Input**: `/opt/backlog/tracking/SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md`  
**Output**: Risk assessment + dependency verification  
**Next**: Confirm ready or flag risks

**What to Do**:
1. Read the sprint plan (553 lines)
2. Verify all 7 tasks can execute in proposed order
3. Identify critical path (what blocks what)
4. Create dependency diagram (text or ASCII art)
5. Flag any scope creep or missing pieces
6. Deliver assessment to team

**Success Criteria**:
- [ ] All dependencies documented
- [ ] Critical path identified (14-hour minimum)
- [ ] No blocking surprises found
- [ ] Team confident to proceed

---

### 🚀 DevOps Agent - START IMMEDIATELY
**Task**: [DEVOPS-001] Local Development Environment  
**Time**: 2-3 hours  
**Input**: `/opt/docker-compose.yml` (exists), project setup  
**Output**: Working dev environment  
**Parallel**: Can run alongside other tasks

**What to Do**:
1. Verify PostgreSQL 16 running in Docker
2. Test `npm install` succeeds
3. Confirm `npx prisma migrate dev` works
4. Check Node 22 installed locally
5. Document any setup issues
6. Ensure team can replicate

**Success Criteria**:
- [ ] PostgreSQL running on port 5432
- [ ] npm dependencies install cleanly
- [ ] Database schema can be created
- [ ] All developers can run same environment

---

### ⚙️ Implementer Agent - START WITH TASK-002 (After Planner green-light)
**Task**: [IMPL-001] TASK-002: Trip Data Model & Migration  
**Time**: 8 hours  
**Minimum Duration**: Full work day  
**Input**: Sprint plan + Prisma docs  
**Output**: Working Prisma schema + migration  
**Blocking**: TASK-003, TASK-005 depend on this

**What to Do**:
1. Create Trip model in `prisma/schema.prisma`:
   - id (String, @id, @default(uuid()))
   - title (String, required)
   - description (String, optional)
   - startDate (DateTime, required)
   - stopDate (DateTime, required)
   - createdAt (DateTime, @default(now()))
   - updatedAt (DateTime, @updatedAt)
2. Run migration: `npx prisma migrate dev --name add_trip_model`
3. Write unit test: `tests/unit/schemas.test.ts`
4. Verify schema in database with Prisma Studio
5. Commit: `[EPIC-001] TASK-002: Add Trip Prisma model and migration`

**Success Criteria**:
- [ ] Migration runs without errors
- [ ] Schema matches implementation plan
- [ ] Tests pass (Zod schema validation)
- [ ] PR ready for review

---

## Priority Queue (In Order)

### Phase 1: Backend Foundation (Days 1-2)

```
Execution Order:
1. ✅ Planner verifies scope [PLANNER-001]
2. ✅ DevOps sets up environment [DEVOPS-001]
3. ⇒ Implementer starts TASK-002 [IMPL-001]
   ├─ After IMPL-001 done:
   │  ⇒ Implementer starts TASK-003 [IMPL-002]
   │  └─ Test Agent writes integration tests [TEST-001]
   │
   └─ While TASK-002 is running:
      ⇒ Implementer also starts TASK-001 [IMPL-003] (parallel)
         Documentation starts drafting API docs [DOC-001]
```

| Queue Position | Task ID | Task Name | Agent | Priority | Duration | Depends On | Blocker |
|---|---|---|---|---|---|---|---|
| 1 | PLANNER-001 | Verify Sprint Scope | 🎯 Planner | P0 | 1-2 hrs | None | None |
| 2 | DEVOPS-001 | Dev Environment | 🚀 DevOps | P0 | 2-3 hrs | None | TASK-002+ |
| 3 | IMPL-001 | TASK-002 (Trip Model) | ⚙️ Implementer | P0 | 8 hrs | DEVOPS-001 | TASK-003, TASK-005 |
| 4 | IMPL-002 | TASK-003 (API CRUD) | ⚙️ Implementer | P0 | 12 hrs | IMPL-001 | TASK-004, TASK-006 |
| 3.5 | IMPL-003 | TASK-001 (Map Scaffold) | ⚙️ Implementer | P1 | 4 hrs | DEVOPS-001 | None |
| 5 | DOC-001 | API Documentation | 📚 Documentation | P1 | 4 hrs | IMPL-002 start | None |
| 6 | DEVOPS-002 | CI/CD Pipeline | 🚀 DevOps | P1 | 3 hrs | DEVOPS-001 | TASK-003+ |

---

### Phase 2: Frontend & Validation (Days 2-3)

After TASK-002 and TASK-003 API complete, run in parallel:

| Queue Position | Task ID | Task Name | Agent | Priority | Duration | Depends On | Blocker |
|---|---|---|---|---|---|---|---|
| 7 | IMPL-004 | TASK-004 (Create Form) | ⚙️ Implementer | P0 | 6 hrs | IMPL-002 + IMPL-003 | None |
| 8 | IMPL-005 | TASK-005 (Date Validation) | ⚙️ Implementer | P0 | 4 hrs | IMPL-002 + IMPL-004 | None |
| 9 | IMPL-006 | TASK-006 (List/Detail) | ⚙️ Implementer | P0 | 6 hrs | IMPL-002 + IMPL-004 | None |

---

### Phase 3: Testing & Polish (Days 3-5)

After frontend complete, run integration and E2E tests:

| Queue Position | Task ID | Task Name | Agent | Priority | Duration | Depends On | Blocker |
|---|---|---|---|---|---|---|---|
| 10 | TEST-001 | TASK-007 (Full Test Suite) | 🧪 Test Agent | P0 | 8 hrs | IMPL-001 through IMPL-006 | None |
| 11 | DOC-002 | Setup & Architecture | 📚 Documentation | P0 | 2 hrs | IMPL-001, IMPL-003 | None |
| 12 | DOC-003 | Validation & Testing Docs | 📚 Documentation | P0 | 1 hr | IMPL-005, TEST-001 | None |
| 13 | DEVOPS-003 | Migration Strategy | 🚀 DevOps | P0 | 1 hr | DEVOPS-002, IMPL-001 | None |

---

## Task Detail: Ready to Pickup

### ✅ READY NOW

#### 🎯 PLANNER-001: Verify Sprint Scope & Task Ordering

**Your Assignment**:
- Input File: `/opt/backlog/tracking/SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md`
- Your Role: Confirm scope is achievable, find risks, identify critical path
- Expected Output Format: See `/opt/prompts/agent_planner.md` for your methodology

**Specific Questions to Answer**:
1. Are the 7 tasks in correct dependency order? (Which must happen before which?)
2. What is the critical path? (Minimum hours to complete, what's on it?)
3. Any risks or missing pieces? (Scope creep? Missing specs?)
4. Is 2-week sprint realistic? (Estimate total effort needed)
5. Any tasks that could run in parallel?

**Deliverable**: 
- Text summary (200-300 words) covering questions above
- ASCII dependency diagram or timeline
- Risk assessment (3-5 risks with mitigations)
- Critical path marked clearly

**Success**: Team says "Yes, we can start" based on your analysis.

**Next Step**: Provide assessment to team (save to `/opt/backlog/tracking/SPRINT-001-SCOPE-VERIFICATION.md`)

---

#### 🚀 DEVOPS-001: Local Development Environment

**Your Assignment**:
- Ensure all developers can run the stack locally
- Verify `docker-compose.yml` works
- Check Node, PostgreSQL, npm installation

**Verification Checklist** (execute each):
```bash
# Check Node version
node --version  # Should be v22.0.0 or higher

# Check Docker
docker --version
docker-compose --version

# Start environment
docker-compose up -d
sleep 5

# Check PostgreSQL is running
docker ps | grep postgres

# Install dependencies
npm install

# Initialize database
npx prisma migrate dev

# Verify schema created
npx prisma studio  # Should open to http://localhost:5555
```

**Document**:
- Any issues encountered
- Workarounds used
- Time to complete
- Confirmation all team members can replicate

**Success**: Team can run `docker-compose up` and `npm install` → working database

**Next Step**: After ✅, notify Implementer they can start TASK-002

---

#### ⚙️ IMPL-001: TASK-002 - Trip Data Model & Migration

**Start Condition**: After Planner says "ready" and DevOps confirms environment works

**Your Assignment**:
- Create Prisma database schema for Trip model
- Generate and verify migration
- Write tests
- Submit for code review

**File Locations** (create/edit these):
- `prisma/schema.prisma` - Add Trip model
- `prisma/migrations/[timestamp]_add_trip_model/migration.sql` - Auto-generated
- `tests/unit/schemas.test.ts` - New test file

**Implementation Checklist**:
- [ ] Open `prisma/schema.prisma`
- [ ] Add this Trip model (after User/Account models if they exist):
  ```prisma
  model Trip {
    id        String   @id @default(cuid())
    title     String
    description String?
    startDate DateTime
    stopDate  DateTime
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
  }
  ```
- [ ] Run: `npx prisma migrate dev --name add_trip_model`
- [ ] Open Prisma Studio: `npx prisma studio` - verify Trip table exists
- [ ] Create unit test file `tests/unit/schemas.test.ts`:
  ```typescript
  // Test Zod schema from src/lib/schemas/trip.ts
  // Should validate required fields: title, startDate, stopDate
  // Should reject invalid date ranges (stopDate < startDate)
  ```
- [ ] Run: `npm test` - all tests pass
- [ ] Commit: `git commit -m "[EPIC-001] TASK-002: Add Trip Prisma model and migration"`
- [ ] Create PR (link back to this task)

**Acceptance Criteria** (from implementation plan):
- ✅ Schema matches specification
- ✅ Migration runs cleanly
- ✅ No manual schema modifications needed
- ✅ Tests pass
- ✅ Can verify in Prisma Studio

**Success**: All above ✅ and PR ready for review

**Estimated Time**: 8 hours

---

#### ⚙️ IMPL-003: TASK-001 - Map Page Scaffold (Can start Day 1, parallel)

**Start Condition**: After DevOps confirms environment, can run in parallel with TASK-002

**Your Assignment**:
- Create basic Next.js page with header and map container
- Add "Create Trip" button
- Write minimal test

**File Locations** (create these):
- `src/app/page.tsx` or `src/app/map/page.tsx` - Main map page
- `tests/components/MapPage.test.ts` - Vitest test

**Implementation Checklist**:
- [ ] Create `src/app/page.tsx`:
  ```tsx
  export default function MapPage() {
    return (
      <div className="flex flex-col h-screen">
        <header className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Trip Planner</h1>
          <button className="bg-white text-blue-600 px-4 py-2 rounded">
            Create Trip
          </button>
        </header>
        <main id="map-container" className="flex-1 bg-gray-100">
          {/* Map component will mount here */}
        </main>
      </div>
    );
  }
  ```
- [ ] Add Tailwind CSS (should already be configured)
- [ ] Test renders: `npm test -- MapPage.test.ts` passes
- [ ] Commit: `git commit -m "[EPIC-001] TASK-001: Add map page scaffold"`
- [ ] Create PR

**Acceptance Criteria**:
- ✅ Page renders without console errors
- ✅ "Create Trip" button visible
- ✅ Visual hierarchy clear (header, content area)
- ✅ Test passes

**Success**: Page loads at `http://localhost:3000`, button is clickable

**Estimated Time**: 4 hours

---

### ⏳ QUEUED (Wait for prior tasks)

#### 📚 DOC-001: API Documentation

**Start Condition**: During or after IMPL-002 (TASK-003) implementation

**Your Assignment**:
- Document all REST API endpoints
- Provide cURL examples
- Show request/response format

**File Location**: `docs/API.md`

**Content Outline**:
```markdown
# API Documentation

## Authentication
(Not implemented yet; placeholder for future)

## Endpoints

### POST /api/trips - Create Trip
- Request body: { title, description?, startDate, stopDate }
- Response: 201 { id, title, description, startDate, stopDate, createdAt, updatedAt }
- Example cURL: ...

### GET /api/trips - List Trips
- Query params: (none yet)
- Response: 200 [{ id, title, ... }, ...]
- Example cURL: ...

(etc for GET [id], PATCH [id], DELETE [id])
```

**Success**: All endpoints documented with working examples

---

#### 🧪 TEST-001: TASK-007 - Full Test Suite

**Start Condition**: After IMPL-001 through IMPL-006 complete

**Your Assignment**:
- Write unit, integration, E2E tests
- Measure coverage (target 85%+)
- Create CI/CD workflow

**Test Structure**:
```
tests/
  unit/
    schemas.test.ts       # Zod validation
    validation.test.ts    # Date validation helpers
    components/           # Component unit tests
  integration/
    api/
      trips.test.ts       # API endpoint tests
  e2e/
    trip-workflow.spec.ts # Playwright tests
```

**Success**: `npm test -- --coverage` shows 85%+, all pass

---

## How to Use This Queue

### For Implementer Agent:
1. Start with **IMPL-001** (TASK-002)
2. After submit for review → start **IMPL-003** (TASK-001) in parallel
3. After IMPL-001 approved → start **IMPL-002** (TASK-003)
4. Then parallel: **IMPL-004**, **IMPL-005**, **IMPL-006**
5. Submit each task for review before moving to next

### For Test Agent:
1. Start writing test specs while Implementer codes **IMPL-002**
2. As each task delivers code, write tests for it
3. Final push: Run full test suite after all tasks done
4. Measure coverage, report 85%+ achieved

### For Reviewer Agent:
1. Review each task PR after Implementer submits
2. Score on quality dimensions
3. Request changes or approve for merge

### For Documentation Agent:
1. Start **DOC-001** after IMPL-002 begins
2. Draft API docs while implementation in progress
3. Finalize **DOC-002** and **DOC-003** at end of sprint

### For DevOps Agent:
1. Start **DEVOPS-001** immediately (critical blocker)
2. Start **DEVOPS-002** after DEVOPS-001 done
3. Finalize **DEVOPS-003** at end of sprint

### For Planner Agent:
1. Start **PLANNER-001** immediately
2. Deliver scope verification
3. Available for risk management throughout sprint

---

## Status Tracking

**Update this as you progress**:

- [ ] **PLANNER-001** - Scope verification (⏳ Ready to start)
- [ ] **DEVOPS-001** - Dev environment (⏳ Ready to start)
- [ ] **IMPL-001** - TASK-002 Trip model (⏳ Blocked by Planner, DevOps)
- [ ] **DEVOPS-002** - CI/CD pipeline (⏳ Blocked by DEVOPS-001)
- [ ] **IMPL-002** - TASK-003 API (⏳ Blocked by IMPL-001)
- [ ] **IMPL-003** - TASK-001 Map (⏳ Blocked by DevOps, can start parallel)
- [ ] **DOC-001** - API docs (⏳ Blocked by IMPL-002 start)
- [ ] **IMPL-004** - TASK-004 Form (⏳ Blocked by IMPL-002, IMPL-003)
- [ ] **IMPL-005** - TASK-005 Validation (⏳ Blocked by IMPL-002, IMPL-004)
- [ ] **IMPL-006** - TASK-006 List/Detail (⏳ Blocked by IMPL-002, IMPL-004)
- [ ] **TEST-001** - TASK-007 Tests (⏳ Blocked by IMPL-001 through IMPL-006)
- [ ] **DOC-002** - Setup/Architecture (⏳ Blocked by IMPL-001, IMPL-003)
- [ ] **DOC-003** - Validation/Testing (⏳ Blocked by IMPL-005, TEST-001)
- [ ] **DEVOPS-003** - Migration strategy (⏳ Blocked by DEVOPS-002, IMPL-001)

---

## Template: Task Completion Report

**When you finish a task**, create file `/opt/backlog/tracking/SPRINT-001-TASK-XXX-COMPLETE.md`:

```markdown
# TASK-XXX Completion Report

**Agent**: [Your Role]  
**Task ID**: TASK-XXX  
**Task Name**: [Name]  
**Completed**: [Date]  
**Time Spent**: [Hours]  

## Summary
[1-2 sentence summary of what was done]

## Deliverables
- [ ] Code files created/modified (list files)
- [ ] Tests pass (command: `npm test`)
- [ ] PR created and linked (URL)
- [ ] Acceptance criteria met (Y/N)

## PR Link
[GitHub PR URL]

## Issues Encountered
[Any blockers or challenges]

## Notes for Next Task Owner
[Handoff notes]

## Ready for Review
[Y/N] - If Y, ready for ✅ Reviewer Agent
```

---

**Last Updated**: March 2, 2026  
**Sprint**: EPIC-001 - Web Map Trip Planning  
**Status**: ✅ Ready for Agent Execution

