# Trip Planner — AI Agent Instructions

> **Single source of truth.** Both GitHub Copilot and Claude Code read this file.
> Edit here; both agents pick up the change automatically.

---

## Project

**EPIC-001**: Web map-based road trip planner.
Users create trips with date ranges, then add per-day destinations that appear on a Leaflet map.
Features include multi-provider routing (OSRM, ORS, Google, Mapbox), distance-based waypoint generation, nearby place search (OSM/Overpass, Google, Park4Night, Tripadvisor, Foursquare), geocoding, and a settings page for API keys and preferences.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4 |
| Language | TypeScript 5 (strict) |
| Validation | Zod |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 (Docker) |
| Graph cache | Neo4j 5 (Docker) — places, geocoding, nearby search |
| Unit tests | Vitest |
| E2E tests | Playwright |
| Linting | ESLint + Prettier |

---

## Repository Layout

```
app/                            # Next.js App Router (routing only)
├── api/
│   ├── trips/                  # CRUD /api/trips, /api/trips/:id
│   ├── daily-destinations/     # CRUD /api/daily-destinations
│   ├── daily-pois/             # CRUD /api/daily-pois
│   ├── route-segments/         # Route generation and management
│   ├── route-waypoints/        # Waypoint CRUD and drag updates
│   ├── nearby-search/
│   │   ├── route.ts            # OSM/Overpass + Google Places nearby search
│   │   ├── cached/route.ts     # Neo4j cache-only search
│   │   ├── park4night/route.ts # Park4Night nearby search
│   │   ├── tripadvisor/route.ts# Tripadvisor nearby search
│   │   └── foursquare/route.ts # Foursquare Places API v3 search
│   ├── geocode/                # Nominatim geocoding with Neo4j cache
│   ├── map-config/             # Map provider + tile config
│   └── settings/               # Key-value settings API
├── layout.tsx                  # Root layout — imports src/app/globals.css
├── map/page.tsx                # Re-export from src/app/map/page.tsx
├── settings/page.tsx           # Re-export from src/app/settings/page.tsx
└── page.tsx                    # Landing / redirect

src/app/
├── globals.css                 # Design system + Tailwind v4 @theme tokens
├── map/
│   ├── page.tsx                # Map page shell (Leaflet + sidebar)
│   └── components/
│       ├── TripForm.tsx
│       ├── TripList.tsx
│       ├── TripDetail.tsx
│       ├── DailyDestinations.tsx
│       ├── MapContextMenu.tsx      # Right-click context menu on map
│       ├── NearbySearchModal.tsx   # OSM/Google category picker
│       ├── TripadvisorSearchModal.tsx
│       ├── FoursquareSearchModal.tsx
│       └── StatusBar.tsx           # Status messages with history dropdown
└── settings/
    ├── page.tsx                # Settings page (API keys, preferences)
    └── components/
        ├── HomeForm.tsx
        ├── RoutingProviderForm.tsx
        ├── TripadvisorSettingsForm.tsx
        └── FoursquareSettingsForm.tsx

src/lib/
├── schemas/
│   ├── trip.ts                 # Trip + DailyDestination Zod schemas
│   ├── routing.ts              # Route segment/waypoint schemas
│   └── geocoding.ts            # Geocoding schemas
├── routing/
│   ├── index.ts                # Provider router (selects OSRM/ORS/Google/Mapbox)
│   ├── types.ts                # Routing types
│   ├── waypoints.ts            # Distance-based waypoint generation
│   ├── osrm.ts                 # OSRM provider
│   ├── ors.ts                  # OpenRouteService provider
│   ├── google.ts               # Google Directions provider
│   └── mapbox.ts               # Mapbox Directions provider
├── geocoding/
│   ├── index.ts                # Cache-first geocoding
│   ├── nominatim.ts            # Nominatim API
│   └── graph.ts                # Neo4j geocoding cache
├── nearby/
│   ├── types.ts                # NearbyPlace type
│   └── graph.ts                # Neo4j place cache (search + store)
├── settings.ts                 # Setting keys + get/upsert helpers
├── neo4j.ts                    # Neo4j driver singleton + constraints
└── prisma.ts                   # Prisma client singleton

prisma/
├── schema.prisma               # Data models (6 models)
└── migrations/                 # Applied migrations (never edit manually)

scripts/
├── dev-server.sh               # Dev server lifecycle (start/stop/restart/status/logs)
├── docker-services.sh          # PostgreSQL + Neo4j container management
├── after-prisma.sh             # PostToolUse hook — auto-restarts dev server after Prisma commands
└── test-e2e-docker.sh          # E2E tests in Docker

tests/
└── unit/                       # Vitest unit tests
```

---

## Data Models

Six Prisma models in `prisma/schema.prisma`. See the file for full definitions.

| Model | Table | Purpose |
|---|---|---|
| `Trip` | `trips` | Trip with date range and plan mode toggle |
| `DailyDestination` | `daily_destinations` | One destination per trip day (unique on tripId+dayDate) |
| `RouteSegment` | `route_segments` | Route leg between consecutive day destinations (polyline, distance, duration) |
| `RouteWaypoint` | `route_waypoints` | Auto-generated or manually-dragged waypoints along a route segment |
| `DailyPoi` | `daily_pois` | User-defined points of interest for a trip day |
| `Setting` | `settings` | Key-value settings store (API keys, preferences) |

### Neo4j graph (non-Prisma)

Neo4j stores cached places and geocoding results. Managed via `src/lib/neo4j.ts` + `src/lib/nearby/graph.ts` + `src/lib/geocoding/graph.ts`.

| Node label | Purpose |
|---|---|
| `Place` | Cached nearby places (all providers). Key: `placeId` (prefixed: `osm:`, `gp:`, `p4n:`, `ta:`, `fs:`) |
| `GeoSearch` | Cached geocoding results with 7-day TTL |

---

## External API Providers

### Nearby Search Providers

| Provider | Route | Auth | Place ID prefix | Notes |
|---|---|---|---|---|
| OSM/Overpass | `nearby-search/route.ts` | None (public) | `osm:` | Free, no key needed |
| Google Places | `nearby-search/route.ts` | `google.api_key` setting | `gp:` | Paid per request |
| Park4Night | `nearby-search/park4night/route.ts` | None (public) | `p4n:` | No radius param; client-side filtering |
| Tripadvisor | `nearby-search/tripadvisor/route.ts` | `tripadvisor.api_key` query param | `ta:` | 5k free/month; details endpoint for coords |
| Foursquare | `nearby-search/foursquare/route.ts` | `Bearer` header + `X-Places-Api-Version` | `fs:` | 10k free/month on Pro-tier fields only |

**Important Foursquare notes:**
- Base URL: `places-api.foursquare.com` (not `api.foursquare.com/v3` — that's deprecated)
- Auth: `Authorization: Bearer <key>` (not raw key)
- Must include `X-Places-Api-Version: 2025-06-17` header
- Only request Pro-tier fields (`fsq_place_id`, `name`, `latitude`, `longitude`, `location`, `categories`, `tel`, `website`). Premium fields (`rating`, `hours`, `photos`, `tips`) bill at a higher rate with no free tier.
- No public venue detail pages — link to user's configured map provider instead

### Settings Keys (`src/lib/settings.ts`)

| Key | Purpose |
|---|---|
| `map.provider` | Map tile provider (osm, google, mapbox) |
| `routing.provider` | Routing engine (osrm, ors, google, mapbox) |
| `home.latitude` / `home.longitude` | Default map center |
| `google.api_key` | Google Maps + Places API key |
| `mapbox.access_token` | Mapbox access token |
| `tripadvisor.api_key` | Tripadvisor Content API key |
| `foursquare.api_key` | Foursquare Places API service key |

Sensitive keys (matching `*api_key*` or `*access_token*`) are redacted as `[SET]` in GET responses.

---

## API Conventions

- All routes are in `app/api/` — Next.js App Router `route.ts` files.
- Parse + validate every request body with the shared Zod schema from `src/lib/schemas/`.
- On validation error return `400` with `{ error: "Validation failed", issues: ZodError.flatten() }`.
- On not-found return `404` with `{ error: "Not found" }`.
- On unexpected error return `500` with `{ error: "Internal server error" }`.
- **Forward upstream HTTP status codes** — when a third-party API returns 401/403/429, propagate that status to the client. Never mask auth/rate-limit errors behind `200`.
- Never expose raw Prisma errors or stack traces in responses.
- Use `prisma` from `src/lib/prisma.ts` — never construct a new `PrismaClient` inline.
- **Always add timeouts to external fetch calls** — use `signal: AbortSignal.timeout(N)` to prevent indefinite hangs. Use 10s for geocoding/search, 5s for lightweight lookups.
- **Guard `JSON.parse()` calls** on data from external sources (Neo4j properties, third-party API responses, batch result lines). Wrap in try-catch or use Zod `.safeParse()`.
- Avoid `as any` — use `as Record<string, unknown>` or define proper TypeScript interfaces for external API response shapes.

---

## Validation (Zod)

- All schemas live in `src/lib/schemas/`.
- Schemas are used on both the client (form validation) and the server (API validation).
- `stopDate` must be ≥ `startDate` — enforce with `.refine()`, not ad-hoc checks.
- Use `.transform()` to normalise data once at the boundary; do not re-validate inside components.

---

## Design System

CSS custom properties are defined in `src/app/globals.css`.
**Custom color palettes are registered as Tailwind v4 design tokens via `@theme`** — this generates the utility classes.

| Token prefix | Usage | Example class |
|---|---|---|
| `primary` | Warm terracotta brand color | `text-primary-600`, `bg-primary-500` |
| `neutral` | Warm grays (overrides Tailwind built-in) | `text-neutral-700`, `bg-neutral-100` |
| `error` | Destructive actions | `text-error-600` |
| `success` | Confirmation / complete | `text-success-600` |
| `warning` | Alerts | `text-warning-600` |
| `info` | Informational | `text-info-600` |

**Rules:**
- Always use design-system color tokens — never hard-code hex values in component classes.
- `text-neutral-*`, `bg-neutral-*`, etc. use the warm-gray override, not Tailwind's default cool grays.
- Dark mode is intentionally omitted. All container backgrounds use `bg-white` explicitly. Do not add `dark:` variants until container backgrounds are updated.

---

## Status Bar

The map page header subtitle doubles as a status bar (`src/app/map/components/StatusBar.tsx`). Use it for user-facing feedback from async operations:

```tsx
statusBarRef.current?.pushStatus('Found 12 places via Foursquare');
statusBarRef.current?.pushStatus('Search failed', errorJson);  // with detail
```

- Messages crossfade over the default subtitle, auto-dismiss after 10 seconds
- Clicking the subtitle opens a reverse-chronological history dropdown
- Clicking a history entry shows a detail popup (useful for error diagnostics)
- All search handlers already wire into this — follow the same pattern for new providers

---

## TypeScript

- `strict: true` is enabled — no `any`, no non-null assertions (`!`) without a comment explaining why.
- Path alias `@/*` maps to `src/*`.
- All API response types should be explicitly typed — do not rely on inference from Prisma return values alone.
- When adding a new Prisma model, run `npx prisma generate` to regenerate the client.

---

## Testing

### Unit tests (Vitest)
- Location: `tests/unit/`
- Run: `npm test`
- Test Zod schemas, utility functions, and pure business logic.
- Do not test Next.js internals or Prisma directly in unit tests.

### E2E tests (Playwright)
- Run: `npm run test:e2e` (local) or `npm run test:e2e:docker` (Docker)
- Test full user flows through the browser.
- Use `data-testid` attributes for stable selectors — do not target CSS classes.

### Before every commit
```bash
npm test && npm run type-check && npm run lint
```

---

## Dev Server

**Node.js requirement:** Next.js 16 requires Node.js ≥20. The system node on this machine is v18 (too old). The correct version is Node.js 22 via nvm.

**Always manage the dev server through the script** — never call `npm run dev` or invoke Next.js directly from an agent, because the wrong Node.js version may be picked up:

```bash
scripts/dev-server.sh start    # start with correct Node.js
scripts/dev-server.sh stop     # stop gracefully
scripts/dev-server.sh restart  # stop + start
scripts/dev-server.sh status   # check if running (shows PID + Node version)
scripts/dev-server.sh logs     # tail /tmp/nextjs-dev.log
```

Log file: `/tmp/nextjs-dev.log`
PID file: `/tmp/nextjs-dev.pid`

**Mandatory restart triggers** — the Prisma client singleton is cached in the running server's memory; it must be reloaded when:

| Event | Action |
|---|---|
| `prisma migrate dev/deploy` | Restart (hook does this automatically) |
| `prisma generate` | Restart (hook does this automatically) |
| `prisma db push` | Restart (hook does this automatically) |
| `.env` / `.env.local` changed | `scripts/dev-server.sh restart` |
| npm package installed/upgraded | `scripts/dev-server.sh restart` |

The `~/.claude/settings.json` PostToolUse hook (`scripts/after-prisma.sh`) handles the Prisma cases automatically. For the other triggers, restart explicitly.

---

## Database

### PostgreSQL (Prisma)
- Start services: `scripts/docker-services.sh start`
- Apply migrations: `npx prisma migrate dev --name <description>`  ← **triggers auto-restart via hook**
- Regenerate client only: `npx prisma generate`  ← **triggers auto-restart via hook**
- Browse data: `npx prisma studio`
- Never hand-edit files in `prisma/migrations/`.

### Neo4j (Graph cache)
- Runs alongside PostgreSQL via `scripts/docker-services.sh`
- Connection: `bolt://localhost:7687`, credentials in `.env.local` (`NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`)
- Driver singleton: `src/lib/neo4j.ts`
- Used for: nearby place caching (`src/lib/nearby/graph.ts`), geocoding cache (`src/lib/geocoding/graph.ts`)
- Constraints created automatically on first use via `ensureConstraints()`
- To inspect data: open Neo4j Browser at `http://localhost:7474`

---

## Backlog

The product backlog lives at `/opt/backlog/` (outside the web repo). All agents must read and update it when working on tasks.

```
/opt/backlog/
├── epics/          # High-level initiatives (EPIC-001, EPIC-002, ...)
├── stories/        # User stories with acceptance criteria (STORY-NNN)
├── tasks/          # Implementation tasks (TASK-NNN-short-name.md)
├── tracking/       # Epic progress tracking (EPIC-NNN-tracking.md)
├── architecture/   # ADRs and technical design notes
└── research/       # Discovery notes and benchmarks
```

### Rules
- **Before starting work**: check if a task exists in `tasks/`. If not, create one.
- **After completing work**: update the task status to `complete`, check all DoD items, and update the relevant `tracking/EPIC-NNN-tracking.md`.
- **Task naming**: `TASK-NNN-short-description.md` with sequential numbering. Current highest: TASK-054.
- **Status values**: `planned`, `in-progress`, `complete`, `blocked`
- **Commit messages** reference the task: `[EPIC-001] TASK-053: Fix Foursquare API auth`

---

## Commit Convention

```
[EPIC-001] TASK-XXX: Short imperative summary

Optional longer explanation if the change is non-obvious.
```

Example: `[EPIC-001] TASK-007: Add latitude/longitude fields to DailyDestination`

---

## Common Commands

```bash
# Dev server (agents must use the script, not npm run dev)
scripts/dev-server.sh start    # start with correct Node.js ≥20
scripts/dev-server.sh restart  # restart (required after Prisma changes)
scripts/dev-server.sh status   # check running state
scripts/dev-server.sh logs     # tail /tmp/nextjs-dev.log

# Build & quality
npm run build         # Production build
npm run type-check    # tsc --noEmit
npm run lint          # ESLint
npm run format        # Prettier

# Tests
npm test              # Vitest unit tests
npm run test:e2e      # Playwright E2E

# Database (agents must use the script, not docker-compose directly)
scripts/docker-services.sh start    # start PostgreSQL + Neo4j
scripts/docker-services.sh restart  # restart containers
scripts/docker-services.sh status   # check container state + health
npx prisma studio                   # PostgreSQL GUI (http://localhost:5555)

# Neo4j
# Browser: http://localhost:7474
# Cypher shell (from host): docker exec -it trip-planner-neo4j cypher-shell -u neo4j -p <password>
```
