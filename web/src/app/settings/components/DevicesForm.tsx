'use client';

/**
 * DevicesForm — view and manage devices registered for cross-device sync.
 * Location: src/app/settings/components/DevicesForm.tsx
 *
 * Lists all devices that have synced, shows when each was last seen, lets the
 * user rename or remove a device. The device used by the current browser is
 * highlighted.
 */

import { useCallback, useEffect, useState } from 'react';
import { useDeviceIdentity } from '@/app/hooks';

interface Device {
  id: string;
  name: string;
  lastSeenAt: string;
  createdAt: string;
}

function formatLastSeen(iso: string): string {
  const then = new Date(iso).getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}

export default function DevicesForm() {
  const { deviceId: currentDeviceId } = useDeviceIdentity();

  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/devices');
      if (!res.ok) throw new Error('Failed to load devices');
      const data: { devices: Device[] } = await res.json();
      setDevices(data.devices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devices');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const handleStartEdit = (device: Device) => {
    setEditingId(device.id);
    setEditName(device.name);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleSaveEdit = async (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setError('Device name cannot be empty.');
      return;
    }
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/devices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to rename device');
      }
      const updated: Device = await res.json();
      setDevices((prev) =>
        prev.map((d) => (d.id === id ? { ...d, name: updated.name } : d))
      );
      setEditingId(null);
      setEditName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename device');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/devices/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to remove device');
      }
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove device');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-neutral-500">Loading devices...</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {devices.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No devices yet. Open a trip on this or another device to register it for sync.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white">
          {devices.map((device) => {
            const isCurrent = device.id === currentDeviceId;
            const isEditing = editingId === device.id;
            return (
              <li
                key={device.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={200}
                      autoFocus
                      className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(device.id);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-neutral-900">
                        {device.name}
                      </span>
                      {isCurrent && (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          This device
                        </span>
                      )}
                    </div>
                  )}
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Last seen {formatLastSeen(device.lastSeenAt)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(device.id)}
                        disabled={savingId === device.id}
                        className="rounded-md bg-primary-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                      >
                        {savingId === device.id ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={savingId === device.id}
                        className="rounded-md px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(device)}
                        className="rounded-md px-2.5 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(device.id)}
                        disabled={deletingId === device.id}
                        className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === device.id ? 'Removing...' : 'Remove'}
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
