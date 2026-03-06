# EPIC-001 Kickoff Package

**Date**: March 2, 2026  
**Epic**: [EPIC #1: Web Map Trip Planning with Dates](../epics/EPIC-001-web-map-trip-planning.md)  
**Duration**: 2 weeks (March 2-13, 2026)  

---

## 📋 What You're Building

A **web-based trip planning application** where users can:
- ✅ Create trips with title and date range
- ✅ View list of all trips
- ✅ Edit trip details
- ✅ Persist data reliably in PostgreSQL
- ✅ Validate dates (`stopDate >= startDate`)

**Tech Stack**: Node.js 22, TypeScript, Next.js, PostgreSQL, Prisma, Zod, Vitest, Playwright

---

## 📦 Deliverables Created

### Documentation

1. **[SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md](SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md)** (40+ pages)
   - Detailed task breakdown with subtasks
   - Risk mitigations
   - Daily standup checklist
   - Team roles and deliverables
   - SUCCESS: Read this first for full context

2. **[SPRINT-001-QUICK-START.md](SPRINT-001-QUICK-START.md)** (10 pages)
   - Step-by-step environment setup (15 min)
   - Prisma configuration
   - API testing with cURL
   - Debugging tips
   - Common issues & fixes
   - SUCCESS: Use this to get running

3. **[SPRINT-001-DAILY-LOG.md](SPRINT-001-DAILY-LOG.md)** (5 pages)
   - Daily progress tracker
   - Blockers log
   - Mid-sprint review template
   - Final metrics summary
   - SUCCESS: Update daily with team progress

### Code Files (Ready to Use)

1. **`/opt/web/src/lib/schemas/trip.ts`**
   - Zod schemas for validation (client + server)
   - TypeScript type definitions
   - Export: `TripCreate`, `TripUpdate`, `TripResponse`
   - Covers: [TASK-003] and [TASK-005]

2. **`/opt/web/app/api/trips/route.ts`**
   - POST /api/trips - Create trip with validation
   - GET /api/trips - List all trips
   - Covers: [TASK-003] Create endpoint

3. **`/opt/web/app/api/trips/[id]/route.ts`**
   - GET /api/trips/[id] - Get trip by ID
   - PATCH /api/trips/[id] - Update trip
   - DELETE /api/trips/[id] - Delete trip
   - Covers: [TASK-003] Read/Update endpoints

4. **`/opt/web/src/lib/prisma.ts`**
   - Prisma Client singleton
   - Prevents multiple instances
   - Graceful shutdown handling

5. **`/opt/web/prisma/schema.prisma.example`**
   - Trip Prisma model definition
   - To use: Copy to `prisma/schema.prisma`

---

## 🎯 Sprint Tasks (EPIC-001)

| Task | Days | Status | Owner |
|------|------|--------|-------|
| TASK-002: Trip model & migration | 1 | Ready | Backend |
| TASK-003: API endpoints | 1.5 | Ready | Backend |
| TASK-001: Map page scaffold | 0.5 | Ready | Frontend |
| TASK-004: Create trip form | 1.5 | Ready | Frontend |
| TASK-005: Date validation | 0.5 | Ready | Full-stack |
| TASK-006: List & detail views | 1 | Ready | Frontend |
| TASK-007: Tests & CI/CD | 1.5 | Ready | QA + DevOps |

**Total**: ~7.5 days of work (fits 2-week sprint)

---

## 🚀 Getting Started (30 minutes)

### Step 1: Environment Setup
```bash
# Follow: SPRINT-001-QUICK-START.md sections 1-3
# Time: 15 min
# Result: Dev server running on http://localhost:3000
```

### Step 2: Test API
```bash
# Follow: SPRINT-001-QUICK-START.md section 4
# Time: 10 min
# Result: Can create/list trips via cURL
```

### Step 3: Review Plan
```bash
# Read: SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md sections 1-3
# Time: 15 min
# Result: Team understanding of full scope
```

### Step 4: Kickoff Meeting
```bash
# Agenda:
# - Review epic outcomes (5 min)
# - Walk through 7-day breakdown (10 min)
# - Assign task owners (5 min)
# - Identify blockers (10 min)
# - Set daily standup time (2 min)
# Duration: 35 min
```

---

## 📊 Sprint Metrics (Target)

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Code Coverage | 85%+ | `npm run test -- --coverage` |
| API Response Time | <200ms | Use `curl -w %{time_total}` |
| E2E Test Pass Rate | 100% | `npm run test:e2e` |
| Bug Escape Rate | 0 critical | QA sign-off |
| Deployment Ready | Yes | All CI checks ✓ |

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Next.js App (Frontend)                  │
├─────────────────────────────────────────────────────────┤
│  Map Page (@/app/page.tsx)                              │
│  ├── Create Trip Modal (CreateTripForm.tsx)             │
│  ├── Trip List (TripList.tsx)                           │
│  └── Trip Detail (TripDetail.tsx)                       │
├─────────────────────────────────────────────────────────┤
│  React Hooks + Zod Validation (Client-side)            │
└─────────────────────────────────────────────────────────┘
                           ▼ HTTP
┌─────────────────────────────────────────────────────────┐
│              Next.js API Routes (Backend)                │
├─────────────────────────────────────────────────────────┤
│  POST   /api/trips        → Create trip                 │
│  GET    /api/trips        → List trips                  │
│  GET    /api/trips/[id]   → Get trip by ID             │
│  PATCH  /api/trips/[id]   → Update trip                │
│  DELETE /api/trips/[id]   → Delete trip                │
├─────────────────────────────────────────────────────────┤
│  Zod Validation (Server-side)                           │
│  Prisma ORM Layer                                        │
└─────────────────────────────────────────────────────────┘
                           ▼ prisma.schema
┌─────────────────────────────────────────────────────────┐
│            PostgreSQL Database (Persistence)             │
├─────────────────────────────────────────────────────────┤
│  trips table:                                            │
│  ├── id (CUID)            ├── startDate (Date)          │
│  ├── title (Varchar200)   ├── stopDate (Date)           │
│  ├── description (Text)   ├── createdAt (Timestamp)     │
│  └──────────────────────────── updatedAt (Timestamp)    │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Pre-Kickoff Checklist

- [ ] All team members have read SPRINT-001-QUICK-START.md
- [ ] Development environment running (see Quick Start section 1-3)
- [ ] `npm run dev` starts without errors
- [ ] `curl http://localhost:3000/api/trips` returns `[]` (empty list)
- [ ] PostgreSQL container running (`docker-compose ps`)
- [ ] Prisma Client generated successfully
- [ ] GitHub branch protection rules in place
- [ ] CI/CD pipeline configured or TODO'd
- [ ] Daily standup time scheduled
- [ ] Slack/chat channel created for sprint updates

---

## 📚 Helpful Resources

### Inside This Repo
- **SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md** - Full task breakdown
- **SPRINT-001-QUICK-START.md** - Environment & API setup
- **SPRINT-001-DAILY-LOG.md** - Daily progress tracker

### From EPIC-001 Archive
- **EPIC-001-web-map-trip-planning.md** - Epic requirements
- **STORY-*.md** (7 files) - Individual stories with acceptance criteria
- **TASK-*.md** (7 files) - Task details and subtasks

### External Tools
- **Prisma Docs**: https://www.prisma.io/docs/
- **Next.js Docs**: https://nextjs.org/docs
- **Zod Docs**: https://zod.dev/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

---

## 🎤 Daily Standup Template

**Time**: 15 minutes  
**Attendees**: Dev team, QA, Product

```
Each person shares:
1. What I completed yesterday
2. What I'm working on today
3. Any blockers or help needed
4. Updated SPRINT-001-DAILY-LOG.md
```

---

## 🚢 Definition of Done (Per Task)

- [ ] Code complete and reviewed
- [ ] All tests pass (unit + integration + E2E)
- [ ] No console errors or warnings
- [ ] Schemas/types generated (Prisma)
- [ ] Database migrations tested
- [ ] API documentation updated
- [ ] PR merged to develop branch
- [ ] Feature deployed to staging

---

## 🐛 If You Get Stuck

### Immediate Help
1. Check "Common Issues & Fixes" in SPRINT-001-QUICK-START.md
2. Search issue in team Slack/Chat
3. Ask in sprint standup
4. Pair program with team lead

### Documentation
- **DB question?** → docs/SCHEMA.md
- **API question?** → docs/API.md
- **Type question?** → Check src/lib/schemas/trip.ts
- **Test question?** → docs/TESTING.md

---

## 📞 Team Contacts

- **Development Lead**: [Name/Slack]
- **Product Owner**: [Name/Slack]
- **QA Lead**: [Name/Slack]
- **DevOps/DB Manager**: [Name/Slack]

---

## 🎉 Success Criteria

**EPIC-001 is complete when**:
1. ✅ All 7 stories have PRs merged to main
2. ✅ All 7 tasks have code merged and deployed
3. ✅ Zero critical defects
4. ✅ 85%+ test coverage
5. ✅ Deployment pipeline successful
6. ✅ User facing features working in staging
7. ✅ Documentation complete and reviewed

---

**Next Step**: Open [SPRINT-001-QUICK-START.md](SPRINT-001-QUICK-START.md) and follow the 30-minute setup.

**Questions?** Ask in your team channel or at next standup.

**Ready?** 🚀 Let's ship!

---

**Last Updated**: March 2, 2026  
**Created By**: Development Planning  
**Approved By**: [Product Lead]
