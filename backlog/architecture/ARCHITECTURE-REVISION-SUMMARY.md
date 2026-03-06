# Architecture Revision Summary: Graph Database Integration

**Date**: March 2, 2026  
**Revision**: ARCH-005 created and related architecture notes updated  
**Impact**: Sprint 1 unaffected; Sprint 2+ implementation timeline defined

---

## What Changed

I've revised the architecture to incorporate a **graph database (Neo4j)** for storing places, routes, and cached external data, addressing your requirements for:

✅ **Relationship tracking** - Easy to identify related elements across planning sessions  
✅ **Historical context** - "Show me stopovers and sights I've visited in this city before"  
✅ **Source caching** - Avoid rate limiting from Google Maps, routing services, POI databases  
✅ **Freshness management** - Track data age with TTL and refresh capabilities

## Architecture Overview

### Hybrid Persistence Strategy

**PostgreSQL (Relational)** - Source of truth for transactional data:
- Trip entities (id, title, dates, status)
- Vehicle profiles (dimensions, constraints)
- User accounts and sessions
- Day assignments and selections

**Neo4j (Graph)** - Knowledge graph for relationships and caching:
- Place nodes (cities, POIs, stopovers, sights)
- Route segments (connections between places)
- Visit relationships (user visited place during trip)
- Cached API responses with TTL and freshness tracking

### Why This Approach?

**Graph databases excel at**:
- Deep relationship traversals ("Find all places I visited in France")
- Pattern matching ("Show similar routes I've taken")
- Shortest paths and graph algorithms
- Semantic queries across interconnected data

**PostgreSQL remains for**:
- ACID transactions (trip creation, updates)
- Structured domain entities
- Foreign key constraints and data integrity
- Familiar SQL operations

## Key Use Cases Enabled

### 1. "I've been here before"
When planning a city visit:
```cypher
// Find all POIs and stopovers I've visited within 50km of this city
MATCH (t:Trip)-[v:VISITED]->(p:Place)
WHERE distance(p.coordinates, $city_coords) < 50
RETURN p.name, p.type, v.visited_on, t.title
ORDER BY v.visited_on DESC
```

**Result**: "You visited Cafe Central and Schönbrunn Palace in Vienna during your Austria 2024 trip"

### 2. API Response Caching with Rate Limit Protection
Before calling Google Places API:
```cypher
// Check for cached response
MATCH (c:CachedSource {provider: 'google_places', query_key: $hash})
WHERE c.expires_at > datetime()
RETURN c.response_data
```

**If cached and fresh**: Return immediately (no API call)  
**If stale or missing**: Call API, cache response with TTL, return data

**Benefits**:
- Avoid hitting Google Places rate limits (100K requests/month)
- Instant response for repeated queries
- Cost savings on API calls

### 3. Freshness Management
Each cached node tracks:
- `fetched_at` - When data was retrieved
- `ttl_hours` - How long it's valid
- `expires_at` - Calculated expiry timestamp

**TTL by source**:
- Google Maps routes: 7 days
- Google Places: 30 days
- POI searches: 14 days
- Park4Night: 3 days (availability changes fast)

**Refresh strategies**:
- Passive: Expired nodes ignored in queries
- Active: Background job refreshes high-priority expired nodes
- Manual: User can click "Refresh this place" in UI

### 4. Route Reuse Across Trips
```cypher
// Find routes I've taken between these cities before
MATCH (origin:Place {name: 'Berlin'})-[c:CONNECTS_TO]->(dest:Place {name: 'Prague'})
MATCH (r:RouteSegment {id: c.route_segment_id})
RETURN r.distance_km, r.duration_minutes, r.polyline
```

**Result**: "You drove Berlin → Prague in 3h 45min on your 2023 trip. Use same route?"

## Implementation Timeline

### Sprint 1: PostgreSQL Only ✅
**Status**: No changes to Sprint 1 stories  
**Scope**: Trip CRUD operations in PostgreSQL  
**Outcome**: Functional trip planning without graph features

### Sprint 2: Neo4j Foundation 🔨
**New stories**:
- STORY-GDB-001: Setup Neo4j infrastructure (Docker, cloud config)
- STORY-GDB-002: Implement Trip node sync (PostgreSQL → Neo4j)

**Effort**: ~10 story points  
**Outcome**: Graph database operational, Trip nodes synced

### Sprint 3-4: Place Tracking 📍
**New stories**:
- STORY-GDB-003: Place nodes and VISITED relationships
- Add "places I've visited" to trip detail page

**Effort**: ~8 story points  
**Outcome**: Historical place tracking functional

### Sprint 4-5: Source Caching 💾
**New stories**:
- STORY-GDB-004: Cache external API responses with TTL
- Wrap Google Maps/Places API calls with cache layer
- Add freshness indicators to UI

**Effort**: ~8 story points  
**Outcome**: Rate limit protection, cost savings

### Sprint 6+: Advanced Features 🚀
- Route segment caching and reuse
- Graph-based recommendations ("Similar trips you might like")
- Place relationship visualization
- Historical pattern analysis

## Files Created/Updated

### Created
- [ARCH-005-graph-database-for-places-and-caching.md](../architecture/ARCH-005-graph-database-for-places-and-caching.md) - Complete architecture specification
- [SPRINT-001-graph-impact-assessment.md](SPRINT-001-graph-impact-assessment.md) - Sprint 1 impact analysis

### Updated
- [ARCH-001-trip-date-model.md](../architecture/ARCH-001-trip-date-model.md) - Added hybrid persistence strategy
- [ARCH-002-plan-mode-routing-and-waypoints.md](../architecture/ARCH-002-plan-mode-routing-and-waypoints.md) - Added route caching section
- [ARCH-004-stay-discovery-ranking-and-assignment.md](../architecture/ARCH-004-stay-discovery-ranking-and-assignment.md) - Added source caching section
- [EPIC-001-tracking.md](EPIC-001-tracking.md) - Documented architecture updates

## Graph Schema Overview

### Node Types
- **Place**: Geographic locations (cities, POIs, rest areas, accommodations)
- **RouteSegment**: Computed routes between places with geometry
- **CachedSource**: API responses from external providers with TTL
- **Trip**: Reference to PostgreSQL trip (synced for relationships)

### Relationship Types
- **VISITED**: Trip → Place (user visited place on specific date)
- **CONNECTS_TO**: Place → Place (route exists between places)
- **SOURCED_FROM**: Place → CachedSource (place discovered from API)
- **CONTAINS**: Place → Place (city contains POIs)
- **CACHED_FROM**: RouteSegment → CachedSource (route from cached API call)

## Example Cypher Queries

### Find all cities I've visited
```cypher
MATCH (t:Trip)-[:VISITED]->(p:Place {type: 'city'})
RETURN DISTINCT p.name, count(t) as visit_count
ORDER BY visit_count DESC
```

### Check if API response is cached and fresh
```cypher
MATCH (c:CachedSource {
  provider: 'google_places',
  query_key: hash('search=camping+vienna')
})
WHERE c.expires_at > datetime()
RETURN c.response_data
```

### Find POIs I visited in a specific city
```cypher
MATCH (city:Place {name: 'Vienna', type: 'city'})
MATCH (city)-[:CONTAINS]->(poi:Place)
MATCH (poi)<-[v:VISITED]-(t:Trip)
RETURN poi.name, poi.type, v.visited_on, t.title
```

## Technical Stack Addition

### Current Stack (Sprint 1)
- Node.js 22 + TypeScript
- Next.js (App Router)
- PostgreSQL
- Prisma ORM
- Zod validation

### Added Stack (Sprint 2+)
- **Neo4j** - Graph database (Community Edition or Aura)
- **neo4j-driver** - Official Node.js driver for Neo4j
- **Cypher** - Graph query language

### Development Environment
- **Docker Compose**: PostgreSQL + Neo4j services
- **Neo4j Browser**: Graph visualization and query tool (http://localhost:7474)
- **Neo4j Aura** - Managed cloud option for production

## Benefits Summary

| Benefit | Description | Sprint |
|---------|-------------|--------|
| 🔍 **Discovery** | "I've been here before" queries | 3-4 |
| 💰 **Cost savings** | Cache API responses, avoid redundant calls | 4-5 |
| ⚡ **Performance** | Graph traversals 10-1000x faster than JOINs | 3+ |
| 🛡️ **Rate limiting** | Respect API quotas with smart caching | 4-5 |
| 📊 **Insights** | Pattern analysis on trip history | 6+ |
| 🎯 **Recommendations** | Graph-based place/route suggestions | 6+ |

## Risks and Mitigations

### ⚠️ Two-database complexity
**Mitigation**: Use Docker Compose for dev, managed Neo4j Aura for prod

### ⚠️ Data sync consistency
**Mitigation**: PostgreSQL is source of truth; graph sync is eventually consistent

### ⚠️ Team learning curve
**Mitigation**: Cypher is intuitive; provide training and query templates

### ⚠️ Infrastructure cost
**Mitigation**: Start with free Community Edition; evaluate Aura when scaling

## Next Steps

### For Sprint 1 (This Week)
✅ **Continue as planned** - No changes to current stories  
✅ **Complete PostgreSQL implementation** - Trip CRUD foundation

### Between Sprint 1 and 2
📚 **Team training** - Schedule Neo4j lunch-and-learn  
📋 **Story refinement** - Detailed breakdown of STORY-GDB-001, STORY-GDB-002  
🔍 **Infrastructure planning** - Neo4j hosting strategy (Docker vs Aura)

### For Sprint 2 Planning
🎯 **Prioritize** - STORY-GDB-001 (Neo4j setup) as first story  
🎯 **Allocate** - 10 points for graph database foundation  
🎯 **Spike** - Consider 1-day tech spike if team unfamiliar with Neo4j

## Questions or Concerns?

This architecture revision significantly enhances the system's ability to:
- Track relationships across trips
- Avoid API rate limits through smart caching
- Provide contextual "been here before" insights
- Enable future ML/recommendation features

**Sprint 1 proceeds unchanged** - you can review the revised stories and approve task creation. Graph database work starts in Sprint 2.

---

**Status**: ✅ Architecture revision complete  
**Sprint 1 Impact**: None  
**Next**: Review Sprint 1 stories (if not already done) and approve task creation
