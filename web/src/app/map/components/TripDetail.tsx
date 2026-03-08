'use client';

/**
 * TripDetail Component
 * Displays detailed information about a single trip
 * Task: TASK-006, STORY-004
 */

import React, { useEffect, useState } from 'react';
import type { TripResponse, DailyDestinationResponse, DailyPoiResponse } from '@/lib/schemas/trip';
import type { RouteSegmentResponse } from '@/lib/schemas/routing';
import DailyDestinations from './DailyDestinations';

interface TripDetailProps {
  /**
   * Trip ID to fetch and display
   * If null, shows "no trip selected" state
   */
  tripId: string | null;
  
  /**
   * Callback when back button is clicked
   */
  onBack?: () => void;
  
  /**
   * Callback when edit button is clicked
   */
  onEdit?: (trip: TripResponse) => void;
  
  /**
   * Callback when delete button is clicked
   */
  onDelete?: (trip: TripResponse) => void;
  /** Forwarded to DailyDestinations so the map can draw routes. */
  onRouteData?: (
    segments: RouteSegmentResponse[],
    destinations: DailyDestinationResponse[],
  ) => void;
  /**
   * Incrementing this value causes DailyDestinations to re-fetch segments
   * from the server (e.g. after a waypoint was moved — STORY-007).
   */
  segmentRefreshTrigger?: number;
  /** Incrementing this causes DailyDestinations to re-fetch destinations and regenerate routes. */
  destinationRefreshTrigger?: number;
  /** Forwarded to DailyDestinations so clicking a day badge zooms the map. */
  onFitPoints?: (points: [number, number][]) => void;
  /** Forwarded to DailyDestinations to notify the map of day selection. */
  onDaySelect?: (destinationId: string | null) => void;
  /** POIs for this trip — forwarded to DailyDestinations for display. */
  pois?: DailyPoiResponse[];
  /** Pre-selected day destination ID to restore on mount. */
  initialSelectedDayId?: string | null;
  /** Callback to push a message to the status bar. */
  onStatusMessage?: (text: string, detail?: string) => void;
  /** Callback to show a persistent loading animation in the status bar. */
  onSetLoading?: (text: string) => void;
  /** Callback when the trip's date range changes (e.g. after insert-day). */
  onTripDatesChange?: (startDate: string, stopDate: string) => void;
  /** Called when a POI or parkup name is clicked in the sidebar. */
  onPoiClick?: (poi: DailyPoiResponse) => void;
  /** Called when a destination name is clicked in the sidebar. */
  onDestinationClick?: (dest: DailyDestinationResponse) => void;
  /** Callback when AI Research discovers experiences — used to show markers on map. */
  onExperiencesDiscovered?: (experiences: Array<{
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
    aiProvider?: 'chatgpt' | 'claude';
  }>) => void;
}

export default function TripDetail({
  tripId,
  onBack,
  onEdit,
  onDelete,
  onRouteData,
  segmentRefreshTrigger,
  destinationRefreshTrigger,
  onFitPoints,
  onDaySelect,
  pois,
  initialSelectedDayId,
  onStatusMessage,
  onSetLoading,
  onTripDatesChange,
  onPoiClick,
  onDestinationClick,
  onExperiencesDiscovered,
}: TripDetailProps) {
  const [trip, setTrip] = useState<TripResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTogglingPlanMode, setIsTogglingPlanMode] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [totalDistanceKm, setTotalDistanceKm] = useState<number | null>(null);

  // Notify parent when trip dates change
  useEffect(() => {
    if (trip) {
      const start = typeof trip.startDate === 'string' ? trip.startDate.split('T')[0] : new Date(trip.startDate).toISOString().split('T')[0];
      const stop = typeof trip.stopDate === 'string' ? trip.stopDate.split('T')[0] : new Date(trip.stopDate).toISOString().split('T')[0];
      onTripDatesChange?.(start, stop);
    }
  }, [trip?.startDate, trip?.stopDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch trip details from API
  const fetchTripDetails = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/trips/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Trip not found');
        }
        throw new Error(`Failed to fetch trip: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTrip(data);
    } catch (err) {
      console.error('[TripDetail] Error fetching trip:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trip');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch trip when tripId changes
  useEffect(() => {
    if (tripId) {
      fetchTripDetails(tripId);
    } else {
      setTrip(null);
      setError(null);
    }
  }, [tripId]);

  // Set plan mode to a specific value
  const setPlanMode = async (value: boolean) => {
    if (!trip || trip.planMode === value) return;

    setIsTogglingPlanMode(true);

    try {
      const response = await fetch(`/api/trips/${trip.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planMode: value }),
      });

      if (!response.ok) {
        throw new Error('Failed to update mode');
      }

      const updatedTrip = await response.json();
      setTrip(updatedTrip);
    } catch (err) {
      console.error('[TripDetail] Error setting mode:', err);
    } finally {
      setIsTogglingPlanMode(false);
    }
  };

  // Run AI experience discovery for the trip
  const handleAiResearch = async () => {
    if (!trip) return;
    setIsResearching(true);
    onSetLoading?.('AI Research: analysing route...');
    try {
      const res = await fetch('/api/discover-experiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: trip.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        onStatusMessage?.(`AI Research failed: ${data.error ?? res.statusText}`, JSON.stringify(data, null, 2));
        return;
      }
      const count = data.experiences?.length ?? 0;
      const stars3 = data.experiences?.filter((e: { michelinStars: number }) => e.michelinStars === 3).length ?? 0;
      const stars2 = data.experiences?.filter((e: { michelinStars: number }) => e.michelinStars === 2).length ?? 0;
      const stars1 = count - stars3 - stars2;
      const summary = [
        stars3 > 0 ? `${stars3} must-visit` : '',
        stars2 > 0 ? `${stars2} worth a detour` : '',
        stars1 > 0 ? `${stars1} worth a stop` : '',
      ].filter(Boolean).join(', ');
      const cachedLabel = data.cached ? ' (cached)' : '';
      const providerLabel = data.aiProvider === 'claude' ? 'Claude' : 'ChatGPT';
      onStatusMessage?.(
        `AI Research (${providerLabel}): found ${count} experiences${cachedLabel} — ${summary}`,
        JSON.stringify(data, null, 2),
      );
      if (data.experiences?.length) {
        const aiProv = data.aiProvider ?? 'chatgpt';
        onExperiencesDiscovered?.(data.experiences.map((e: Record<string, unknown>) => ({ ...e, aiProvider: aiProv })));
      }
    } catch (err) {
      onStatusMessage?.('AI Research failed', String(err));
    } finally {
      setIsResearching(false);
    }
  };

  // No trip selected state
  if (!tripId) {
    return (
      <div className="p-4">
        <div className="rounded-md bg-neutral-50 p-6 text-center border border-neutral-200">
          <svg
            className="mx-auto h-12 w-12 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-2 text-sm text-neutral-600">
            Select a trip from the list to view details
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
        <p className="mt-2 text-sm text-neutral-600">Loading trip details...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-md bg-error-50 p-4 border border-error-200">
          <p className="text-sm text-error-800">
            <strong>Error:</strong> {error}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => fetchTripDetails(tripId)}
              className="text-sm text-error-600 hover:text-error-800 underline"
            >
              Try again
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="text-sm text-error-600 hover:text-error-800 underline"
              >
                Go back
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // No trip loaded yet
  if (!trip) {
    return null;
  }

  // Format date helper
  const formatDate = (dateString: string | Date) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString.toString();
    }
  };

  // Format timestamp helper
  const formatTimestamp = (dateString: string | Date) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString.toString();
    }
  };

  // Calculate trip duration in days
  const calculateDuration = (startDate: string | Date, stopDate: string | Date) => {
    const start = new Date(startDate);
    const stop = new Date(stopDate);
    const diffTime = Math.abs(stop.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end day
    return diffDays;
  };

  return (
    <div className="p-4">
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to list
        </button>
      )}

      {/* Trip details card */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        {/* Title */}
        <h2 className="text-2xl font-bold text-neutral-900">{trip.title}</h2>

        {/* Description */}
        {trip.description && (
          <p className="mt-3 text-neutral-700 whitespace-pre-wrap">
            {trip.description}
          </p>
        )}

        {/* Dates section */}
        <div className="mt-6 space-y-3">
          <div className="flex items-start gap-3">
            <svg
              className="mt-1 h-5 w-5 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-500">Start Date</p>
              <p className="mt-1 text-base text-neutral-900">{formatDate(trip.startDate)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <svg
              className="mt-1 h-5 w-5 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-500">End Date</p>
              <p className="mt-1 text-base text-neutral-900">{formatDate(trip.stopDate)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <svg
              className="mt-1 h-5 w-5 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-500">Duration</p>
              <p className="mt-1 text-base text-neutral-900">
                {calculateDuration(trip.startDate, trip.stopDate)} days
              </p>
            </div>
          </div>

          {totalDistanceKm != null && (
            <div className="flex items-start gap-3">
              <svg
                className="mt-1 h-5 w-5 text-neutral-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-500">Distance</p>
                <p className="mt-1 text-base text-neutral-900">
                  {totalDistanceKm.toFixed(0)} km
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mode selector */}
        <div className="mt-6 border-t border-neutral-200 pt-4">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Mode</p>
          <div className="flex gap-1 rounded-lg bg-neutral-100 p-1">
            <button
              onClick={() => setPlanMode(false)}
              disabled={isTogglingPlanMode}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all disabled:opacity-50 ${
                !trip.planMode
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-800'
              }`}
            >
              Travel
            </button>
            <button
              onClick={() => setPlanMode(true)}
              disabled={isTogglingPlanMode}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all disabled:opacity-50 ${
                trip.planMode
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-800'
              }`}
            >
              Plan
            </button>
          </div>
        </div>

        {/* Daily Destinations (shown when plan mode is enabled) */}
        {trip.planMode && (
          <DailyDestinations
            trip={trip}
            onRouteData={(segments, destinations) => {
              const totalM = segments.reduce((sum, s) => sum + s.distanceMeters, 0);
              setTotalDistanceKm(totalM > 0 ? totalM / 1000 : null);
              onRouteData?.(segments, destinations);
            }}
            segmentRefreshTrigger={segmentRefreshTrigger}
            destinationRefreshTrigger={destinationRefreshTrigger}
            onFitPoints={onFitPoints}
            onDaySelect={onDaySelect}
            pois={pois}
            initialSelectedDayId={initialSelectedDayId}
            onTripChange={(updatedTrip) => setTrip(updatedTrip)}
            onUpdate={() => {
              if (tripId) fetchTripDetails(tripId);
            }}
            onPoiClick={onPoiClick}
            onDestinationClick={onDestinationClick}
          />
        )}

        {/* Metadata section */}
        <div className="mt-6 border-t border-neutral-200 pt-4 space-y-2">
          <div className="flex justify-between text-xs text-neutral-500">
            <span>Created</span>
            <span>{formatTimestamp(trip.createdAt)}</span>
          </div>
          <div className="flex justify-between text-xs text-neutral-500">
            <span>Last updated</span>
            <span>{formatTimestamp(trip.updatedAt)}</span>
          </div>
          <div className="flex justify-between text-xs text-neutral-500">
            <span>Trip ID</span>
            <span className="font-mono">{trip.id}</span>
          </div>
        </div>

        {/* AI Research */}
        <div className="mt-6 border-t border-neutral-200 pt-4">
          <button
            onClick={handleAiResearch}
            disabled={isResearching}
            className="w-full rounded-md bg-info-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-info-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isResearching ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent" />
                Researching...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Research
              </>
            )}
          </button>
          <p className="mt-1.5 text-xs text-neutral-500 text-center">
            Discover must-see experiences along this route
          </p>
        </div>

        {/* Action buttons */}
        {(onEdit || onDelete) && (
          <div className="mt-6 flex gap-3 border-t border-neutral-200 pt-4">
            {onEdit && (
              <button
                onClick={() => onEdit(trip)}
                className="flex-1 rounded-md bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-all"
              >
                Edit Trip
              </button>
            )}
            
            {onDelete && (
              <button
                onClick={() => onDelete(trip)}
                className="flex-1 rounded-md bg-error-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-error-700 transition-all"
              >
                Delete Trip
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
