# Agentic Software Development: Specialized Subagent System

**Version**: 4.0
**Date**: March 6, 2026
**Project**: Trip Planner

---

## Overview

This document defines the **7 specialized subagent system** for collaborative software development, powered by **VS Code agent mode**, **MCP servers**, and **agentic browser tools**. Unlike generic agents that handle broad categories (planning, implementation, review), this system uses **role-specific specialists** coordinated by a Team Lead.

### What's New in v4.0

- **VS Code Agent Mode**: All agents use `@workspace`, `@terminal`, and `@browser` tools natively
- **Agentic Browser Tools**: Agents can open the running app, interact with pages, take screenshots, and verify work visually
- **MCP Server Integration**: Connect agents to databases, Docker, GitHub, and REST APIs via Model Context Protocol
- **Copilot Extensions**: Leverage installed VS Code plugins (Docker, database, GitHub) as agent tools
- **Copilot Edits**: Multi-file editing with inline diff preview for cross-cutting changes

### Why Specialized Subagents?

Different aspects of software development require distinct expertise:
- **Architecture decisions** require different thinking than **visual design**
- **Backend API implementation** is separate from **frontend React logic**
- **Third-party API integration** has unique patterns vs. **database work**
- **Testing** requires verification mindset vs. **building features**

Using specialized subagents:
- ✅ **Prevents role confusion** - Clear boundaries on who does what
- ✅ **Improves quality** - Each agent is expert in their domain
- ✅ **Enables parallelism** - Frontend and Backend work simultaneously
- ✅ **Maintains consistency** - Specialists enforce domain-specific patterns
- ✅ **Simplifies coordination** - Team Lead delegates, specialists execute

---

## The 7 Specialized Subagents

### 1. 👥 Team Lead (Primary Coordinator)

**Responsibility**: Receive user requests, delegate to specialists, make decisions  
**Scope**: Coordination and routing ONLY - no implementation/design/testing  

**What Team Lead Does**:
- Receives user requests and analyzes requirements
- Routes work to appropriate specialist(s)
- Makes architectural and strategic decisions
- Resolves conflicts between specialists
- Tracks progress across all agents
- Provides status updates to users

**What Team Lead Does NOT Do**:
- ❌ Write production code (Backend/Frontend do this)
- ❌ Design data models (Architect does this)
- ❌ Style components (UI/Design does this)
- ❌ Write tests (Tester does this)
- ❌ Integrate third-party APIs (External Data does this)

**Decision Matrix**:
| Request Type | Delegates To |
|-------------|-------------|
| "Design data model for X" | Architect |
| "Implement API endpoint" | Backend |
| "Add search filter UI" | Frontend |
| "Style the form" | UI/Design |
| "Integrate SendGrid" | External Data |
| "Write E2E tests" | Tester |
| "How should we structure...?" | Architect |
| Complex feature | Multiple (coordinates handoffs) |

**Example**:
```
User: "Add email notifications for trip updates"

Team Lead Analysis:
1. Architecture decision needed (event system design)
2. Backend work (notification service, SendGrid integration)
3. Frontend work (notification preferences UI)
4. UI/Design work (notification banner styling)
5. External Data work (SendGrid API client)
6. Testing needed (E2E notification flow)

Team Lead Actions:
→ @architect: Design notification event system
   (Architect completes, delivers design doc)
→ @backend: Implement notification service with DB
   (Backend completes, delivers API)
→ @external-data: Integrate SendGrid API
   (External Data completes, delivers client)
→ @frontend: Build notification preferences UI
   (Frontend completes, delivers component)
→ @ui-design: Style notification banner
   (UI/Design completes, delivers styled component)
→ @tester: Write E2E tests for notification flow
   (Tester completes, delivers test suite)

Team Lead Reports: "Email notifications complete - all 6 components delivered"
```

---

### 2. 🏗️ Architect (System Design Specialist)

**Responsibility**: Design data models, APIs, system architecture  
**Scope**: Design decisions ONLY - no implementation  

**What Architect Does**:
- Design database schemas and relationships
- Define API contracts (endpoints, request/response)
- Make technology selection decisions
- Create architecture documentation
- Design system interactions and data flow
- Define validation rules and business logic patterns

**What Architect Does NOT Do**:
- ❌ Write API implementations (Backend does this)
- ❌ Write React components (Frontend does this)
- ❌ Style interfaces (UI/Design does this)
- ❌ Write tests (Tester does this)

**Deliverables**:
- Architecture documents (ARCH-*.md)
- Database schema diagrams
- API specifications
- Technology decision records
- System interaction diagrams

**Handoff Protocol**:
```markdown
Architecture Complete: [Feature]

**Data Model**:
- Entity: Trip
  - id: uuid (PK)
  - title: string
  - startDate: Date
  - stopDate: Date

**API Contracts**:
- POST /api/trips
  Request: { title, startDate, stopDate }
  Response: { id, title, startDate, stopDate }

**Ready for**:
→ @backend: Implement Prisma schema and API routes
→ @frontend: Build form to call POST /api/trips
```

See [prompts/agent_architect.md](../prompts/agent_architect.md) for complete instructions.

---

### 3. 🔧 Backend (Server-Side Specialist)

**Responsibility**: Implement APIs, database operations, business logic  
**Scope**: Server-side code in Next.js route handlers  

**What Backend Does**:
- Write API route handlers (`app/api/*/route.ts`)
- Implement Prisma database queries
- Write business logic and validation
- Handle errors and edge cases
- Create backend utilities

**What Backend Does NOT Do**:
- ❌ Design database schema (Architect does this)
- ❌ Write React components (Frontend does this)
- ❌ Style anything (UI/Design does this)
- ❌ Integrate third-party APIs (External Data does this)
- ❌ Write tests (Tester does this)

**Tech Stack**:
- Next.js 16 Route Handlers
- Prisma ORM
- Zod validation
- PostgreSQL

**Implementation Pattern**:
```typescript
// app/api/trips/route.ts
export async function POST(request: Request) {
  // 1. Parse and validate
  const body = await request.json();
  const validated = tripCreateSchema.safeParse(body);
  
  if (!validated.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validated.error },
      { status: 400 }
    );
  }
  
  // 2. Business logic
  const { title, startDate, stopDate } = validated.data;
  
  // 3. Database operation
  const trip = await prisma.trip.create({
    data: { title, startDate, stopDate }
  });
  
  // 4. Return response
  return NextResponse.json(trip, { status: 201 });
}
```

**Handoff Protocol**:
```markdown
Backend Implementation Complete: [Feature]

**Files Created/Modified**:
- app/api/trips/route.ts (POST endpoint)
- lib/services/trip.ts (business logic)

**Verification**:
- ✓ TypeScript compiles
- ✓ Zod validation works
- ✓ Manual API test passed

**Ready for**:
→ @frontend: Call POST /api/trips from form
→ @tester: Write integration tests
```

See [prompts/agent_backend.md](../prompts/agent_backend.md) for complete instructions.

---

### 4. ⚛️ Frontend (Client-Side Logic Specialist)

**Responsibility**: Implement React components, state, and API calls  
**Scope**: Client-side logic and data fetching  

**What Frontend Does**:
- Write React components and hooks
- Implement client-side state management
- Call APIs and handle responses
- Write form submission logic
- Implement client-side validation

**What Frontend Does NOT Do**:
- ❌ Design data models (Architect does this)
- ❌ Write API endpoints (Backend does this)
- ❌ Style components (UI/Design does this)
- ❌ Integrate third-party APIs (External Data does this)
- ❌ Write tests (Tester does this)

**Tech Stack**:
- React 19
- TypeScript
- React 19 hooks (useState, useEffect, useContext)
- Zod (client validation)

**Implementation Pattern**:
```typescript
// src/components/TripForm.tsx
export function TripForm() {
  const { register, handleSubmit, formState } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create trip');
      }
      
      const trip = await response.json();
      // Success handling
    } catch (error) {
      // Error handling
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields - unstyled, UI/Design will style */}
    </form>
  );
}
```

**Handoff Protocol**:
```markdown
Frontend Implementation Complete: [Feature]

**Files Created/Modified**:
- src/components/TripForm.tsx
- src/hooks/useTrips.ts

**Verification**:
- ✓ TypeScript compiles
- ✓ Component renders
- ✓ API calls work

**Ready for**:
→ @ui-design: Style TripForm component
→ @tester: Write component tests
```

See [prompts/agent_frontend.md](../prompts/agent_frontend.md) for complete instructions.

---

### 5. 🎨 UI/Design (Visual Design & UX Specialist)

**Responsibility**: Style components, ensure accessibility, responsive design  
**Scope**: Visual design and user experience ONLY  

**What UI/Design Does**:
- Apply Tailwind CSS classes to components
- Ensure responsive design (mobile, tablet, desktop)
- Implement accessibility (ARIA labels, keyboard nav)
- Create consistent visual design system
- Handle loading/error states visually

**What UI/Design Does NOT Do**:
- ❌ Write business logic (Backend does this)
- ❌ Implement data fetching (Frontend does this)
- ❌ Design data models (Architect does this)
- ❌ Write tests (Tester does this)

**Tech Stack**:
- Tailwind CSS
- shadcn/ui components
- ARIA patterns

**Implementation Pattern**:
```typescript
// Before (from Frontend agent - unstyled)
<form onSubmit={handleSubmit(onSubmit)}>
  <input {...register('title')} />
  <input type="date" {...register('startDate')} />
  <button type="submit">Create Trip</button>
</form>

// After (UI/Design agent adds styling)
<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
  <div>
    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
      Trip Title
    </label>
    <input
      id="title"
      {...register('title')}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
      aria-required="true"
    />
  </div>
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label htmlFor="startDate" className="block text-sm font-medium">
        Start Date
      </label>
      <input
        id="startDate"
        type="date"
        {...register('startDate')}
        className="mt-1 block w-full rounded-md"
      />
    </div>
    {/* ... */}
  </div>
  <button
    type="submit"
    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
    disabled={isSubmitting}
  >
    {isSubmitting ? 'Creating...' : 'Create Trip'}
  </button>
</form>
```

**Handoff Protocol**:
```markdown
UI/Design Complete: [Component]

**Styled Components**:
- TripForm: Responsive, accessible, loading states

**Verification**:
- ✓ Mobile responsive (320px+)
- ✓ ARIA labels present
- ✓ Keyboard navigation works
- ✓ Follows design system

**Ready for**:
→ @tester: Verify accessibility and responsiveness
```

See [prompts/agent_ui_design.md](../prompts/agent_ui_design.md) for complete instructions.

---

### 6. 🌐 External Data (Third-Party API Specialist)

**Responsibility**: Integrate external APIs (SendGrid, MapBox, etc.)  
**Scope**: Third-party service integration ONLY  

**What External Data Does**:
- Create API clients for third-party services
- Handle authentication and rate limiting
- Transform external data to internal format
- Implement retry logic and error handling
- Set up webhooks for external events

**What External Data Does NOT Do**:
- ❌ Design internal data models (Architect does this)
- ❌ Write internal APIs (Backend does   this)
- ❌ Write UI components (Frontend/UI/Design do this)
- ❌ Write tests (Tester does this)

**Services**:
- SendGrid (email)
- MapBox (maps, geocoding, routing)
- OpenWeather (weather data)
- Stripe (payments - if needed)

**Implementation Pattern**:
```typescript
// lib/external/sendgrid.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendTripNotification(trip: Trip, email: string) {
  const msg = {
    to: email,
    from: 'notifications@tripplanner.com',
    subject: `Your trip "${trip.title}" is coming up!`,
    text: `Your trip starts on ${trip.startDate}`,
    html: `<strong>Your trip starts on ${trip.startDate}</strong>`,
  };
  
  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('SendGrid error:', error);
    return { success: false, error };
  }
}
```

**Handoff Protocol**:
```markdown
External Data Integration Complete: [Service]

**Client Created**:
- lib/external/sendgrid.ts (email notifications)

**Functions**:
- sendTripNotification(trip, email)
- Handles rate limiting and retries

**Verification**:
- ✓ Successfully sent test email
- ✓ Error handling works

**Ready for**:
→ @backend: Use sendTripNotification in API route
→ @tester: Write integration tests with mocked API
```

See [prompts/agent_external_data.md](../prompts/agent_external_data.md) for complete instructions.

---

### 7. 🧪 Tester (Quality Assurance Specialist)

**Responsibility**: Write comprehensive tests (unit, integration, E2E)  
**Scope**: Testing ONLY - no production code  

**What Tester Does**:
- Write unit tests for functions and components
- Write integration tests for API endpoints
- Write E2E tests for user workflows
- Measure and report test coverage
- Create test fixtures and factories

**What Tester Does NOT Do**:
- ❌ Design features (Architect does this)
- ❌ Implement features (Backend/Frontend do this)
- ❌ Style features (UI/Design does this)
- ❌ Write production code (only test code)

**Tech Stack**:
- Vitest (unit/integration)
- Testing Library (React)
- Playwright (E2E)
- Test database

**Test Types**:
| Type | Purpose | Target Coverage |
|------|---------|----------------|
| Unit | Test individual functions | 80%+ |
| Integration | Test API + database | All endpoints |
| E2E | Test user workflows | Critical paths |

**Implementation Pattern**:
```typescript
// tests/unit/schemas/trip.test.ts
import { describe, it, expect } from 'vitest';
import { tripCreateSchema } from '@/lib/schemas/trip';

describe('tripCreateSchema', () => {
  it('validates a valid trip', () => {
    const result = tripCreateSchema.safeParse({
      title: 'Beach Vacation',
      startDate: '2026-07-01',
      stopDate: '2026-07-07',
    });
    
    expect(result.success).toBe(true);
  });

  it('rejects stop date before start date', () => {
    const result = tripCreateSchema.safeParse({
      title: 'Trip',
      startDate: '2026-07-07',
      stopDate: '2026-07-01',
    });
    
    expect(result.success).toBe(false);
  });
});
```

**Handoff Protocol**:
```markdown
Testing Complete: [Feature]

**Tests Written**:
- Unit: 24 tests (95% coverage)
- Integration: 15 tests (all endpoints)
- E2E: 8 scenarios (critical paths)

**Files**:
- tests/unit/schemas/trip.test.ts
- tests/integration/trips-api.test.ts
- tests/e2e/trip-crud.spec.ts

**Coverage Report**:
- Statements: 85%
- Branches: 78%
- Functions: 82%

**All tests passing** ✓
```

See [prompts/agent_tester.md](../prompts/agent_tester.md) for complete instructions.

---

## Agent Coordination Workflows

### Simple Feature (Single Agent)

```
User → Team Lead → Specialist Agent → Done
```

**Example**: "Style the trip card"
- Team Lead → UI/Design → Styled component delivered

---

### Complex Feature (Sequential)

```
User → Team Lead → Agent 1 → Agent 2 → Agent 3 → Done
```

**Example**: "Add trip update endpoint"
1. Team Lead → Architect (design API contract)
2. Architect → Backend (implement endpoint)
3. Backend → Tester (write tests)

---

### Complex Feature (Parallel)

```
User → Team Lead → Agent 1 ↘
                → Agent 2  → All complete → Done
                → Agent 3 ↗
```

**Example**: "Add email notifications"
1. Team Lead → Architect (design event system) → **Done**
2. Then parallel:
   - External Data (SendGrid client)
   - Backend (notification service)
   - Frontend (preferences UI)
   - UI/Design (notification banner)
3. After all parallel work done:
   - Tester (E2E test flow)

---

### Iteration Pattern

```
Agent A delivers → Team Lead reviews → Issues found?
                                          ├─→ No: Done
                                          └─→ Yes: Agent A fixes → Loop
```

---

## Role Boundaries (Critical)

### Clear Separation of Concerns

| If You Need... | Don't Ask... | Ask Instead... |
|-------|-----------|------------|
| Data model designed | Backend/Frontend | Architect |
| API implemented | Frontend/UI | Backend |
| React logic | Backend/UI | Frontend |
| Styling | Frontend/Backend | UI/Design |
| Third-party API | Backend | External Data |
| Tests | Anyone else | Tester |
| Coordination | Any specialist | Team Lead |

### What Each Agent Does NOT Do

**Team Lead**:
- ❌ NO implementation/design/testing
- ✅ ONLY coordination and decisions

**Architect**:
- ❌ NO code implementation
- ✅ ONLY design and specifications

**Backend**:
- ❌ NO React components
- ❌ NO styling
- ❌ NO external API clients
- ✅ ONLY server-side logic

**Frontend**:
- ❌ NO API endpoints
- ❌ NO styling
- ❌ NO external API clients
- ✅ ONLY client-side logic

**UI/Design**:
- ❌ NO business logic
- ❌ NO data fetching
- ❌ NO API implementation
- ✅ ONLY visual design & UX

**External Data**:
- ❌ NO internal API design
- ❌ NO UI components
- ❌ NO business logic
- ✅ ONLY third-party API integration

**Tester**:
- ❌ NO production code
- ❌ NO design decisions
- ❌ NO feature implementation
- ✅ ONLY test code

---

## Setup Instructions

### Step 1: Verify Agent Prompt Files

Ensure all 7 agent instruction files exist in `prompts/`:

```bash
ls -1 prompts/agent_*.md

# Expected output:
# prompts/agent_team_lead.md
# prompts/agent_architect.md
# prompts/agent_backend.md
# prompts/agent_frontend.md
# prompts/agent_ui_design.md
# prompts/agent_external_data.md
# prompts/agent_tester.md
```

### Step 2: Environment Variables

```bash
# API Keys
export ANTHROPIC_API_KEY=sk-ant-...
export GITHUB_TOKEN=ghp_...

# External Services
export SENDGRID_API_KEY=SG....
export MAPBOX_TOKEN=pk....
export OPENWEATHER_API_KEY=...

# Project Context
export PROJECT_ROOT=/opt
export DATABASE_URL=postgresql://localhost/trip_planner
```

### Step 3: Test Agent Routing

Test that Team Lead can delegate to specialists:

```bash
# Test architecture delegation
@copilot Design the waypoint data model
# Expect: Team Lead → Architect → Design doc

# Test backend delegation
@copilot Implement POST /api/waypoints
# Expect: Team Lead → Backend → API route

# Test UI delegation
@copilot Style the waypoint card
# Expect: Team Lead → UI/Design → Styled component

# Test external data delegation
@copilot Integrate MapBox routing API
# Expect: Team Lead → External Data → API client

# Test tester delegation
@copilot Write E2E tests for waypoint creation
# Expect: Team Lead → Tester → Test suite
```

### Step 4: Verify Boundaries

Ensure agents stay in their lane:

```bash
# This should NOT have Backend agent write React components
@backend Implement trip form
# Expect: Backend refuses, suggests Frontend agent

# This should NOT have Frontend agent style
@frontend Build styled trip card
# Expect: Frontend builds logic, suggests UI/Design for styling

# This should NOT have Architect implement
@architect Implement the trip data model
# Expect: Architect refuses, provides design then suggests Backend
```

---

## Using the System

### VS Code Agent Mode (Recommended)

Use **Copilot agent mode** (Ctrl+Shift+I or `@workspace` toggle) for the richest experience. Agent mode gives all subagents access to:
- `@workspace` — codebase search and navigation
- `@terminal` — shell command execution
- `@browser` — live app interaction and visual verification
- **MCP servers** — external tool integration
- **Copilot Extensions** — installed plugin capabilities

**Request to Team Lead** (most common):
```
Add a feature to geocode trip destinations

→ Team Lead analyzes:
   1. External Data: MapBox geocoding client
   2. Backend: Store lat/lon in database
   3. Frontend: Display coordinates
   4. UI/Design: Show map preview
   5. Tester: Test geocoding flow

→ Team Lead delegates, each agent uses agent mode tools:
   - @external-data uses @browser to read MapBox API docs
   - @backend uses @terminal to run migrations and type-check
   - @frontend uses @browser to verify component in live app
   - @ui-design uses @browser to check responsive layouts
   - @tester uses @terminal to run test suites
```

**Direct to Specialist** (when you know exactly what's needed):
```
@architect Design the waypoint data model
@backend Implement GET /api/waypoints
@frontend Add waypoint list component
@ui-design Style the waypoint card
@external-data Integrate MapBox routing
@tester Write E2E test for waypoint flow
```

### MCP Server Configuration

Add MCP servers to VS Code settings for enhanced agent capabilities:

```jsonc
// .vscode/settings.json
{
  "mcp.servers": {
    "database": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-postgres", "postgresql://localhost:5432/trip_planner_db"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-github"],
      "env": { "GITHUB_TOKEN": "${env:GITHUB_TOKEN}" }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-filesystem", "/opt"]
    }
  }
}
```

### CLI (if implemented)

```bash
# Team Lead routes automatically
python -m agentic_se run "Add dark mode toggle"

# Direct to specialist
python -m agentic_se run "Style trip form" --agent ui-design
python -m agentic_se run "Implement trip API" --agent backend
```

---

## Best Practices

### ✅ Do's

- ✅ **Start with Team Lead** for complex features
- ✅ **Use specialists directly** when you know exactly what's needed
- ✅ **Respect boundaries** - don't ask Backend to style
- ✅ **Wait for handoffs** - Architect finishes before Backend starts
- ✅ **Verify deliverables** - Check that agent delivered what was expected
- ✅ **Track progress** - Team Lead tracks all specialist work

### ❌ Don'ts

- ❌ **Don't ask wrong specialist** - Frontend doesn't write APIs
- ❌ **Don't skip Architect** - Design before implementation
- ❌ **Don't mix concerns** - Styling belongs to UI/Design only
- ❌ **Don't skip testing** - Tester verifies all features
- ❌ **Don't let Team Lead implement** - Team Lead coordinates only

---

## Troubleshooting

### Agent Doing Wrong Work

**Problem**: Backend agent is adding Tailwind classes

**Solution**:
1. Stop the agent
2. Review agent instructions: `prompts/agent_backend.md`
3. Verify "What You Do NOT Do" section includes styling
4. Re-delegate to UI/Design agent

### Unclear Delegation

**Problem**: Team Lead doesn't know which agent to use

**Solution**:
1. Be more specific in request
2. Mention technical details (e.g., "API endpoint", "styling", "data model")
3. Reference files (e.g., "in app/api/trips/route.ts")

### Handoff Issues

**Problem**: Frontend starts before Backend finishes API

**Solution**:
1. Team Lead should enforce sequential dependencies
2. Check the Architect's design for dependency order
3. Wait for explicit handoff notification

---

## Migration from Old Agent System

If you're coming from the old 6-agent system (Planner, Implementer, Reviewer, Test, Documentation, DevOps):

### Mapping Old → New

| Old Agent | Maps To | Notes |
|-----------|---------|-------|
| Planner | Architect + Team Lead | Architecture design + coordination |
| Implementer | Backend + Frontend + UI/Design | Split by technology layer |
| Reviewer | (Removed) | Quality verification moved to Tester |
| Test | Tester | Same, but more comprehensive |
| Documentation | (Deprecated) | Agents document as they work |
| DevOps | (Deprecated) | Infrastructure as code in repo |

### New Agents

| New Agent | Purpose |
|-----------|---------|
| External Data | Dedicated third-party API integration |
| UI/Design | Separated visual design from logic |
| Team Lead | Explicit coordination role |

---

## Example: Complete Feature

**Feature**: "Add waypoint support to trips"

### Step 1: Team Lead Receives Request

```
User: "Add waypoint support so users can add stops along their trip route"

Team Lead Analysis:
- Architecture needed (waypoint data model, relationship to trips)
- Backend work (waypoint CRUD API)
- MapBox integration (routing between waypoints)
- Frontend (waypoint list, add waypoint form)
- UI/Design (waypoint card styling, map markers)
- Testing (E2E waypoint creation flow)
```

### Step 2: Architect Designs

```markdown
→ @architect Design waypoint data model and API

Architect Delivers:
**Data Model**:
- Entity: Waypoint
  - id: uuid (PK)
  - tripId: uuid (FK → Trip)
  - order: integer
  - location: string
  - lat: float
  - lon: float
  - createdAt: timestamp

**API Contracts**:
- POST /api/trips/:tripId/waypoints
  Request: { location, lat, lon }
  Response: { id, tripId, order, location, lat, lon }
- GET /api/trips/:tripId/waypoints
  Response: Waypoint[]

**Relationships**:
- Trip hasMany Waypoints
- Waypoints ordered by `order` field
```

### Step 3: Parallel Implementation

```markdown
→ @backend Implement waypoint CRUD API
→ @external-data Create MapBox routing client

**Backend Delivers**:
- app/api/trips/[tripId]/waypoints/route.ts (GET, POST)
- prisma/schema.prisma (Waypoint model)
- lib/services/waypoint.ts (business logic)

**External Data Delivers**:
- lib/external/mapbox.ts (routing API client)
- Functions: getRoute(waypoints), geocode(location)
```

### Step 4: Frontend + UI

```markdown
→ @frontend Build waypoint list and add form
→ @ui-design Style waypoint components

**Frontend Delivers**:
- src/components/WaypointList.tsx (logic)
- src/components/AddWaypointForm.tsx (logic)
- src/hooks/useWaypoints.ts (API calls)

**UI/Design Delivers**:
- Styled WaypointList (Tailwind classes)
- Styled AddWaypointForm (responsive, accessible)
- Waypoint card design
```

### Step 5: Testing

```markdown
→ @tester Write comprehensive tests for waypoints

**Tester Delivers**:
- tests/unit/services/waypoint.test.ts (business logic)
- tests/integration/waypoints-api.test.ts (API + DB)
- tests/e2e/waypoint-flow.spec.ts (user creates waypoints)
- Coverage: 88%
```

### Step 6: Team Lead Reports

```markdown
Feature Complete: Waypoint Support

**Delivered by**:
- Architect: Data model and API design ✓
- Backend: CRUD API with database ✓
- External Data: MapBox routing client ✓
- Frontend: Waypoint list and form ✓
- UI/Design: Styled components ✓
- Tester: Comprehensive test suite (88% coverage) ✓

**Ready for production**
```

---

## Metrics and Observability

### Track Agent Performance

```bash
# Which agent worked on each file?
git log --pretty=format:"%h %an %s" | grep "agent"

# How many handoffs per feature?
# (Count agent transitions in commit messages)

# Average time per agent type?
# (Track timestamps in agent handoff messages)
```

### Success Metrics

| Metric | Target | Why |
|--------|--------|-----|
| Boundary violations | 0 | Agents stay in lane |
| Handoff clarity | 100% | Clear deliverables |
| Rework rate | <10% | Good design upfront |
| Test coverage | >80% | Quality assurance |
| Parallel efficiency | >50% | Work simultaneously |

---

## References

- **Agent Prompt Files**: `/opt/prompts/agent_*.md`
- **Quick Start Guide**: `/opt/.github/copilot-instructions.md`
- **Backlog Management**: `/opt/docs/BACKLOG-MANAGEMENT-CONVENTIONS.md`
- **VS Code Agent Mode Docs**: https://code.visualstudio.com/docs/copilot/chat/agents
- **MCP Server Docs**: https://modelcontextprotocol.io/

---

**Questions?** Ask Team Lead (the primary agent coordinating your work).

**Last Updated**: March 6, 2026 | **Version**: 4.0 - Agent Mode + MCP + Browser Tools