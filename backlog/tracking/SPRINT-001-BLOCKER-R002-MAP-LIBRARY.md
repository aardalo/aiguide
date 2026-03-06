# 🚫 BLOCKER RESOLUTION: MAP LIBRARY DECISION (R-002)

**Decision Date**: March 2, 2026  
**Status**: ✅ **RESOLVED** - Ready for TASK-001 implementation

---

## Decision: Leaflet + OpenStreetMap

**Map Library**: [Leaflet](https://leafletjs.com/) (v1.9+)  
**Tile Provider**: [OpenStreetMap](https://www.openstreetmap.org/)  
**React Integration**: [react-leaflet](https://react-leaflet.js.org/)  

---

## Why This Choice?

| Criterion | Leaflet + OSM | Why It Wins |
|-----------|-------|-----------|
| **MVP Fit** | ✅ Lightweight | Perfect for EPIC-001 MVP, scales up later |
| **Licensing** | ✅ Open Source (MIT + ODbL) | No API keys needed, no costs, no lock-in |
| **Web Integration** | ✅ Simple React integration | `react-leaflet` has excellent Next.js support |
| **Learning Curve** | ✅ Easy | Minimal setup for basic map display |
| **Extensibility** | ✅ Plugin ecosystem | Can add routing (EPIC-002), markers, etc. |
| **Performance** | ✅ Good for MVP | Renders fast enough for trip planning (10K+ points) |
| **Community** | ✅ Large, active | Lots of Stack Overflow answers, tutorials |
| **No Vendor Lock-in** | ✅ Fully portable | Future epics can switch if needed |

---

## Implementation Details for TASK-001

### Map Library Setup (TASK-001)

**Dependencies to Add**:
```json
{
  "dependencies": {
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "@types/leaflet": "^1.9.8"
  }
}
```

**Day 1 (TASK-001) Includes**:
1. Install `leaflet` + `react-leaflet` packages
2. Create `src/components/MapContainer.tsx`:
   ```tsx
   import { MapContainer, TileLayer, Popup, Marker } from 'react-leaflet'
   import L from 'leaflet'
   
   export default function MapComponent() {
     const center: [number, number] = [39.8283, -98.5795] // USA center
     
     return (
       <MapContainer center={center} zoom={4} style={{ height: '100%', width: '100%' }}>
         <TileLayer
           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
           attribution='© OpenStreetMap contributors'
         />
         {/* Trip markers will be added in EPIC-002 */}
       </MapContainer>
     )
   }
   ```
3. Add map container div in `src/app/page.tsx` (main page):
   ```tsx
   <div id="map-container" className="flex-1">
     <MapComponent />
   </div>
   ```
4. Test page renders + map displays (Leaflet attribution visible)

### Notes

- **No API Key Required**: OpenStreetMap is free and doesn't require authentication
- **Tile Layer**: Standard OSM tiles are performant for MVP
- **Future**: Can add custom tiles, alternative providers, or offline rendering in later epics
- **Zoom**: Default zoom level 4 shows entire USA; user clicks will zoom into specific locations

---

## Alternatives Considered (& Why Not)

| Option | Why Not Chosen |
|--------|---|
| **Google Maps** | Requires API key + billing; might be overkill for MVP; lock-in to Google |
| **Mapbox GL** | Requires API key + billing (though free tier); adds cost |
| **Deck.gl** | Better for 3D/HD maps; overkill for MVP trip planning |
| **Canvas-based (custom)** | Too much engineering for MVP; not justified |

**Decision**: Leaflet is the pragmatic choice for **fast MVP delivery** with **no cost** and **full portability**.

---

## Task 001 Updated Requirement

**TASK-001 Map Page Scaffold - UPDATED**

**Requirement**: Create map page with Leaflet + OpenStreetMap

**Subtasks**:
- [ ] Add leaflet + react-leaflet to `package.json`
- [ ] Create `src/components/MapContainer.tsx` with react-leaflet MapContainer
- [ ] Set default center to USA (39.8283, -98.5795), zoom 4
- [ ] Add OSM TileLayer with proper attribution
- [ ] Integrate MapContainer into `src/app/page.tsx`
- [ ] Test: Map displays in browser, no console errors
- [ ] Test: OpenStreetMap attribution visible (legal requirement)
- [ ] Unit test: MapContainer renders without errors

**Acceptance Criteria**:
- ✅ Map displays in browser at http://localhost:3000
- ✅ Can zoom/pan without errors
- ✅ OpenStreetMap attribution visible
- ✅ No API keys exposed in code
- ✅ Tests pass

---

## Go Decision

**Status**: ✅ **APPROVED - Ready for Implementer Agent**

🎯 **Implementer Agent can now start TASK-001** with Leaflet + OpenStreetMap as the confirmed choice.

---

**Decision Owner**: Development Lead  
**Associated Risk**: R-002 ✅ RESOLVED  
**Date**: March 2, 2026

