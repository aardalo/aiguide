# 🚀 SPRINT-001 Agent Kickoff Brief

**Sprint**: EPIC-001 - Web Map Trip Planning with Dates  
**Start Date**: March 2, 2026 (Today)  
**Duration**: 2 weeks  
**Team**: 6 Specialized AI Agents  
**Status**: ✅ Ready to Begin

---

## 📋 What We're Building

**User Story**: As a traveler, I want to create and manage trips with `startDate`/`stopDate`, so I can plan multi-day adventures.

**Scope**: 
- Create trips (title, dates, optional description)
- View list of all trips
- View single trip details
- Edit trip information
- Validate dates (`stopDate >= startDate`)
- Persist everything to PostgreSQL database
- Test thoroughly (85%+ coverage)

**URL**: When done, users will visit `http://trip-planner.local` → see map page → click "Create Trip" → fill form → see trips in list → click to edit

**Not Included** (yet):
- Map rendering (that's EPIC-002)
- User authentication (that's EPIC-003)
- Multi-user trip sharing (that's EPIC-004)

---

## 👥 Your Agent Team

| Agent | Role | Your Job |
|-------|------|----------|
| 🎯 **Planner** | Scope verification | Verify sprint is realistic, find risks |
| ⚙️ **Implementer** | Write code | Build database schema, API, frontend UI |
| ✅ **Reviewer** | Quality gate | Review code, ensure it meets standards |
| 🧪 **Test Agent** | Test coverage | Write tests, verify 85%+ coverage, E2E validation |
| 📚 **Documentation** | Documentation | Write API docs, setup guides, architecture |
| 🚀 **DevOps** | Infrastructure | Setup environment, CI/CD, deployment |

---

## 🎯 Your Starting Point (Read This First)

### START HERE (Right Now)

**Each agent should**:
1. ✅ Read this brief (you're reading it!)
2. ✅ Read your system prompt: `/opt/prompts/agent_[role].md`
3. ✅ Read your assignment: `/opt/backlog/tracking/SPRINT-001-AGENT-ASSIGNMENTS.md` (search for your role)
4. ✅ Check the work queue: `/opt/backlog/tracking/SPRINT-001-AGENT-WORK-QUEUE.md`
5. ✅ Claim your first task and start

---

## 🎬 First Task for Each Agent (Start Immediately)

### 🎯 Planner Agent
**Task**: PLANNER-001 - Verify Sprint Scope & Task Ordering  
**Time**: 1-2 hours  
**Start**: Now  
**Instructions**: 
- Read: `/opt/backlog/tracking/SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md` (553 lines)
- Answer: Are these 7 tasks in the right order? What's the critical path? Any risks?
- Deliver: Risk assessment + dependency diagram
- Success: Team says "Yes, proceed"

### 🚀 DevOps Agent
**Task**: DEVOPS-001 - Local Development Environment  
**Time**: 2-3 hours  
**Start**: Now  
**Instructions**:
- Verify: Docker Compose, PostgreSQL 16, Node 22, npm
- Test: `docker-compose up` + `npm install` + `npx prisma migrate dev` all work
- Document: Any setup issues or workarounds
- Success: Entire team can run `docker-compose up` → database works

### ⚙️ Implementer Agent
**Task**: IMPL-001 - TASK-002: Trip Data Model & Migration  
**Time**: 8 hours (full day)  
**Start**: After Planner green-lights + DevOps confirms environment works  
**Instructions**:
- Create: Prisma Trip model in `prisma/schema.prisma`
- Run: `npx prisma migrate dev --name add_trip_model`
- Test: Write tests in `tests/unit/schemas.test.ts`, verify pass
- Submit: PR to develop branch
- Success: PR ready for Reviewer Agent to approve

### 🧪 Test Agent
**Task**: TEST-001 - TASK-007: Full Test Suite (Prep phase)  
**Time**: 1-2 hours (planning phase) + 8 hours (implementation)  
**Start**: Now (write test specs) → Execute after Implementer finishes all code  
**Instructions**:
- Read: Test methodology in `/opt/prompts/agent_test.md`
- Plan: What will you test? Unit/integration/E2E coverage strategy
- Prepare: Test file structure ready to go
- Success: Ready to execute tests as code becomes available

### 📚 Documentation Agent
**Task**: DOC-001 - API Documentation (Prep phase)  
**Time**: 1-2 hours (planning) + 4 hours (implementation)  
**Start**: Now (prepare template) → Start after IMPL-002 begins coding  
**Instructions**:
- Prepare: `docs/API.md` template with section placeholders
- Read: `/opt/prompts/agent_documentation.md` for documentation standards
- Plan: What will you document? Endpoints, examples, error codes
- Success: Ready to fill in endpoint docs as API implementation starts

### ✅ Reviewer Agent
**Task**: REVIEW-001 - Code Review Gate Setup  
**Time**: 1-2 hours  
**Start**: Now  
**Instructions**:
- Create: `docs/CODE-REVIEW-CHECKLIST.md`
- Define: 7 code review dimensions (correctness, readability, maintainability, performance, security, style, testing)
- Success: Team knows exactly what "approval" means

---

## 📚 Key Documents

**Reference During Sprint**:

| Document | Purpose | Read When |
|----------|---------|-----------|
| [SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md](SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md) | Full sprint plan with 7 tasks | Start of sprint (Planner verifies) |
| [SPRINT-001-AGENT-ASSIGNMENTS.md](SPRINT-001-AGENT-ASSIGNMENTS.md) | Detailed assignments for each agent | Your role introduction |
| [SPRINT-001-AGENT-WORK-QUEUE.md](SPRINT-001-AGENT-WORK-QUEUE.md) | Prioritized task queue with dependencies | When picking up next task |
| `/opt/prompts/agent_[role].md` | Your methodology & standards | Before you start working |
| [SPRINT-001-DAILY-LOG.md](SPRINT-001-DAILY-LOG.md) | Progress tracking (create/update daily) | Each day's standup |

---

## 🔄 Daily Workflow

### Every Day (Morning)
1. Standup: Answer 3 questions in `/opt/backlog/tracking/SPRINT-001-DAILY-LOG.md`:
   - What did I complete yesterday?
   - What am I working on today?
   - Any blockers?
2. Check work queue for next task
3. Start work

### During Day
- Push commits frequently: `git commit -m "[EPIC-001] TASK-XXX: Description"`
- Run tests before pushing: `npm test`
- Ask for help if stuck

### Before Day Ends
- Submit completed work for review (PRs for code, documents for docs)
- Update DAILY-LOG
- Flag any blockers

---

## 📊 Critical Dates

| Date | Milestone | Must Deliver |
|------|-----------|--------------|
| Today (Mar 2) | Sprint kickoff | Planner scope check, DevOps setup |
| Mar 3 (Day 2) | Backend done | TASK-002, TASK-003 (model + API) |
| Mar 4 (Day 3) | Frontend started | TASK-001 map page, TASK-004 form |
| Mar 5 (Day 4) | Frontend integration | TASK-004, TASK-005, TASK-006 |
| Mar 6 (Day 5) | Testing & docs | TASK-007 tests, all documentation |
| Mar 6-13 | Buffer & polish | Bug fixes, performance, review cycle |
| Mar 13 | EPIC-001 complete | All code merged to main, tests pass |

---

## ✅ Definition of Done (EPIC-001)

**Sprint is only done when ALL of these are true**:

**Code**:
- [ ] All 7 tasks implemented
- [ ] All code merged to `develop` branch
- [ ] All PRs reviewed and approved
- [ ] Zero high/critical issues remaining

**Testing**:
- [ ] Unit tests: 85%+ code coverage
- [ ] Integration tests: All API endpoints tested
- [ ] E2E tests: Main user workflow validated (create → list → detail → edit)
- [ ] CI/CD: All tests passing on every PR

**Documentation**:
- [ ] API endpoints documented with cURL examples
- [ ] Setup guide: New dev can start from scratch in <30 min
- [ ] Architecture document: System components and data flow clear
- [ ] Validation rules documented
- [ ] Testing strategy documented

**Infrastructure**:
- [ ] Local dev environment working (docker-compose)
- [ ] CI/CD pipeline configured and passing
- [ ] Database migrations safe and reversible

**Quality**:
- [ ] No console errors or warnings
- [ ] Code follows TypeScript best practices
- [ ] All validation shared between client/server
- [ ] Dates handled timezone-safely (YYYY-MM-DD format)

**Deployment**:
- [ ] Code can merge to `main` branch
- [ ] Ready for staging deployment
- [ ] All team members can pull and run locally

---

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "I don't have a task" | Check `/opt/backlog/tracking/SPRINT-001-AGENT-WORK-QUEUE.md` for your role's next item |
| "I'm blocked" | Document blocker in DAILY-LOG, mention Planner or DevOps Agent |
| "My code doesn't pass tests" | Debug locally with `npm test`, commit frequently, ask for help |
| "Reviewer rejected my PR" | Read feedback carefully, make changes, re-submit for review |
| "I finished early" | Check queue for next task, or help another agent that's blocked |

---

## 🎪 How Agents Collaborate

**Example Workflow Day 2**:

1. **Implementer** finishes TASK-002 (Trip model) → commits + creates PR
2. **Reviewer** reviews TASK-002 code → scores on 7 dimensions → approves
3. **Implementer** merges TASK-002 → starts TASK-003 (API)
4. **Test Agent** starts writing integration tests for TASK-003 API
5. **Documentation** preps API.md template
6. **DevOps** finalizes CI/CD pipeline with test workflow
7. **Implementer** finishes TASK-003 → submits PR
8. **Test Agent** runs tests against new TASK-003 code → validates pass
9. **Reviewer** reviews TASK-003 → approves → merges
10. **Documentation** fills in API.md with endpoints from TASK-003
11. ... repeat for remaining tasks

**Key Rules**:
- ✅ Code is never merged without Reviewer approval
- ✅ Tests must pass before PR submission
- ✅ Documentation is updated as code is implemented (not at the end)
- ✅ Each agent specializes in their role (Planner doesn't code, Implementer doesn't write tests alone)

---

## 📞 Communication

**Create one file for team coordination**:  
**File**: `/opt/backlog/tracking/SPRINT-001-DAILY-LOG.md`

**Update daily with template**:
```markdown
## Day 1 (March 2, 2026)

### 🎯 Planner
- Started: PLANNER-001 (scope verification)
- Completed: [pending]
- Blockers: None
- Next: Deliver scope assessment

### 🚀 DevOps
- Started: DEVOPS-001 (dev environment)
- Completed: [pending]
- Blockers: None
- Next: Verify all team members can run environment

### ⚙️ Implementer
- Started: [Waiting for Planner + DevOps green]
- Completed: [pending]
- Blockers: Environment setup
- Next: TASK-002 when ready

[... repeat for all 6 agents]
```

---

## 🎓 Reference: Agent Roles at a Glance

### 🎯 Planner Agent
- **Thinks**: Strategy, ordering, risks, dependencies
- **Asks**: Should we really do this? Is the order right? What could go wrong?
- **Outputs**: Task breakdowns, risk assessments, scope verification

### ⚙️ Implementer Agent
- **Thinks**: Code, architecture, implementation details
- **Asks**: What needs to be built? How do I build it? Does it work?
- **Outputs**: Code files, migrations, fully working features

### ✅ Reviewer Agent
- **Thinks**: Quality, standards, best practices
- **Asks**: Is this good enough? Does it meet our standards? Any issues?
- **Outputs**: Code review feedback, approval/rejection, quality scores

### 🧪 Test Agent
- **Thinks**: Coverage, edge cases, validation, confidence
- **Asks**: What could break? Did we test it? Is coverage high enough?
- **Outputs**: Tests (unit/integration/E2E), coverage reports, test documentation

### 📚 Documentation Agent
- **Thinks**: Clarity, examples, future readers
- **Asks**: Will someone understand this? Are examples included? Is it accurate?
- **Outputs**: API docs, guides, architecture diagrams, examples

### 🚀 DevOps Agent
- **Thinks**: Infrastructure, deployment, reliability
- **Asks**: Can we deploy this? Will it scale? Is it secure?
- **Outputs**: Docker setup, CI/CD pipelines, monitoring, deployment runbooks

---

## 🟢 Ready to Begin!

**✅ All Systems Go**

Your sprint plan is complete. Documents are ready. Assignments are clear. 

**Each agent should now**:
1. Find your role in the sections above
2. Read your system prompt
3. Read SPRINT-001-AGENT-ASSIGNMENTS.md (search your role)
4. Claim your first task from SPRINT-001-AGENT-WORK-QUEUE.md
5. Get to work!

**Questions?** Check the reference documents or ask in SPRINT-001-DAILY-LOG.md

---

**Sprint Owner**: Development Lead  
**Created**: March 2, 2026  
**Status**: ✅ Ready for Agent Execution

🚀 **Let's build!**

