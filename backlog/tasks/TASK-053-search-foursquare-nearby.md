# Task: TASK-053 Search Foursquare nearby places

## Metadata
- **Priority**: P2
- **Status**: complete

## Goal
Add a "Search Foursquare" option to the map context menu, allowing users to find nearby places via the Foursquare Places API v3. Results appear as markers on the map with Foursquare branding. The API key is managed through the Settings page.

## Implementation notes

### Foursquare Places API (new endpoint)
- **Base URL**: `https://places-api.foursquare.com`
- **Auth**: `Authorization: Bearer <SERVICE_KEY>` header
- **Required header**: `X-Places-Api-Version: 2025-06-17`
- **Search endpoint**: `GET /places/search`
- **Parameters**: `ll`, `radius`, `limit`, `fields`, `categories`
- **Pricing**: Pro-tier fields are free up to 10k calls/month. Premium fields (`rating`, `hours`, `photos`, `tips`, `stats`) cost extra and must be avoided on the free tier.
- **Pro-tier fields used**: `fsq_place_id`, `name`, `latitude`, `longitude`, `location`, `categories`, `tel`, `website`

### Key differences from old API (api.foursquare.com/v3)
- Base URL changed from `api.foursquare.com/v3` to `places-api.foursquare.com`
- Auth changed from `Authorization: <key>` to `Authorization: Bearer <key>`
- Version header `X-Places-Api-Version` is required
- `fsq_id` renamed to `fsq_place_id`
- `geocodes.main.latitude/longitude` moved to top-level `latitude`/`longitude`
- No public venue detail pages exist — Foursquare results link to the user's configured map provider (Google Maps or OpenStreetMap) instead

### Components created/modified
- `src/app/settings/components/FoursquareSettingsForm.tsx` — API key management
- `app/api/nearby-search/foursquare/route.ts` — API route with Neo4j caching
- `src/app/map/components/FoursquareSearchModal.tsx` — category picker modal
- `src/app/map/components/MapContextMenu.tsx` — added "Search Foursquare" button
- `src/app/map/page.tsx` — wired Foursquare search handlers, markers, popup
- `src/lib/settings.ts` — added `FOURSQUARE_API_KEY` to `SETTING_KEYS`

### Category mapping
- food: 13000 (Dining and Drinking)
- hotels: 19014 (Hotels and Motels)
- outdoors: 16000 (Landmarks and Outdoors)
- shopping: 17000 (Retail)

## Definition of done
- [x] `foursquare.api_key` added to `SETTING_KEYS`
- [x] `FoursquareSettingsForm` component created and rendered on Settings page
- [x] API key saveable, loadable, and redacted in GET response
- [x] `app/api/nearby-search/foursquare/route.ts` created with Zod validation
- [x] Nearby search calls Foursquare Places API with correct auth (Bearer token + version header)
- [x] Only Pro-tier fields requested (avoids Premium billing)
- [x] Results mapped to `NearbyPlace[]` and cached in Neo4j
- [x] `FoursquareSearchModal` component created (category picker)
- [x] "Search Foursquare" button added to `MapContextMenu` (conditional on key configured)
- [x] Map page wired: context menu -> modal -> API call -> markers on map
- [x] Foursquare-styled markers rendered on map (blue FS circle)
- [x] Selected-place popup shows Foursquare badge and links to configured map provider
- [x] Graceful handling: no key configured (button hidden), API errors (status bar message), rate limit 429 (user-facing message)
- [x] Status bar integration for search feedback

## Links
- Related: [TASK-052](TASK-052-search-tripadvisor-nearby.md) (same pattern, Tripadvisor)
- Related: [TASK-050](TASK-050-configurable-nearby-search-radius-cap.md) (radius cap applies)
- Related: [TASK-054](TASK-054-status-bar-with-history.md) (status bar used for search feedback)
- Pattern: `app/api/nearby-search/tripadvisor/route.ts`
- Foursquare developer portal: https://location.foursquare.com/developer/
- Foursquare migration guide: https://docs.foursquare.com/fsq-developers-places/reference/migration-guide
