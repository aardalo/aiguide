# Sprint 1 Plan: EPIC-001 Web Map Trip Planning

## Sprint Goal
Deliver a working web application where users can create trips with dates on a map page, view their trips, edit trip details, and have date consistency validated - all backed by persistent storage.

## Sprint Duration
2 weeks (estimated)

## Stories in Sprint 1

### 1. STORY-001A: Setup database infrastructure
**Priority**: Highest (foundation for all other stories)  
**Effort**: 3 points  
**Description**: Set up Prisma ORM with PostgreSQL and establish database connection. Create initial Trip model schema and migration.  
**Outcome**: Development environment with working database ready for trip persistence.

### 2. STORY-001: Map shell and trip entry point
**Priority**: High  
**Effort**: 5 points  
**Description**: Create map page at `/map` route with "Create Trip" action that opens a trip creation form.  
**Outcome**: Users can access the map page and initiate trip creation.

### 3. STORY-002: Create trip with start/stop dates
**Priority**: High  
**Effort**: 8 points  
**Description**: Build trip creation form and API endpoint to create trips with title, start_date, and stop_date.  
**Outcome**: Users can create and persist new trips with date ranges.

### 4. STORY-002A: Display trip list and detail view
**Priority**: High  
**Effort**: 5 points  
**Description**: Create trip list page showing all trips and detail page showing individual trip information.  
**Outcome**: Users can browse created trips and view trip details.

### 5. STORY-003: Validate trip date consistency
**Priority**: High  
**Effort**: 5 points  
**Description**: Implement client and server-side validation ensuring stop_date >= start_date.  
**Outcome**: Invalid date ranges are prevented with clear error messages.

### 6. STORY-003A: Edit existing trip details
**Priority**: Medium  
**Effort**: 5 points  
**Description**: Build trip edit form and PATCH endpoint to update trip title, description, and dates.  
**Outcome**: Users can modify existing trips and save changes.

### 7. STORY-003B: Add automated tests for trip workflows
**Priority**: Medium  
**Effort**: 8 points  
**Description**: Create comprehensive test suite for trip creation, validation, and editing flows.  
**Outcome**: Critical trip workflows covered by automated tests with >80% coverage.

## Total Story Points
39 points (adjust based on team velocity)

## Sprint Backlog Priority
1. STORY-001A (infrastructure - blocks all others)
2. STORY-001 (map page scaffold)
3. STORY-002 (create trips - core functionality)
4. STORY-003 (validation - data integrity)
5. STORY-002A (viewing trips - completes CRUD)
6. STORY-003A (editing trips - completes CRUD)
7. STORY-003B (tests - quality assurance)

## Technical Stack
- **Runtime**: Node.js 22 LTS
- **Language**: TypeScript
- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Validation**: Zod
- **Styling**: Tailwind CSS
- **Testing**: Vitest (unit/integration)

## Definition of Done
- All acceptance criteria met for each story
- Code reviewed and merged to main branch
- Unit and integration tests passing
- No critical or high-severity bugs
- Documentation updated (README, inline comments)
- Demo-ready in local development environment

## Dependencies and Risks
- **External**: PostgreSQL installation/setup (mitigated by Docker option)
- **Technical**: Map component selection (start with placeholder)
- **Scope**: Defer map interaction features to later sprints
- **Team**: Ensure Node.js 22 and PostgreSQL access in dev environment

## Success Criteria for Sprint 1
- [ ] Users can create a trip from the map page
- [ ] Trips persist in database and survive page reloads
- [ ] Invalid date ranges are blocked with clear feedback
- [ ] Users can view trip list and trip details
- [ ] Users can edit existing trip dates and details
- [ ] Core workflows covered by automated tests
- [ ] Zero critical defects in trip CRUD operations

## Out of Scope (Future Sprints)
- Map interaction (pin placement, drawing)
- Route planning and optimization
- Multi-day itinerary details
- Plan mode (covered by EPIC-002)
- Vehicle profiles (covered by EPIC-003)
- Stay discovery (covered by EPIC-004)

## Next Steps After Sprint 1
1. Sprint Review: Demo trip creation and management workflows
2. Sprint Retrospective: Identify improvements
3. Sprint 2 Planning: Begin EPIC-002 (plan mode daily routing) or enhance EPIC-001 scope

---

**Created**: March 2, 2026  
**Epic**: [EPIC-001: Web Map Trip Planning](../epics/EPIC-001-web-map-trip-planning.md)  
**Status**: Ready for task breakdown and implementation
