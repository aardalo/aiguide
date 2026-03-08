'use client';

/**
 * DailyDestinations Component
 * Displays and manages daily destinations for a trip in plan mode.
 * Tasks: STORY-004, STORY-005
 */

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { PlaceResult } from '@/lib/schemas/geocoding';
import type { TripResponse, DailyDestinationResponse, DailyPoiResponse } from '@/lib/schemas/trip';
import type { RouteSegmentResponse } from '@/lib/schemas/routing';
import { decodePolyline } from '@/lib/polyline';

interface DailyDestinationsProps {
  trip: TripResponse;
  /** Called when the trip itself changes (e.g. stopDate extended by insert-day). */
  onTripChange?: (trip: TripResponse) => void;
  onUpdate?: () => void;
  /** Called whenever destinations or route segments change so the map can redraw. */
  onRouteData?: (
    segments: RouteSegmentResponse[],
    destinations: DailyDestinationResponse[],
  ) => void;
  /**
   * Incrementing this value triggers a segment re-fetch from the server.
   * Used by the map page to refresh distance/duration after a waypoint move (STORY-007).
   */
  segmentRefreshTrigger?: number;
  /**
   * Incrementing this value re-fetches destinations and regenerates route segments.
   * Used after a destination's coordinates are changed externally (e.g. nearby-search add).
   */
  destinationRefreshTrigger?: number;
  /** Called when the user clicks a day badge to zoom the map to that day's route. */
  onFitPoints?: (points: [number, number][]) => void;
  /** Called when a day badge is clicked so the map can highlight the corresponding marker. */
  onDaySelect?: (destinationId: string | null) => void;
  /** POIs for this trip — rendered under each day's distance/duration line. */
  pois?: DailyPoiResponse[];
  /** Pre-selected day destination ID to restore on mount (from persisted UI state). */
  initialSelectedDayId?: string | null;
  /** Called when a POI or parkup name is clicked in the sidebar. */
  onPoiClick?: (poi: DailyPoiResponse) => void;
  /** Called when a destination name is clicked in the sidebar. */
  onDestinationClick?: (dest: DailyDestinationResponse) => void;
}

export default function DailyDestinations({ trip, onTripChange, onUpdate, onRouteData, segmentRefreshTrigger, destinationRefreshTrigger, onFitPoints, onDaySelect, pois = [], initialSelectedDayId, onPoiClick, onDestinationClick }: DailyDestinationsProps) {
  const [destinations, setDestinations] = useState<DailyDestinationResponse[]>([]);
  const [segments, setSegments] = useState<RouteSegmentResponse[]>([]);
  const [home, setHome] = useState<{ name: string; latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingRoutes, setIsGeneratingRoutes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForDate, setAddForDate] = useState<string | null>(null);
  const [editingDestination, setEditingDestination] = useState<DailyDestinationResponse | null>(null);
  // 'home' | destination.id | null — tracks which day badge is highlighted in the sidebar
  const [selectedDayId, setSelectedDayId] = useState<string | null>(initialSelectedDayId ?? null);

  // Fetch daily destinations for the trip
  const fetchDestinations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/daily-destinations?tripId=${trip.id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch daily destinations');
      }

      const data = await response.json();
      setDestinations(data);
    } catch (err) {
      console.error('[DailyDestinations] Error fetching destinations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load destinations');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate route segments after destination changes
  const generateRoutes = async () => {
    setIsGeneratingRoutes(true);
    setRouteError(null);
    try {
      const response = await fetch('/api/route-segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: trip.id }),
      });
      const data = await response.json();
      if (!response.ok && response.status !== 207) {
        // Suppress the expected "not enough destinations yet" case
        if (data.code !== 'insufficient_destinations') {
          setRouteError(data.error ?? 'Failed to generate routes');
        }
        return;
      }
      if (data.segments) setSegments(data.segments);
      if (data.errors?.length) {
        setRouteError(`Some segments failed: ${data.errors.join('; ')}`);
      }
    } catch (err) {
      console.error('[DailyDestinations] Error generating routes:', err);
    } finally {
      setIsGeneratingRoutes(false);
    }
  };

  // Load destinations and segments on mount; auto-generate routes when
  // coordinates exist but no segments are saved yet.
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [destsRes, segsRes, settingsRes] = await Promise.all([
          fetch(`/api/daily-destinations?tripId=${trip.id}`),
          fetch(`/api/route-segments?tripId=${trip.id}`),
          fetch('/api/settings'),
        ]);

        if (!destsRes.ok) throw new Error('Failed to fetch daily destinations');

        const dests: DailyDestinationResponse[] = await destsRes.json();
        const segs: RouteSegmentResponse[] = segsRes.ok ? await segsRes.json() : [];
        const settingsRows: { key: string; value: string }[] = settingsRes.ok
          ? await settingsRes.json()
          : [];

        setDestinations(dests);
        if (Array.isArray(segs)) setSegments(segs);

        const sm = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]));
        if (sm['home.name'] && sm['home.latitude'] && sm['home.longitude']) {
          setHome({
            name: sm['home.name'],
            latitude: parseFloat(sm['home.latitude']),
            longitude: parseFloat(sm['home.longitude']),
          });
        }

        // Auto-generate when there are no segments yet.
        // The server decides whether there are enough points (home + destinations).
        if (segs.length === 0) {
          await generateRoutes();
        }
      } catch (err) {
        console.error('[DailyDestinations] Error loading trip data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load destinations');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [trip.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent map whenever route data changes
  useEffect(() => {
    onRouteData?.(segments, destinations);
  }, [segments, destinations]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch segments when the map signals a waypoint was moved (STORY-007)
  useEffect(() => {
    if (!segmentRefreshTrigger) return;
    fetch(`/api/route-segments?tripId=${trip.id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((segs: RouteSegmentResponse[]) => {
        if (Array.isArray(segs)) setSegments(segs);
      })
      .catch(() => {/* silently ignore */});
  }, [segmentRefreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch destinations and regenerate routes when a destination's coords were changed
  // externally (e.g. via the nearby-search "Add as daily destination" action).
  useEffect(() => {
    if (!destinationRefreshTrigger) return;
    fetchDestinations().then(() => generateRoutes());
  }, [destinationRefreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Delete destination
  const handleDelete = async (destinationId: string) => {
    if (!confirm('Are you sure you want to delete this destination?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/daily-destinations/${destinationId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete destination');
      }
      
      // Refresh destinations list
      await fetchDestinations();
      onUpdate?.();
    } catch (err) {
      console.error('[DailyDestinations] Error deleting destination:', err);
      alert('Failed to delete destination');
    }
  };

  // Handle successful form submission (create or update)
  const handleFormSuccess = async () => {
    setShowAddForm(false);
    setAddForDate(null);
    setEditingDestination(null);
    await fetchDestinations();
    await generateRoutes();
    onUpdate?.();
  };

  // Remove a day from the trip
  const [removingDate, setRemovingDate] = useState<string | null>(null);
  const handleRemoveDay = async (dateStr: string) => {
    if (!confirm('Remove this day? The destination, POIs and route segment will be deleted and subsequent days shifted back.')) return;
    setRemovingDate(dateStr);
    try {
      const res = await fetch(`/api/trips/${trip.id}/remove-day`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error('[DailyDestinations] Remove day failed:', data.error);
        return;
      }
      const updatedTrip = await res.json();
      onTripChange?.(updatedTrip);
      await fetchDestinations();
      await generateRoutes();
    } catch (err) {
      console.error('[DailyDestinations] Remove day error:', err);
    } finally {
      setRemovingDate(null);
    }
  };

  // Insert a blank day after the given date
  const [insertingAfter, setInsertingAfter] = useState<string | null>(null);
  const handleInsertDay = async (afterDate: string) => {
    setInsertingAfter(afterDate);
    try {
      const res = await fetch(`/api/trips/${trip.id}/insert-day`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ afterDate }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error('[DailyDestinations] Insert day failed:', data.error);
        return;
      }
      const updatedTrip = await res.json();
      onTripChange?.(updatedTrip);
      await fetchDestinations();
      await generateRoutes();
    } catch (err) {
      console.error('[DailyDestinations] Insert day error:', err);
    } finally {
      setInsertingAfter(null);
    }
  };

  // Get all dates in the trip range
  const getTripDates = () => {
    const dates: Date[] = [];
    const start = new Date(trip.startDate);
    const end = new Date(trip.stopDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    
    return dates;
  };

  // Format date for display
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get destination for a specific date
  const getDestinationForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return destinations.find((d) => {
      const destDateStr = new Date(d.dayDate).toISOString().split('T')[0];
      return destDateStr === dateStr;
    });
  };

  // Get POIs whose dayDate matches the given date
  const getPoisForDate = (date: Date): DailyPoiResponse[] => {
    const dateStr = date.toISOString().split('T')[0];
    return pois.filter((p) => new Date(p.dayDate).toISOString().split('T')[0] === dateStr);
  };

  // Get route segment whose "to" date matches the given date
  const getSegmentForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return segments.find((s) => {
      const segDateStr = new Date(s.dayDate).toISOString().split('T')[0];
      return segDateStr === dateStr;
    });
  };

  // Collect map points for a given segment + destination (for zoom-to-day)
  const getSegmentPoints = (
    seg: RouteSegmentResponse | undefined,
    dest: DailyDestinationResponse | undefined,
  ): [number, number][] => {
    const pts: [number, number][] = [];
    if (seg?.encodedPolyline) pts.push(...decodePolyline(seg.encodedPolyline));
    if (dest?.latitude != null && dest?.longitude != null) {
      pts.push([dest.latitude, dest.longitude]);
    }
    return pts;
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${Math.round(meters)} m`;
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const tripDates = getTripDates();

  if (isLoading && destinations.length === 0) {
    return (
      <div className="mt-6 border-t border-neutral-200 pt-4">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Daily Itinerary</h3>
        <p className="text-sm text-neutral-500">Loading destinations...</p>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-neutral-200 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">Daily Itinerary</h3>
        <button
          onClick={() => { setAddForDate(null); setShowAddForm(true); }}
          className="text-sm text-primary-600 hover:text-primary-800 font-medium"
        >
          + Add Destination
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-error-50 p-3 border border-error-200">
          <p className="text-sm text-error-800">{error}</p>
        </div>
      )}

      {routeError && (
        <div className="mb-4 rounded-md bg-warning-50 p-3 border border-warning-200">
          <p className="text-sm text-warning-800">{routeError}</p>
        </div>
      )}

      {isGeneratingRoutes && (
        <div className="mb-4 rounded-md bg-neutral-50 p-3 border border-neutral-200">
          <p className="text-sm text-neutral-600">Generating route estimates...</p>
        </div>
      )}

      {/* Pinned Home / departure row */}
      <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (!home || !onFitPoints) return;
                onFitPoints([[home.latitude, home.longitude]]);
                setSelectedDayId('home');
                onDaySelect?.('home');
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${home && onFitPoints ? 'cursor-pointer' : 'cursor-default'} ${selectedDayId === 'home' ? 'bg-primary-600 text-white' : 'bg-primary-100 text-primary-600 hover:bg-primary-200'}`}
              title={home ? 'Zoom to home' : undefined}
            >
              H
            </button>
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Home</p>
              {home ? (
                <p className="text-sm font-medium text-neutral-900">{home.name}</p>
              ) : (
                <p className="text-sm text-neutral-400 italic">Not set</p>
              )}
            </div>
          </div>
          <Link
            href="/settings"
            className="text-xs text-primary-600 hover:text-primary-800 font-medium"
          >
            {home ? 'Change' : 'Set home'}
          </Link>
        </div>
      </div>

      {/* Daily destinations list */}
      <div className="space-y-0">
        {tripDates.map((date, index) => {
          const destination = getDestinationForDate(date);
          const segment = getSegmentForDate(date);
          const dayPois = getPoisForDate(date);
          const dateStr = date.toISOString().split('T')[0];
          const showInlineForm = (showAddForm && addForDate === dateStr) || (editingDestination && destination && editingDestination.id === destination.id);

          return (
            <React.Fragment key={date.toISOString()}>
              {/* Insert-day hover zone between rows */}
              {index > 0 && (
                <div className="group relative h-2 flex items-center justify-center hover:h-8 transition-all cursor-pointer"
                  onClick={() => {
                    const prevDate = tripDates[index - 1].toISOString().split('T')[0];
                    if (!insertingAfter) handleInsertDay(prevDate);
                  }}
                >
                  <div className="absolute inset-x-4 h-px bg-transparent group-hover:bg-primary-300 transition-colors" />
                  <button
                    type="button"
                    disabled={!!insertingAfter}
                    className="relative z-10 hidden group-hover:flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 hover:bg-primary-200 text-primary-600 text-sm font-bold border border-primary-300 shadow-sm transition-all disabled:opacity-50"
                    title="Insert a day here"
                  >
                    {insertingAfter === tripDates[index - 1].toISOString().split('T')[0] ? (
                      <span className="inline-block w-3 h-3 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                    ) : '+'}
                  </button>
                </div>
              )}
            <div
              className="relative p-3 bg-neutral-50 rounded-lg border border-neutral-200 hover:bg-neutral-100 transition-colors group/day"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (!onFitPoints) return;
                        const pts = getSegmentPoints(segment, destination);
                        if (pts.length > 0) {
                          onFitPoints(pts);
                          const selId = destination?.id ?? null;
                          setSelectedDayId(selId);
                          onDaySelect?.(selId);
                        }
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${onFitPoints && (segment || destination?.latitude != null) ? 'cursor-pointer' : 'cursor-default'} ${destination?.id && selectedDayId === destination.id ? 'bg-primary-600 text-white' : 'bg-primary-100 text-primary-600 hover:bg-primary-200'}`}
                      title={segment || destination?.latitude != null ? 'Zoom to this day' : undefined}
                    >
                      {index + 1}
                    </button>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">
                      {formatDate(date)}
                    </p>
                    {destination ? (
                      <div className="mt-1">
                        <p
                          className={`text-sm text-neutral-700 ${destination.latitude != null && destination.longitude != null && onDestinationClick ? 'cursor-pointer hover:text-primary-600' : ''}`}
                          onClick={() => {
                            if (destination.latitude != null && destination.longitude != null && onDestinationClick) {
                              onDestinationClick(destination);
                            }
                          }}
                        >
                          {destination.name}
                          {destination.municipality && (
                            <span className="text-neutral-400"> ({destination.municipality})</span>
                          )}
                        </p>
                        {destination.notes && (
                          <p className="text-xs text-neutral-500 mt-0.5">{destination.notes}</p>
                        )}
                        {destination.latitude && destination.longitude && (
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {destination.latitude.toFixed(4)}, {destination.longitude.toFixed(4)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-400 italic">No destination set</p>
                    )}
                  </div>
                </div>

                {destination && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingDestination(destination)}
                      className="p-1 text-neutral-400 hover:text-primary-600 transition-colors"
                      title="Edit destination"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(destination.id)}
                      className="p-1 text-neutral-400 hover:text-error-600 transition-colors"
                      title="Delete destination"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}

                {!destination && (
                  <button
                    onClick={() => {
                      setAddForDate(date.toISOString().split('T')[0]);
                      setShowAddForm(true);
                    }}
                    className="p-1 text-neutral-400 hover:text-primary-600 transition-colors"
                    title="Add destination"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Route segment info (distance + duration to this overnight stop) */}
              {segment && (
                <div className="mt-2 ml-11 flex items-center gap-3 text-xs text-neutral-500">
                  <span>{formatDistance(segment.distanceMeters)}</span>
                  <span>·</span>
                  <span>{formatDuration(segment.durationSeconds)}</span>
                  <span className="text-neutral-400">via {segment.provider}</span>
                </div>
              )}

              {/* Parkups + POIs for this day */}
              {dayPois.length > 0 && (() => {
                const parkups = dayPois.filter((p) => p.category === 'parkup');
                const regularPois = dayPois.filter((p) => p.category !== 'parkup');
                return (
                  <div className="mt-1.5 ml-11 flex flex-col gap-0.5">
                    {parkups.map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center gap-1.5 text-xs text-emerald-700 ${onPoiClick ? 'cursor-pointer hover:text-emerald-900' : ''}`}
                        onClick={() => onPoiClick?.(p)}
                      >
                        <span className="shrink-0">🚐</span>
                        <span className="truncate">{p.name}</span>
                      </div>
                    ))}
                    {regularPois.map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center gap-1.5 text-xs text-violet-700 ${onPoiClick ? 'cursor-pointer hover:text-violet-900' : ''}`}
                        onClick={() => onPoiClick?.(p)}
                      >
                        <span className="shrink-0">📌</span>
                        <span className="truncate">{p.name}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Inline add/edit form for this day */}
              {showInlineForm && (
                <div className="mt-2">
                  <DestinationForm
                    trip={trip}
                    destination={editingDestination && destination && editingDestination.id === destination.id ? editingDestination : null}
                    initialDate={addForDate}
                    onSuccess={handleFormSuccess}
                    onCancel={() => {
                      setShowAddForm(false);
                      setAddForDate(null);
                      setEditingDestination(null);
                    }}
                  />
                </div>
              )}

              {/* Remove day button — lower-right, visible on hover */}
              {tripDates.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const dateStr = date.toISOString().split('T')[0];
                    if (!removingDate) handleRemoveDay(dateStr);
                  }}
                  disabled={!!removingDate}
                  className="absolute bottom-1.5 right-1.5 hidden group-hover/day:flex items-center justify-center w-5 h-5 rounded-full text-neutral-400 hover:text-error-600 hover:bg-error-50 text-xs transition-all disabled:opacity-50"
                  title="Remove this day"
                >
                  {removingDate === date.toISOString().split('T')[0] ? (
                    <span className="inline-block w-3 h-3 border-2 border-error-600 border-t-transparent rounded-full animate-spin" />
                  ) : '×'}
                </button>
              )}
            </div>
            </React.Fragment>
          );
        })}
      </div>

      {destinations.length === 0 && !showAddForm && (
        <p className="text-sm text-neutral-500 text-center py-4">
          No destinations added yet. Click "Add Destination" to get started.
        </p>
      )}
    </div>
  );
}

// ─── Destination Form ────────────────────────────────────────────────────────

interface DestinationFormProps {
  trip: TripResponse;
  destination?: DailyDestinationResponse | null;
  initialDate?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

function DestinationForm({ trip, destination, initialDate, onSuccess, onCancel }: DestinationFormProps) {
  // Core form fields
  const [dayDate, setDayDate] = useState(
    destination?.dayDate.split('T')[0] || initialDate || trip.startDate.toString().split('T')[0],
  );
  const [name, setName] = useState(destination?.name || '');
  const [notes, setNotes] = useState(destination?.notes || '');

  // Hidden coordinates — set via place picker, never shown directly
  const [placeCoords, setPlaceCoords] = useState<{ lat: number; lng: number } | null>(
    destination?.latitude != null && destination?.longitude != null
      ? { lat: destination.latitude, lng: destination.longitude }
      : null,
  );
  // Shown in the chip below the name field
  const [placeDisplayName, setPlaceDisplayName] = useState<string | null>(
    destination?.latitude != null && destination?.longitude != null ? destination.name : null,
  );
  // Municipality/town/city extracted from geocoding displayName
  const [municipality, setMunicipality] = useState<string | null>(destination?.municipality ?? null);

  // Typeahead state
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [noResults, setNoResults] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use a ref so the debounce effect doesn't need placeCoords as a dep
  const placeCoordsRef = useRef(placeCoords);
  placeCoordsRef.current = placeCoords;

  // Debounced place search — fires 400ms after name stops changing
  useEffect(() => {
    const trimmed = name.trim();

    if (trimmed.length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      setNoResults(false);
      return;
    }

    // Don't search when a place is already selected
    if (placeCoordsRef.current) return;

    setSearchResults([]);
    setShowDropdown(false);
    setNoResults(false);

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}&limit=5`);
        if (res.ok) {
          const data: PlaceResult[] = await res.json();
          setSearchResults(data);
          setShowDropdown(data.length > 0);
          setNoResults(data.length === 0);
        }
      } catch {
        // Geocoding unavailable — silently degrade
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [name]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNameChange = (value: string) => {
    setName(value);
    // Clear the selection so a new search is triggered
    if (placeCoords) {
      setPlaceCoords(null);
      setPlaceDisplayName(null);
      setMunicipality(null);
    }
  };

  const handleSelectPlace = (result: PlaceResult) => {
    setName(result.name);
    setPlaceCoords({ lat: result.latitude, lng: result.longitude });
    setPlaceDisplayName(result.displayName);
    // Extract municipality: first comma-separated segment after the place name
    const parts = result.displayName.split(',').map((s) => s.trim());
    const muni = parts.length > 1 && parts[1] !== result.name ? parts[1] : null;
    setMunicipality(muni);
    setSearchResults([]);
    setShowDropdown(false);
    setNoResults(false);
  };

  const handleClearPlace = () => {
    setPlaceCoords(null);
    setPlaceDisplayName(null);
    setMunicipality(null);
    setSearchResults([]);
    setShowDropdown(false);
    setNoResults(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        dayDate,
        name,
        municipality: municipality || null,
        latitude: placeCoords?.lat ?? null,
        longitude: placeCoords?.lng ?? null,
        notes: notes || null,
      };

      let response;
      if (destination) {
        response = await fetch(`/api/daily-destinations/${destination.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        payload.tripId = trip.id;
        response = await fetch('/api/daily-destinations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save destination');
      }

      onSuccess();
    } catch (err) {
      console.error('[DestinationForm] Error saving destination:', err);
      setError(err instanceof Error ? err.message : 'Failed to save destination');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Extract the secondary line from a full display name: everything after the first comma
  const secondaryLine = (displayName: string) => {
    const idx = displayName.indexOf(',');
    return idx >= 0 ? displayName.slice(idx + 1).trim() : '';
  };

  return (
    <div className="mb-4 p-4 bg-white border border-neutral-300 rounded-lg shadow-sm">
      <h4 className="text-md font-semibold text-neutral-900 mb-3">
        {destination ? 'Edit Destination' : 'Add Destination'}
      </h4>

      {error && (
        <div className="mb-3 rounded-md bg-error-50 p-2 border border-error-200">
          <p className="text-sm text-error-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Date */}
        <div>
          <label htmlFor="dayDate" className="block text-sm font-medium text-neutral-700">
            Date <span className="text-error-500">*</span>
          </label>
          <input
            type="date"
            id="dayDate"
            value={dayDate}
            onChange={(e) => setDayDate(e.target.value)}
            min={trip.startDate.toString().split('T')[0]}
            max={trip.stopDate.toString().split('T')[0]}
            required
            disabled={!!initialDate && !destination}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-default"
          />
        </div>

        {/* Place name + typeahead */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-neutral-700">
            Destination <span className="text-error-500">*</span>
          </label>

          <div className="relative mt-1">
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              maxLength={200}
              placeholder="Type a city or place name…"
              autoComplete="off"
              className="block w-full rounded-md border border-neutral-300 px-3 py-2.5 pr-8 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all"
            />
            {isSearching && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <svg className="animate-spin h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              </span>
            )}
          </div>

          {/* Selected place chip */}
          {placeDisplayName && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-neutral-600">
              <span className="text-primary-600">📍</span>
              <span className="truncate">{placeDisplayName}</span>
              <button
                type="button"
                onClick={handleClearPlace}
                className="ml-auto flex-shrink-0 text-neutral-400 hover:text-neutral-700"
                aria-label="Clear place selection"
              >
                ✕
              </button>
            </div>
          )}

          {/* No results note */}
          {noResults && !isSearching && (
            <p className="mt-1 text-xs text-neutral-500">No places found. You can still save without a location pin.</p>
          )}

          {/* Results dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <ul className="mt-1 border border-neutral-200 rounded-md bg-white shadow-md overflow-hidden divide-y divide-neutral-100 z-10 relative">
              {searchResults.map((result) => (
                <li key={result.placeId}>
                  <button
                    type="button"
                    onClick={() => handleSelectPlace(result)}
                    className="w-full text-left px-3 py-2 hover:bg-primary-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-neutral-900">{result.name}</p>
                    {secondaryLine(result.displayName) && (
                      <p className="text-xs text-neutral-500 truncate">{secondaryLine(result.displayName)}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-neutral-700">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Optional notes about this destination"
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded-md bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? 'Saving...' : destination ? 'Update' : 'Add Destination'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 rounded-md bg-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
