# Architecture Note: ARCH-005 Graph database for places, routes, and source caching

## Context
Trip planning involves rich relationships between places, routes, visits, and external data sources. As users create multiple trips over time, the system should:
1. **Identify related elements** across planning sessions (e.g., "I've visited this city before" or "I stopped at this rest area")
2. **Cache external source data** to avoid rate limiting from public APIs (Google Maps, routing services, POI databases)
3. **Manage data freshness** so cached information doesn't become stale
4. **Enable semantic queries** like "show me all places I visited in France" or "find routes between these cities I've used before"

Traditional relational models struggle with deep traversals and complex relationship queries that graph databases excel at.

## Decision

### Hybrid persistence architecture
- **PostgreSQL (relational)**: Transactional domain entities
  - Trips (id, title, dates, status)
  - Vehicles (id, name, dimensions, constraints)
  - User accounts and sessions
  - Trip-day assignments and selections
  
- **Graph database**: Knowledge graph for places, routes, and cached data
  - Place nodes (cities, POIs, stopovers, sights)
  - Route segments (connections between places with geometry)
  - Visit relationships (user visited place during trip)
  - Source cache nodes (API responses from external providers)
  - Freshness metadata for cache invalidation

### Graph database implementation: Neo4j
- **Why Neo4j**: 
  - Native graph database with excellent traversal performance
  - Cypher query language for intuitive relationship queries
  - Built-in graph algorithms (shortest path, centrality, community detection)
  - Strong ecosystem and Docker support for development
  - Official Node.js driver with TypeScript support

### Alternative considered: PostgreSQL with Apache AGE
- **Pros**: Single database, simpler ops, SQL compatibility
- **Cons**: Less mature graph features, more complex setup, limited tooling
- **Decision**: Neo4j preferred for richer graph capabilities; can revisit if ops complexity becomes a constraint

### Graph schema design

#### Node types
```cypher
// Place: Any geographic location (city, POI, rest area, sight)
(:Place {
  id: uuid,
  name: string,
  type: enum(city, poi, rest_area, sight, accommodation, other),
  coordinates: {lat, lon},
  address: string?,
  google_place_id: string?,
  created_at: datetime,
  updated_at: datetime
})

// RouteSegment: Computed route between two places
(:RouteSegment {
  id: uuid,
  origin_place_id: uuid,
  destination_place_id: uuid,
  distance_km: float,
  duration_minutes: float,
  polyline: string,  // encoded geometry
  travel_mode: enum(driving, walking, cycling),
  created_at: datetime,
  updated_at: datetime
})

// CachedSource: API response from external provider
(:CachedSource {
  id: uuid,
  provider: enum(google_maps, google_places, park4night, osm),
  query_key: string,  // hash of query parameters
  response_data: json,
  fetched_at: datetime,
  ttl_hours: integer,
  expires_at: datetime
})

// Trip: Reference to relational trip entity
(:Trip {
  id: uuid,  // matches PostgreSQL trip.id
  title: string,
  start_date: date,
  stop_date: date
})
```

#### Relationship types
```cypher
// User visited a place during a trip
(:Trip)-[:VISITED {
  visited_on: date,
  day_index: integer,
  notes: string?
}]->(:Place)

// Route connects two places
(:Place)-[:CONNECTS_TO {
  route_segment_id: uuid
}]->(:Place)

// Place discovered from cached source
(:Place)-[:SOURCED_FROM {
  discovered_at: datetime,
  confidence: float
}]->(:CachedSource)

// Place contains other places (e.g., city contains POIs)
(:Place)-[:CONTAINS]->(:Place)

// Route segment sourced from cache
(:RouteSegment)-[:CACHED_FROM]->(:CachedSource)
```

### Integration with relational model
- **Trip entity**: Lives in PostgreSQL with core CRUD operations
- **Trip graph node**: Synced to Neo4j when trip is created/updated for relationship queries
- **Sync strategy**: 
  - Event-driven: Emit domain events on trip create/update
  - Background job: Sync trip nodes to graph on save
  - Read path: Query PostgreSQL for trip details, Neo4j for relationships

### Data flow examples

#### Example 1: Creating a trip with places
1. User creates trip in web UI (title, dates)
2. API handler saves trip to PostgreSQL
3. Background job creates corresponding Trip node in Neo4j
4. User adds waypoints/destinations to trip
5. For each place:
   - Check if Place node exists in Neo4j by coordinates/google_place_id
   - If not, create Place node
   - Create (:Trip)-[:VISITED]->(:Place) relationship with date/day_index

#### Example 2: Discovering related places
When user selects a city destination:
```cypher
// Find all places I've visited in this city before
MATCH (t:Trip)-[v:VISITED]->(p:Place)
WHERE p.type IN ['poi', 'sight', 'rest_area']
  AND distance(p.coordinates, $city_coordinates) < 50  // within 50km
RETURN p, v.visited_on, t.title
ORDER BY v.visited_on DESC
```

#### Example 3: Caching API responses
When calling Google Places API:
1. Compute query_key = hash(query_params)
2. Check Neo4j for CachedSource node with matching query_key
3. If found and not expired (`expires_at > now()`), return cached `response_data`
4. If not found or expired:
   - Call Google Places API
   - Create/update CachedSource node with response and TTL
   - Link discovered places via [:SOURCED_FROM]
5. Return API response

### Freshness management strategy

#### TTL by source type
- **Google Maps routes**: 7 days (routes change infrequently)
- **Google Places details**: 30 days (business details relatively stable)
- **POI search results**: 14 days (search results may change)
- **Park4Night spots**: 3 days (availability changes frequently)

#### Refresh policies
- **Passive expiry**: Expired cache nodes ignored in queries
- **Active refresh**: Background job identifies high-value expired nodes and refreshes
  - Priority: Nodes linked to upcoming trips (within 30 days)
  - Batch API calls to respect rate limits
- **Manual refresh**: User can trigger "refresh this place" action in UI

#### Staleness indicators
- Add `stale: boolean` computed property based on `expires_at`
- UI shows freshness indicator: "Last updated 5 days ago"
- Warn user if planning with stale data > 60 days old

### Implementation timeline

#### Phase 1: Foundation (Sprint 2-3)
- Set up Neo4j database (Docker for dev, cloud for prod)
- Install Neo4j Node.js driver
- Create graph schema and indexes
- Build sync service for Trip nodes

#### Phase 2: Places and visits (Sprint 3-4)
- Implement Place node creation/retrieval
- Track VISITED relationships when user adds destinations
- Build "places I've visited" query endpoint

#### Phase 3: Caching layer (Sprint 4-5)
- Implement CachedSource nodes with TTL
- Wrap Google Maps/Places API calls with cache lookup
- Add freshness indicators to UI

#### Phase 4: Advanced queries (Sprint 6+)
- Route segment caching and reuse
- Place recommendations based on graph similarity
- Trip timeline visualization from graph data
- "Show me all trips to Spain" semantic queries

## Alternatives considered

### 1. Full relational with PostgreSQL only
**Pros**: Simpler ops, single database, familiar SQL
**Cons**: Complex JOIN queries for deep relationships, poor traversal performance, caching logic scattered
**Verdict**: Insufficient for rich relationship queries at scale

### 2. Document database (MongoDB) for places
**Pros**: Flexible schema, easy to embed relationships
**Cons**: No native graph queries, manual relationship traversal, poor for complex queries
**Verdict**: Not optimized for graph-like data

### 3. PostgreSQL with recursive CTEs for graphs
**Pros**: Single database, SQL standard
**Cons**: Verbose queries, limited graph algorithms, performance issues at depth
**Verdict**: Workable but suboptimal; doesn't solve caching architecture

### 4. Redis for caching + PostgreSQL for everything else
**Pros**: Fast cache, simple key-value store
**Cons**: No relationship queries, can't traverse cache to places, loses graph benefits
**Verdict**: Good for simple caching but doesn't enable semantic queries

## Consequences

### Benefits
✅ **Rich relationship queries**: "Show me all places I visited in this region" in one query
✅ **Rate limit protection**: Cache external API responses with TTL management
✅ **Data reuse**: Places visited in one trip available for future trips
✅ **Performance**: Graph traversals 10-1000x faster than JOIN-heavy SQL
✅ **Semantic understanding**: Discover patterns like "I always stop at rest areas every 200km"
✅ **Future-proof**: Enables ML/recommendation features on graph data

### Challenges
⚠️ **Operational complexity**: Two databases to manage (PostgreSQL + Neo4j)
⚠️ **Sync overhead**: Keep Trip nodes in Neo4j synchronized with PostgreSQL
⚠️ **Learning curve**: Team needs to learn Cypher query language
⚠️ **Data consistency**: Ensure eventual consistency between relational and graph stores
⚠️ **Cost**: Additional infrastructure for Neo4j (can use Aura cloud or self-host)

### Mitigation strategies
- **Two-database ops**: Use Docker Compose for local dev, managed Neo4j Aura for production
- **Sync robustness**: Implement idempotent sync jobs with retry logic and monitoring
- **Learning curve**: Provide Cypher query examples and templates for common patterns
- **Consistency**: Accept eventual consistency; relational DB is source of truth for trips
- **Cost**: Start with Neo4j Community Edition (free), evaluate Aura when scaling

## Follow-ups

### Immediate (before Sprint 1 completion)
- [ ] Update ARCH-001 to note graph integration is planned for Sprint 2+
- [ ] Add STORY-001B (or defer to Sprint 2): "Setup Neo4j infrastructure"
- [ ] Document graph schema in detail with Cypher examples

### Near-term (Sprint 2-3)
- [ ] Create shared graph client service (similar to Prisma client for PostgreSQL)
- [ ] Design Trip sync event system (PostgreSQL → Neo4j)
- [ ] Build Place node creation/deduplication logic
- [ ] Implement first relationship query: "Places I've visited"

### Medium-term (Sprint 4+)
- [ ] Deploy Neo4j to cloud (Aura or self-hosted)
- [ ] Implement cache layer for Google Maps/Places APIs
- [ ] Add cache monitoring dashboard (hit rate, expired nodes)
- [ ] Build refresh job for high-value stale nodes

### Long-term (Sprint 6+)
- [ ] Graph-based recommendations (similar trips, related places)
- [ ] Export graph data for analysis
- [ ] Implement graph visualization in UI
- [ ] Add graph-based search ("Find trips through Switzerland")
- [ ] Integrate Ollama-grounded semantic planning suggestions over graph data (see ARCH-006)

## References
- Neo4j Documentation: https://neo4j.com/docs/
- Neo4j Node.js Driver: https://neo4j.com/docs/javascript-manual/
- Graph modeling best practices: https://neo4j.com/developer/guide-data-modeling/
- PostgreSQL + Neo4j integration patterns: https://neo4j.com/developer/postgresql/

## Related architecture notes
- [ARCH-001: Trip date model](ARCH-001-trip-date-model.md) - PostgreSQL trip entities
- [ARCH-002: Plan mode routing](ARCH-002-plan-mode-routing-and-waypoints.md) - Route segments will be cached in graph
- [ARCH-004: Stay discovery](ARCH-004-stay-discovery-ranking-and-assignment.md) - POI source caching in graph
- [ARCH-006: Ollama-based AI integration](ARCH-006-ollama-ai-integration.md) - AI gateway, extraction, freshness-aware refresh ranking

---

**Status**: Approved  
**Impact**: High - Foundational architecture change  
**Implementation**: Sprint 2+ (does not block Sprint 1)  
**Owner**: Backend team + DevOps for Neo4j setup
