# EPIC-001 Development Quick Start Guide

**Status**: Ready for Team  
**Last Updated**: March 2, 2026  
**For**: [SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md](SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md)

---

## Prerequisites

- **Node.js**: 22 LTS or higher (`node --version`)
- **npm**: 10.x+ (`npm --version`)
- **Docker & Docker Compose**: For PostgreSQL container
- **Git**: Latest version

Verify all are installed:
```bash
node --version && npm --version && docker --version && git --version
```

---

## 1. Development Environment Setup (15 minutes)

### Step 1a: Clone and Setup Repository

```bash
cd /opt
# Git repository should already exist; if not:
# git clone <repo-url> web && cd web
cd /opt/web
```

### Step 1b: Create `.env.local` File

Create `/opt/web/.env.local` with the following content:

```bash
# Database Configuration
DATABASE_URL="postgresql://trip_user:trip_password@localhost:5432/trip_planner_dev"

# Environment
NODE_ENV="development"

# Optional: Prisma logging
LOG_LEVEL="debug"
```

### Step 1c: Spin Up PostgreSQL Container

```bash
# From /opt/web directory
docker-compose up -d

# Verify PostgreSQL is running
docker-compose ps

# You should see:
# postgres    Up 30 seconds    0.0.0.0:5432->5432/tcp
```

Test database connection:

```bash
docker-compose exec postgres psql -U trip_user -d trip_planner_dev -c "SELECT 1;"

# Expected output:
# ?column?
# ----------
#        1
# (1 row)
```

### Step 1d: Install Dependencies

```bash
npm install
```

Verify installation:

```bash
npm list next prisma zod
# Should show package versions
```

---

## 2. Prisma Setup (10 minutes)

### Step 2a: Add Trip Model to Schema

Edit `/opt/web/prisma/schema.prisma` and ensure the `Trip` model exists:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Trip {
  id          String   @id @default(cuid())
  title       String   @db.Varchar(200)
  description String?  @db.Text
  startDate   DateTime @db.Date
  stopDate    DateTime @db.Date
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([createdAt])
  @@map("trips")
}
```

### Step 2b: Create and Apply Migration

```bash
# Create migration file
npx prisma migrate dev --name add_trip_model

# This will:
# 1. Generate migration SQL file
# 2. Apply migration to PostgreSQL
# 3. Generate Prisma client

# Expected output:
# ✓ Database synced to the schema. Run following command to generate Prisma Client.
# ✓ Generated Prisma Client (X.X.X) to ./node_modules/.prisma/client in XXms
```

### Step 2c: Verify Database Schema

```bash
# Inspect the new trips table
npx prisma studio

# Visit http://localhost:5555 to inspect data (browser GUI)
# Or use CLI:
docker-compose exec postgres psql -U trip_user -d trip_planner_dev -c "\d trips;"

# Expected output: Shows id, title, description, startDate, stopDate, createdAt, updatedAt columns
```

---

## 3. Start Development Server (5 minutes)

### Step 3a: Launch Next.js Dev Server

```bash
npm run dev

# Expected output:
# ▲ Next.js 15.x.x
# - Local:        http://localhost:3000
# - Environments: .env.local
# ✓ Ready in XXXms
```

### Step 3b: Verify Map Page Loads

Open browser to [http://localhost:3000](http://localhost:3000)

You should see:
- [ ] Header with "Trip Planner" title
- [ ] "Create Trip" button
- [ ] Map container placeholder
- [ ] No console errors in browser DevTools

---

## 4. API Testing (10 minutes)

### Step 4a: Test Create Trip Endpoint

```bash
# Create a trip with valid dates
curl -X POST http://localhost:3000/api/trips \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Summer Road Trip",
    "description": "West Coast adventure",
    "startDate": "2026-06-15",
    "stopDate": "2026-06-30"
  }'

# Expected response (201 Created):
# {
#   "id": "clx...",
#   "title": "Summer Road Trip",
#   "description": "West Coast adventure",
#   "startDate": "2026-06-15T00:00:00.000Z",
#   "stopDate": "2026-06-30T00:00:00.000Z",
#   "createdAt": "2026-03-02T14:30:00.000Z",
#   "updatedAt": "2026-03-02T14:30:00.000Z"
# }
```

### Step 4b: Test List Trips Endpoint

```bash
curl http://localhost:3000/api/trips

# Expected response (200 OK):
# [
#   {
#     "id": "clx...",
#     "title": "Summer Road Trip",
#     ...
#   }
# ]
```

### Step 4c: Test Invalid Date Range (Should Fail)

```bash
# Stop date before start date
curl -X POST http://localhost:3000/api/trips \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Bad Trip",
    "startDate": "2026-06-30",
    "stopDate": "2026-06-15"
  }'

# Expected response (400 Bad Request):
# {
#   "error": "Validation failed",
#   "issues": {
#     "fieldErrors": {
#       "stopDate": ["Stop date must be equal to or after the start date"]
#     }
#   }
# }
```

---

## 5. Running Tests (10 minutes)

### Step 5a: Run Unit Tests

```bash
npm run test

# Expected output:
# ✓ tests/unit/schemas.test.ts (X tests)
# ✓ tests/unit/components/... (more tests)
# 
# Test Files  X passed (X)
# Tests  Y passed (Y)
```

### Step 5b: Run E2E Tests

```bash
npm run test:e2e

# Expected output:
# ✓ tests/e2e/trip-workflow.spec.ts
# ...passes
```

---

## 6. Debugging Tips

### Enable Query Logging

View all database queries in console:

```bash
# In .env.local, add:
LOG_LEVEL="debug"

# Or use Prisma's built-in logging
# Edit src/lib/prisma.ts:
// log: ["query", "error", "info", "warn"]
```

### Inspect Database with Prisma Studio

```bash
# Browser-based GUI for database
npx prisma studio

# Opens http://localhost:5555
# View/edit Trip records directly
```

### Check Logs

```bash
# Next.js server logs
# Look in terminal where `npm run dev` is running

# Database logs
docker-compose logs postgres

# Container status
docker-compose ps
```

---

## 7. Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| `DATABASE_URL not found` | Missing `.env.local` | Create `.env.local` with DATABASE_URL |
| `connection refused on 0.0.0.0:5432` | PostgreSQL not running | Run `docker-compose up -d` |
| `Error: Install Prisma engine` | Node modules outdated | Run `npm install` then `npx prisma generate` |
| `EADDRINUSE on 3000` | Port already in use | Kill process or use different port: `PORT=3001 npm run dev` |
| `Migration failed` | Syntax error in schema | Check `prisma/schema.prisma` syntax; run `npx prisma validate` |

---

## 8. Development Workflow

### Making Changes

```bash
# Feature branch
git checkout -b feature/TASK-002-trip-model

# Make changes to src/ and prisma/ files

# Create migration if schema changes
npx prisma migrate dev --name describe_change

# Commit
git add .
git commit -m "[EPIC-001] TASK-002: Add Trip model and migration"

# Push and create PR
git push origin feature/TASK-002-trip-model
```

### Running Tests Before Commit

```bash
npm run test          # Unit tests
npm run test:e2e      # E2E tests
npm run lint          # TypeScript + ESLint
npm run type-check    # Type checking
```

### Viewing Changes

```bash
# See what changed in a migration
cat prisma/migrations/[timestamp]_add_trip_model/migration.sql

# See Prisma client changes
ls node_modules/.prisma/client/
```

---

## 9. Command Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server (hot reload) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | TypeScript type checking |
| `npx prisma migrate dev` | Create and apply migration |
| `npx prisma studio` | Browser GUI for database |
| `npx prisma db push` | Sync schema to database |
| `npx prisma generate` | Generate Prisma client |
| `docker-compose up -d` | Start PostgreSQL container |
| `docker-compose down` | Stop and remove containers |
| `docker-compose logs` | Show container logs |

---

## 10. Next Steps

1. ✅ **Development environment running?**
   - Server on http://localhost:3000
   - PostgreSQL accessible
   - API endpoints responding

2. **Start TASK-002**: Implement Trip Prisma model
   - Files already created: `/opt/web/src/lib/schemas/trip.ts`
   - Files already created: `/opt/web/app/api/trips/route.ts`
   - Files already created: `/opt/web/app/api/trips/[id]/route.ts`

3. **Then TASK-003**: API integration tests

4. **Then TASK-001**: Map page scaffold

5. **Then TASK-004**: Create Trip form

---

## Support & Questions

- **Issue?** Check "Common Issues & Fixes" section above
- **Schema question?** See `docs/SCHEMA.md`
- **API question?** See `docs/API.md`
- **Test question?** See `docs/TESTING.md`

---

**Last Updated**: March 2, 2026  
**Maintained By**: Development Lead
