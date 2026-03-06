'use client';

/**
 * TripList Component
 * Displays a list of all trips fetched from the API
 * Task: TASK-006
 */

import React, { useEffect, useState } from 'react';
import type { TripResponse } from '@/lib/schemas/trip';

interface TripListProps {
  /**
   * Callback when a trip is selected for viewing details
   */
  onTripSelect?: (trip: TripResponse) => void;
  
  /**
   * Callback when edit button is clicked
   */
  onTripEdit?: (trip: TripResponse) => void;
  
  /**
   * Callback when delete button is clicked
   */
  onTripDelete?: (trip: TripResponse) => void;
  
  /**
   * Trigger to refresh the trip list (incremented when a trip is created/updated/deleted)
   */
  refreshTrigger?: number;
}

export default function TripList({
  onTripSelect,
  onTripEdit,
  onTripDelete,
  refreshTrigger = 0,
}: TripListProps) {
  const [trips, setTrips] = useState<TripResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch trips from API
  const fetchTrips = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/trips');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch trips: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTrips(data);
    } catch (err) {
      console.error('[TripList] Error fetching trips:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trips');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch trips on mount and when refreshTrigger changes
  useEffect(() => {
    fetchTrips();
  }, [refreshTrigger]);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
        <p className="mt-2 text-sm text-neutral-600">Loading trips...</p>
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
          <button
            onClick={fetchTrips}
            className="mt-2 text-sm text-error-600 hover:text-error-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (trips.length === 0) {
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="mt-2 text-sm text-neutral-600">
            No trips yet. Create your first trip using the form above!
          </p>
        </div>
      </div>
    );
  }

  // Format date helper
  const formatDate = (dateString: string | Date) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
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
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900">
          Your Trips ({trips.length})
        </h3>
      </div>

      <div className="space-y-2">
        {trips.map((trip) => (
          <div
            key={trip.id}
            className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Trip header - clickable to view details */}
            <div
              className={onTripSelect ? 'cursor-pointer' : undefined}
              onClick={() => onTripSelect?.(trip)}
            >
              <h4 className="font-medium text-neutral-900 hover:text-primary-600">
                {trip.title}
              </h4>
              
              {trip.description && (
                <p className="mt-1 text-sm text-neutral-600 line-clamp-2">
                  {trip.description}
                </p>
              )}

              <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
                <span className="flex items-center gap-1">
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
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {formatDate(trip.startDate)} - {formatDate(trip.stopDate)}
                </span>
                
                <span className="flex items-center gap-1">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {calculateDuration(trip.startDate, trip.stopDate)} days
                </span>
              </div>
            </div>

            {/* Action buttons */}
            {(onTripEdit || onTripDelete) && (
              <div className="mt-3 flex gap-2 border-t border-neutral-100 pt-3">
                {onTripEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTripEdit(trip);
                    }}
                    className="flex-1 rounded-md bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 transition-all"
                  >
                    Edit
                  </button>
                )}
                
                {onTripDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTripDelete(trip);
                    }}
                    className="flex-1 rounded-md bg-error-50 px-3 py-2 text-sm font-medium text-error-700 hover:bg-error-100 transition-all"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
