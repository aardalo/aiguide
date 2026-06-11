'use client';

/**
 * SyncStatus Component
 * Location: src/app/map/components/SyncStatus.tsx
 *
 * Compact indicator showing cross-device synchronization status.
 * Displays polling state, time since last sync, and recent device activity.
 */

import { useEffect, useState } from 'react';
import type { ChangeItem } from '@/app/hooks/useTripsPolling';

export interface SyncStatusProps {
  /** Whether polling is currently active. */
  isPolling: boolean;
  /** ISO timestamp of the last successful sync, or null. */
  lastSyncTime: string | null;
  /** Last error message from polling, or null. */
  error: string | null;
  /** Most recent batch of detected changes (used to surface device names). */
  recentChanges: ChangeItem[];
  /** Name of the current device (to avoid showing "updated on <self>"). */
  currentDeviceName?: string | null;
}

/** Format an ISO timestamp into a short relative string (e.g. "5s ago"). */
function formatRelativeTime(iso: string | null, now: number): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  const diffMs = Math.max(0, now - then);
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

export default function SyncStatus({
  isPolling,
  lastSyncTime,
  error,
  recentChanges,
  currentDeviceName,
}: SyncStatusProps) {
  // Tick once per second so the relative time stays fresh.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Find the most recent change from a *different* device for attribution.
  const remoteChange = recentChanges.find(
    (c) => c.deviceName && c.deviceName !== currentDeviceName,
  );

  let dotColor = 'bg-neutral-300';
  let label = 'Sync off';
  let title = 'Cross-device sync is not active';

  if (error) {
    dotColor = 'bg-amber-500';
    label = 'Sync issue';
    title = `Sync error: ${error}`;
  } else if (isPolling) {
    dotColor = 'bg-emerald-500';
    label = `Synced ${formatRelativeTime(lastSyncTime, now)}`;
    title = remoteChange
      ? `Last update from ${remoteChange.deviceName}`
      : 'Cross-device sync active';
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 text-[11px] text-neutral-500"
      title={title}
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2">
        {isPolling && !error && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dotColor} opacity-60`}
          />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dotColor}`} />
      </span>
      <span className="truncate">{label}</span>
      {remoteChange && !error && (
        <span className="hidden md:inline text-neutral-400 truncate">
          · from {remoteChange.deviceName}
        </span>
      )}
    </div>
  );
}
