# 🗂️ Sprint 1 Navigation Hub - All Agents Reference

**Purpose**: One-stop index to find exactly what you need for SPRINT-001  
**Created**: March 2, 2026  
**Status**: ✅ Ready to Use

---

## 🎯 Quick Find by Agent Role

### 🎯 **Planner Agent** - Find Your Resources

| What | Where | Why |
|------|-------|-----|
| What am I supposed to do? | [SPRINT-001-AGENT-ASSIGNMENTS.md](SPRINT-001-AGENT-ASSIGNMENTS.md#-planner-agent) | Your role description |
| What's my first task? | [SPRINT-001-AGENT-WORK-QUEUE.md](SPRINT-001-AGENT-WORK-QUEUE.md#-planner-agent---start-immediately) | Task PLANNER-001 |
| How do Planners think? | `/opt/prompts/agent_planner.md` | Your system prompt |
| What's the sprint scope? | [SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md](SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md) | Full plan to verify |
| Where's my checklist? | [SPRINT-001-AGENT-KICKOFF.md](SPRINT-001-AGENT-KICKOFF.md#-plannerplanner-agent) | Daily standup format |

**Next Step**: Read `/opt/prompts/agent_planner.md`, then [PLANNER Task](SPRINT-001-AGENT-WORK-QUEUE.md#-planner-001-verify-sprint-scope--task-ordering)

---

### 🚀 **DevOps Agent** - Find Your Resources

| What | Where | Why |
|------|-------|-----|
| What am I supposed to do? | [SPRINT-001-AGENT-ASSIGNMENTS.md](SPRINT-001-AGENT-ASSIGNMENTS.md#-devops-agent) | Your role description |
| What's my first task? | [SPRINT-001-AGENT-WORK-QUEUE.md](SPRINT-001-AGENT-WORK-QUEUE.md#-devops-agent---start-immediately) | Task DEVOPS-001 |
| How do DevOps agents think? | `/opt/prompts/agent_devops.md` | Your system prompt |
| What environment do I set up? | `docker-compose.yml` (in workspace root) | Development environment |
| What's the structure? | [SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md](SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md#-appendix-file-structure-created) (lines ~530) | File structure reference |
| Where do I report progress? | [SPRINT-001-DAILY-LOG.md](SPRINT-001-DAILY-LOG.md) | Daily standup |

**Next Step**: Read `/opt/prompts/agent_devops.md`, then [DEVOPS Task](SPRINT-001-AGENT-WORK-QUEUE.md#-devops-001-local-development-environment)

---

### ⚙️ **Implementer Agent** - Find Your Resources

| What | Where | Why |
|------|-------|-----|
| What am I supposed to do? | [SPRINT-001-AGENT-ASSIGNMENTS.md](SPRINT-001-AGENT-ASSIGNMENTS.md#-implementer-agent) | Your role with all 6 tasks |
| What's my first task? | [SPRINT-001-AGENT-WORK-QUEUE.md](SPRINT-001-AGENT-WORK-QUEUE.md) | IMPL-001 (TASK-002) |
| How do Implementers code? | `/opt/prompts/agent_implementer.md` | Your system prompt & standards |
| What's the full sprint? | [SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md](SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md) | All 7 tasks with details |
| What order should I do tasks? | [SPRINT-001-AGENT-WORK-QUEUE.md](SPRINT-001-AGENT-WORK-QUEUE.md#-execution-timeline) (Priority Queue section) | Dependencies & timing |
| Which task should I work on next? | [SPRINT-001-AGENT-WORK-QUEUE.md](SPRINT-001-AGENT-WORK-QUEUE.md#-task-detail-ready-to-pickup) | Next task with checklist |
| How do I structure my code? | `/opt/prompts/agent_implementer.md` | Code patterns & best practices |
| Where do I report progress? | [SPRINT-001-DAILY-LOG.md](SPRINT-001-DAILY-LOG.md) | Daily standup |
| When I finish a task | [SPRINT-001-AGENT-WORK-QUEUE.md](SPRINT-001-AGENT-WORK-QUEUE.md#-template-task-completion-report) | Task completion template |

**Task Details**:
- [ ] [IMPL-001: TASK-002 (Trip Model)](SPRINT-001-AGENT-WORK-QUEUE.md#-impl-001-task-002---trip-data-model--migration)
- [ ] [IMPL-002: TASK-003 (API CRUD)](SPRINT-001-AGENT-ASSIGNMENTS.md#impl-002-task-003-crud-api-endpoints-12-hrs)
- [ ] [IMPL-003: TASK-001 (Map Page)](SPRINT-001-AGENT-WORK-QUEUE.md#-impl-003-task-001---map-page-scaffold-can-start-day-1-parallel)
- [ ] [IMPL-004: TASK-004 (Create Form)](SPRINT-001-AGENT-ASSIGNMENTS.md#impl-004-task-004-create-trip-form-6-hrs)
- [ ] [IMPL-005: TASK-005 (Validation)](SPRINT-001-AGENT-ASSIGNMENTS.md#impl-005-task-005-date-validation-4-hrs)
- [ ] [IMPL-006: TASK-006 (List/Detail)](SPRINT-001-AGENT-ASSIGNMENTS.md#impl-006-task-006-trip-list--detail-views-6-hrs)

**Next Step**: Read `/opt/prompts/agent_implementer.md`, then [IMPL-001 Checklist](SPRINT-001-AGENT-WORK-QUEUE.md#-impl-001-task-002---trip-data-model--migration)

---

### ✅ **Reviewer Agent** - Find Your Resources

| What | Where | Why |
|------|-------|-----|
| What am I supposed to do? | [SPRINT-001-AGENT-ASSIGNMENTS.md](SPRINT-001-AGENT-ASSIGNMENTS.md#-reviewer-agent) | Your role description |
| What's my first task? | [SPRINT-001-AGENT-WORK-QUEUE.md](SPRINT-001-AGENT-WORK-QUEUE.md) | REVIEW-001 (Setup checklist) |
| How do Reviewers think? | `/opt/prompts/agent_reviewer.md` | Your system prompt |
| What should I review PR for? | [SPRINT-001-AGENT-ASSIGNMENTS.md](SPRINT-001-AGENT-ASSIGNMENTS.md#review-001-code-review-gate-setup-2-hrs) | Review dimensions defined |
| When do I review? | [SPRINT-001-AGENT-KICKOFF.md](SPRINT-001-AGENT-KICKOFF.md#-how-agents-collaborate) | After each Implementer task PR |
| Where do I report progress? | [SPRINT-001-DAILY-LOG.md](SPRINT-001-DAILY-LOG.md) | Daily standup |

**Next Step**: Read `/opt/prompts/agent_reviewer.md`, then create [review checklist](SPRINT-001-AGENT-ASSIGNMENTS.md#review-001-code-review-gate-setup-2-hrs)

---

### 🧪 **Test Agent** - Find Your Resources

| What | Where | Why |
|------|-------|-----|
| What am I supposed to do? | [SPRINT-001-AGENT-ASSIGNMENTS.md](SPRINT-001-AGENT-ASSIGNMENTS.md#-test-agent) | Your role description |
| What's my task? | [SPRINT-001-AGENT-WORK-QUEUE.md](SPRINT-001-AGENT-WORK-QUEUE.md) | TEST-001 (Full test suite) |
| How do Test Agents think? | `/opt/prompts/agent_test.md` | Your system prompt |
| What test structure? | [SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md](SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md#-appendix-file-structure-created) (lines ~530) | tests/ directory structure |
| Coverage target? | [SPRINT-001-AGENT-ASSIGNMENTS.md](SPRINT-001-AGENT-ASSIGNMENTS.md#test-001-comprehensive-test-suite-8-hrs) | 85%+ coverage goal |
| When do I write tests? | [SPRINT-001-AGENT-KICKOFF.md](SPRINT-001-AGENT-KICKOFF.md#-how-agents-collaborate) | During & after implementation |
| Where do I report progress? | [SPRINT-001-DAILY-LOG.md](SPRINT-001-DAILY-LOG.md) | Daily standup |

**Next Step**: Read `/opt/prompts/agent_test.md`, then [TEST-001 Details](SPRINT-001-AGENT-ASSIGNMENTS.md#test-001-comprehensive-test-suite-8-hrs)

---

### 📚 **Documentation Agent** - Find Your Resources

| What | Where | Why |
|------|-------|-----|
| What am I supposed to do? | [SPRINT-001-AGENT-ASSIGNMENTS.md](SPRINT-001-AGENT-ASSIGNMENTS.md#-documentation-agent) | Your role description |
| What tasks are mine? | [SPRINT-001-AGENT-ASSIGNMENTS.md](SPRINT-001-AGENT-ASSIGNMENTS.md#doc-001-api-documentation-4-hrs) | DOC-001, DOC-002, DOC-003 |
| How do Documentation Agents write? | `/opt/prompts/agent_documentation.md` | Your system prompt & standards |
| When do I start? | [SPRINT-001-AGENT-KICKOFF.md](SPRINT-001-AGENT-KICKOFF.md#-how-agents-collaborate) | DOC-001 after IMPL-002 starts |
| What do I document? | [SPRINT-001-AGENT-ASSIGNMENTS.md](SPRINT-001-AGENT-ASSIGNMENTS.md#-documentation-agent) | API, Setup, Architecture, Validation, Testing |
| Where do I report progress? | [SPRINT-001-DAILY-LOG.md](SPRINT-001-DAILY-LOG.md) | Daily standup |
| File naming convention? | `docs/` folder | Place all docs in docs/ |

**Task Details**:
- [ ] [DOC-001: API Documentation](SPRINT-001-AGENT-ASSIGNMENTS.md#doc-001-api-documentation-4-hrs)
- [ ] [DOC-002: Setup & Architecture](SPRINT-001-AGENT-ASSIGNMENTS.md#doc-002-setup--architecture-guides-2-hrs)
- [ ] [DOC-003: Validation & Testing](SPRINT-001-AGENT-ASSIGNMENTS.md#doc-003-validation--testing-docs-1-hr)

**Next Step**: Read `/opt/prompts/agent_documentation.md`, then [DOC-001 Details](SPRINT-001-AGENT-ASSIGNMENTS.md#doc-001-api-documentation-4-hrs)

---

## 📊 Important Dates & Milestones

| Date | Milestone | Owner | Blocker |
|------|-----------|-------|---------|
| **Mar 2 (Today)** | Sprint kickoff | All | None |
| **Mar 2** | Planner scope check | 🎯 Planner | Blocker for others |
| **Mar 2** | DevOps environment ready | 🚀 DevOps | Blocker for Implementer |
| **Mar 3** | TASK-002 merged | ⚙️ Implementer | Blocker for TASK-003, TASK-005 |
| **Mar 3** | TASK-003 complete | ⚙️ Implementer | Blocker for TASK-004, TASK-006 |
| **Mar 4** | TASK-001 merged | ⚙️ Implementer | Blocker for forms |
| **Mar 5** | TASK-004, 005, 006 merged | ⚙️ Implementer | Ready for tests |
| **Mar 6** | TASK-007 tests complete | 🧪 Test Agent | Final quality gate |
| **Mar 6** | All documentation done | 📚 Documentation | Release requirement |
| **Mar 13** | All code in main | Team | Sprint complete |

---

## 📁 Document Map (All Files)

### Core Sprint Documents
- **[SPRINT-001-AGENT-KICKOFF.md](SPRINT-001-AGENT-KICKOFF.md)** ← **START HERE** (high-level overview)
- **[SPRINT-001-AGENT-ASSIGNMENTS.md](SPRINT-001-AGENT-ASSIGNMENTS.md)** ← Your detailed role & tasks
- **[SPRINT-001-AGENT-WORK-QUEUE.md](SPRINT-001-AGENT-WORK-QUEUE.md)** ← Priority ordered tasks
- **[SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md](SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md)** ← Full technical spec

### Daily Progress
- **[SPRINT-001-DAILY-LOG.md](SPRINT-001-DAILY-LOG.md)** ← Team standup (create/update daily)
- **[SPRINT-001-TASK-XXX-COMPLETE.md](SPRINT-001-AGENT-WORK-QUEUE.md#-template-task-completion-report)** ← (create when task done)

### Agent System Prompts (Reference Your Role)
- `/opt/prompts/agent_planner.md` - 🎯 Planning methodology
- `/opt/prompts/agent_implementer.md` - ⚙️ Code standards & patterns
- `/opt/prompts/agent_reviewer.md` - ✅ Code review dimensions
- `/opt/prompts/agent_test.md` - 🧪 Testing strategy
- `/opt/prompts/agent_documentation.md` - 📚 Documentation standards
- `/opt/prompts/agent_devops.md` - 🚀 Infrastructure patterns

### System Documentation
- `/opt/.github/AGENT-ROLES-AND-SETUP.md` - Complete agentic system docs (40+ pages)
- `/opt/.github/AGENT-QUICK-REFERENCE.md` - Quick reference cheat sheet
- `/opt/.github/copilot-instructions.md` - Quick start guide

### Deliverable Locations (Where to Put Files)
| Deliverable | Location |
|---|---|
| Code files | `src/`, `prisma/`, `tests/` |
| Documentation | `docs/` |
| CI/CD workflows | `.github/workflows/` |
| Tracking/progress | `/opt/backlog/tracking/` |
| Docker config | `docker-compose.yml` |

---

## 🔀 Decision Trees (Which Document?)

### "What should I do right now?"
```
Am I a Planner?
  ├─ YES → Read /opt/prompts/agent_planner.md + Do PLANNER-001
  └─ NO → Continue...

Am I a DevOps?
  ├─ YES → Read /opt/prompts/agent_devops.md + Do DEVOPS-001
  └─ NO → Continue...

Am I an Implementer?
  ├─ YES → Read /opt/prompts/agent_implementer.md + [IMPL-001](SPRINT-001-AGENT-WORK-QUEUE.md#-impl-001-task-002---trip-data-model--migration)
  └─ NO → Continue...

Am I a Test Agent?
  ├─ YES → Read /opt/prompts/agent_test.md + [TEST-001](SPRINT-001-AGENT-ASSIGNMENTS.md#test-001-comprehensive-test-suite-8-hrs)
  └─ NO → Continue...

Am I a Reviewer?
  ├─ YES → Read /opt/prompts/agent_reviewer.md + [REVIEW-001](SPRINT-001-AGENT-ASSIGNMENTS.md#review-001-code-review-gate-setup-2-hrs)
  └─ NO → Continue...

Am I Documentation?
  ├─ YES → Read /opt/prompts/agent_documentation.md + [DOC-001](SPRINT-001-AGENT-ASSIGNMENTS.md#doc-001-api-documentation-4-hrs)
  └─ NO → Hm, check if you're a hidden 7th agent 🎭
```

### "I'm blocked, what do I do?"
```
1. Is it a code blocker (missing files/setup)?
   → Contact 🚀 DevOps Agent or ⚙️ Implementer

2. Is it a scope/requirement blocker?
   → Check [SPRINT-001-AGENT-ASSIGNMENTS.md](SPRINT-001-AGENT-ASSIGNMENTS.md)
   → Or ask 🎯 Planner Agent

3. Is it a quality/approval blocker?
   → Ask ✅ Reviewer Agent

4. Still stuck?
   → Document blocking issue in [SPRINT-001-DAILY-LOG.md](SPRINT-001-DAILY-LOG.md)
   → Mention which agent can help
```

### "What do I do when I finish my task?"
```
If you're an Implementer:
  ├─ Commit code: git commit -m "[EPIC-001] TASK-XXX: Description"
  ├─ Create PR (link to this sprint doc)
  ├─ Notify ✅ Reviewer Agent
  ├─ Wait for approval
  └─ Merge to develop when approved

If you're a Test Agent:
  ├─ Write test files on disk
  ├─ Run: npm test -- --coverage
  ├─ Report coverage % to team
  ├─ Commit test files
  └─ Create PR for review

If you're a Documentation Agent:
  ├─ Write doc files in docs/
  ├─ Run examples (ensure they work)
  ├─ Commit documentation
  └─ Create PR for review

If you're a Reviewer:
  ├─ Mark PR as reviewed
  ├─ Approve or request changes
  └─ Approve merge to develop

If you're a DevOps or Planner:
  ├─ Commit changes
  └─ Mark task complete in DAILY-LOG
```

---

## ✅ Pre-Sprint Checklist

**Before you claim your first task, verify**:

- [ ] You've read this document (SPRINT-001-NAVIGATION-HUB.md)
- [ ] You've read your agent system prompt (e.g., `/opt/prompts/agent_implementer.md`)
- [ ] You've read [SPRINT-001-AGENT-ASSIGNMENTS.md](SPRINT-001-AGENT-ASSIGNMENTS.md) (search for your role)
- [ ] You understand your first task from [SPRINT-001-AGENT-WORK-QUEUE.md](SPRINT-001-AGENT-WORK-QUEUE.md)
- [ ] You can access all workspace files (file paths work for you)
- [ ] You've joined the team's daily standup in [SPRINT-001-DAILY-LOG.md](SPRINT-001-DAILY-LOG.md)

**If any of above are unclear**:
- Re-read the reference document, or
- Check [SPRINT-001-AGENT-KICKOFF.md](SPRINT-001-AGENT-KICKOFF.md#-common-issues--solutions)

---

## 🚀 Go Launch Buttons (Quick Start Each Role)

Click your role to jump to your first task:

- **🎯 Planner**: [Start PLANNER-001](SPRINT-001-AGENT-WORK-QUEUE.md#-planner-001-verify-sprint-scope--task-ordering)
- **🚀 DevOps**: [Start DEVOPS-001](SPRINT-001-AGENT-WORK-QUEUE.md#-devops-001-local-development-environment)
- **⚙️ Implementer**: [Start IMPL-001](SPRINT-001-AGENT-WORK-QUEUE.md#-impl-001-task-002---trip-data-model--migration)
- **🧪 Test Agent**: [Start TEST-001](SPRINT-001-AGENT-ASSIGNMENTS.md#test-001-comprehensive-test-suite-8-hrs)
- **📚 Documentation**: [Start DOC-001](SPRINT-001-AGENT-ASSIGNMENTS.md#doc-001-api-documentation-4-hrs)
- **✅ Reviewer**: [Start REVIEW-001](SPRINT-001-AGENT-ASSIGNMENTS.md#review-001-code-review-gate-setup-2-hrs)

---

## 📞 Getting Help

| Type of Help | Who to Ask | Where |
|---|---|---|
| Technical code question | ⚙️ Implementer Agent | In comments/PR |
| Test coverage/strategy | 🧪 Test Agent | In comments |
| Documentation standard | 📚 Documentation Agent | In comments |
| Infrastructure/setup | 🚀 DevOps Agent | In comments |
| Code quality/approval | ✅ Reviewer Agent | In PR review |
| Sprint scope/planning | 🎯 Planner Agent | In [SPRINT-001-DAILY-LOG.md](SPRINT-001-DAILY-LOG.md) |
| General coordination | Team lead | In [SPRINT-001-DAILY-LOG.md](SPRINT-001-DAILY-LOG.md) |

---

**Last Updated**: March 2, 2026  
**Hub Status**: ✅ Complete & Ready  
**Next**: Pick your role above, go to your first task, and get started! 🚀

