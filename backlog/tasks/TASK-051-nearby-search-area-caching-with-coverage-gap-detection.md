# Task: TASK-051 Nearby search area caching with coverage gap detection

## Metadata
- **Priority**: P2
- **Status**: planned

## Goal
Reduce external API calls (Overpass, Google Places, Park4Night) by tracking which geographic areas have already been searched. When a new search overlaps with previously searched areas, only query the uncovered gap — not the entire request circle.

Currently, the nearby search routes always call the external API on every request. Individual Place nodes are cached in Neo4j and deduplicated, but the API call itself is never skipped or reduced. This wastes quota and risks hitting rate limits, especially for Overpass (public, no key) and Google Places (paid per request).

## Background

### Current caching behavior
- **Geocoding** (`src/lib/geocoding/index.ts`): Cache-first — skips Nominatim entirely on cache hit. Uses `GeoSearch` nodes with 7-day TTL. This is the model to follow.
- **Nearby search** (`app/api/nearby-search/route.ts`): Caches Place nodes but always makes the external API call. Deduplicates results (skips places already in cache) but does not skip or reduce the API call.
- **Park4Night** (`app/api/nearby-search/park4night/route.ts`): Same pattern — always calls the Park4Night API.

### Why full-circle re-query is wasteful
A user panning the map triggers overlapping searches. If search A covered a 10 km circle and search B is a 10 km circle offset by 3 km, ~70% of B is already covered. Today, both make full API calls.

## Algorithm: Adaptive Radial Sampling with Greedy Cover

### Overview
1. Record each completed search as a `SearchArea` node in Neo4j: `(lat, lng, radiusMeters, type, expiresAt)`
2. On new request, retrieve overlapping `SearchArea` nodes
3. Use radial point sampling to determine which parts of the request circle are uncovered
4. Form minimal query circles covering only the gap
5. Execute gap queries, record new `SearchArea` nodes, merge results

### Phase 1 — Sample
Generate 73 points on concentric rings within the request circle (1 center + 6 rings x 12 points each). This naturally matches circular geometry and runs in microseconds.

```
Ring 0: center point (1 point)
Ring 1-6: evenly spaced at radius * (ring / 6), 12 points each
Total: 73 points
```

### Phase 2 — Filter
For each sample point, check if it falls inside any cached `SearchArea` circle (haversine distance <= cached radius). Remove covered points.

### Phase 3 — Greedy Cover
Cluster uncovered points into at most 5 query circles:
1. Compute centroid of remaining uncovered points
2. Set radius to cover the farthest uncovered point + 15% buffer
3. Remove points now covered by this new circle
4. Repeat until all points covered or 5 circles reached
5. If points remain after 5 circles, fall back to the original full request circle

### Fast paths (skip sampling entirely)
- **No cached areas** -> return original request circle (1 API call)
- **Request fully contained** in a single cached circle -> return empty (0 API calls)
- **>85% of sample points uncovered** -> return original request circle (no benefit in splitting)
- **All sample points covered** -> return empty (0 API calls)

### Park4Night special case
Park4Night has no radius parameter — it returns nearby results from a center, filtered client-side by haversine. Multiple sub-circle queries are pointless (results overlap heavily). Decision is binary:
- If >90% of sample points are covered -> skip API call entirely
- Otherwise -> make one call to request center

### Performance budget
73 sample points x 20 cached circles = 1,460 haversine checks. Well under 1ms.

## Implementation notes

### New file: `src/lib/nearby/coverage.ts`
Core algorithm module. Pure functions, no side effects:
- `computeUncoveredQueries(request, cachedAreas): SearchCircle[]`
- `computePark4NightQuery(request, cachedAreas): SearchCircle | null`
- `generateRingSamples(circle, ringCount, pointsPerRing): Point[]`
- `greedyCover(uncoveredPoints, requestCircle, maxCircles): SearchCircle[]`

Helper types:
```typescript
interface SearchCircle {
  lat: number;
  lng: number;
  radiusMeters: number;
}

interface CachedSearchArea extends SearchCircle {
  type: string;
  expiresAt: Date;
}
```

### Extend: `src/lib/nearby/graph.ts`
Add `SearchArea` node CRUD:
- `recordSearchArea(lat, lng, radiusMeters, type, ttlMinutes): Promise<void>` — create node after successful API call
- `getOverlappingSearchAreas(lat, lng, radiusMeters, type): Promise<CachedSearchArea[]>` — fetch non-expired areas that overlap with request circle (distance between centers < sum of radii)

Add Neo4j constraint in `src/lib/neo4j.ts` `ensureConstraints()`:
- No uniqueness constraint needed (SearchArea nodes are not keyed by a single field), but consider an index on `type` + `expiresAt` for query performance

### Extend: `src/lib/nearby/types.ts`
Add `SearchCircle` and `CachedSearchArea` interfaces.

### Modify: `app/api/nearby-search/route.ts`
Change flow from:
```
request -> searchNearbyCache(places) -> API call (full circle) -> cacheNearbyPlaces -> return
```
To:
```
request -> getOverlappingSearchAreas
        -> computeUncoveredQueries
        -> for each gap circle:
             API call (Overpass or Google) + recordSearchArea
        -> searchNearbyCache(places, full request radius)
        -> merge cached + fresh, deduplicate -> return
```

Note: `searchNearbyCache` still returns all Place nodes within the request radius (from any prior search). The gap queries only fetch places in uncovered areas. Merge and deduplicate by `placeId`.

### Modify: `app/api/nearby-search/park4night/route.ts`
Change flow to:
```
request -> getOverlappingSearchAreas
        -> computePark4NightQuery (binary: skip or query center)
        -> if query: API call + recordSearchArea
        -> searchNearbyCache(places, full request radius)
        -> merge + deduplicate -> return
```

### TTL considerations
- Campgrounds, RV parks, rest stops: change rarely. TTL: 24-48 hours.
- Parking: existence is stable, availability is not (but we cache existence, not availability). TTL: 12-24 hours.
- Tourist attractions, parks: very stable. TTL: 48-72 hours.
- Consider making TTL configurable per type, or start with a flat 24 hours.

### SearchArea cleanup
Expired `SearchArea` nodes should be cleaned up periodically. Options:
- Lazy: delete expired nodes during `getOverlappingSearchAreas` queries
- Background: periodic Cypher query `MATCH (s:SearchArea) WHERE s.expiresAt < datetime() DELETE s`

## Definition of done
- [ ] `SearchCircle` and `CachedSearchArea` types added to `src/lib/nearby/types.ts`
- [ ] `coverage.ts` module created with `computeUncoveredQueries`, `computePark4NightQuery`, and helpers
- [ ] `graph.ts` extended with `recordSearchArea` and `getOverlappingSearchAreas`
- [ ] Neo4j constraint/index for `SearchArea` added to `ensureConstraints()`
- [ ] `app/api/nearby-search/route.ts` uses coverage algorithm (gap queries instead of full circle)
- [ ] `app/api/nearby-search/park4night/route.ts` uses binary skip-or-query logic
- [ ] Fast paths verified: full coverage skips API, no coverage queries full circle, partial coverage queries gap only
- [ ] Unit tests for `coverage.ts` pure functions (sample generation, filtering, greedy cover, fast paths)
- [ ] Unit tests for `SearchArea` graph operations (record, retrieve, overlap filtering, expiry)
- [ ] Manual verification: two overlapping searches result in reduced API calls on second request

## Links
- Related: [TASK-050](TASK-050-configurable-nearby-search-radius-cap.md) (radius cap setting — gap queries must respect the configured cap)
- Nearby search route: `app/api/nearby-search/route.ts`
- Park4Night route: `app/api/nearby-search/park4night/route.ts`
- Graph cache: `src/lib/nearby/graph.ts`
- Geocoding cache (reference pattern): `src/lib/geocoding/graph.ts`, `src/lib/geocoding/index.ts`
