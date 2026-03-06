# Trip Planner - EPIC-001 Development

**Status**: 🚀 Ready for Development  
**Epic**: EPIC-001: Web Map Trip Planning with Dates  
**Date**: March 2, 2026  

## CI/CD Status

[![CI](https://github.com/user/repo/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/user/repo/actions/workflows/ci.yml)
[![E2E Tests](https://github.com/user/repo/actions/workflows/e2e-tests.yml/badge.svg?branch=main)](https://github.com/user/repo/actions/workflows/e2e-tests.yml)
[![Docker](https://github.com/user/repo/actions/workflows/docker-build.yml/badge.svg?branch=main)](https://github.com/user/repo/actions/workflows/docker-build.yml)

**CI/CD Docs**: See [CI-CD.md](../docs/CI-CD.md) for detailed pipeline documentation  

## Quick Start (30 Minutes)

### 🚀 New Developers - Start Here!

1. **Follow the [FIRST-RUN-CHECKLIST.md](FIRST-RUN-CHECKLIST.md)** (10 steps, ~30 min)
2. Verify all 10 checkboxes pass ✅
3. Start development!

### Prerequisites
- Node.js 20+ LTS
- Docker (for PostgreSQL)
- npm 10+

## Documentation

- **[FIRST-RUN-CHECKLIST.md](FIRST-RUN-CHECKLIST.md)** ⭐ Start here for first-time setup
- **[README.md](README.md)** - You are here
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Detailed setup & troubleshooting guide
- **[EPIC-001-DEV-STATUS.md](EPIC-001-DEV-STATUS.md)** - Current development status
- **[/opt/backlog/tracking/SPRINT-001-QUICK-START.md](/opt/backlog/tracking/SPRINT-001-QUICK-START.md)** - Quick start guide
- **[/opt/backlog/tracking/SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md](/opt/backlog/tracking/SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md)** - Full implementation plan

## What's Included

✅ **Backend**
- PostgreSQL database with Prisma ORM
- Trip CRUD API endpoints (POST, GET, PATCH, DELETE)
- Zod validation schemas (client & server)

✅ **Frontend**
- Next.js map page shell
- Create Trip form with validation
- Trip list sidebar
- Tailwind CSS styling

✅ **Testing**
- Vitest unit test framework
- Playwright E2E testing
- GitHub Actions CI/CD pipeline
- Schema validation tests

## Daily Workflow

```bash
# Start of day
docker compose up -d
npm run dev

# During development
npm test                # Run tests
npm run type-check      # TypeScript validation
npm run lint           # Code quality

# Before commit
npm test && npm run lint && npm run type-check
git add . && git commit -m "[EPIC-001] TASK-XXX: Description"
git push origin feature/TASK-XXX
```

## API Endpoints

```bash
# Create trip
curl -X POST http://localhost:3000/api/trips \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","startDate":"2026-06-15","stopDate":"2026-06-30"}'

# List trips
curl http://localhost:3000/api/trips

# Get trip
curl http://localhost:3000/api/trips/[id]

# Update trip
curl -X PATCH http://localhost:3000/api/trips/[id] \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated"}'

# Delete trip
curl -X DELETE http://localhost:3000/api/trips/[id]
```

## Project Structure

```
app/                           # Frontend (Next.js)
├── page.tsx                   # Map page + form
└── api/trips/
    ├── route.ts              # POST/GET endpoints
    └── [id]/route.ts         # GET/PATCH/DELETE endpoints

src/lib/                       # Backend utilities
├── schemas/trip.ts           # Zod validation
└── prisma.ts                 # Prisma client

prisma/                        # Database
├── schema.prisma             # Trip model
└── migrations/               # Database migrations

tests/                        # Test suite
└── unit/schemas.test.ts      # Schema validation tests

docker-compose.yml            # PostgreSQL container
.env.local                     # Environment variables
```

## Testing & CI/CD

### Local Testing

```bash
# Run unit tests
npm run test

# Run E2E tests with Docker
npm run test:e2e:docker

# Run E2E tests locally (without Docker)
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

### GitHub Actions CI/CD

Three automated workflows run on push and pull requests:

1. **CI Workflow** (`.github/workflows/ci.yml`)
   - Linting with ESLint
   - Type checking with TypeScript
   - Unit tests with Vitest
   - Build verification

2. **E2E Tests Workflow** (`.github/workflows/e2e-tests.yml`)
   - Playwright E2E tests
   - PostgreSQL database service
   - Artifact uploads (reports, traces)
   - PR comments with results

3. **Docker Build Workflow** (`.github/workflows/docker-build.yml`)
   - E2E Docker image build verification
   - Layer caching optimization

**View CI/CD Details**: See [CI-CD.md](../docs/CI-CD.md)

### Test Infrastructure

- **Framework**: Vitest (unit) + Playwright (E2E)
- **Database**: PostgreSQL 16 with Prisma migrations
- **Docker**: Multi-stage builds optimized for testing
- **Reports**: HTML reports with screenshots and traces on failure



```bash
npm run dev           # Start development server
npm run build         # Build for production
npm start             # Start production server
npm test              # Run unit tests
npm run test:e2e      # Run E2E tests
npm run type-check    # TypeScript validation
npm run lint          # Run ESLint
npm run format        # Format code with Prettier

npx prisma studio    # Interactive database browser
npx prisma generate  # Regenerate Prisma client
npx prisma migrate dev --name [migration-name]  # Create migration
```

## Support

**Setup Issues?** → See [DEVELOPMENT.md](DEVELOPMENT.md)  
**Code Questions?** → See [EPIC-001-DEV-STATUS.md](EPIC-001-DEV-STATUS.md)  
**Task Blocked?** → Check [SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md](/opt/backlog/tracking/SPRINT-001-EPIC-001-IMPLEMENTATION-PLAN.md)

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
