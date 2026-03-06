'use client';

/**
 * HomeForm — configure the global home/departure location.
 * Location: src/app/settings/components/HomeForm.tsx
 *
 * Stores three settings: home.name, home.latitude, home.longitude.
 * Route planning always starts from this point.
 */

import { useEffect, useRef, useState } from 'react';
import type { PlaceResult } from '@/lib/schemas/geocoding';

interface SettingRow {
  key: string;
  value: string;
}

export default function HomeForm() {
  const [name, setName] = useState('');
  const [placeCoords, setPlaceCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [placeDisplayName, setPlaceDisplayName] = useState<string | null>(null);

  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [noResults, setNoResults] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const placeCoordsRef = useRef(placeCoords);
  placeCoordsRef.current = placeCoords;

  // Load existing home setting on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error('Failed to load settings');
        const rows: SettingRow[] = await res.json();
        const sm = Object.fromEntries(rows.map((r) => [r.key, r.value]));
        if (sm['home.name'] && sm['home.latitude'] && sm['home.longitude']) {
          setName(sm['home.name']);
          setPlaceCoords({ lat: parseFloat(sm['home.latitude']), lng: parseFloat(sm['home.longitude']) });
          setPlaceDisplayName(sm['home.name']);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Debounced geocode search
  useEffect(() => {
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      setNoResults(false);
      return;
    }
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
    if (placeCoords) {
      setPlaceCoords(null);
      setPlaceDisplayName(null);
    }
    setSuccessMessage(null);
    setError(null);
  };

  const handleSelectPlace = (result: PlaceResult) => {
    setName(result.name);
    setPlaceCoords({ lat: result.latitude, lng: result.longitude });
    setPlaceDisplayName(result.displayName);
    setSearchResults([]);
    setShowDropdown(false);
    setNoResults(false);
  };

  const handleClearPlace = () => {
    setPlaceCoords(null);
    setPlaceDisplayName(null);
    setSearchResults([]);
    setShowDropdown(false);
    setNoResults(false);
  };

  const putSetting = async (key: string, value: string) => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? 'Failed to save');
    }
  };

  const deleteSetting = async (key: string) => {
    const res = await fetch('/api/settings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? 'Failed to delete');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeCoords) {
      setError('Please select a location from the suggestions.');
      return;
    }
    setIsSaving(true);
    setSuccessMessage(null);
    setError(null);
    try {
      await Promise.all([
        putSetting('home.name', name),
        putSetting('home.latitude', String(placeCoords.lat)),
        putSetting('home.longitude', String(placeCoords.lng)),
      ]);
      setSuccessMessage('Home location saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save home location');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsClearing(true);
    setSuccessMessage(null);
    setError(null);
    try {
      await Promise.all([
        deleteSetting('home.name'),
        deleteSetting('home.latitude'),
        deleteSetting('home.longitude'),
      ]);
      setName('');
      setPlaceCoords(null);
      setPlaceDisplayName(null);
      setSuccessMessage('Home location cleared.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear home location');
    } finally {
      setIsClearing(false);
    }
  };

  const secondaryLine = (displayName: string) => {
    const idx = displayName.indexOf(',');
    return idx >= 0 ? displayName.slice(idx + 1).trim() : '';
  };

  if (isLoading) {
    return <p className="text-sm text-neutral-500">Loading...</p>;
  }

  return (
    <form
      onSubmit={handleSave}
      className="space-y-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200"
    >
      {error && (
        <div className="rounded-md bg-error-50 p-3 border border-error-200">
          <p className="text-sm text-error-800">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="rounded-md bg-success-50 p-3 border border-success-200">
          <p className="text-sm text-success-800">{successMessage}</p>
        </div>
      )}

      <div>
        <label htmlFor="homeName" className="block text-sm font-medium text-neutral-700 mb-1">
          Address or place name
        </label>

        <div className="relative">
          <input
            id="homeName"
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Type a city or address…"
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

        {noResults && !isSearching && (
          <p className="mt-1 text-xs text-neutral-500">No places found.</p>
        )}

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

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSaving || !placeCoords}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isSaving ? 'Saving…' : 'Save Home'}
        </button>
        {(placeDisplayName || name) && (
          <button
            type="button"
            onClick={handleClear}
            disabled={isClearing}
            className="rounded-md bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isClearing ? 'Clearing…' : 'Clear'}
          </button>
        )}
      </div>
    </form>
  );
}
