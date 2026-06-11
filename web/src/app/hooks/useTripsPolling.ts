/**
 * Trips Polling Hook
 * Location: src/app/hooks/useTripsPolling.ts
 * 
 * Periodically polls for changes to a trip and notifies parent context.
 * Implements exponential backoff on errors and respects active trip status.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface ChangeItem {
  id: string;
  type: string; // 'trip' | 'destination' | 'poi' | 'route_segment' | 'route_waypoint'
  tripId: string;
  updatedAt: string;
  lastModifiedByDeviceId: string | null;
  deviceName: string | null;
}

export interface UseTripsPollingReturn {
  isPolling: boolean;
  lastSyncTime: string | null;
  hasChanges: boolean;
  error: string | null;
  changes: ChangeItem[];
  pausePolling: () => void;
  resumePolling: () => void;
  resetSync: () => void;
}

const DEFAULT_POLLING_INTERVAL_MS = 3000; // 3 seconds
const MAX_BACKOFF_MS = 60000; // 60 seconds
const BACKOFF_MULTIPLIER = 1.5;

/**
 * useTripsPolling Hook
 * 
 * Polls the `/api/trips/{tripId}/changes` endpoint at regular intervals
 * to detect changes made on other devices.
 * 
 * Features:
 * - Automatic exponential backoff on errors
 * - Pause/resume functionality
 * - Change notification tracking
 * - Respects polling interval setting
 * 
 * Parameters:
 * - tripId: ID of the trip to monitor
 * - onChangesDetected: Optional callback when changes are detected
 * - pollingIntervalMs: Interval between polls (default: 3000ms)
 * - enabled: Whether polling is active (default: true)
 * 
 * Returns:
 * - isPolling: Whether polling is currently active
 * - lastSyncTime: ISO timestamp of last successful sync
 * - hasChanges: Whether unprocessed changes exist
 * - error: Last error message (if any)
 * - changes: Array of detected changes
 * - pausePolling: Function to pause polling
 * - resumePolling: Function to resume polling
 * - resetSync: Function to reset change detection
 */
export function useTripsPolling(
  tripId: string | null,
  onChangesDetected?: (changes: ChangeItem[]) => void,
  pollingIntervalMs = DEFAULT_POLLING_INTERVAL_MS,
  enabled = true
): UseTripsPollingReturn {
  const [isPolling, setIsPolling] = useState(enabled && !!tripId);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState<ChangeItem[]>([]);

  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const backoffRef = useRef<number>(pollingIntervalMs);
  const isPausedRef = useRef<boolean>(false);

  const performSync = useCallback(async () => {
    if (!tripId || !isPolling || isPausedRef.current) {
      return;
    }

    try {
      // Use lastSyncTime as 'since' parameter to only get new changes
      const since = lastSyncTime ? new Date(lastSyncTime).toISOString() : undefined;
      const params = new URLSearchParams();
      if (since) params.append('since', since);

      const response = await fetch(`/api/trips/${tripId}/changes?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch changes`);
      }

      const data = await response.json();
      const newChanges: ChangeItem[] = data.changes || [];
      const syncTime = data.lastSyncTime;

      setLastSyncTime(syncTime);
      setError(null);

      // Reset backoff on success
      backoffRef.current = pollingIntervalMs;

      if (newChanges.length > 0) {
        setChanges(newChanges);
        setHasChanges(true);
        onChangesDetected?.(newChanges);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown polling error';
      console.warn(`[useTripsPolling] Sync error for trip ${tripId}:`, message);
      setError(message);

      // Exponential backoff on error
      backoffRef.current = Math.min(backoffRef.current * BACKOFF_MULTIPLIER, MAX_BACKOFF_MS);
    }
  }, [tripId, isPolling, lastSyncTime, onChangesDetected, pollingIntervalMs]);

  const pausePolling = useCallback(() => {
    isPausedRef.current = true;
  }, []);

  const resumePolling = useCallback(() => {
    isPausedRef.current = false;
    // Immediately poll when resuming
    performSync();
  }, [performSync]);

  const resetSync = useCallback(() => {
    setChanges([]);
    setHasChanges(false);
    setLastSyncTime(null);
  }, []);

  // Set up polling interval
  useEffect(() => {
    if (!tripId || !enabled) {
      setIsPolling(false);
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      return;
    }

    setIsPolling(true);

    // Perform initial sync immediately
    performSync();

    // Then set up recurring polls
    intervalIdRef.current = setInterval(() => {
      performSync();
    }, backoffRef.current);

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [tripId, enabled, performSync]);

  return {
    isPolling,
    lastSyncTime,
    hasChanges,
    error,
    changes,
    pausePolling,
    resumePolling,
    resetSync,
  };
}

