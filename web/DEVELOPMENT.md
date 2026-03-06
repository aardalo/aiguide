# EPIC-001 Development - Setup & Getting Started

**Status**: ✅ Ready for Local Development  
**Date**: March 2, 2026  
**Last Updated**: March 2, 2026, 09:15 UTC

---

## What's Been Set Up ✅

### Dependencies
- ✅ Node.js packages installed (including Prisma, Zod, Vitest, Playwright)
- ✅ Package.json scripts configured (dev, test, build, type-check, format)
- ✅ Environment variables template created (.env.local)

### Database
- ✅ Prisma schema configured (`prisma/schema.prisma`)
- ✅ Migration file created (`prisma/migrations/1_init/migration.sql`)
- ✅ `docker-compose.yml` configured for PostgreSQL 16

### Backend Code (TASK-002 & TASK-003)
- ✅ Trip validation schemas (`src/lib/schemas/trip.ts`)
- ✅ Trip API endpoints (POST, GET, PATCH, DELETE)
  - `app/api/trips/route.ts` (Create + List)
  - `app/api/trips/[id]/route.ts` (Get + Update + Delete)
- ✅ Prisma client setup (`src/lib/prisma.ts`)

### Frontend Code (TASK-001 & TASK-004)
- ✅ Map page with Create Trip form (`app/page.tsx`)
- ✅ Basic UI with Tailwind CSS
- ✅ Form validation and error handling
- ✅ Trip list sidebar

### Documentation
- ✅ Implementation plan (40 pages)
- ✅ Quick start guide (15 pages)
- ✅ Daily log template
- ✅ Kickoff package

---

## Prerequisites (Your Machine)

### Required
- **Docker & Docker Compose**: For PostgreSQL (install from docker.com)
- **Node.js**: 20+ LTS (current: v18 - needs upgrade)
- **npm**: 10.x+ (comes with Node.js)
- **Git**: For version control

### Install Node.js 20+

If you have Node 18, upgrade it:

```bash
# Using nvm (recommended)
nvm install 20
nvm use 20

# Or download from https://nodejs.org/ (LTS version)

# Verify
node --version  # Should show v20.x.x or higher
npm --version   # Should show 10.x or higher
```

### Install Docker

```bash
# macOS (with Homebrew)
brew install docker

# Ubuntu/Debian
sudo apt update && sudo apt install docker.io docker-compose

# Windows
# Download from https://www.docker.com/products/docker-desktop

# Verify
docker --version
docker compose version  # Note: "docker compose" (not "docker-compose")
```

---

## Setup Steps (30 minutes)

### Step 1: Start PostgreSQL (5 min)

```bash
cd /opt/web

# Start PostgreSQL container
docker compose up -d

# Verify it's running
docker compose ps

# Expected output:
# NAME            IMAGE              STATUS
# trip_planner_db postgres:16-alpine Up X seconds
```

### Step 2: Apply Prisma Migration (5 min)

```bash
cd /opt/web

# Deploy the migration to your database
npx prisma migrate deploy

# Expected output:
# ✓ Successfully applied 1 migration

# Generate Prisma Client
npx prisma generate

# Expected output:
# ✓ Generated Prisma Client
```

### Step 3: Start Development Server (5 min)

```bash
cd /opt/web

# Install remaining dependencies (if needed)
npm install

# Start the development server
npm run dev

# Expected output:
# ▲ Next.js 16.x.x
# - Local:        http://localhost:3000
# ✓ Ready in XXXms
```

### Step 4: Test the Application (5 min)

**Open browser**: http://localhost:3000

You should see:
- ✅ "Trip Planner" header
- ✅ "+ Create Trip" button
- ✅ Map placeholder
- ✅ Empty trips sidebar

**Test creating a trip**:
1. Click "+ Create Trip"
2. Enter:
   - Title: "Test Trip"
   - Start Date: 2026-06-15
   - Stop Date: 2026-06-30
3. Click "Create Trip"
4. Should see success message and trip appears in sidebar

---

## Verify Database Connection

### Using psql (CLI)

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U trip_user -d trip_planner_dev

# In the psql prompt, run:
\dt              # List tables (should show "trips" table)
SELECT COUNT(*) FROM trips;  # Should return 0 initially
\q              # Exit psql
```

### Using Prisma Studio (GUI)

```bash
cd /opt/web
npx prisma studio

# Opens browser to http://localhost:5555
# Inspect trips table visually
```

---

## Test API Endpoints

### Create a Trip

```bash
curl -X POST http://localhost:3000/api/trips \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Beach Vacation",
    "description": "Summer getaway",
    "startDate": "2026-07-01",
    "stopDate": "2026-07-07"
  }'

# Expected response (HTTP 201):
# {
#   "id": "clx...",
#   "title": "Beach Vacation",
#   "description": "Summer getaway",
#   "startDate": "2026-07-01T00:00:00.000Z",
#   "stopDate": "2026-07-07T00:00:00.000Z",
#   "createdAt": "2026-03-02T...",
#   "updatedAt": "2026-03-02T..."
# }
```

### List All Trips

```bash
curl http://localhost:3000/api/trips

# Expected response (HTTP 200):
# [
#   { "id": "...", "title": "Beach Vacation", ... },
#   ...
# ]
```

### Test Invalid Date Range (Should Fail)

```bash
curl -X POST http://localhost:3000/api/trips \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Bad Trip",
    "startDate": "2026-07-07",
    "stopDate": "2026-07-01"
  }'

# Expected response (HTTP 400):
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

## Common Commands

### Development

```bash
npm run dev           # Start dev server (http://localhost:3000)
npm run build         # Build for production
npm run type-check    # TypeScript validation
npm run format        # Format code with Prettier
npm run lint          # Run ESLint
```

### Database

```bash
npx prisma studio               # Open browser GUI
npx prisma migrate dev          # Create new migration
npx prisma migrate deploy       # Apply migrations
npx prisma generate            # Regenerate Prisma client
docker compose logs postgres    # View PostgreSQL logs
docker compose down             # Stop containers
```

### Testing

```bash
npm test              # Run unit tests (Vitest)
npm run test:ui       # Test UI (Vitest UI)
npm run test:e2e      # Run E2E tests (Playwright)
```

---

## Troubleshooting

### Issue: "Database connection refused"
```bash
# Check if PostgreSQL is running
docker compose ps

# If not running, start it
docker compose up -d

# Check logs
docker compose logs postgres
```

### Issue: "Prisma Client out of sync"
```bash
# Regenerate Prisma client
npx prisma generate

# Or reset and resync
rm -rf node_modules/.prisma
npx prisma generate
```

### Issue: "Port 5432 already in use"
```bash
# Find and stop the conflicting container
docker ps | grep postgres
docker stop <container_id>

# Or use a different port in docker-compose.yml:
# ports:
#   - "5433:5432"
```

### Issue: "Node version too old"
```bash
# Check your version
node --version

# Upgrade to Node 20 LTS
# Using nvm:
nvm install 20
nvm use 20
nvm default 20
```

### Issue: "npm install fails"
```bash
# Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

## Project Structure

```
/opt/web/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Map page (TASK-001)
│   └── api/trips/
│       ├── route.ts              # POST/GET endpoints (TASK-003)
│       └── [id]/route.ts         # GET/PATCH/DELETE endpoints
├── src/
│   └── lib/
│       ├── schemas/
│       │   └── trip.ts           # Zod validation schemas
│       └── prisma.ts             # Prisma client singleton
├── prisma/
│   ├── schema.prisma             # Database schema (Trip model)
│   └── migrations/
│       └── 1_init/
│           └── migration.sql     # Initial migration
├── docker-compose.yml            # PostgreSQL container config
├── .env.local                    # Environment variables
├── package.json
└── tsconfig.json
```

---

## Next Steps

### Today (Day 1)
1. ✅ Get environment running (follow Setup Steps above)
2. ✅ Test API endpoints with cURL
3. ✅ Create a test trip via the web form
4. ⏳ Begin TASK-002 subtasks (schema validation)

### Tomorrow (Day 2-3)
1. Complete TASK-003 (API testing)
2. Complete TASK-004 (Form refinement)
3. Begin TASK-005 (Date validation tests)

### Week 1 Checkpoint (Friday)
1. All backend CRUD working
2. Frontend displaying trips
3. Validation tests passing
4. Ready for code review

---

## Team Communication

### Daily Standup
- **Time**: [TBD in kickoff]
- **Duration**: 15 minutes
- **Topics**: What's done, what's next, blockers

### If Stuck
1. Check "Troubleshooting" section above
2. Search team Slack/chat
3. Ask in standup
4. Pair program with tech lead

### Documentation
- **Full Plan**: [SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md](/opt/backlog/tracking/SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md)
- **Quick Start**: [SPRINT-001-QUICK-START.md](/opt/backlog/tracking/SPRINT-001-QUICK-START.md)
- **Daily Log**: [SPRINT-001-DAILY-LOG.md](/opt/backlog/tracking/SPRINT-001-DAILY-LOG.md)

---

## Ready?

```bash
cd /opt/web
docker compose up -d
npx prisma migrate deploy
npm run dev
# Open http://localhost:3000
```

Then update the Daily Log with your progress! 🚀

---

**Questions?** Ask in the team channel or at standup.  
**Ready to code?** See TASK-002 in the implementation plan!
