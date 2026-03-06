# Story: STORY-001A Setup database infrastructure

## Metadata
- **Priority**: P0
- **Status**: complete

## User story
As a developer, I want to set up Prisma ORM with PostgreSQL and establish the database connection, so that the application can persist trip data reliably.

## Mode ownership
- Primary mode: PLAN
- Secondary modes: RUN, SETUP

## Acceptance criteria
- [x] PostgreSQL database is running and accessible (local dev environment).
- [x] Prisma is installed and configured with database connection.
- [x] Prisma schema file is initialized with basic Trip model.
- [x] Initial migration is created and applied successfully.
- [x] Database connection can be imported and used in API routes.
- [x] `npm run dev` starts without database connection errors.

## Dependencies
- Node.js and npm installed
- PostgreSQL installed (or Docker container available)
- Next.js project structure

## Technical notes
- Use Prisma as ORM for type-safe database access
- PostgreSQL as persistence layer (per ARCH-001)
- Connection string via environment variable (`.env.local`)
- Basic Trip model: `id`, `title`, `description`, `startDate`, `stopDate`, `createdAt`, `updatedAt`
- Date fields stored as `DATE` type for day-level planning

## Related tasks
- Setup PostgreSQL database locally
- Install and configure Prisma
- Create Trip model schema
- Generate and run initial migration
- Create database client singleton for API routes
- Add .env.example with database connection template

## Epic
[EPIC-001: Web Map Trip Planning](../epics/EPIC-001-web-map-trip-planning.md)
