# Task: TASK-052 Search Tripadvisor nearby places

## Metadata
- **Priority**: P2
- **Status**: complete

## Goal
Add a "Search Tripadvisor" option to the map context menu, allowing users to find nearby hotels, restaurants, and attractions via the Tripadvisor Content API. Results appear as markers on the map with Tripadvisor branding, ratings, and a direct link to the Tripadvisor listing. The API key is managed through the existing Settings page.

## Tripadvisor Content API reference

- **Base URL**: `https://api.content.tripadvisor.com/api/v1/`
- **Auth**: query parameter `key` (not a header)
- **Nearby search endpoint**: `GET /location/nearby_search`
- **Parameters**:
  - `latLong` (required): `"lat,lng"` string
  - `key` (required): API key
  - `category` (optional): `"hotels"`, `"restaurants"`, `"attractions"`, or `"geos"`
  - `radius` (optional): search radius number
  - `radiusUnit` (optional): `"km"`, `"mi"`, or `"m"`
  - `language` (optional): defaults to `"en"`
- **Response fields per location**:
  - `location_id`: unique Tripadvisor identifier
  - `name`: place name
  - `distance`: distance from search point (in miles)
  - `bearing`: direction from search point
  - `address_obj`: `{ street, city, state, country, postal_code, address }`
- **Rate limits**: 10,000 calls/day, 50 QPS. First 5,000 calls/month free.
- **Attribution**: Tripadvisor logo and rating bubbles must be displayed when showing results. B2C use only.

### Location Details endpoint (enrichment)
To get ratings, reviews, photos, and website for a place returned by nearby search:
- `GET /location/{locationId}/details?key={key}&language=en`
- Returns: `rating`, `num_reviews`, `web_url`, `phone`, `website`, `cuisine`, `hours`, `photo`

## Implementation notes

### 1. Settings: API key (`tripadvisor.api_key`)

**`src/lib/settings.ts`** — add to `SETTING_KEYS`:
```typescript
TRIPADVISOR_API_KEY: 'tripadvisor.api_key',
```

**`src/app/settings/page.tsx`** — add a new section after the Map Provider section:
```
<section>
  <h2>Tripadvisor</h2>
  <p>API key for nearby place search. Get one at tripadvisor.com/developers</p>
  <TripadvisorSettingsForm />
</section>
```

**`src/app/settings/components/TripadvisorSettingsForm.tsx`** — new component:
- Single API key input field (password type, same pattern as Google/Mapbox key forms)
- Placeholder: `"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"`
- Env var override note: `TRIPADVISOR_API_KEY`
- Save button, success/error feedback (same pattern as `RoutingProviderForm.tsx`)
- The Tripadvisor key is independent of the map provider — it's always available regardless of whether the user uses OSM, Google, or Mapbox tiles

### 2. API route: `app/api/nearby-search/tripadvisor/route.ts`

**Request** (POST, same pattern as other nearby-search routes):
```typescript
const bodySchema = z.object({
  lat: z.number(),
  lng: z.number(),
  radiusMeters: z.number().min(100).max(50_000),
  category: z.enum(['hotels', 'restaurants', 'attractions']).optional(),
});
```

**Flow**:
1. Read API key from setting `tripadvisor.api_key` (fall back to `process.env.TRIPADVISOR_API_KEY`)
2. If no key configured, return `400` with `{ error: "Tripadvisor API key not configured" }`
3. Phase 1: Neo4j cache — `searchNearbyCache(lat, lng, radiusMeters, 'tripadvisor')` (or `'tripadvisor:hotels'` etc. if category-specific caching is worthwhile)
4. Phase 2: Call Tripadvisor nearby search:
   ```
   GET https://api.content.tripadvisor.com/api/v1/location/nearby_search
     ?latLong={lat},{lng}
     &key={apiKey}
     &category={category}
     &radius={radiusKm}
     &radiusUnit=km
     &language=en
   ```
5. Map response to `NearbyPlace[]`:
   - `placeId`: `"ta:{location_id}"`
   - `name`: from response
   - `lat`, `lng`: not directly in nearby_search response — must either:
     - (a) Call `/location/{id}/details` for each result to get coordinates, or
     - (b) Use the search center + distance + bearing to compute approximate lat/lng
   - `type`: the `category` or a mapped label
   - `provider`: `'tripadvisor'`
   - `address`: from `address_obj`
6. Deduplicate against cached placeIds
7. Cache fresh results via `cacheNearbyPlaces()`
8. Return merged results

**Important: coordinate resolution**
The nearby_search endpoint returns `distance` and `bearing` but not lat/lng. Two options:
- **Option A (accurate, slower)**: Batch-call `/location/{id}/details` for each result to get `latitude`/`longitude`. This uses 1 + N API calls per search (N = results, max ~10). Given the 10,000/day limit this is fine for personal use.
- **Option B (approximate, faster)**: Compute lat/lng from center + distance + bearing using the destination-point formula. Avoids extra API calls but coordinates are approximate.

**Recommendation**: Option A — accuracy matters for map markers. The details endpoint also provides `rating`, `num_reviews`, `web_url`, and `website` which are valuable for the popup. Cache aggressively in Neo4j so subsequent searches don't re-fetch details.

### 3. Category picker modal: `src/app/map/components/TripadvisorSearchModal.tsx`

Similar to `NearbySearchModal.tsx`. Grid of category buttons:

| Category | Label | Icon |
|---|---|---|
| `hotels` | Hotels | bed icon or text |
| `restaurants` | Restaurants | fork/knife icon or text |
| `attractions` | Attractions | camera icon or text |
| _(no category)_ | All | magnifying glass or text |

Closes on Escape or backdrop click (same pattern as `NearbySearchModal`).

### 4. Context menu: add "Search Tripadvisor" button

**`src/app/map/components/MapContextMenu.tsx`**:
- Add `onSearchTripadvisor: () => void` to Props
- Add button between "Search Park4Night" and "Add POI":
  ```
  <button onClick={onSearchTripadvisor}>
    <span>TA</span> Search Tripadvisor
  </button>
  ```
- Only show the button if the Tripadvisor API key is configured (pass a boolean prop `tripadvisorEnabled`)

### 5. Map page wiring: `src/app/map/page.tsx`

New state and handlers (follow the Park4Night pattern):
- `showTripadvisorModal` state (boolean)
- `handleOpenTripadvisorModal` — stores context menu position, opens modal, closes context menu
- `handleSearchTripadvisor(category?)` — called when user picks a category:
  1. Compute radius from map bounds (same as Park4Night: `haversineMeters` to corner, cap at 50 km)
  2. POST to `/api/nearby-search/tripadvisor` with `{ lat, lng, radiusMeters, category }`
  3. Add result markers to `nearbyLayerRef` using Tripadvisor-styled markers
  4. Set `nearbyStatus`
- Wire `onSearchTripadvisor` in `MapContextMenu`
- Wire `TripadvisorSearchModal` below the existing `NearbySearchModal`

### 6. Marker styling and popup

**Marker**: Tripadvisor green circle (`#34e0a1` background, `#00af87` border) with "TA" text or a simple icon. Add to `NEARBY_PLACE_EMOJIS` or use a custom `makeNearbyMarkerHtml` branch for `provider === 'tripadvisor'`.

**Popup** (in the selected-nearby-place panel):
- Badge: "Tripadvisor" in green
- Rating: show `rating` with Tripadvisor-style (e.g., "4.5 (1,234 reviews)")
- Address from `address_obj`
- "Open in Tripadvisor" link: `https://www.tripadvisor.com/Attraction_Review-d{location_id}` or use `web_url` from details response
- Attribution: must display per API terms — small "Powered by Tripadvisor" text or logo

### 7. Neo4j caching

Uses existing `searchNearbyCache` / `cacheNearbyPlaces` from `src/lib/nearby/graph.ts`. Place nodes get:
- `placeId`: `"ta:{location_id}"`
- `type`: `"tripadvisor"` (or `"tripadvisor:hotels"` etc.)
- `provider` field is not stored on the Place node currently — it's set at response time based on `placeId` prefix

TASK-051 (area-based caching) will further optimize this by tracking searched areas.

### 8. Check API key availability at page load

To conditionally show/hide the "Search Tripadvisor" button in the context menu, the map page needs to know if the key is configured. Options:
- (a) Fetch `/api/settings` on mount and check for `tripadvisor.api_key === '[SET]'` — settings are already fetched for home coords, so extend that
- (b) Add a lightweight `/api/nearby-search/tripadvisor/status` endpoint — overkill
- **Recommendation**: option (a), extend the existing settings fetch

## Definition of done
- [x] `tripadvisor.api_key` added to `SETTING_KEYS`
- [x] `TripadvisorSettingsForm` component created and rendered on Settings page
- [x] API key saveable, loadable, and redacted in GET response (existing `SENSITIVE_KEY_PATTERNS` already covers `*api_key`)
- [x] `TRIPADVISOR_API_KEY` env var override works
- [x] `app/api/nearby-search/tripadvisor/route.ts` created with Zod validation
- [x] Nearby search calls Tripadvisor API with correct auth and parameters
- [x] Location details fetched for coordinates, ratings, and web URL
- [x] Results mapped to `NearbyPlace[]` and cached in Neo4j
- [x] `TripadvisorSearchModal` component created (category picker)
- [x] "Search Tripadvisor" button added to `MapContextMenu` (conditional on key configured)
- [x] Map page wired: context menu -> modal -> API call -> markers on map
- [x] Tripadvisor-styled markers rendered on map
- [x] Selected-place popup shows Tripadvisor badge, rating, "Open in Tripadvisor" link
- [x] Tripadvisor attribution displayed per API terms
- [x] Graceful handling: no key configured (button hidden), API errors (toast/status), rate limit 429 (user-facing message)

## Links
- Related: [TASK-050](TASK-050-configurable-nearby-search-radius-cap.md) (radius cap applies to this search too)
- Related: [TASK-051](TASK-051-nearby-search-area-caching-with-coverage-gap-detection.md) (area caching will optimize Tripadvisor calls)
- Pattern: `app/api/nearby-search/park4night/route.ts` (closest existing analog)
- Settings pattern: `src/app/settings/components/RoutingProviderForm.tsx`
- Context menu: `src/app/map/components/MapContextMenu.tsx`
- Nearby modal pattern: `src/app/map/components/NearbySearchModal.tsx`
- Tripadvisor API docs: https://tripadvisor-content-api.readme.io/reference/overview
