'use client';

/**
 * Map Page - Trip Planning Interface
 * Location: app/map/page.tsx
 * Task: TASK-001, TASK-004, TASK-006
 * 
 * Features:
 * - Interactive Leaflet map with OpenStreetMap tiles
 * - Map controls (zoom, fullscreen)
 * - Default view centered on US (for now)
 * - Trip creation form (TASK-004)
 * - Trip list and detail views (TASK-006)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import TripForm from './components/TripForm';
import TripList from './components/TripList';
import TripDetail from './components/TripDetail';
import MapContextMenu from './components/MapContextMenu';
import NearbySearchModal from './components/NearbySearchModal';
import TripadvisorSearchModal from './components/TripadvisorSearchModal';
import FoursquareSearchModal from './components/FoursquareSearchModal';
import StatusBar, { type StatusBarHandle } from './components/StatusBar';
import MarkerFilterPane, { type MarkerFilterGroup, type MarkerVisibility } from './components/MarkerFilterPane';
import PlacePopup from './components/PlacePopup';
import type { TripResponse, DailyDestinationResponse, DailyPoiResponse, BranchResponse } from '@/lib/schemas/trip';
import type { RouteSegmentResponse, RouteWaypointResponse } from '@/lib/schemas/routing';
import type { NearbyPlace } from '@/lib/nearby/types';
import type { PlaceResult } from '@/lib/schemas/geocoding';
import { decodePolyline } from '@/lib/polyline';
import { MAIN_BRANCH_COLOR } from '@/lib/branches';

// Small circular icons for draggable interval waypoint markers (STORY-007)
// Auto-generated waypoints use a muted terracotta; manually-placed ones use blue.
const WAYPOINT_ICON_AUTO =
  '<div style="width:10px;height:10px;border-radius:50%;background:#c05010;border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.35);cursor:grab;"></div>';
const WAYPOINT_ICON_MANUAL =
  '<div style="width:12px;height:12px;border-radius:50%;background:#2563eb;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);cursor:grab;"></div>';

// Emoji icons for nearby search result markers — must match NearbySearchModal PLACE_TYPES
const NEARBY_PLACE_EMOJIS: Record<string, string> = {
  tourist_attraction: '🏛️',
  park:               '🌳',
  rv_park:            '🚐',
  campground:         '⛺',
  mobile_home_park:   '🏕️',
  rest_stop:          '🛑',
  parking:            '🅿️',
  park4night:         '🚐',
  // Park4Night sub-types
  'Surrounded by nature':       '🌲',
  'Parking lot day/night':      '🅿️',
  'Rest area':                  '🛑',
  'Picnic area':                '🧺',
  'Free motorhome area':        '🚐',
  'Paying motorhome area':      '🚐',
  'Private car park for campers':'🚐',
  'Off-road':                   '🏔️',
  'On the farm':                '🌾',
  'Camping':                    '⛺',
  'Service area without parking':'🔧',
  'Daytime parking only':       '🅿️',
  'Homestays accommodation':    '🏠',
  'Extra services':             '🔧',
  'MH parking without services':'🚐',
};

function makeNearbyMarkerHtml(type: string, provider?: string, michelinStars?: number): string {
  if ((provider === 'chatgpt' || provider === 'claude') && michelinStars) {
    return makeExperienceMarkerHtml(michelinStars);
  }
  if (provider === 'tripadvisor') {
    return `<div style="width:28px;height:28px;border-radius:50%;background:#ecfdf5;border:1.5px solid #34d399;box-shadow:0 2px 4px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#059669;cursor:pointer;">TA</div>`;
  }
  if (provider === 'foursquare') {
    return `<div style="width:28px;height:28px;border-radius:50%;background:#eff6ff;border:1.5px solid #60a5fa;box-shadow:0 2px 4px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#2563eb;cursor:pointer;">FS</div>`;
  }
  const emoji = NEARBY_PLACE_EMOJIS[type] ?? '📍';
  const isP4n = provider === 'p4n' || type === 'park4night';
  const bg = isP4n ? '#ecfdf5' : '#fff';
  const border = isP4n ? '#6ee7b7' : '#d4d4d4';
  return `<div style="width:28px;height:28px;border-radius:50%;background:${bg};border:1.5px solid ${border};box-shadow:0 2px 4px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;">${emoji}</div>`;
}

// Star-rated marker for AI-discovered experiences (Michelin-style)
const EXPERIENCE_STAR_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  3: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' }, // gold — must-visit
  2: { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6' }, // purple — worth a detour
  1: { bg: '#e0f2fe', border: '#38bdf8', text: '#0369a1' }, // blue — worth a stop
};

function makeExperienceMarkerHtml(stars: number): string {
  const c = EXPERIENCE_STAR_COLORS[stars] ?? EXPERIENCE_STAR_COLORS[1];
  const starStr = '★'.repeat(stars);
  return `<div style="display:flex;align-items:center;justify-content:center;min-width:28px;height:28px;border-radius:14px;padding:0 6px;background:${c.bg};border:1.5px solid ${c.border};box-shadow:0 2px 4px rgba(0,0,0,.25);font-size:11px;font-weight:700;color:${c.text};cursor:pointer;white-space:nowrap;">${starStr}</div>`;
}

interface DiscoveredExperienceMarker {
  name: string;
  michelinStars: number;
  category: string;
  description: string;
  reasoning: string;
  approximateLat: number;
  approximateLng: number;
  nearestCity: string;
  country: string;
  estimatedDetourKm: number;
  seasonalNotes?: string;
  sources?: string[];
  /** Which AI provider discovered this experience */
  aiProvider?: 'chatgpt' | 'claude';
}

/** Haversine distance in metres between two lat/lng points. */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Build a labelled circular divIcon for destination/home markers. */
function makeLabelIconHtml(label: string, selected = false, color = '#e06319'): string {
  const bg = selected ? darkenHex(color, 0.2) : color;
  const shadow = selected
    ? `0 0 0 3px #fff, 0 0 0 5px ${color}, 0 2px 8px rgba(0,0,0,.5)`
    : '0 1px 5px rgba(0,0,0,.45)';
  const fontSize = label.length > 2 ? '9px' : '11px';
  return `<div style="width:28px;height:28px;border-radius:50%;background:${bg};border:2.5px solid #fff;box-shadow:${shadow};color:#fff;font-size:${fontSize};font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1;">${label}</div>`;
}

/** Darken a hex color by a given amount (0–1). */
function darkenHex(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((n & 0xff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Fix for default marker icons in Next.js
// Leaflet's default icon paths don't work with webpack
if (typeof window !== 'undefined') {
  const L = require('leaflet');
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

/**
 * Add the appropriate tile layer to the Leaflet map based on the selected provider.
 * Returns a promise that resolves once the tile layer has been added.
 */
async function addTileLayer(
  L: any,
  map: any,
  mapProvider: string,
  tileKey: string | null,
): Promise<any> {
  if (mapProvider === 'google' && tileKey) {
    // Pre-load Google Maps JS API so googlemutant can find window.google.maps immediately.
    await new Promise<void>((resolve) => {
      if ((window as any).google?.maps) { resolve(); return; }
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${tileKey}&libraries=places`;
      s.onload = () => resolve();
      document.head.appendChild(s);
    });
    // v0.16+ exports the class as default; the window.L factory is not available in webpack.
    const { default: GoogleMutant } = await import('leaflet.gridlayer.googlemutant');
    const mutantLayer = new (GoogleMutant as any)({ type: 'roadmap', maxZoom: 22 });
    mutantLayer.addTo(map);
    return mutantLayer;
  } else if (mapProvider === 'mapbox' && tileKey) {
    L.tileLayer(
      `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}?access_token=${tileKey}`,
      {
        attribution:
          '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> ' +
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        tileSize: 512,
        zoomOffset: -1,
        maxZoom: 22,
        minZoom: 3,
      },
    ).addTo(map);
  } else {
    // OpenStreetMap (default)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      minZoom: 3,
    }).addTo(map);
  }
}

type SidebarView = 'create' | 'list' | 'detail' | 'edit';

// ── localStorage persistence ────────────────────────────────────────────────
const STORAGE_KEY = 'tripPlanner:uiState';

interface PersistedState {
  tripId: string | null;
  mapLat: number;
  mapLng: number;
  mapZoom: number;
  selectedDayDestId: string | null;
}

function loadPersistedState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

function savePersistedState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota exceeded — ignore */ }
}

/** Return "Day N" for the given destination ID, or null if none/home. */
function getDayLabel(
  destId: string | null,
  destinations: DailyDestinationResponse[],
): string | null {
  if (!destId || destId === 'home') return null;
  const sorted = [...destinations]
    .filter((d) => d.latitude != null && d.longitude != null)
    .sort((a, b) => new Date(a.dayDate).getTime() - new Date(b.dayDate).getTime());
  const idx = sorted.findIndex((d) => d.id === destId);
  return idx >= 0 ? `Day ${idx + 1}` : null;
}

const toFormDate = (value: string | Date) => {
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().split('T')[0];
};

export default function MapPage() {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const statusBarRef = useRef<StatusBarHandle>(null);
  const routeLayerRef = useRef<any>(null); // Leaflet LayerGroup for route overlays
  const [isMapReady, setIsMapReady] = useState(false);
  const restoredRef = useRef<PersistedState | null>(null);

  // Sidebar state
  const [sidebarView, setSidebarView] = useState<SidebarView>('create');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  // Ref mirror so Leaflet event handlers always see the latest value
  const selectedTripIdRef = useRef(selectedTripId);
  const [editingTrip, setEditingTrip] = useState<TripResponse | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Trips dropdown menu state
  const [tripsMenuOpen, setTripsMenuOpen] = useState(false);
  const tripsMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!tripsMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (tripsMenuRef.current && !tripsMenuRef.current.contains(e.target as Node)) {
        setTripsMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTripsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [tripsMenuOpen]);

  // Delete confirmation state
  const [tripToDelete, setTripToDelete] = useState<TripResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Home location ref — populated from the settings fetch at map init
  const homeCoordsRef = useRef<{ name: string; latitude: number; longitude: number } | null>(null);

  // STORY-007: current route data refs (stable across Leaflet event handlers)
  const currentSegmentsRef = useRef<RouteSegmentResponse[]>([]);
  const currentDestinationsRef = useRef<DailyDestinationResponse[]>([]);
  const branchesRef = useRef<BranchResponse[]>([]);
  // Current trip date range — updated when the selected trip or its dates change
  const currentTripDatesRef = useRef<{ start: string; stop: string } | null>(null);
  // Ref to the latest handleWaypointMoved function so handleRouteData can
  // reference it without creating a circular useCallback dependency
  const onWaypointMovedRef = useRef<(id: string, lat: number, lng: number) => void>(() => {});
  // Ref to the latest handleSegmentClick so the Leaflet click handler is always current
  const onSegmentClickRef = useRef<(segId: string, lat: number, lng: number) => void>(() => {});
  // Selected day tracking — 'home' or a destination ID; updated by handleDaySelect
  const selectedDayDestIdRef = useRef<string | null>(null);
  // Map of id → {marker, label} for in-place icon updates on day selection
  const destMarkersRef = useRef<Map<string, { marker: any; label: string; color: string }>>(new Map());

  // Counter: handleRouteData skips fitBounds while this is > 0.
  // Each waypoint drag/segment click adds 2 (one for the immediate redraw,
  // one for the DailyDestinations re-fetch callback), and handleRouteData
  // decrements by 1 each time it runs.
  const skipFitBoundsRef = useRef(0);
  // Incrementing this causes DailyDestinations to re-fetch segments from DB
  const [segmentRefreshTrigger, setSegmentRefreshTrigger] = useState(0);
  // Incrementing this causes DailyDestinations to re-fetch destinations + regenerate routes
  const [destinationRefreshTrigger, setDestinationRefreshTrigger] = useState(0);

  // ── Search Nearby state ────────────────────────────────────────────────────
  // Context menu shown at the map click position
  const [contextMenu, setContextMenu] = useState<{
    lat: number; lng: number; x: number; y: number;
  } | null>(null);
  // Lat/lng captured when the user opened the "Search Nearby" modal
  const [nearbySearchPos, setNearbySearchPos] = useState<{ lat: number; lng: number } | null>(null);
  const [showNearbyModal, setShowNearbyModal] = useState(false);
  const [nearbyResults, setNearbyResults] = useState<NearbyPlace[]>([]);
  const [nearbyStatus, setNearbyStatus] = useState<'idle' | 'searching' | 'done'>('idle');
  const nearbyLayerRef = useRef<any>(null); // Leaflet LayerGroup for nearby markers
  const [selectedNearbyPlace, setSelectedNearbyPlace] = useState<NearbyPlace | null>(null);
  const [nearbySegmentPickerOpen, setNearbySegmentPickerOpen] = useState(false);
  const [nearbyDestPickerOpen, setNearbyDestPickerOpen] = useState(false);
  const [nearbyPoiPickerOpen, setNearbyPoiPickerOpen] = useState(false);
  // Ref so the Leaflet marker click handler always uses the latest setter
  const setSelectedNearbyPlaceRef = useRef(setSelectedNearbyPlace);
  // Tripadvisor search state
  const [showTripadvisorModal, setShowTripadvisorModal] = useState(false);
  const tripadvisorEnabledRef = useRef(false);
  // Foursquare search state
  const [showFoursquareModal, setShowFoursquareModal] = useState(false);
  const foursquareEnabledRef = useRef(false);
  // AI-discovered experiences state
  const [experienceResults, setExperienceResults] = useState<DiscoveredExperienceMarker[]>([]);
  const experienceLayerRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any -- Leaflet LayerGroup
  const [selectedExperience, setSelectedExperience] = useState<DiscoveredExperienceMarker | null>(null);
  const setSelectedExperienceRef = useRef(setSelectedExperience);

  // ── Marker filter pane state ────────────────────────────────────────────────
  const [markerFilterOpen, setMarkerFilterOpen] = useState(false);
  const [markerHidden, setMarkerHidden] = useState<MarkerVisibility>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem('markerFilterHidden');
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, string[]>;
      const result: MarkerVisibility = {};
      for (const [k, v] of Object.entries(parsed)) {
        result[k] = new Set(v);
      }
      return result;
    } catch {
      return {};
    }
  });
  // Persist marker filter to localStorage
  useEffect(() => {
    const serializable: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(markerHidden)) {
      if (v.size > 0) serializable[k] = [...v];
    }
    localStorage.setItem('markerFilterHidden', JSON.stringify(serializable));
  }, [markerHidden]);

  // Current map viewport bounds — updated on moveend for filter pane
  const [mapBounds, setMapBounds] = useState<{ south: number; west: number; north: number; east: number } | null>(null);

  // ── Daily POI state ─────────────────────────────────────────────────────────
  const [tripPois, setTripPois] = useState<DailyPoiResponse[]>([]);
  const poiLayerRef = useRef<any>(null);
  // Add-POI modal
  const [showAddPoiModal, setShowAddPoiModal] = useState(false);
  const [addPoiPos, setAddPoiPos] = useState<{ lat: number; lng: number } | null>(null);
  const [addPoiDestId, setAddPoiDestId] = useState<string | null>(null);
  const [addPoiName, setAddPoiName] = useState('');
  // POI info popup (shown when a POI marker is clicked)
  const [selectedPoi, setSelectedPoi] = useState<DailyPoiResponse | null>(null);
  const setSelectedPoiRef = useRef(setSelectedPoi);
  // Waypoint info popup (shown when a waypoint marker is clicked)
  const [selectedWaypoint, setSelectedWaypoint] = useState<(RouteWaypointResponse & { segmentDuration?: number }) | null>(null);
  const setSelectedWaypointRef = useRef(setSelectedWaypoint);
  // True when Google Maps is the tile provider (enables POI detection on click)
  const isGoogleProviderRef = useRef(false);
  // Flag set by Google Maps IconMouseEvent handler to suppress Leaflet's click
  const googlePoiClickedRef = useRef(false);

  // ── Place search bar state ─────────────────────────────────────────────────
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [placeSearchResults, setPlaceSearchResults] = useState<PlaceResult[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [placeSearchOpen, setPlaceSearchOpen] = useState(false);
  const placeSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePlaceSearchChange = useCallback((value: string) => {
    setPlaceSearchQuery(value);
    if (placeSearchTimerRef.current) clearTimeout(placeSearchTimerRef.current);
    if (value.trim().length < 3) {
      setPlaceSearchResults([]);
      setPlaceSearchOpen(false);
      return;
    }
    placeSearchTimerRef.current = setTimeout(async () => {
      setPlaceSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(value.trim())}&limit=5`);
        if (res.ok) {
          const data: PlaceResult[] = await res.json();
          setPlaceSearchResults(data);
          setPlaceSearchOpen(data.length > 0);
        }
      } catch {
        // silently degrade
      } finally {
        setPlaceSearching(false);
      }
    }, 400);
  }, []);

  const handlePlaceSelect = useCallback((place: PlaceResult) => {
    setPlaceSearchOpen(false);
    setPlaceSearchQuery(place.name);
    if (!mapRef.current) return;
    const L = (window as unknown as Record<string, unknown>).L as typeof import('leaflet');
    mapRef.current.setView([place.latitude, place.longitude], 13, { animate: true });
    // Drop a temporary marker to highlight the selected place
    const tempMarker = L.marker([place.latitude, place.longitude], {
      icon: L.divIcon({
        className: '',
        html: '<div style="width:14px;height:14px;border-radius:50%;background:#c0392b;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      }),
    });
    tempMarker.addTo(mapRef.current);
    tempMarker.bindTooltip(place.displayName, { permanent: true, direction: 'top', offset: [0, -10] }).openTooltip();
    setTimeout(() => {
      tempMarker.remove();
    }, 5000);
  }, []);

  // ── Marker filter helpers ──────────────────────────────────────────────────
  const PROVIDER_LABELS: Record<string, string> = {
    osm: 'OpenStreetMap',
    google: 'Google Places',
    p4n: 'Park4Night',
    tripadvisor: 'Tripadvisor',
    foursquare: 'Foursquare',
    chatgpt: 'AI Research (ChatGPT)',
    claude: 'AI Research (Claude)',
  };

  const PROVIDER_BADGE_STYLES: Record<string, string> = {
    osm: 'text-neutral-700 bg-neutral-50 border-neutral-200',
    google: 'text-blue-700 bg-blue-50 border-blue-200',
    p4n: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    tripadvisor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    foursquare: 'text-blue-700 bg-blue-50 border-blue-200',
    chatgpt: 'text-amber-700 bg-amber-50 border-amber-200',
    claude: 'text-orange-700 bg-orange-50 border-orange-200',
  };

  const TYPE_LABELS: Record<string, string> = {
    tourist_attraction: 'Attractions',
    park: 'Parks',
    rv_park: 'RV Parks',
    campground: 'Campgrounds',
    mobile_home_park: 'Mobile Home Parks',
    rest_stop: 'Rest Stops',
    parking: 'Parking',
    park4night: 'Park4Night',
    // Tripadvisor categories
    'tripadvisor': 'All',
    'tripadvisor:hotels': 'Hotels',
    'tripadvisor:restaurants': 'Restaurants',
    'tripadvisor:attractions': 'Attractions',
    // Foursquare categories
    'foursquare': 'All',
    'foursquare:food': 'Food',
    'foursquare:hotels': 'Hotels',
    'foursquare:outdoors': 'Outdoors',
    'foursquare:shopping': 'Shopping',
    'foursquare:arts': 'Arts',
  };

  /** Build filter groups from current marker data */
  const buildFilterGroups = useCallback((): MarkerFilterGroup[] => {
    const groups: MarkerFilterGroup[] = [];
    const b = mapBounds;
    const inBounds = (lat: number, lng: number) =>
      !b || (lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east);

    // Nearby results — group by provider, items by type
    if (nearbyResults.length > 0) {
      const visibleNearby = nearbyResults.filter((p) => inBounds(p.lat, p.lng));
      const byProvider = new Map<string, Map<string, number>>();
      for (const p of visibleNearby) {
        const prov = p.provider ?? 'osm';
        if (prov === 'chatgpt' || prov === 'claude') continue;
        if (!byProvider.has(prov)) byProvider.set(prov, new Map());
        const types = byProvider.get(prov)!; // eslint-disable-line @typescript-eslint/no-non-null-assertion -- checked above
        types.set(p.type, (types.get(p.type) ?? 0) + 1);
      }
      for (const [prov, types] of byProvider) {
        const items: MarkerFilterGroup['items'] = [];
        for (const [type, count] of types) {
          items.push({
            key: type,
            label: TYPE_LABELS[type] ?? type.replace(/_/g, ' '),
            count,
            iconHtml: makeNearbyMarkerHtml(type, prov),
          });
        }
        items.sort((a, b) => b.count - a.count);
        groups.push({ key: `nearby:${prov}`, label: PROVIDER_LABELS[prov] ?? prov, items });
      }

      // AI-researched cached places (from Show Cached) — both ChatGPT and Claude
      const aiCachedPlaces = visibleNearby.filter((p) => p.provider === 'chatgpt' || p.provider === 'claude');
      if (aiCachedPlaces.length > 0) {
        const byStars = new Map<number, number>();
        for (const p of aiCachedPlaces) {
          const stars = p.michelinStars ?? 1;
          byStars.set(stars, (byStars.get(stars) ?? 0) + 1);
        }
        const items: MarkerFilterGroup['items'] = [];
        for (const [stars, count] of [...byStars].sort((a, b) => b[0] - a[0])) {
          items.push({
            key: `stars:${stars}`,
            label: `${'★'.repeat(stars)} ${stars === 3 ? 'Must-visit' : stars === 2 ? 'Worth a detour' : 'Worth a stop'}`,
            count,
            iconHtml: makeExperienceMarkerHtml(stars),
          });
        }
        groups.push({ key: 'nearby:chatgpt', label: 'AI Cached', items });
      }
    }

    // AI experience results (from AI Research button)
    if (experienceResults.length > 0) {
      const visibleExp = experienceResults.filter((e) => inBounds(e.approximateLat, e.approximateLng));
      if (visibleExp.length > 0) {
        const byStars = new Map<number, number>();
        for (const e of visibleExp) {
          byStars.set(e.michelinStars, (byStars.get(e.michelinStars) ?? 0) + 1);
        }
        const items: MarkerFilterGroup['items'] = [];
        for (const [stars, count] of [...byStars].sort((a, b) => b[0] - a[0])) {
          items.push({
            key: `stars:${stars}`,
            label: `${'★'.repeat(stars)} ${stars === 3 ? 'Must-visit' : stars === 2 ? 'Worth a detour' : 'Worth a stop'}`,
            count,
            iconHtml: makeExperienceMarkerHtml(stars),
          });
        }
        groups.push({ key: 'experience', label: 'AI Research', items });
      }
    }

    // POIs
    if (tripPois.length > 0) {
      const visiblePois = tripPois.filter((p) => inBounds(p.latitude, p.longitude));
      if (visiblePois.length > 0) {
        groups.push({
          key: 'poi',
          label: 'Points of Interest',
          items: [{
            key: 'poi',
            label: 'POIs',
            count: visiblePois.length,
            iconHtml: '<div style="width:20px;height:20px;border-radius:50%;background:#7c3aed;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:12px;line-height:1;">📌</div>',
          }],
        });
      }
    }

    return groups;
  }, [nearbyResults, experienceResults, tripPois, mapBounds]);

  const handleToggleFilterItem = useCallback((groupKey: string, itemKey: string) => {
    setMarkerHidden((prev) => {
      const next = { ...prev };
      const set = new Set(next[groupKey] ?? []);
      if (set.has(itemKey)) {
        set.delete(itemKey);
      } else {
        set.add(itemKey);
      }
      next[groupKey] = set;
      return next;
    });
  }, []);

  const handleToggleFilterGroup = useCallback((groupKey: string) => {
    setMarkerHidden((prev) => {
      const groups = buildFilterGroups();
      const group = groups.find((g) => g.key === groupKey);
      if (!group) return prev;
      const next = { ...prev };
      const currentSet = next[groupKey] ?? new Set<string>();
      const allHidden = group.items.every((i) => currentSet.has(i.key));
      if (allHidden) {
        // Show all
        next[groupKey] = new Set<string>();
      } else {
        // Hide all
        next[groupKey] = new Set(group.items.map((i) => i.key));
      }
      return next;
    });
  }, [buildFilterGroups]);

  /** Check if a nearby place should be visible given current filter state */
  const isNearbyVisible = useCallback((place: NearbyPlace): boolean => {
    const prov = place.provider ?? 'osm';
    if (prov === 'chatgpt' || prov === 'claude') {
      const stars = place.michelinStars ?? 1;
      return !(markerHidden['nearby:chatgpt']?.has(`stars:${stars}`));
    }
    return !(markerHidden[`nearby:${prov}`]?.has(place.type));
  }, [markerHidden]);

  /** Check if an experience marker should be visible */
  const isExperienceVisible = useCallback((exp: DiscoveredExperienceMarker): boolean => {
    return !(markerHidden['experience']?.has(`stars:${exp.michelinStars}`));
  }, [markerHidden]);

  /** Check if POIs should be visible */
  const arePoIsVisible = !markerHidden['poi']?.has('poi');

  // Auto-open filter pane when markers appear
  useEffect(() => {
    if (nearbyResults.length > 0 || experienceResults.length > 0) {
      setMarkerFilterOpen(true);
    }
  }, [nearbyResults, experienceResults]);

  // Restore persisted state from localStorage on mount (avoids hydration mismatch)
  useEffect(() => {
    const saved = loadPersistedState();
    if (!saved) return;
    restoredRef.current = saved;
    selectedDayDestIdRef.current = saved.selectedDayDestId ?? null;
    if (saved.tripId) {
      setSelectedTripId(saved.tripId);
      setSidebarView('detail');
      // Fetch POIs for the restored trip
      fetch(`/api/daily-pois?tripId=${saved.tripId}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((pois) => { if (Array.isArray(pois)) setTripPois(pois); })
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep ref mirror in sync and persist trip/day changes
  useEffect(() => {
    selectedTripIdRef.current = selectedTripId;
    if (!mapRef.current) return;
    const c = mapRef.current.getCenter();
    savePersistedState({
      tripId: selectedTripId,
      mapLat: c.lat,
      mapLng: c.lng,
      mapZoom: mapRef.current.getZoom(),
      selectedDayDestId: selectedDayDestIdRef.current,
    });
  }, [selectedTripId]);

  const handleTripCreated = (trip: any) => {
    console.log('[MapPage] Trip created:', trip);
    setRefreshTrigger((prev) => prev + 1);
    // Switch to list view to show the new trip
    setSidebarView('list');
  };

  const handleTripSelect = (trip: TripResponse) => {
    clearRouteLayer();
    setNearbyResults([]);
    setNearbyStatus('idle');
    setSelectedNearbyPlace(null);
    setExperienceResults([]);
    setSelectedExperience(null);
    setTripPois([]);
    setSelectedPoi(null);
    setSelectedWaypoint(null);
    setMarkerFilterOpen(false);
    setMarkerHidden({});
    setSelectedTripId(trip.id);
    setSidebarView('detail');
    // Fetch POIs for this trip
    fetch(`/api/daily-pois?tripId=${trip.id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((pois) => { if (Array.isArray(pois)) setTripPois(pois); })
      .catch(() => {});
  };

  const handleBackToList = () => {
    clearRouteLayer();
    setNearbyResults([]);
    setNearbyStatus('idle');
    setSelectedNearbyPlace(null);
    setExperienceResults([]);
    setSelectedExperience(null);
    setTripPois([]);
    setSelectedPoi(null);
    setSelectedWaypoint(null);
    setMarkerFilterOpen(false);
    setMarkerHidden({});
    setSelectedTripId(null);
    setSidebarView('list');
  };

  const handleEdit = (trip: TripResponse) => {
    setEditingTrip(trip);
    setSidebarView('edit');
  };

  const handleEditCancel = () => {
    if (selectedTripId) {
      setSidebarView('detail');
      return;
    }
    setSidebarView('list');
  };

  const handleTripUpdated = (trip: TripResponse) => {
    setEditingTrip(trip);
    setSelectedTripId(trip.id);
    setRefreshTrigger((prev) => prev + 1);
    setSidebarView('detail');
  };

  const handleDeleteClick = (trip: TripResponse) => {
    setTripToDelete(trip);
  };

  // ─── Map route drawing ──────────────────────────────────────────────────────

  const clearRouteLayer = useCallback(() => {
    if (routeLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
  }, []);

  // Render/clear nearby search result markers whenever results or filter change
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;
    import('leaflet').then((L) => {
      // Remove previous nearby layer
      if (nearbyLayerRef.current) {
        mapRef.current.removeLayer(nearbyLayerRef.current);
        nearbyLayerRef.current = null;
      }
      if (nearbyResults.length === 0) return;
      const layer = L.layerGroup();
      for (const place of nearbyResults) {
        if (!isNearbyVisible(place)) continue;
        // Use the provider's own icon image when available, else the emoji divIcon
        const icon = place.iconUrl
          ? L.icon({
              iconUrl: place.iconUrl,
              iconSize: [32, 40],
              iconAnchor: [16, 40],
              popupAnchor: [0, -40],
              className: 'app-marker-shadow',
            })
          : L.divIcon({
              className: '',
              html: makeNearbyMarkerHtml(place.type, place.provider, place.michelinStars),
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            });
        const marker = L.marker([place.lat, place.lng], {
          icon,
          zIndexOffset: 500,
        });
        marker.bindTooltip(place.name, {
          permanent: false,
          direction: 'top',
          offset: place.iconUrl ? [0, -28] : [0, -14],
        });
        const captured = place;
        marker.on('click', (e: any) => {
          L.DomEvent.stopPropagation(e);
          setSelectedNearbyPlaceRef.current(captured);
        });
        marker.addTo(layer);
      }
      layer.addTo(mapRef.current);
      nearbyLayerRef.current = layer;
    });
  }, [nearbyResults, isMapReady, isNearbyVisible]);

  // Draw/update AI experience markers
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;
    import('leaflet').then((L) => {
      if (experienceLayerRef.current) {
        mapRef.current.removeLayer(experienceLayerRef.current);
        experienceLayerRef.current = null;
      }
      if (experienceResults.length === 0) return;
      const layer = L.layerGroup();
      for (const exp of experienceResults) {
        if (!isExperienceVisible(exp)) continue;
        const html = makeExperienceMarkerHtml(exp.michelinStars);
        const icon = L.divIcon({
          className: '',
          html,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker([exp.approximateLat, exp.approximateLng], {
          icon,
          zIndexOffset: 600,
        });
        marker.bindTooltip(
          `${'★'.repeat(exp.michelinStars)} ${exp.name}`,
          { permanent: false, direction: 'top', offset: [0, -14] },
        );
        const captured = exp;
        marker.on('click', (e: L.LeafletEvent) => {
          L.DomEvent.stopPropagation(e);
          setSelectedExperienceRef.current(captured);
        });
        marker.addTo(layer);
      }
      layer.addTo(mapRef.current);
      experienceLayerRef.current = layer;
    });
  }, [experienceResults, isMapReady, isExperienceVisible]);

  // Keep experience ref in sync
  useEffect(() => {
    setSelectedExperienceRef.current = setSelectedExperience;
  });

  // Draw/update POI markers whenever tripPois or the map changes
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;
    import('leaflet').then((L) => {
      if (poiLayerRef.current) {
        mapRef.current.removeLayer(poiLayerRef.current);
        poiLayerRef.current = null;
      }
      if (tripPois.length === 0 || !arePoIsVisible) return;
      const layer = L.layerGroup();
      for (const poi of tripPois) {
        const marker = L.marker([poi.latitude, poi.longitude], {
          icon: L.divIcon({
            className: '',
            html: '<div style="width:28px;height:28px;border-radius:50%;background:#7c3aed;border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;font-size:15px;line-height:1;">📌</div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
          zIndexOffset: 400,
        });
        marker.bindTooltip(poi.name, { permanent: false, direction: 'top', offset: [0, -14] });
        const captured = poi;
        marker.on('click', (e: any) => {
          L.DomEvent.stopPropagation(e);
          setSelectedPoiRef.current(captured);
        });
        marker.addTo(layer);
      }
      layer.addTo(mapRef.current);
      poiLayerRef.current = layer;
    });
  }, [tripPois, isMapReady, arePoIsVisible]);

  const handleRouteData = useCallback(
    (segments: RouteSegmentResponse[], destinations: DailyDestinationResponse[]) => {
      if (!mapRef.current) return;

      // Keep refs up-to-date for use in Leaflet drag handlers (STORY-007)
      currentSegmentsRef.current = segments;
      currentDestinationsRef.current = destinations;

      // Read and decrement the skip-fit counter synchronously before the async import
      const shouldFit = skipFitBoundsRef.current === 0;
      if (skipFitBoundsRef.current > 0) skipFitBoundsRef.current--;

      // Fetch branches for color lookups
      const tripId = destinations[0]?.tripId ?? segments[0]?.tripId;
      const branchesPromise = tripId
        ? fetch(`/api/branches?tripId=${tripId}`)
            .then((r) => (r.ok ? r.json() : []))
            .then((b: BranchResponse[]) => { branchesRef.current = b; return b; })
            .catch(() => [] as BranchResponse[])
        : Promise.resolve([] as BranchResponse[]);

      // Helper to resolve branch color from branchId
      const getBranchColor = (branchId: string | null | undefined): string => {
        if (!branchId) return MAIN_BRANCH_COLOR;
        const branch = branchesRef.current.find((b) => b.id === branchId);
        return branch?.color ?? MAIN_BRANCH_COLOR;
      };

      Promise.all([import('leaflet'), branchesPromise]).then(([L]) => {
        clearRouteLayer();

        const group = L.layerGroup();
        destMarkersRef.current.clear();

        // Draw labelled destination markers (H for home, 1/2/3… for each day)
        const home = homeCoordsRef.current;
        if (home) {
          const homeMarker = L.marker([home.latitude, home.longitude], {
            icon: L.divIcon({
              className: '',
              html: makeLabelIconHtml('H', selectedDayDestIdRef.current === 'home'),
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            }),
          }).bindTooltip(home.name, { permanent: false, direction: 'top', offset: [0, -14] });
          destMarkersRef.current.set('home', { marker: homeMarker, label: 'H', color: MAIN_BRANCH_COLOR });
          homeMarker.addTo(group);
        }

        const sortedDests = [...destinations]
          .filter((d) => d.latitude != null && d.longitude != null)
          .sort((a, b) => new Date(a.dayDate).getTime() - new Date(b.dayDate).getTime());

        // Separate main vs branch destinations for numbering
        const mainDests = sortedDests.filter((d) => !d.branchId);
        // Build a map of date string → day number from main destinations
        const dateToDayNum = new Map<string, number>();
        mainDests.forEach((d, i) => {
          dateToDayNum.set(new Date(d.dayDate).toISOString().split('T')[0], i + 1);
        });
        // Build a map of branchId → branch number (sortOrder + 1)
        const branchNumMap = new Map<string, number>();
        (branchesRef.current || []).forEach((b) => {
          branchNumMap.set(b.id, b.sortOrder + 1);
        });
        sortedDests.forEach((dest) => {
          const dateStr = new Date(dest.dayDate).toISOString().split('T')[0];
          const dayNum = dateToDayNum.get(dateStr);
          let label: string;
          if (!dest.branchId) {
            label = dayNum ? String(dayNum) : '?';
          } else {
            const branchNum = branchNumMap.get(dest.branchId) ?? 0;
            label = `${dayNum ?? '?'}.${branchNum}`;
          }
          const isSelected = selectedDayDestIdRef.current === dest.id;
          const color = getBranchColor(dest.branchId);
          const destMarker = L.marker([dest.latitude!, dest.longitude!], {
            icon: L.divIcon({
              className: '',
              html: makeLabelIconHtml(label, isSelected, color),
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            }),
          }).bindTooltip(dest.name, { permanent: false, direction: 'top', offset: [0, -14] });
          destMarkersRef.current.set(dest.id, { marker: destMarker, label, color });
          destMarker.addTo(group);
        });

        // Draw route polylines and interval waypoint markers
        const mapContainer = (mapRef.current as any)._container as HTMLElement | undefined;
        const allCoords: [number, number][] = [];
        for (const seg of segments) {
          if (!seg.encodedPolyline) continue;
          const coords = decodePolyline(seg.encodedPolyline);
          if (coords.length === 0) continue;
          allCoords.push(...coords);

          // Visible polyline — colored per branch
          const segColor = getBranchColor(seg.branchId);
          L.polyline(coords, {
            color: segColor,
            weight: 4,
            opacity: 0.85,
            interactive: false,
          }).addTo(group);

          // Wider transparent hit target — crosshair cursor + click-to-add-waypoint
          const segId = seg.id;
          const hitTarget = L.polyline(coords, {
            color: 'transparent',
            weight: 16,
            opacity: 0,
          });
          hitTarget.on('mouseover', () => { if (mapContainer) mapContainer.style.cursor = 'crosshair'; });
          hitTarget.on('mouseout',  () => { if (mapContainer) mapContainer.style.cursor = ''; });
          hitTarget.on('click', (e: any) => {
            L.DomEvent.stopPropagation(e);
            onSegmentClickRef.current(segId, e.latlng.lat, e.latlng.lng);
          });
          hitTarget.addTo(group);

          // Interval waypoints — draggable markers with time tooltips (STORY-007)
          for (const wp of (seg as RouteSegmentResponse & { waypoints?: RouteWaypointResponse[] }).waypoints ?? []) {
            const wpId = wp.id;
            const iconHtml = wp.isManual ? WAYPOINT_ICON_MANUAL : WAYPOINT_ICON_AUTO;
            const iconSize: [number, number] = wp.isManual ? [12, 12] : [10, 10];
            const waypointIcon = L.divIcon({
              className: '',
              html: iconHtml,
              iconSize,
              iconAnchor: [iconSize[0] / 2, iconSize[1] / 2],
            });
            const marker = L.marker([wp.latitude, wp.longitude], {
              icon: waypointIcon,
              draggable: true,
            });
            const tooltipText = wp.isManual
              ? 'Via-point'
              : `~${Math.round(wp.targetDurationSeconds / 60)} min`;
            marker.bindTooltip(tooltipText, {
              permanent: false,
              direction: 'top',
              offset: [0, -6],
            });
            marker.on('dragend', () => {
              const latlng = marker.getLatLng();
              onWaypointMovedRef.current(wpId, latlng.lat, latlng.lng);
            });
            marker.on('click', () => {
              setSelectedWaypointRef.current({ ...wp, segmentDuration: seg.durationSeconds });
            });
            marker.addTo(group);
          }
        }

        group.addTo(mapRef.current);
        routeLayerRef.current = group;

        // Fit map to show all route + destination markers
        const allPoints: [number, number][] = [
          ...allCoords,
          ...destinations
            .filter((d) => d.latitude != null && d.longitude != null)
            .map((d) => [d.latitude!, d.longitude!] as [number, number]),
        ];
        if (shouldFit && allPoints.length > 0) {
          mapRef.current.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40] });
        }
      });
    },
    [clearRouteLayer],
  );

  // STORY-007: handle a waypoint being dragged to a new position
  const handleWaypointMoved = useCallback(
    async (waypointId: string, lat: number, lng: number) => {
      try {
        const res = await fetch(`/api/route-waypoints/${waypointId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude: lat, longitude: lng }),
        });
        if (!res.ok) {
          console.error('[MapPage] Waypoint move failed:', res.status);
          return;
        }
        const updatedSegment: RouteSegmentResponse = await res.json();

        // Replace the updated segment in the current list and re-render the map
        // without zooming — the user is actively working at their current zoom level
        const newSegments = currentSegmentsRef.current.map((s) =>
          s.id === updatedSegment.id ? updatedSegment : s,
        );
        // +2: one for the immediate handleRouteData call, one for the
        // DailyDestinations re-fetch callback that follows segmentRefreshTrigger
        skipFitBoundsRef.current += 2;
        handleRouteData(newSegments, currentDestinationsRef.current);

        // Tell DailyDestinations to refresh its distance/duration display
        setSegmentRefreshTrigger((prev) => prev + 1);
      } catch (err) {
        console.error('[MapPage] Failed to move waypoint:', err);
      }
    },
    [handleRouteData],
  );

  // Keep the ref in sync so Leaflet drag handlers always call the latest version
  useEffect(() => {
    onWaypointMovedRef.current = handleWaypointMoved;
  }, [handleWaypointMoved]);

  // STORY-007: insert a new via-point at the clicked position on a polyline
  const handleSegmentClick = useCallback(
    async (segmentId: string, lat: number, lng: number) => {
      try {
        const res = await fetch(`/api/route-segments/${segmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude: lat, longitude: lng }),
        });
        if (!res.ok) {
          console.error('[MapPage] Via-point insert failed:', res.status);
          return;
        }
        const updatedSegment: RouteSegmentResponse = await res.json();

        const newSegments = currentSegmentsRef.current.map((s) =>
          s.id === updatedSegment.id ? updatedSegment : s,
        );
        skipFitBoundsRef.current += 2;
        handleRouteData(newSegments, currentDestinationsRef.current);
        setSegmentRefreshTrigger((prev) => prev + 1);
      } catch (err) {
        console.error('[MapPage] Failed to insert via-point:', err);
      }
    },
    [handleRouteData],
  );

  useEffect(() => {
    onSegmentClickRef.current = handleSegmentClick;
  }, [handleSegmentClick]);

  // Keep setter ref current so Leaflet marker handlers can call the latest version
  useEffect(() => {
    setSelectedNearbyPlaceRef.current = setSelectedNearbyPlace;
  });

  // ── Search Nearby handlers ─────────────────────────────────────────────────

  const handleOpenNearbyModal = useCallback(() => {
    if (!contextMenu) return;
    setNearbySearchPos({ lat: contextMenu.lat, lng: contextMenu.lng });
    setContextMenu(null);
    setShowNearbyModal(true);
  }, [contextMenu]);

  const handleSearchPark4Night = useCallback(() => {
    if (!contextMenu || !mapRef.current) return;
    const pos = { lat: contextMenu.lat, lng: contextMenu.lng };
    setContextMenu(null);
    setNearbyResults([]);
    setNearbyStatus('searching');

    const bounds = mapRef.current.getBounds();
    const ne = bounds.getNorthEast();
    const center = bounds.getCenter();
    const halfDiag = haversineMeters(center.lat, center.lng, ne.lat, ne.lng);
    const radiusMeters = Math.min(Math.round(halfDiag), 50_000);

    fetch('/api/nearby-search/park4night', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: pos.lat, lng: pos.lng, radiusMeters }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        const places = data.places ?? [];
        setNearbyResults(places);
        statusBarRef.current?.pushStatus(`Found ${places.length} places via Park4Night`);
      })
      .catch((err) => {
        console.error('[MapPage] Park4Night search error:', err);
        statusBarRef.current?.pushStatus('Park4Night search failed', String(err));
      })
      .finally(() => setNearbyStatus('done'));
  }, [contextMenu]);

  const handleOpenTripadvisorModal = useCallback(() => {
    if (!contextMenu) return;
    setNearbySearchPos({ lat: contextMenu.lat, lng: contextMenu.lng });
    setContextMenu(null);
    setShowTripadvisorModal(true);
  }, [contextMenu]);

  const handleSearchTripadvisor = useCallback(
    async (category?: string) => {
      if (!nearbySearchPos || !mapRef.current) return;
      setShowTripadvisorModal(false);
      setNearbyResults([]);
      setNearbyStatus('searching');

      const bounds = mapRef.current.getBounds();
      const ne = bounds.getNorthEast();
      const center = bounds.getCenter();
      const halfDiag = haversineMeters(center.lat, center.lng, ne.lat, ne.lng);
      const radiusMeters = Math.min(Math.round(halfDiag), 50_000);

      try {
        const res = await fetch('/api/nearby-search/tripadvisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: nearbySearchPos.lat,
            lng: nearbySearchPos.lng,
            radiusMeters,
            ...(category ? { category } : {}),
          }),
        });
        const data = await res.json();
        const places = data.places ?? [];
        if (data.error) {
          console.warn('[MapPage] Tripadvisor:', data.error);
          statusBarRef.current?.pushStatus(`Tripadvisor: ${data.error}`, JSON.stringify(data, null, 2));
        } else {
          statusBarRef.current?.pushStatus(`Found ${places.length} places via Tripadvisor`);
        }
        setNearbyResults(places);
      } catch (err) {
        console.error('[MapPage] Tripadvisor search error:', err);
        statusBarRef.current?.pushStatus('Tripadvisor search failed', String(err));
      } finally {
        setNearbyStatus('done');
      }
    },
    [nearbySearchPos],
  );

  const handleOpenFoursquareModal = useCallback(() => {
    if (!contextMenu) return;
    setNearbySearchPos({ lat: contextMenu.lat, lng: contextMenu.lng });
    setContextMenu(null);
    setShowFoursquareModal(true);
  }, [contextMenu]);

  const handleSearchFoursquare = useCallback(
    async (category?: string) => {
      if (!nearbySearchPos || !mapRef.current) return;
      setShowFoursquareModal(false);
      setNearbyResults([]);
      setNearbyStatus('searching');

      const bounds = mapRef.current.getBounds();
      const ne = bounds.getNorthEast();
      const center = bounds.getCenter();
      const halfDiag = haversineMeters(center.lat, center.lng, ne.lat, ne.lng);
      const radiusMeters = Math.min(Math.round(halfDiag), 50_000);

      try {
        const res = await fetch('/api/nearby-search/foursquare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: nearbySearchPos.lat,
            lng: nearbySearchPos.lng,
            radiusMeters,
            ...(category ? { category } : {}),
          }),
        });
        const data = await res.json();
        const places = data.places ?? [];
        if (data.error) {
          console.warn('[MapPage] Foursquare:', data.error);
          statusBarRef.current?.pushStatus(`Foursquare: ${data.error}`, JSON.stringify(data, null, 2));
        } else {
          statusBarRef.current?.pushStatus(`Found ${places.length} places via Foursquare`);
        }
        setNearbyResults(places);
      } catch (err) {
        console.error('[MapPage] Foursquare search error:', err);
        statusBarRef.current?.pushStatus('Foursquare search failed', String(err));
      } finally {
        setNearbyStatus('done');
      }
    },
    [nearbySearchPos],
  );

  const handleShowCached = useCallback(async () => {
    if (!mapRef.current) return;
    setNearbyResults([]);
    setNearbyStatus('searching');
    try {
      const bounds = mapRef.current.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const params = new URLSearchParams({
        south: String(sw.lat),
        west: String(sw.lng),
        north: String(ne.lat),
        east: String(ne.lng),
      });
      const res = await fetch(`/api/nearby-search/cached?${params}`);
      if (res.ok) {
        const data = await res.json();
        const places = data.places ?? [];
        setNearbyResults(places);
        statusBarRef.current?.pushStatus(`Loaded ${places.length} cached places`);
      } else {
        console.error('[MapPage] Cached places fetch failed:', res.status);
        statusBarRef.current?.pushStatus(`Failed to load cached places (${res.status})`);
      }
    } catch (err) {
      console.error('[MapPage] Cached places error:', err);
      statusBarRef.current?.pushStatus('Failed to load cached places', String(err));
    } finally {
      setNearbyStatus('done');
    }
  }, []);

  const handleAiResearchArea = useCallback(async () => {
    if (!mapRef.current) return;
    setContextMenu(null);
    statusBarRef.current?.setLoading('AI researching visible area...');
    try {
      const b = mapRef.current.getBounds();
      const sw = b.getSouthWest();
      const ne = b.getNorthEast();
      const res = await fetch('/api/discover-experiences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/x-ndjson',
        },
        body: JSON.stringify({
          bounds: { south: sw.lat, west: sw.lng, north: ne.lat, east: ne.lng },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        statusBarRef.current?.pushStatus(`AI Research failed: ${data.error ?? res.status}`, JSON.stringify(data));
        return;
      }

      // Read NDJSON stream for progress updates
      const reader = res.body?.getReader();
      if (!reader) {
        statusBarRef.current?.pushStatus('AI Research failed: no response stream');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let resultData: Record<string, unknown> | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const ev = JSON.parse(line) as { type: string; message?: string; data?: Record<string, unknown> };
            if (ev.type === 'progress' && ev.message) {
              statusBarRef.current?.setLoading(ev.message);
            } else if (ev.type === 'result' && ev.data) {
              resultData = ev.data;
            } else if (ev.type === 'error') {
              statusBarRef.current?.pushStatus(`AI Research failed: ${ev.message ?? 'Unknown error'}`);
            }
          } catch { /* ignore malformed lines */ }
        }
      }

      if (resultData) {
        const data = resultData;
        const aiProv: 'chatgpt' | 'claude' = data.aiProvider === 'claude' ? 'claude' : 'chatgpt';
        const experiences = ((data.experiences ?? []) as DiscoveredExperienceMarker[]).map((e) => ({ ...e, aiProvider: aiProv }));
        setExperienceResults(experiences);
        const providerLabel = (data.aiProvider as string) === 'claude' ? 'Claude' : 'ChatGPT';
        const tokens = (data.tokenUsage as { totalTokens?: number })?.totalTokens ?? 0;
        statusBarRef.current?.pushStatus(
          `AI Research (${providerLabel}): ${experiences.length} experiences${(data.cached as boolean) ? ' (cached)' : ''} — ${tokens} tokens`,
        );
      }
    } catch (err) {
      console.error('[MapPage] AI area research error:', err);
      statusBarRef.current?.pushStatus('AI Research failed', String(err));
    }
  }, []);

  const handleNearbySearch = useCallback(
    async (type: string) => {
      if (!nearbySearchPos || !mapRef.current) return;
      setShowNearbyModal(false);
      setNearbyResults([]);
      setNearbyStatus('searching');

      // Compute search radius from visible map area, capped at 25 km
      const bounds = mapRef.current.getBounds();
      const ne = bounds.getNorthEast();
      const center = bounds.getCenter();
      const halfDiag = haversineMeters(center.lat, center.lng, ne.lat, ne.lng);
      const radiusMeters = Math.min(Math.round(halfDiag), 25_000);

      try {
        const res = await fetch('/api/nearby-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: nearbySearchPos.lat, lng: nearbySearchPos.lng, radiusMeters, type }),
        });
        if (res.ok) {
          const data = await res.json();
          const places = data.places ?? [];
          setNearbyResults(places);
          statusBarRef.current?.pushStatus(`Found ${places.length} places nearby`);
        } else {
          console.error('[MapPage] Nearby search failed:', res.status);
          statusBarRef.current?.pushStatus(`Nearby search failed (${res.status})`);
        }
      } catch (err) {
        console.error('[MapPage] Nearby search error:', err);
        statusBarRef.current?.pushStatus('Nearby search failed', String(err));
      } finally {
        setNearbyStatus('done');
      }
    },
    [nearbySearchPos],
  );

  const handleAddAsVia = useCallback(
    async (segmentId: string) => {
      if (!selectedNearbyPlace) return;
      setNearbySegmentPickerOpen(false);
      try {
        const res = await fetch(`/api/route-segments/${segmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: selectedNearbyPlace.lat,
            longitude: selectedNearbyPlace.lng,
          }),
        });
        if (!res.ok) {
          console.error('[MapPage] Add as via failed:', res.status);
          return;
        }
        const updatedSegment: RouteSegmentResponse = await res.json();
        const newSegments = currentSegmentsRef.current.map((s) =>
          s.id === updatedSegment.id ? updatedSegment : s,
        );
        skipFitBoundsRef.current += 2;
        handleRouteData(newSegments, currentDestinationsRef.current);
        setSegmentRefreshTrigger((prev) => prev + 1);
        setSelectedNearbyPlace(null);
      } catch (err) {
        console.error('[MapPage] Failed to add via-point:', err);
      }
    },
    [selectedNearbyPlace, handleRouteData],
  );

  const handleAddAsDestination = useCallback(
    async (destinationIdOrDate: string) => {
      if (!selectedNearbyPlace || !selectedTripId) return;
      setNearbyDestPickerOpen(false);
      try {
        // If it looks like a date (YYYY-MM-DD), create a new destination; otherwise PATCH existing
        const isDate = /^\d{4}-\d{2}-\d{2}$/.test(destinationIdOrDate);
        let res: Response;
        const municipality = selectedNearbyPlace.address || null;
        if (isDate) {
          res = await fetch('/api/daily-destinations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tripId: selectedTripId,
              dayDate: destinationIdOrDate,
              name: selectedNearbyPlace.name,
              municipality,
              latitude: selectedNearbyPlace.lat,
              longitude: selectedNearbyPlace.lng,
            }),
          });
        } else {
          // Demote existing destination to a POI before replacing it
          const oldDest = currentDestinationsRef.current.find((d) => d.id === destinationIdOrDate);
          if (oldDest?.latitude != null && oldDest?.longitude != null) {
            const poiRes = await fetch('/api/daily-pois', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tripId: selectedTripId,
                dayDate: new Date(oldDest.dayDate).toISOString().split('T')[0],
                name: oldDest.name,
                latitude: oldDest.latitude,
                longitude: oldDest.longitude,
              }),
            });
            if (poiRes.ok) {
              const newPoi = await poiRes.json();
              setTripPois((prev) => [...prev, newPoi]);
            }
          }
          res = await fetch(`/api/daily-destinations/${destinationIdOrDate}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: selectedNearbyPlace.name,
              municipality,
              latitude: selectedNearbyPlace.lat,
              longitude: selectedNearbyPlace.lng,
            }),
          });
        }
        if (!res.ok) {
          console.error('[MapPage] Add as destination failed:', res.status);
          return;
        }
        // Re-fetch destinations and regenerate routes to reflect the new coordinates
        setDestinationRefreshTrigger((prev) => prev + 1);
        setSelectedNearbyPlace(null);
      } catch (err) {
        console.error('[MapPage] Failed to add as destination:', err);
      }
    },
    [selectedNearbyPlace, selectedTripId],
  );

  // Add a nearby search result as a POI for the given destination's day
  const handleAddAsPoiForDay = useCallback(
    async (destId: string) => {
      if (!selectedNearbyPlace || !selectedTripId) return;
      setNearbyPoiPickerOpen(false);
      const dest = currentDestinationsRef.current.find((d) => d.id === destId);
      if (!dest) return;
      try {
        const res = await fetch('/api/daily-pois', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId: selectedTripId,
            dayDate: new Date(dest.dayDate).toISOString().split('T')[0],
            name: selectedNearbyPlace.name,
            latitude: selectedNearbyPlace.lat,
            longitude: selectedNearbyPlace.lng,
          }),
        });
        if (res.ok) {
          const newPoi = await res.json();
          setTripPois((prev) => [...prev, newPoi]);
          setSelectedNearbyPlace(null);
        }
      } catch (err) {
        console.error('[MapPage] Failed to add nearby place as POI:', err);
      }
    },
    [selectedNearbyPlace, selectedTripId],
  );

  const handleAddAsParkupForDay = useCallback(
    async (destId: string) => {
      if (!selectedNearbyPlace || !selectedTripId) return;
      const dest = currentDestinationsRef.current.find((d) => d.id === destId);
      if (!dest) return;
      try {
        const res = await fetch('/api/daily-pois', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId: selectedTripId,
            dayDate: new Date(dest.dayDate).toISOString().split('T')[0],
            name: selectedNearbyPlace.name,
            latitude: selectedNearbyPlace.lat,
            longitude: selectedNearbyPlace.lng,
            category: 'parkup',
          }),
        });
        if (res.ok) {
          const newPoi = await res.json();
          setTripPois((prev) => [...prev, newPoi]);
          setSelectedNearbyPlace(null);
        }
      } catch (err) {
        console.error('[MapPage] Failed to add nearby place as parkup:', err);
      }
    },
    [selectedNearbyPlace, selectedTripId],
  );

  // Add an AI-discovered experience — picker state for via-point, destination, and POI
  const [experiencePoiPickerOpen, setExperiencePoiPickerOpen] = useState(false);
  const [experienceSegmentPickerOpen, setExperienceSegmentPickerOpen] = useState(false);
  const [experienceDestPickerOpen, setExperienceDestPickerOpen] = useState(false);

  const handleAddExperienceAsVia = useCallback(
    async (segmentId: string) => {
      if (!selectedExperience) return;
      setExperienceSegmentPickerOpen(false);
      try {
        const res = await fetch(`/api/route-segments/${segmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: selectedExperience.approximateLat,
            longitude: selectedExperience.approximateLng,
          }),
        });
        if (!res.ok) {
          console.error('[MapPage] Add experience as via failed:', res.status);
          return;
        }
        const updatedSegment: RouteSegmentResponse = await res.json();
        const newSegments = currentSegmentsRef.current.map((s) =>
          s.id === updatedSegment.id ? updatedSegment : s,
        );
        skipFitBoundsRef.current += 2;
        handleRouteData(newSegments, currentDestinationsRef.current);
        setSegmentRefreshTrigger((prev) => prev + 1);
        setSelectedExperience(null);
        statusBarRef.current?.pushStatus(`Added "${selectedExperience.name}" as via-point`);
      } catch (err) {
        console.error('[MapPage] Failed to add experience as via-point:', err);
      }
    },
    [selectedExperience, handleRouteData],
  );

  const handleAddExperienceAsDestination = useCallback(
    async (destinationIdOrDate: string) => {
      if (!selectedExperience || !selectedTripId) return;
      setExperienceDestPickerOpen(false);
      try {
        const isDate = /^\d{4}-\d{2}-\d{2}$/.test(destinationIdOrDate);
        let res: Response;
        if (isDate) {
          res = await fetch('/api/daily-destinations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tripId: selectedTripId,
              dayDate: destinationIdOrDate,
              name: selectedExperience.name,
              latitude: selectedExperience.approximateLat,
              longitude: selectedExperience.approximateLng,
            }),
          });
        } else {
          // Demote existing destination to a POI before replacing it
          const oldDest = currentDestinationsRef.current.find((d) => d.id === destinationIdOrDate);
          if (oldDest?.latitude != null && oldDest?.longitude != null) {
            const poiRes = await fetch('/api/daily-pois', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tripId: selectedTripId,
                dayDate: new Date(oldDest.dayDate).toISOString().split('T')[0],
                name: oldDest.name,
                latitude: oldDest.latitude,
                longitude: oldDest.longitude,
              }),
            });
            if (poiRes.ok) {
              const newPoi = await poiRes.json();
              setTripPois((prev) => [...prev, newPoi]);
            }
          }
          res = await fetch(`/api/daily-destinations/${destinationIdOrDate}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: selectedExperience.name,
              latitude: selectedExperience.approximateLat,
              longitude: selectedExperience.approximateLng,
            }),
          });
        }
        if (!res.ok) {
          console.error('[MapPage] Add experience as destination failed:', res.status);
          return;
        }
        setDestinationRefreshTrigger((prev) => prev + 1);
        setSelectedExperience(null);
        statusBarRef.current?.pushStatus(`Added "${selectedExperience.name}" as destination`);
      } catch (err) {
        console.error('[MapPage] Failed to add experience as destination:', err);
      }
    },
    [selectedExperience, selectedTripId],
  );

  const handleAddExperienceAsPoi = useCallback(
    async (destId: string) => {
      if (!selectedExperience || !selectedTripId) return;
      setExperiencePoiPickerOpen(false);
      const dest = currentDestinationsRef.current.find((d) => d.id === destId);
      if (!dest) return;
      try {
        const res = await fetch('/api/daily-pois', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId: selectedTripId,
            dayDate: new Date(dest.dayDate).toISOString().split('T')[0],
            name: selectedExperience.name,
            latitude: selectedExperience.approximateLat,
            longitude: selectedExperience.approximateLng,
          }),
        });
        if (res.ok) {
          const newPoi = await res.json();
          setTripPois((prev) => [...prev, newPoi]);
          setSelectedExperience(null);
          statusBarRef.current?.pushStatus(`Added "${selectedExperience.name}" as POI`);
        }
      } catch (err) {
        console.error('[MapPage] Failed to add experience as POI:', err);
      }
    },
    [selectedExperience, selectedTripId],
  );

  const handleAddExperienceAsParkup = useCallback(
    async (destId: string) => {
      if (!selectedExperience || !selectedTripId) return;
      const dest = currentDestinationsRef.current.find((d) => d.id === destId);
      if (!dest) return;
      try {
        const res = await fetch('/api/daily-pois', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId: selectedTripId,
            dayDate: new Date(dest.dayDate).toISOString().split('T')[0],
            name: selectedExperience.name,
            latitude: selectedExperience.approximateLat,
            longitude: selectedExperience.approximateLng,
            category: 'parkup',
          }),
        });
        if (res.ok) {
          const newPoi = await res.json();
          setTripPois((prev) => [...prev, newPoi]);
          setSelectedExperience(null);
          statusBarRef.current?.pushStatus(`Added "${selectedExperience.name}" as parkup`);
        }
      } catch (err) {
        console.error('[MapPage] Failed to add experience as parkup:', err);
      }
    },
    [selectedExperience, selectedTripId],
  );

  // Zoom the map to a set of lat/lng points (called from day-badge clicks)
  const handleFitPoints = useCallback((points: [number, number][]) => {
    if (!mapRef.current || points.length === 0) return;
    // fitBounds accepts a LatLngBoundsExpression — [[lat,lng],...] works directly
    mapRef.current.fitBounds(points, { padding: [60, 60], maxZoom: 14 });
  }, []);

  // Update map marker icons when the selected day changes (no full layer rebuild)
  const handleDaySelect = useCallback((destinationId: string | null) => {
    const L = require('leaflet');
    const prevId = selectedDayDestIdRef.current;
    if (prevId !== null) {
      const entry = destMarkersRef.current.get(prevId);
      if (entry) {
        entry.marker.setIcon(L.divIcon({
          className: '',
          html: makeLabelIconHtml(entry.label, false, entry.color),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }));
      }
    }
    selectedDayDestIdRef.current = destinationId;
    if (destinationId !== null) {
      const entry = destMarkersRef.current.get(destinationId);
      if (entry) {
        entry.marker.setIcon(L.divIcon({
          className: '',
          html: makeLabelIconHtml(entry.label, true, entry.color),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }));
      }
    }
    // Persist selected day
    if (mapRef.current) {
      const c = mapRef.current.getCenter();
      savePersistedState({
        tripId: selectedTripIdRef.current,
        mapLat: c.lat,
        mapLng: c.lng,
        mapZoom: mapRef.current.getZoom(),
        selectedDayDestId: destinationId,
      });
    }
  }, []);

  // ── Sidebar click-to-zoom handlers ────────────────────────────────────────
  const handleSidebarPoiClick = useCallback((poi: DailyPoiResponse) => {
    if (!mapRef.current || poi.latitude == null || poi.longitude == null) return;
    mapRef.current.setView([poi.latitude, poi.longitude], 15, { animate: true });
    setSelectedPoi(poi);
  }, []);

  const handleSidebarDestinationClick = useCallback((dest: DailyDestinationResponse) => {
    if (!mapRef.current || dest.latitude == null || dest.longitude == null) return;
    mapRef.current.setView([dest.latitude, dest.longitude], 13, { animate: true });
    handleDaySelect(dest.id);
  }, [handleDaySelect]);

  // Open the Add-POI modal at the context-menu position
  const handleOpenAddPoiModal = useCallback(() => {
    if (!contextMenu) return;
    setAddPoiPos({ lat: contextMenu.lat, lng: contextMenu.lng });
    const selId = selectedDayDestIdRef.current;
    setAddPoiDestId(selId !== 'home' ? selId : null);
    setAddPoiName('');
    setContextMenu(null);
    setShowAddPoiModal(true);
  }, [contextMenu]);

  // Save a new POI
  const handleSavePoi = useCallback(async () => {
    if (!addPoiPos || !selectedTripId || !addPoiDestId) return;
    const dest = currentDestinationsRef.current.find((d) => d.id === addPoiDestId);
    if (!dest) return;
    try {
      const res = await fetch('/api/daily-pois', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: selectedTripId,
          dayDate: new Date(dest.dayDate).toISOString().split('T')[0],
          name: addPoiName.trim() || 'Point of Interest',
          latitude: addPoiPos.lat,
          longitude: addPoiPos.lng,
        }),
      });
      if (res.ok) {
        const newPoi = await res.json();
        setTripPois((prev) => [...prev, newPoi]);
        setShowAddPoiModal(false);
        setAddPoiName('');
        setAddPoiDestId(null);
      }
    } catch (err) {
      console.error('[MapPage] Failed to create POI:', err);
    }
  }, [addPoiPos, selectedTripId, addPoiDestId, addPoiName]);

  // Delete a POI
  const handleDeletePoi = useCallback(async () => {
    if (!selectedPoi) return;
    try {
      const res = await fetch(`/api/daily-pois/${selectedPoi.id}`, { method: 'DELETE' });
      if (res.ok) {
        setTripPois((prev) => prev.filter((p) => p.id !== selectedPoi.id));
        setSelectedPoi(null);
      }
    } catch (err) {
      console.error('[MapPage] Failed to delete POI:', err);
    }
  }, [selectedPoi]);

  // Delete a waypoint
  const handleDeleteWaypoint = useCallback(async () => {
    if (!selectedWaypoint) return;
    try {
      const res = await fetch(`/api/route-waypoints/${selectedWaypoint.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedWaypoint(null);
        setSegmentRefreshTrigger((prev) => prev + 1);
      }
    } catch (err) {
      console.error('[MapPage] Failed to delete waypoint:', err);
    }
  }, [selectedWaypoint]);

  const handleDeleteCancel = () => {
    setTripToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!tripToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/trips/${tripToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete trip');
      }

      // Success - refresh list and go back to list view
      setRefreshTrigger((prev) => prev + 1);
      setTripToDelete(null);
      setSidebarView('list');
      setSelectedTripId(null);
    } catch (error) {
      console.error('[MapPage] Error deleting trip:', error);
      alert('Failed to delete trip. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    // Only initialize map on client side
    if (typeof window === 'undefined' || !mapContainerRef.current) return;
    if (mapRef.current) return; // Already initialized

    // Fetch settings and map config in parallel to set initial map position and tile layer
    Promise.all([
      fetch('/api/settings').then((r) => r.ok ? r.json() : []),
      fetch('/api/map-config').then((r) => r.ok ? r.json() : { provider: 'osm', tileKey: null }),
    ]).then(([rows, mapConfig]: [{ key: string; value: string }[], { provider: string; tileKey: string | null }]) => {
      const sm = Object.fromEntries(rows.map((r: { key: string; value: string }) => [r.key, r.value]));
      const homeLat = sm['home.latitude'] ? parseFloat(sm['home.latitude']) : null;
      const homeLng = sm['home.longitude'] ? parseFloat(sm['home.longitude']) : null;
      // Detect Tripadvisor API key availability
      tripadvisorEnabledRef.current = sm['tripadvisor.api_key'] === '[SET]';
      // Detect Foursquare API key availability
      foursquareEnabledRef.current = sm['foursquare.api_key'] === '[SET]';

      if (homeLat !== null && homeLng !== null) {
        homeCoordsRef.current = {
          name: sm['home.name'] ?? 'Home',
          latitude: homeLat,
          longitude: homeLng,
        };
      }

      const { provider: mapProvider, tileKey } = mapConfig;

      // Dynamically import leaflet to avoid SSR issues
      import('leaflet').then((L) => {
        // Restore saved map position, or fall back to home / Europe
        const saved = restoredRef.current;
        const center: [number, number] = saved
          ? [saved.mapLat, saved.mapLng]
          : (homeLat !== null && homeLng !== null)
            ? [homeLat, homeLng]
            : [54, 15]; // Centre of Europe
        const zoom = saved
          ? saved.mapZoom
          : (homeLat !== null && homeLng !== null) ? 8 : 4;

        const map = L.map(mapContainerRef.current!, {
          center,
          zoom,
          zoomControl: true,
        });

        // Map-level click → show context menu (POI clicks are handled by
        // the Google Maps IconMouseEvent listener set up after tile init)
        map.on('click', (e: any) => {
          // If the Google Maps click handler already handled a POI, skip
          if (googlePoiClickedRef.current) {
            googlePoiClickedRef.current = false;
            return;
          }
          setContextMenu({
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            x: e.containerPoint.x,
            y: e.containerPoint.y,
          });
        });

        // Save map position/zoom to localStorage on every move; update filter bounds
        map.on('moveend', () => {
          const c = map.getCenter();
          savePersistedState({
            tripId: selectedTripIdRef.current,
            mapLat: c.lat,
            mapLng: c.lng,
            mapZoom: map.getZoom(),
            selectedDayDestId: selectedDayDestIdRef.current,
          });
          const b = map.getBounds();
          const sw = b.getSouthWest();
          const ne = b.getNorthEast();
          setMapBounds({ south: sw.lat, west: sw.lng, north: ne.lat, east: ne.lng });
        });

        // Add tile layer for the selected map provider, then mark map ready
        addTileLayer(L, map, mapProvider, tileKey).then((mutantLayer: any) => {
          mapRef.current = map;
          setIsMapReady(true);
          isGoogleProviderRef.current = mapProvider === 'google';

          // When Google Maps is the provider, make the hidden Google Maps
          // instance receive real mouse clicks so we can detect POI icon
          // clicks via the native IconMouseEvent (which carries placeId).
          if (mutantLayer && mapProvider === 'google') {
            mutantLayer.whenReady(() => {
              const gmap = mutantLayer._mutant;        // google.maps.Map
              const container = mutantLayer._mutantContainer as HTMLElement;
              if (!gmap || !container) return;

              // Switch from visibility:hidden to opacity:0 so the Google
              // Maps Canvas is rendered (enabling hit-testing) but invisible.
              container.style.visibility = 'visible';
              container.style.opacity = '0';
              // Place above Leaflet tile pane (z-index 200) but below
              // marker/overlay panes (z-index 400+)
              container.style.zIndex = '250';
              container.style.pointerEvents = 'auto';

              // Forward all pointer/wheel events to Leaflet's container so
              // panning, zooming, double-click zoom, and right-click all work
              // as if the overlay wasn't there.
              const leafletContainer = map.getContainer() as HTMLElement;
              const forwarded = [
                'pointerdown', 'pointermove', 'pointerup', 'pointercancel',
                'mousedown', 'mousemove', 'mouseup',
                'wheel', 'dblclick', 'contextmenu',
                'touchstart', 'touchmove', 'touchend', 'touchcancel',
              ];
              for (const type of forwarded) {
                container.addEventListener(type, (ev: Event) => {
                  // Clone and re-dispatch on Leaflet's container
                  const clone = new (ev.constructor as any)(type, ev);
                  leafletContainer.dispatchEvent(clone);
                }, { capture: true, passive: false });
              }

              // Listen for Google Maps click — when a visible POI icon is
              // clicked the event is an IconMouseEvent carrying a placeId.
              const google = (window as any).google;
              gmap.addListener('click', (ev: any) => {
                if (!ev.placeId) return; // not a POI icon
                ev.stop(); // prevent Google's default info window

                googlePoiClickedRef.current = true;

                // Use the new Places API to fetch details by placeId
                const Place = google?.maps?.places?.Place;
                if (!Place) return;
                const place = new Place({ id: ev.placeId });
                place.fetchFields({
                  fields: [
                    'id', 'displayName', 'location', 'formattedAddress',
                    'nationalPhoneNumber', 'websiteURI', 'regularOpeningHours',
                    'rating', 'userRatingCount', 'types',
                  ],
                }).then(({ place: p }: { place: any }) => {
                  const lat = p.location?.lat() ?? ev.latLng.lat();
                  const lng = p.location?.lng() ?? ev.latLng.lng();
                  const nearbyPlace: NearbyPlace = {
                    placeId: `google:${p.id}`,
                    name: p.displayName || 'Unknown Place',
                    lat,
                    lng,
                    type: (p.types && p.types[0]) || 'point_of_interest',
                    address: p.formattedAddress,
                    phone: p.nationalPhoneNumber,
                    website: p.websiteURI,
                    openingHours:
                      p.regularOpeningHours?.weekdayDescriptions?.join('\n'),
                    rating: p.rating,
                    ratingCount: p.userRatingCount,
                  };
                  setSelectedNearbyPlaceRef.current(nearbyPlace);
                }).catch((err: any) => {
                  console.warn('[MapPage] Failed to fetch place details:', err);
                });
              });
            });
          }
        });
      });
    });

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="shrink-0">
            <h1 className="text-2xl font-bold text-neutral-900">Trip Planner</h1>
            <StatusBar ref={statusBarRef} />
          </div>
          {/* Place search bar — centered in header */}
          <div className="flex-1 flex justify-center px-6">
            <div className="relative w-80">
              <input
                type="text"
                value={placeSearchQuery}
                onChange={(e) => handlePlaceSearchChange(e.target.value)}
                onFocus={() => { if (placeSearchResults.length > 0) setPlaceSearchOpen(true); }}
                onBlur={() => { setTimeout(() => setPlaceSearchOpen(false), 200); }}
                placeholder="Search for a place..."
                className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {placeSearching && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <svg className="animate-spin h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                </span>
              )}
              {!placeSearching && placeSearchQuery.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setPlaceSearchQuery(''); setPlaceSearchResults([]); setPlaceSearchOpen(false); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-sm"
                  aria-label="Clear search"
                >
                  &times;
                </button>
              )}
              {placeSearchOpen && placeSearchResults.length > 0 && (
                <ul className="absolute left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden divide-y divide-neutral-100 max-h-64 overflow-y-auto z-50">
                  {placeSearchResults.map((result) => {
                    const secondary = result.displayName.indexOf(',') >= 0
                      ? result.displayName.slice(result.displayName.indexOf(',') + 1).trim()
                      : '';
                    return (
                      <li key={result.placeId}>
                        <button
                          type="button"
                          onClick={() => handlePlaceSelect(result)}
                          className="w-full text-left px-3 py-2 hover:bg-primary-50 transition-colors"
                        >
                          <p className="text-sm font-medium text-neutral-900">{result.name}</p>
                          {secondary && (
                            <p className="text-xs text-neutral-500 truncate">{secondary}</p>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-4">
            <div className="relative" ref={tripsMenuRef}>
              <button
                onClick={() => setTripsMenuOpen((v) => !v)}
                className={`text-sm font-medium transition-colors ${
                  sidebarView === 'create' || sidebarView === 'list' || sidebarView === 'detail' || sidebarView === 'edit'
                    ? 'text-primary-700 font-semibold'
                    : 'text-primary-600 hover:text-primary-800'
                }`}
              >
                Trips
              </button>
              {tripsMenuOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 min-w-40 py-1">
                  <button
                    type="button"
                    onClick={() => { setSidebarView('create'); setTripsMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-primary-50 transition-colors ${
                      sidebarView === 'create' ? 'text-primary-700 font-semibold' : 'text-neutral-700'
                    }`}
                  >
                    Create Trip
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSidebarView('list'); setTripsMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-primary-50 transition-colors ${
                      sidebarView === 'list' || sidebarView === 'detail' || sidebarView === 'edit'
                        ? 'text-primary-700 font-semibold'
                        : 'text-neutral-700'
                    }`}
                  >
                    My Trips
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleShowCached}
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
              title="Show all cached places in the current map view"
            >
              Show Cached
            </button>
            <Link
              href="/settings"
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              Settings
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map Container */}
        <div className="flex-1 relative">
          <div
            ref={mapContainerRef}
            className="absolute inset-0 w-full h-full"
            style={{ zIndex: 0 }}
          />
          {!isMapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-neutral-600">Loading map...</p>
              </div>
            </div>
          )}


          {/* Context menu shown on map click */}
          {contextMenu && (
            <MapContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              onSearchNearby={handleOpenNearbyModal}
              onSearchPark4Night={handleSearchPark4Night}
              onSearchTripadvisor={handleOpenTripadvisorModal}
              tripadvisorEnabled={tripadvisorEnabledRef.current}
              onSearchFoursquare={handleOpenFoursquareModal}
              foursquareEnabled={foursquareEnabledRef.current}
              onAiResearch={handleAiResearchArea}
              onAddPoi={handleOpenAddPoiModal}
              selectedDayLabel={getDayLabel(selectedDayDestIdRef.current, currentDestinationsRef.current)}
              onClose={() => setContextMenu(null)}
            />
          )}

          {/* Marker filter pane */}
          {markerFilterOpen && (
            <MarkerFilterPane
              groups={buildFilterGroups()}
              hidden={markerHidden}
              onToggleItem={handleToggleFilterItem}
              onToggleGroup={handleToggleFilterGroup}
              onClose={() => setMarkerFilterOpen(false)}
            />
          )}

          {/* Add-POI modal */}
          {showAddPoiModal && addPoiPos && (() => {
            const sortedDests = [...currentDestinationsRef.current]
              .filter((d) => d.latitude != null && d.longitude != null)
              .sort((a, b) => new Date(a.dayDate).getTime() - new Date(b.dayDate).getTime());
            return (
              <div className="absolute inset-0 bg-black/40 z-[1000] flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-80 flex flex-col gap-4">
                  <h3 className="text-base font-semibold text-neutral-900">Add Point of Interest</h3>
                  <p className="text-xs text-neutral-500">
                    {addPoiPos.lat.toFixed(5)}, {addPoiPos.lng.toFixed(5)}
                  </p>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-neutral-600">Name</label>
                    <input
                      type="text"
                      value={addPoiName}
                      onChange={(e) => setAddPoiName(e.target.value)}
                      placeholder="Point of Interest"
                      className="border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      autoFocus
                    />
                  </div>
                  {!addPoiDestId && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-neutral-600">Day</label>
                      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                        {sortedDests.length === 0 && (
                          <p className="text-xs text-neutral-400">No destinations set yet.</p>
                        )}
                        {sortedDests.map((dest, idx) => (
                          <button
                            key={dest.id}
                            type="button"
                            onClick={() => setAddPoiDestId(dest.id)}
                            className="text-left px-3 py-2 text-sm rounded-md border border-neutral-200 hover:bg-primary-50 hover:border-primary-300 transition-colors"
                          >
                            <span className="font-medium">Day {idx + 1}</span>
                            <span className="text-neutral-500 ml-2">{dest.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {addPoiDestId && (() => {
                    const dest = currentDestinationsRef.current.find((d) => d.id === addPoiDestId);
                    const dayIdx = sortedDests.findIndex((d) => d.id === addPoiDestId);
                    return dest ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-600">
                          <span className="font-medium">Day {dayIdx + 1}</span>
                          <span className="text-neutral-400 ml-1">— {dest.name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setAddPoiDestId(null)}
                          className="text-xs text-primary-600 hover:underline"
                        >
                          Change
                        </button>
                      </div>
                    ) : null;
                  })()}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSavePoi}
                      disabled={!addPoiDestId}
                      className="flex-1 bg-primary-600 text-white text-sm font-medium py-2 rounded-md hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Add POI
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAddPoiModal(false); setAddPoiDestId(null); setAddPoiName(''); }}
                      className="flex-1 border border-neutral-300 text-neutral-700 text-sm py-2 rounded-md hover:bg-neutral-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* POI info popup */}
          {selectedPoi && (() => {
            const sortedDests = [...currentDestinationsRef.current]
              .filter((d) => d.latitude != null && d.longitude != null)
              .sort((a, b) => new Date(a.dayDate).getTime() - new Date(b.dayDate).getTime());
            const poiDate = new Date(selectedPoi.dayDate).toISOString().split('T')[0];
            const dayIdx = sortedDests.findIndex((d) =>
              new Date(d.dayDate).toISOString().split('T')[0] === poiDate,
            );
            const dayLabel = dayIdx >= 0 ? `Day ${dayIdx + 1}` : '';
            return (
              <PlacePopup
                name={selectedPoi.name}
                subtitle={dayLabel || undefined}
                onClose={() => setSelectedPoi(null)}
                badge={
                  <span className="inline-block text-[10px] font-semibold rounded px-1.5 py-0.5 mb-1 border text-violet-700 bg-violet-50 border-violet-200">
                    My POI
                  </span>
                }
                links={
                  isGoogleProviderRef.current ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedPoi.latitude},${selectedPoi.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:underline"
                    >
                      Open in Google Maps ↗
                    </a>
                  ) : (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${selectedPoi.latitude}&mlon=${selectedPoi.longitude}#map=17/${selectedPoi.latitude}/${selectedPoi.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:underline"
                    >
                      Open in OpenStreetMap ↗
                    </a>
                  )
                }
                actions={
                  <button
                    type="button"
                    onClick={handleDeletePoi}
                    className="w-full text-sm text-red-600 border border-red-200 rounded-md py-1.5 hover:bg-red-50 transition-colors"
                  >
                    Delete POI
                  </button>
                }
              />
            );
          })()}


          {/* Selected waypoint popup */}
          {selectedWaypoint && (
            <PlacePopup
              name={selectedWaypoint.isManual ? 'Via-point' : 'Waypoint'}
              subtitle={
                selectedWaypoint.isManual
                  ? 'Manually placed routing handle'
                  : `~${Math.round(selectedWaypoint.targetDurationSeconds / 60)} min from start`
              }
              onClose={() => setSelectedWaypoint(null)}
              badge={
                <span className={`inline-block text-[10px] font-semibold rounded px-1.5 py-0.5 mb-1 border ${selectedWaypoint.isManual ? 'text-orange-700 bg-orange-50 border-orange-200' : 'text-blue-700 bg-blue-50 border-blue-200'}`}>
                  {selectedWaypoint.isManual ? 'Manual' : 'Auto'}
                </span>
              }
            >
              <div className="text-xs text-neutral-500 space-y-0.5">
                <p>{selectedWaypoint.latitude.toFixed(5)}, {selectedWaypoint.longitude.toFixed(5)}</p>
                {!selectedWaypoint.isManual && selectedWaypoint.segmentDuration != null && selectedWaypoint.segmentDuration > 0 && (
                  <p>{Math.round((selectedWaypoint.targetDurationSeconds / selectedWaypoint.segmentDuration) * 100)}% along segment</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleDeleteWaypoint}
                className="w-full text-sm text-red-600 border border-red-200 rounded-md py-1.5 hover:bg-red-50 transition-colors"
              >
                Delete {selectedWaypoint.isManual ? 'via-point' : 'waypoint'}
              </button>
            </PlacePopup>
          )}

          {/* Nearby search: loading indicator */}
          {nearbyStatus === 'searching' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[800] flex items-center gap-2 bg-white rounded-full shadow-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-700">
              <span className="inline-block w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              Searching nearby…
            </div>
          )}

          {/* Nearby search: no results */}
          {nearbyStatus === 'done' && nearbyResults.length === 0 && !selectedNearbyPlace && (
            <div className="absolute bottom-4 left-4 z-[800] flex items-center gap-3 bg-white rounded-lg shadow-lg border border-neutral-200 px-4 py-3 text-sm text-neutral-600">
              <span>No places found nearby.</span>
              <button
                onClick={() => setNearbyStatus('idle')}
                className="text-neutral-400 hover:text-neutral-600 text-base leading-none"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}

          {/* Selected nearby place popup */}
          {selectedNearbyPlace && (
            <PlacePopup
              name={selectedNearbyPlace.name}
              subtitle={selectedNearbyPlace.type.replace(/_/g, ' ')}
              onClose={() => {
                setSelectedNearbyPlace(null);
                setNearbySegmentPickerOpen(false);
                setNearbyDestPickerOpen(false);
                setNearbyPoiPickerOpen(false);
              }}
              badge={
                selectedNearbyPlace.provider ? (
                  <span className={`inline-block text-[10px] font-semibold rounded px-1.5 py-0.5 mb-1 border ${PROVIDER_BADGE_STYLES[selectedNearbyPlace.provider] ?? 'text-neutral-700 bg-neutral-50 border-neutral-200'}`}>
                    {PROVIDER_LABELS[selectedNearbyPlace.provider] ?? selectedNearbyPlace.provider}
                  </span>
                ) : null
              }
              links={
                <>
                  {selectedNearbyPlace.provider === 'p4n' && (
                    <a
                      href={`https://park4night.com/en/place/${selectedNearbyPlace.placeId.replace('p4n:', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-600 hover:underline"
                    >
                      Open in Park4Night ↗
                    </a>
                  )}
                  {selectedNearbyPlace.provider === 'tripadvisor' && selectedNearbyPlace.webUrl && (
                    <a
                      href={selectedNearbyPlace.webUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-600 hover:underline"
                    >
                      Open in Tripadvisor ↗
                    </a>
                  )}
                  {isGoogleProviderRef.current ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedNearbyPlace.lat},${selectedNearbyPlace.lng}&query_place_id=${selectedNearbyPlace.placeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:underline"
                    >
                      Open in Google Maps ↗
                    </a>
                  ) : (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${selectedNearbyPlace.lat}&mlon=${selectedNearbyPlace.lng}#map=17/${selectedNearbyPlace.lat}/${selectedNearbyPlace.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:underline"
                    >
                      Open in OpenStreetMap ↗
                    </a>
                  )}
                </>
              }
            >
                {/* Enriched properties */}
                {(selectedNearbyPlace.address || selectedNearbyPlace.phone ||
                  selectedNearbyPlace.website || selectedNearbyPlace.openingHours ||
                  selectedNearbyPlace.rating != null) && (
                  <div className="text-xs text-neutral-600 space-y-0.5 border-t border-neutral-100 pt-2">
                    {selectedNearbyPlace.address && (
                      <p>{selectedNearbyPlace.address}</p>
                    )}
                    {selectedNearbyPlace.phone && (
                      <p>
                        <a href={`tel:${selectedNearbyPlace.phone}`} className="hover:underline">
                          {selectedNearbyPlace.phone}
                        </a>
                      </p>
                    )}
                    {selectedNearbyPlace.website && (
                      <p>
                        <a
                          href={selectedNearbyPlace.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:underline truncate block max-w-full"
                        >
                          {(() => { try { return new URL(selectedNearbyPlace.website).hostname; } catch { return selectedNearbyPlace.website; } })()}
                        </a>
                      </p>
                    )}
                    {selectedNearbyPlace.rating != null && (
                      <p>
                        {'★'.repeat(Math.round(selectedNearbyPlace.rating))}{'☆'.repeat(Math.max(0, 5 - Math.round(selectedNearbyPlace.rating)))}
                        {' '}{selectedNearbyPlace.rating.toFixed(1)}
                        {selectedNearbyPlace.ratingCount != null && (
                          <span className="text-neutral-400"> ({selectedNearbyPlace.ratingCount.toLocaleString()})</span>
                        )}
                      </p>
                    )}
                    {selectedNearbyPlace.openingHours && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-neutral-500 hover:text-neutral-700">Opening hours</summary>
                        <pre className="mt-1 text-xs whitespace-pre-wrap font-sans">{selectedNearbyPlace.openingHours}</pre>
                      </details>
                    )}
                  </div>
                )}

                {/* Amenities (e.g. from Park4Night) */}
                {selectedNearbyPlace.amenities && selectedNearbyPlace.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 border-t border-neutral-100 pt-2">
                    {selectedNearbyPlace.amenities.map((a) => (
                      <span key={a} className="text-[10px] bg-neutral-100 text-neutral-600 rounded px-1.5 py-0.5">{a}</span>
                    ))}
                  </div>
                )}

                {/* Description (e.g. from Park4Night) */}
                {selectedNearbyPlace.description && (
                  <details className="text-xs text-neutral-600 border-t border-neutral-100 pt-2">
                    <summary className="cursor-pointer text-neutral-500 hover:text-neutral-700">Description</summary>
                    <p className="mt-1 whitespace-pre-wrap">{selectedNearbyPlace.description}</p>
                  </details>
                )}

                {/* Action buttons */}
                {(() => {
                  const preSelId = selectedDayDestIdRef.current;
                  const hasDaySelected = !!preSelId && preSelId !== 'home';
                  const preSelDest = hasDaySelected
                    ? currentDestinationsRef.current.find((d) => d.id === preSelId)
                    : null;
                  const selSegment = preSelDest
                    ? currentSegmentsRef.current.find((s) => {
                        const segDate = new Date(s.dayDate).toISOString().split('T')[0];
                        const destDate = new Date(preSelDest.dayDate).toISOString().split('T')[0];
                        return segDate === destDate;
                      })
                    : null;
                  return (
                    <div className="mt-1 group/addas relative">
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Add as</p>
                      {!hasDaySelected && (
                        <p className="hidden group-hover/addas:block absolute -top-6 left-0 right-0 text-[10px] text-warning-600 bg-warning-50 border border-warning-200 rounded px-2 py-0.5 text-center z-10">To add this place, select a day</p>
                      )}
                      <div className="flex gap-1.5">
                        <button
                          disabled={!hasDaySelected}
                          onClick={() => {
                            if (!preSelId) return;
                            handleAddAsDestination(preSelId!);
                          }}
                          className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-all ${hasDaySelected ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700' : 'bg-neutral-50 text-neutral-300 cursor-not-allowed'}`}
                        >
                          Destination
                        </button>
                        <button
                          disabled={!hasDaySelected || !selSegment}
                          onClick={() => {
                            if (selSegment) handleAddAsVia(selSegment.id);
                          }}
                          className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-all ${hasDaySelected && selSegment ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700' : 'bg-neutral-50 text-neutral-300 cursor-not-allowed'}`}
                        >
                          Via
                        </button>
                        <button
                          disabled={!hasDaySelected}
                          onClick={() => {
                            if (preSelId) handleAddAsPoiForDay(preSelId);
                          }}
                          className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-all ${hasDaySelected ? 'bg-violet-50 hover:bg-violet-100 text-violet-700' : 'bg-neutral-50 text-neutral-300 cursor-not-allowed'}`}
                        >
                          POI
                        </button>
                        <button
                          disabled={!hasDaySelected}
                          onClick={() => {
                            if (!preSelId) return;
                            handleAddAsParkupForDay(preSelId!);
                          }}
                          className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-all ${hasDaySelected ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' : 'bg-neutral-50 text-neutral-300 cursor-not-allowed'}`}
                        >
                          Parkup
                        </button>
                      </div>
                    </div>
                  );
                })()}
            </PlacePopup>
          )}
          {/* Selected AI experience popup */}
          {selectedExperience && (
            <PlacePopup
              name={selectedExperience.name}
              subtitle={`${selectedExperience.category.replace(/_/g, ' ')} · ${selectedExperience.nearestCity}, ${selectedExperience.country}`}
              onClose={() => {
                setSelectedExperience(null);
                setExperiencePoiPickerOpen(false);
                setExperienceSegmentPickerOpen(false);
                setExperienceDestPickerOpen(false);
              }}
              badge={
                <>
                  <span className={`inline-block text-[10px] font-semibold rounded px-1.5 py-0.5 mb-1 border ${PROVIDER_BADGE_STYLES[selectedExperience.aiProvider ?? 'chatgpt']}`}>
                    {selectedExperience.aiProvider === 'claude' ? 'AI Research (Claude)' : 'AI Research (ChatGPT)'}
                  </span>
                  {' '}
                  <span
                    className="inline-block text-[10px] font-semibold rounded px-1.5 py-0.5 mb-1"
                    style={{
                      color: EXPERIENCE_STAR_COLORS[selectedExperience.michelinStars]?.text ?? '#0369a1',
                      background: EXPERIENCE_STAR_COLORS[selectedExperience.michelinStars]?.bg ?? '#e0f2fe',
                      border: `1px solid ${EXPERIENCE_STAR_COLORS[selectedExperience.michelinStars]?.border ?? '#38bdf8'}`,
                    }}
                  >
                    {'★'.repeat(selectedExperience.michelinStars)}{' '}
                    {selectedExperience.michelinStars === 3 ? 'Must-visit' : selectedExperience.michelinStars === 2 ? 'Worth a detour' : 'Worth a stop'}
                  </span>
                </>
              }
              links={
                isGoogleProviderRef.current ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedExperience.approximateLat},${selectedExperience.approximateLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Open in Google Maps ↗
                  </a>
                ) : (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${selectedExperience.approximateLat}&mlon=${selectedExperience.approximateLng}#map=15/${selectedExperience.approximateLat}/${selectedExperience.approximateLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Open in OpenStreetMap ↗
                  </a>
                )
              }
            >
                <p className="text-xs text-neutral-700">{selectedExperience.description}</p>

                <details className="text-xs text-neutral-600 border-t border-neutral-100 pt-2">
                  <summary className="cursor-pointer text-neutral-500 hover:text-neutral-700">Why this rating</summary>
                  <p className="mt-1 whitespace-pre-wrap">{selectedExperience.reasoning}</p>
                </details>

                {selectedExperience.seasonalNotes && (
                  <p className="text-xs text-neutral-500 border-t border-neutral-100 pt-2">
                    <span className="font-medium">Seasonal:</span> {selectedExperience.seasonalNotes}
                  </p>
                )}

                {selectedExperience.estimatedDetourKm > 0 && (
                  <p className="text-xs text-neutral-500">
                    ~{selectedExperience.estimatedDetourKm} km detour from route
                  </p>
                )}

                {/* Action buttons */}
                {(() => {
                  const preSelId = selectedDayDestIdRef.current;
                  const hasDaySelected = !!preSelId && preSelId !== 'home';
                  const preSelDest = hasDaySelected
                    ? currentDestinationsRef.current.find((d) => d.id === preSelId)
                    : null;
                  const selSegment = preSelDest
                    ? currentSegmentsRef.current.find((s) => {
                        const segDate = new Date(s.dayDate).toISOString().split('T')[0];
                        const destDate = new Date(preSelDest.dayDate).toISOString().split('T')[0];
                        return segDate === destDate;
                      })
                    : null;
                  return (
                    <div className="mt-1 group/addas relative">
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Add as</p>
                      {!hasDaySelected && (
                        <p className="hidden group-hover/addas:block absolute -top-6 left-0 right-0 text-[10px] text-warning-600 bg-warning-50 border border-warning-200 rounded px-2 py-0.5 text-center z-10">To add this place, select a day</p>
                      )}
                      <div className="flex gap-1.5">
                        <button
                          disabled={!hasDaySelected}
                          onClick={() => {
                            if (!preSelId) return;
                            handleAddExperienceAsDestination(preSelId!);
                          }}
                          className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-all ${hasDaySelected ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700' : 'bg-neutral-50 text-neutral-300 cursor-not-allowed'}`}
                        >
                          Destination
                        </button>
                        <button
                          disabled={!hasDaySelected || !selSegment}
                          onClick={() => {
                            if (selSegment) handleAddExperienceAsVia(selSegment.id);
                          }}
                          className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-all ${hasDaySelected && selSegment ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700' : 'bg-neutral-50 text-neutral-300 cursor-not-allowed'}`}
                        >
                          Via
                        </button>
                        <button
                          disabled={!hasDaySelected}
                          onClick={() => {
                            if (preSelId) handleAddExperienceAsPoi(preSelId);
                          }}
                          className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-all ${hasDaySelected ? 'bg-violet-50 hover:bg-violet-100 text-violet-700' : 'bg-neutral-50 text-neutral-300 cursor-not-allowed'}`}
                        >
                          POI
                        </button>
                        <button
                          disabled={!hasDaySelected}
                          onClick={() => {
                            if (!preSelId) return;
                            handleAddExperienceAsParkup(preSelId!);
                          }}
                          className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-all ${hasDaySelected ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' : 'bg-neutral-50 text-neutral-300 cursor-not-allowed'}`}
                        >
                          Parkup
                        </button>
                      </div>
                    </div>
                  );
                })()}
            </PlacePopup>
          )}
        </div>

        {/* Sidebar for trip management */}
        <aside className="w-96 bg-white border-l border-neutral-200 overflow-y-auto flex flex-col">
          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto">
            {sidebarView === 'create' && (
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-neutral-900 mb-2">
                    Create New Trip
                  </h2>
                  <p className="text-sm text-neutral-600">
                    Plan a trip by entering details below
                  </p>
                </div>
                <TripForm onSuccess={handleTripCreated} />
              </div>
            )}

            {sidebarView === 'list' && (
              <TripList
                onTripSelect={handleTripSelect}
                onTripEdit={handleEdit}
                onTripDelete={handleDeleteClick}
                refreshTrigger={refreshTrigger}
              />
            )}

            {sidebarView === 'detail' && (
              <TripDetail
                tripId={selectedTripId}
                onBack={handleBackToList}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onRouteData={handleRouteData}
                segmentRefreshTrigger={segmentRefreshTrigger}
                destinationRefreshTrigger={destinationRefreshTrigger}
                onFitPoints={handleFitPoints}
                onDaySelect={handleDaySelect}
                pois={tripPois}
                initialSelectedDayId={restoredRef.current?.selectedDayDestId}
                onStatusMessage={(text, detail) => statusBarRef.current?.pushStatus(text, detail)}
                onSetLoading={(text) => statusBarRef.current?.setLoading(text)}
                onTripDatesChange={(start, stop) => { currentTripDatesRef.current = { start, stop }; }}
                onExperiencesDiscovered={setExperienceResults}
                onPoiClick={handleSidebarPoiClick}
                onDestinationClick={handleSidebarDestinationClick}
              />
            )}

            {sidebarView === 'edit' && editingTrip && (
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-neutral-900 mb-2">
                    Edit Trip
                  </h2>
                  <p className="text-sm text-neutral-600">
                    Update trip details and dates
                  </p>
                </div>
                <TripForm
                  mode="edit"
                  tripId={editingTrip.id}
                  initialData={{
                    title: editingTrip.title,
                    description: editingTrip.description ?? '',
                    startDate: toFormDate(editingTrip.startDate),
                    stopDate: toFormDate(editingTrip.stopDate),
                    routingPreferences: editingTrip.routingPreferences ?? undefined,
                  }}
                  onSuccess={handleTripUpdated}
                  onCancel={handleEditCancel}
                />
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Nearby Search Modal */}
      {showNearbyModal && (
        <NearbySearchModal
          onSelect={handleNearbySearch}
          onClose={() => setShowNearbyModal(false)}
        />
      )}

      {/* Tripadvisor Search Modal */}
      {showTripadvisorModal && (
        <TripadvisorSearchModal
          onSelect={handleSearchTripadvisor}
          onClose={() => setShowTripadvisorModal(false)}
        />
      )}

      {/* Foursquare Search Modal */}
      {showFoursquareModal && (
        <FoursquareSearchModal
          onSelect={handleSearchFoursquare}
          onClose={() => setShowFoursquareModal(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {tripToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Delete Trip?
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              Are you sure you want to delete &quot;{tripToDelete.title}&quot;? This action
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-md hover:bg-neutral-200 disabled:opacity-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-error-600 rounded-md hover:bg-error-700 disabled:opacity-50 transition-all"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
