# Architecture Note: ARCH-007 UI mode architecture (PLAN, RUN, SETUP)

## Context
The application needs a clear UI operating model that separates concerns across:
- **PLAN mode**: planning future trips
- **RUN mode**: day-to-day replanning while traveling
- **SETUP mode**: global, stable configuration not tied to a single trip

Without explicit mode boundaries, features such as weather-aware replanning, event recording, scoring, and global credentials/settings can become mixed and difficult to evolve.

## Decision
Adopt a top-level UI architecture with three explicit modes: `PLAN`, `RUN`, and `SETUP`.

### Mode responsibilities

#### PLAN mode (future trip design)
Purpose: Build and refine a future itinerary.
- Create/edit trips and date ranges
- Select destinations and candidate stops
- Generate and adjust planned routes/waypoints
- Evaluate candidate stays and ranking before departure
- Use historical graph context (visited places, prior routes)

#### RUN mode (in-trip daily operations)
Purpose: Replan and adapt day-by-day during active travel.
- Daily route replanning with real-time constraints
- Event recording (delays, incidents, detours, closures, notes)
- Day/session scoring (route quality, comfort, success criteria)
- Weather-aware decisions (route/stay impact and risk flags)
- Operational timeline updates for the active trip day

#### SETUP mode (global configuration)
Purpose: Manage stable account/application settings reused across trips.
- Vehicle profiles and defaults
- Global preferences (units, risk tolerance, optimization preferences)
- API keys/credentials and provider toggles
- AI model/runtime preferences (Ollama model selection and limits)
- Source refresh policy defaults (TTL overrides, refresh windows)

### UI structure and routing
Use mode-first routing in the web app:
- `/plan/*`
- `/run/*`
- `/setup/*`

Core navigation:
- Global mode switcher in app shell
- Mode-specific side navigation
- Shared top bar for trip context and sync/health indicators

### Domain ownership by mode
- PLAN owns itinerary authoring and pre-trip optimization workflows.
- RUN owns operational state for the current day (actuals vs plan).
- SETUP owns reusable global configuration and secure credentials.

### Data boundaries
- **Trip-scoped data**: plan drafts, day plans, run-day events, day scores
- **Global data**: vehicles, API credentials, provider settings, unit preferences
- **Graph/knowledge data**: places, routes, cache freshness, historical relationships

### Security and credential handling
- Credentials are configured only in SETUP mode.
- Secrets are never returned raw to client views after initial save.
- Provider health/status can be displayed, but secret values remain masked.

### Weather integration policy
- Weather ingestion feeds RUN mode first (operational impact).
- PLAN mode can use weather normals/climatology as advisory, not hard constraints.
- Weather-influenced decisions are logged as events in RUN mode for later analysis.

### Scoring model (initial)
RUN mode scoring is day-centric and append-only:
- `navigation_score`
- `comfort_score`
- `reliability_score`
- `overall_day_score`
- optional `notes` and `evidence` links (weather/event references)

Scores support retrospective learning and can inform future PLAN recommendations.

### AI integration by mode (ARCH-006)
- PLAN: itinerary suggestions, place extraction, tradeoff analysis
- RUN: replanning suggestions based on weather/events and current progress
- SETUP: model/provider diagnostics and policy tuning

### Graph integration by mode (ARCH-005)
- PLAN: retrieve prior visited places and related routes
- RUN: fetch nearest proven alternatives under current constraints
- SETUP: configure cache freshness defaults and refresh strategies

## Alternatives considered
- Single unified workflow without modes: simpler navigation, weaker clarity and ownership.
- Trip-only architecture without global setup area: duplicates settings per trip and increases drift.
- Merge PLAN and RUN into one mode: reduces context switch but hurts operational focus during travel.

## Consequences

### Benefits
- Clear UX boundaries and reduced feature coupling
- Better operational reliability during active trips (RUN focus)
- Cleaner handling of credentials and global preferences (SETUP)
- Easier prioritization and roadmap slicing per mode

### Tradeoffs
- More explicit routing and state management required
- Cross-mode handoff logic needed (PLAN → RUN activation)
- Additional documentation/testing for mode transitions

## Follow-ups
- Define trip lifecycle transition: `draft -> planned -> active -> completed`.
- Add run-day event schema and scoring persistence model.
- Add weather provider abstraction and fallback strategy.
- Add setup secret storage policy (encrypted at rest + masking in UI).
- Map existing stories/tasks to mode ownership for backlog clarity.

## Related architecture notes
- [ARCH-001: Trip date model](ARCH-001-trip-date-model.md)
- [ARCH-002: PLAN mode routing and waypoints](ARCH-002-plan-mode-routing-and-waypoints.md)
- [ARCH-003: Vehicle profile and trip assignment](ARCH-003-vehicle-profile-and-trip-assignment.md)
- [ARCH-004: Stay discovery and assignment](ARCH-004-stay-discovery-ranking-and-assignment.md)
- [ARCH-005: Graph database for places and caching](ARCH-005-graph-database-for-places-and-caching.md)
- [ARCH-006: Ollama-based AI integration](ARCH-006-ollama-ai-integration.md)
