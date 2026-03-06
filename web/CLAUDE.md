# Claude Code — Trip Planner

@.github/copilot-instructions.md

---

## Claude-specific notes

### After editing CSS or Tailwind config
Run the dev server and confirm the compiled CSS contains the expected utility classes before declaring the fix complete. The `.next/dev/static/chunks/` files show what Tailwind actually generated.

### After editing Prisma schema
Run `npx prisma migrate dev --name <description>` (or `npx prisma generate` for schema-only changes), then **restart the dev server** so it picks up the regenerated Prisma client.

### Dev server management
The project requires Node.js ≥20 (system node is v18 — too old). Always manage the dev server through the provided script, not `npm run dev` directly:

```bash
scripts/dev-server.sh start    # start with correct Node.js version
scripts/dev-server.sh stop     # stop gracefully
scripts/dev-server.sh restart  # stop + start (needed after Prisma changes)
scripts/dev-server.sh status   # check if running
scripts/dev-server.sh logs     # tail /tmp/nextjs-dev.log
```

**When a restart is required:**
- After any `prisma migrate` or `prisma generate` command — the Prisma client singleton is cached in the running server's module cache and must be reloaded
- After changing `.env.local` or `.env`
- After installing or upgrading npm packages

The `~/.claude/settings.json` PostToolUse hook (`scripts/after-prisma.sh`) handles the Prisma case automatically. For the others, run `scripts/dev-server.sh restart` explicitly.

### Docker services management
Manage PostgreSQL and Neo4j containers through the provided script, not `docker-compose` directly:

```bash
scripts/docker-services.sh start    # start containers, wait for healthy
scripts/docker-services.sh stop     # stop containers
scripts/docker-services.sh restart  # stop + start
scripts/docker-services.sh status   # check container state + health
```

The script detects `docker compose` vs `docker-compose`, verifies the Docker daemon is running, checks container health after start, and prints last log lines on failure — so agents get actionable error messages instead of silent failures.

### Prefer targeted edits
Read the file before modifying it. Make the minimal change that satisfies the requirement — do not refactor surrounding code, add comments, or introduce abstractions beyond what was asked.

### Backlog management
The product backlog is at `/opt/backlog/` (outside the web repo). Before starting work, check for an existing task. After completing work, update the task status and the relevant epic tracking file. See the Backlog section in `.github/copilot-instructions.md` for structure and rules.

### Adding a new nearby search provider
Follow the established pattern:
1. Add API key to `SETTING_KEYS` in `src/lib/settings.ts`
2. Create settings form in `src/app/settings/components/`
3. Create API route in `app/api/nearby-search/<provider>/route.ts` — use Neo4j two-phase cache pattern
4. Create category picker modal in `src/app/map/components/`
5. Add button to `MapContextMenu.tsx` (conditional on key being configured)
6. Wire in `page.tsx`: state, handlers, markers, popup badge, status bar messages
7. Use the status bar (`statusBarRef.current?.pushStatus(...)`) for user feedback

### Known environment constraints
- `crypto.randomUUID()` is unavailable in HTTP (insecure) dev contexts — use `Date.now() + Math.random()` for client-side IDs
- The dev server runs on HTTP (not HTTPS) — some Web APIs may be unavailable
- Foursquare Places API uses `places-api.foursquare.com` (not `api.foursquare.com/v3`) with `Bearer` auth and a required `X-Places-Api-Version` header
