# AI Agents — Trip Planner Project Guide

> **Purpose**: Central navigation for AI agents across sessions. Minimize context-reloading by pointing to authoritative sources instead of duplicating information.

---

## 🚀 Quick Navigation

| Need | Link |
|------|------|
| **Main AI Instructions** | [.github/copilot-instructions.md](.github/copilot-instructions.md) — both Copilot & Claude read this |
| **Current Sprint Tasks** | [SPRINT-001-DAILY-LOG.md](/opt/backlog/tracking/SPRINT-001-DAILY-LOG.md) — check for ongoing work |
| **EPIC-001 Status** | [EPIC-001-tracking.md](/opt/backlog/tracking/EPIC-001-tracking.md) — current progress, blockers, decisions |
| **Backlog Structure** | [/opt/backlog/README.md](/opt/backlog/README.md) — epics, stories, tasks, tracking folders |
| **Architecture Decisions** | [/opt/backlog/architecture/](file:///opt/backlog/architecture/) — ARCH-001 through ARCH-007+ |
| **Dev Server & Docker Scripts** | [scripts/](scripts/) — `dev-server.sh`, `docker-services.sh`, `test-*.sh` |

---

## 📋 Project Overview

**Trip Planner** is a full-stack Next.js application for planning multi-day road trips with interactive map-based routing, place discovery, and day-by-day itinerary management.

### Status
- **EPIC-001**: ✅ Complete (trip CRUD, validation, daily timeline, nearby search)
- **Next**: EPIC-002 (daily routing) — see [/opt/backlog/epics/](file:///opt/backlog/epics/)
- **Latest Update**: [SPRINT-001-DAILY-LOG.md](/opt/backlog/tracking/SPRINT-001-DAILY-LOG.md)

### Tech Stack
- **Frontend**: Next.js 16, React 19, Leaflet, Tailwind CSS v4
- **Backend**: Next.js App Router, Zod validation
- **Database**: PostgreSQL 16 (Prisma ORM) + Neo4j 5 (graph cache)
- **Testing**: Vitest (unit), Playwright (e2e)
- **Infrastructure**: Docker Compose, GitHub Actions CI/CD

---

## 🖥️ VM Environment (dev-aiguide)

### Host Baseline
- **OS**: Ubuntu 24.04.4 LTS
- **Kernel**: 6.8.0-124-generic
- **CPU**: 4 vCPUs | **RAM**: 7.8 GiB (2.5 GiB in use)
- **Storage**: 148 GiB root (ext4 on LVM), 120 GiB free
- **Virtualization**: KVM on QEMU hardware
- **Networking**: eth0 (static IP typically 192.168.1.171/24)

### Toolchain
- **Bash**: 5.2
- **Git**: 2.43
- **Node**: 22.22.0 (managed by nvm in ~/.nvm)
- **npm**: 10.9.4
- **Python**: 3.12.3
- **Docker**: 29.1.3 + Docker Compose v5.1.1

### Default Service Ports
| Service | Port | Container | Status |
|---------|------|-----------|--------|
| Next.js dev | 3000 | host | Running |
| PostgreSQL | 5432 | `trip_planner_db` | Running |
| Neo4j HTTP | 7474 | `trip_planner_neo4j` | Running |
| Neo4j Bolt | 7687 | `trip_planner_neo4j` | Running |
| SSH | 22 | host | Running |

### Verify Before Acting
Always check live state before assuming port/service availability:

```bash
# Check dev server
scripts/dev-server.sh status

# Check Docker services  
scripts/docker-services.sh status

# Check all listening ports
ss -tulpn

# Check containers
docker ps
```

**Do NOT hard-code volatile values** (PIDs, IPs, container IDs, branch names, host-specific paths outside `/opt/web`).

---

## 📦 Repository Structure

```
/opt/web/                       # Web application root
├── .github/copilot-instructions.md  # ⭐ AI instruction source
├── AGENTS.md                   # You are here
├── CLAUDE.md                   # Claude Code-specific notes
├── DEVELOPMENT.md              # Setup & troubleshooting
├── FIRST-RUN-CHECKLIST.md      # Onboarding checklist
├── EPIC-001-DEV-STATUS.md      # EPIC-001 delivery summary
├── README.md                   # Project overview
├── scripts/
│   ├── dev-server.sh           # Start/stop Next.js dev server
│   ├── docker-services.sh      # Start/stop PostgreSQL + Neo4j
│   └── test-e2e-docker.sh      # E2E tests in Docker
├── app/                        # Next.js App Router
│   ├── api/                    # API endpoints (CRUD, search, geocoding, etc.)
│   └── map/                    # Map page and settings
├── src/
│   ├── app/                    # Shared components and layouts
│   ├── lib/
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── schemas/            # Zod validation schemas
│   │   └── types/              # TypeScript types
│   └── utils/                  # Utilities
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Migration history
├── tests/ & tests/             # Vitest + Playwright tests
└── docs/                       # Additional documentation

/opt/backlog/                   # Product & engineering planning
├── epics/                      # EPIC-001 through EPIC-005
├── stories/                    # User stories and acceptance criteria
├── tasks/                      # Implementation tasks
├── tracking/                   # Sprint status, daily logs, decision tracking
├── architecture/               # ARCH-001 through ARCH-007+
└── research/                   # Discovery notes and references
```

---

## 📊 Backlog Navigation

### Current Sprint
- **Sprint**: SPRINT-001
- **Status**: Delivered (trip CRUD + validation complete)
- **Daily Log**: [SPRINT-001-DAILY-LOG.md](/opt/backlog/tracking/SPRINT-001-DAILY-LOG.md)
- **Task Tracking**: [EPIC-001-tracking.md](/opt/backlog/tracking/EPIC-001-tracking.md)

### Epics (Roadmap)
1. **EPIC-001**: Web map trip planning with dates — ✅ **COMPLETE**
2. **EPIC-002**: Plan mode daily routing — See [epics/EPIC-002-plan-mode-daily-routing.md](/opt/backlog/epics/EPIC-002-plan-mode-daily-routing.md)
3. **EPIC-003**: Global vehicle setup — See [epics/EPIC-003-global-vehicle-setup-and-plan-mode-selection.md](/opt/backlog/epics/EPIC-003-global-vehicle-setup-and-plan-mode-selection.md)
4. **EPIC-004**: Vehicle-aware stay discovery — See [epics/EPIC-004-vehicle-aware-stay-discovery-and-day-assignment.md](/opt/backlog/epics/EPIC-004-vehicle-aware-stay-discovery-and-day-assignment.md)
5. **EPIC-005**: RUN mode (replanning, events, weather) — See [epics/EPIC-005-run-mode-daily-replanning-events-and-weather.md](/opt/backlog/epics/EPIC-005-run-mode-daily-replanning-events-and-weather.md)

### How to Find & Update Work
1. **Starting work**: Check [SPRINT-001-DAILY-LOG.md](/opt/backlog/tracking/SPRINT-001-DAILY-LOG.md) for ongoing tasks
2. **Pick a task**: Find it in [/opt/backlog/tasks/](file:///opt/backlog/tasks/) or [/opt/backlog/stories/](file:///opt/backlog/stories/)
3. **Update status**: Modify the tracking file and task file with completion date, blockers, decisions
4. **Link architecture**: If making architecture changes, document in [/opt/backlog/architecture/](file:///opt/backlog/architecture/)
5. **Update epic tracking**: Reflect progress in the relevant epic's tracking file

---

## 🏗️ Key Architecture Decisions

See [/opt/backlog/architecture/](file:///opt/backlog/architecture/) for full details. Key decisions:

| Decision | Impact |
|----------|--------|
| **ARCH-001**: PostgreSQL + Prisma for transactional data | All CRUD operations, migrations use this foundation |
| **ARCH-002**: Neo4j for graph caching (places, nearby, geocoding) | Places search caching; no Sprint 1 impact; Sprint 2+ scope |
| **ARCH-005**: Hybrid cache strategy (PostgreSQL + Neo4j) | Sync between databases must follow explicit rules; see ARCH-005 |
| **ARCH-006**: Ollama-based AI extraction (future) | Denotes planned local LLM integration for trip analysis |
| **ARCH-007**: UI mode architecture (PLAN/SETUP/RUN) | Guides feature scope: PLAN now, SETUP/RUN in future EPICs |
| **Date model**: Trip start is anchor, stop is derived; single-day edits shift downstream | Affects trip edit validation; see EPIC-001-tracking.md decisions |
| **No Segment Routes Pre-Anchor**: Branches cannot generate routes before anchor day | Prevents data inconsistency; code enforces this |

---

## 🔧 Common Development Tasks

### Starting Work
```bash
cd /opt/web

# Start services (PostgreSQL + Neo4j)
scripts/docker-services.sh start

# Start dev server (Next.js)
scripts/dev-server.sh start

# Check status
scripts/dev-server.sh status
scripts/docker-services.sh status
```

### After Database Changes
```bash
# Create migration and apply
npx prisma migrate dev --name <description>

# Regenerate Prisma client only (no DB change)
npx prisma generate

# Then restart dev server (Prisma client is cached in memory)
scripts/dev-server.sh restart
```

### Testing
```bash
# Unit tests (Vitest)
npm run test

# E2E tests (Playwright)
npm run test:e2e

# E2E in Docker
npm run test:e2e:docker
```

### Type Check & Format
```bash
npm run type-check
npm run format
npm run lint
```

See [CLAUDE.md](CLAUDE.md) for Claude Code-specific workflows and post-tool hooks.

---

## 📝 Before Starting Work

1. **Check for active tasks**: Read [SPRINT-001-DAILY-LOG.md](/opt/backlog/tracking/SPRINT-001-DAILY-LOG.md)
2. **Understand constraints**: Review [.github/copilot-instructions.md](.github/copilot-instructions.md)
3. **Know the architecture**: Skim [/opt/backlog/architecture/](file:///opt/backlog/architecture/) for relevant decisions
4. **Verify environment**: Run `scripts/docker-services.sh status && scripts/dev-server.sh status`
5. **Link to task**: Record which task/story/epic you're working on

## 🎯 After Completing Work

1. **Update task file**: Add completion timestamp, blockers encountered, and decisions made
2. **Update epic tracking**: Reflect progress in [EPIC-001-tracking.md](/opt/backlog/tracking/EPIC-001-tracking.md) or relevant epic
3. **Update SPRINT log**: Add entry to [SPRINT-001-DAILY-LOG.md](/opt/backlog/tracking/SPRINT-001-DAILY-LOG.md)
4. **Document decisions**: If changing behavior, add to [/opt/backlog/architecture/](file:///opt/backlog/architecture/)
5. **Link architectural impact**: Reference architecture decisions made during implementation

---

## 🔗 Session Continuation Pattern

**Goal**: On next session start, avoid re-scanning the VM. Instead:

1. **Read this file** (AGENTS.md) — 2 min
2. **Check daily log** — See what was done yesterday
3. **Review epic tracking** — Understand current blockers
4. **Verify environment** — Run status scripts
5. **Pick task** — Continue from daily log or epic tracking
6. **Execute** — Follow the task acceptance criteria and architecture decisions
7. **Update tracking** — Commit completion and new decisions

---

## 📞 Need Help?

- **Project questions**: See [README.md](README.md) and [/opt/backlog/epics/](file:///opt/backlog/epics/)
- **Setup issues**: Check [DEVELOPMENT.md](DEVELOPMENT.md) or [FIRST-RUN-CHECKLIST.md](FIRST-RUN-CHECKLIST.md)
- **Environment issues**: Check [.github/copilot-instructions.md](.github/copilot-instructions.md) "Environment Baseline" section
- **Architectural concerns**: Browse [/opt/backlog/architecture/](file:///opt/backlog/architecture/)
- **Task status**: [SPRINT-001-DAILY-LOG.md](/opt/backlog/tracking/SPRINT-001-DAILY-LOG.md)

---

## 📅 Last Updated

- **File**: AGENTS.md
- **Date**: 2026-06-10
- **VM State**: dev-aiguide running normally, EPIC-001 complete, SPRINT-001 delivered

---

**Next**: Choose your task from [SPRINT-001-DAILY-LOG.md](/opt/backlog/tracking/SPRINT-001-DAILY-LOG.md) or pick the next epic from [/opt/backlog/epics/](file:///opt/backlog/epics/).
