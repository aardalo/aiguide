'use client';

/**
 * MapProviderForm — configure the active map provider, tile API keys, and routing engine.
 * Location: src/app/settings/components/RoutingProviderForm.tsx
 */

import { useEffect, useState } from 'react';

type MapProviderId = 'osm' | 'google' | 'mapbox';
type OsmRoutingId = 'ors' | 'osrm';

interface SettingRow {
  key: string;
  value: string;
}

const MAP_PROVIDERS: { id: MapProviderId; label: string; description: string }[] = [
  { id: 'osm', label: 'OpenStreetMap', description: 'Free, no API key required' },
  { id: 'google', label: 'Google Maps', description: 'Requires Google Maps API key' },
  { id: 'mapbox', label: 'Mapbox', description: 'Requires Mapbox access token' },
];

const OSM_ROUTING_ENGINES: {
  id: OsmRoutingId;
  label: string;
  keyLabel: string;
  placeholder: string;
  keyField: string;
  envVar: string;
}[] = [
  {
    id: 'ors',
    label: 'OpenRouteService',
    keyLabel: 'API Key',
    placeholder: '5b3ce3597851...',
    keyField: 'ors.api_key',
    envVar: 'ORS_API_KEY',
  },
  {
    id: 'osrm',
    label: 'OSRM (self-hosted)',
    keyLabel: 'Base URL',
    placeholder: 'http://router.project-osrm.org',
    keyField: 'osrm.base_url',
    envVar: 'OSRM_BASE_URL',
  },
];

export default function RoutingProviderForm() {
  const [mapProvider, setMapProvider] = useState<MapProviderId>('osm');
  const [osmRouting, setOsmRouting] = useState<OsmRoutingId>('osrm');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error('Failed to load settings');
        const rows: SettingRow[] = await res.json();
        const sm: Record<string, string> = {};
        for (const row of rows) sm[row.key] = row.value;
        setMapProvider((sm['map.provider'] as MapProviderId) ?? 'osm');
        setOsmRouting((sm['routing.provider'] as OsmRoutingId) ?? 'osrm');
        setApiKeys(sm);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const save = async (key: string, value: string) => {
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

  const handleMapProviderChange = async (id: MapProviderId) => {
    setMapProvider(id);
    setSuccessMessage(null);
    setError(null);
    try {
      await save('map.provider', id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save provider');
    }
  };

  const handleOsmRoutingChange = async (id: OsmRoutingId) => {
    setOsmRouting(id);
    setSuccessMessage(null);
    setError(null);
    try {
      await save('routing.provider', id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save routing engine');
    }
  };

  const handleKeySubmit = async (e: React.FormEvent<HTMLFormElement>, keyField: string, label: string) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setError(null);
    const value = apiKeys[keyField] ?? '';
    try {
      await save(keyField, value);
      setSuccessMessage(`${label} saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save key');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-neutral-500">Loading settings...</p>;
  }

  return (
    <div className="space-y-6">
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

      {/* Map provider selector */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Map Provider
        </label>
        <div className="grid grid-cols-3 gap-2">
          {MAP_PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleMapProviderChange(p.id)}
              className={[
                'rounded-lg border px-3 py-2 text-sm font-medium transition-colors text-left',
                mapProvider === p.id
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50',
              ].join(' ')}
            >
              <div>{p.label}</div>
              <div className="text-xs font-normal text-neutral-500 mt-0.5">{p.description}</div>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Controls map tiles, route planning, and nearby place search. Reload the map page after changing.
        </p>
      </div>

      {/* OSM: routing engine sub-selector */}
      {mapProvider === 'osm' && (
        <div className="space-y-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Routing Engine
            </label>
            <div className="grid grid-cols-2 gap-2">
              {OSM_ROUTING_ENGINES.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => handleOsmRoutingChange(e.id)}
                  className={[
                    'rounded-lg border px-3 py-2 text-sm font-medium transition-colors text-left',
                    osmRouting === e.id
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50',
                  ].join(' ')}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* API key / URL for the selected routing engine */}
          {OSM_ROUTING_ENGINES.filter((e) => e.id === osmRouting).map((engine) => (
            <form
              key={engine.id}
              onSubmit={(ev) => handleKeySubmit(ev, engine.keyField, `${engine.label} ${engine.keyLabel}`)}
              className="space-y-3"
            >
              <div>
                <label htmlFor="osmKey" className="block text-sm font-medium text-neutral-700 mb-1">
                  {engine.keyLabel}
                  {apiKeys[engine.keyField] === '[SET]' && (
                    <span className="ml-2 text-xs text-success-600 font-normal">(configured)</span>
                  )}
                </label>
                <input
                  id="osmKey"
                  type={engine.id === 'ors' ? 'password' : 'text'}
                  autoComplete="off"
                  placeholder={
                    apiKeys[engine.keyField] === '[SET]'
                      ? '••••••••  (leave blank to keep current)'
                      : engine.placeholder
                  }
                  value={apiKeys[engine.keyField] === '[SET]' ? '' : (apiKeys[engine.keyField] ?? '')}
                  onChange={(e) =>
                    setApiKeys((prev) => ({ ...prev, [engine.keyField]: e.target.value }))
                  }
                  className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Set the{' '}
                  <code className="bg-neutral-100 px-1 rounded text-neutral-700">{engine.envVar}</code>
                  {' '}environment variable to override.
                </p>
              </div>
              <button
                type="submit"
                disabled={
                  isSaving ||
                  !apiKeys[engine.keyField] ||
                  apiKeys[engine.keyField] === '[SET]'
                }
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSaving ? 'Saving…' : `Save ${engine.keyLabel}`}
              </button>
            </form>
          ))}
        </div>
      )}

      {/* Google: API key */}
      {mapProvider === 'google' && (
        <form
          onSubmit={(e) => handleKeySubmit(e, 'google.api_key', 'Google Maps API Key')}
          className="space-y-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200"
        >
          <h3 className="text-sm font-semibold text-neutral-900">Google Maps — API Key</h3>
          <div>
            <label htmlFor="googleKey" className="block text-sm font-medium text-neutral-700 mb-1">
              API Key
              {apiKeys['google.api_key'] === '[SET]' && (
                <span className="ml-2 text-xs text-success-600 font-normal">(configured)</span>
              )}
            </label>
            <input
              id="googleKey"
              type="password"
              autoComplete="off"
              placeholder={
                apiKeys['google.api_key'] === '[SET]'
                  ? '••••••••  (leave blank to keep current)'
                  : 'AIzaSy...'
              }
              value={apiKeys['google.api_key'] === '[SET]' ? '' : (apiKeys['google.api_key'] ?? '')}
              onChange={(e) =>
                setApiKeys((prev) => ({ ...prev, 'google.api_key': e.target.value }))
              }
              className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Enable the Maps JavaScript API, Directions API, and Places API (New) in Google Cloud Console.
              Set the{' '}
              <code className="bg-neutral-100 px-1 rounded text-neutral-700">GOOGLE_API_KEY</code>
              {' '}environment variable to override.
            </p>
          </div>
          <button
            type="submit"
            disabled={
              isSaving ||
              !apiKeys['google.api_key'] ||
              apiKeys['google.api_key'] === '[SET]'
            }
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? 'Saving…' : 'Save API Key'}
          </button>
        </form>
      )}

      {/* Mapbox: access token */}
      {mapProvider === 'mapbox' && (
        <form
          onSubmit={(e) => handleKeySubmit(e, 'mapbox.api_key', 'Mapbox Access Token')}
          className="space-y-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200"
        >
          <h3 className="text-sm font-semibold text-neutral-900">Mapbox — Access Token</h3>
          <div>
            <label htmlFor="mapboxKey" className="block text-sm font-medium text-neutral-700 mb-1">
              Access Token
              {apiKeys['mapbox.api_key'] === '[SET]' && (
                <span className="ml-2 text-xs text-success-600 font-normal">(configured)</span>
              )}
            </label>
            <input
              id="mapboxKey"
              type="password"
              autoComplete="off"
              placeholder={
                apiKeys['mapbox.api_key'] === '[SET]'
                  ? '••••••••  (leave blank to keep current)'
                  : 'pk.eyJ1...'
              }
              value={apiKeys['mapbox.api_key'] === '[SET]' ? '' : (apiKeys['mapbox.api_key'] ?? '')}
              onChange={(e) =>
                setApiKeys((prev) => ({ ...prev, 'mapbox.api_key': e.target.value }))
              }
              className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Create a public token at mapbox.com/account. Enables Mapbox Streets tiles and Mapbox Directions routing.
              Set the{' '}
              <code className="bg-neutral-100 px-1 rounded text-neutral-700">MAPBOX_API_KEY</code>
              {' '}environment variable to override.
            </p>
          </div>
          <button
            type="submit"
            disabled={
              isSaving ||
              !apiKeys['mapbox.api_key'] ||
              apiKeys['mapbox.api_key'] === '[SET]'
            }
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? 'Saving…' : 'Save Token'}
          </button>
        </form>
      )}
    </div>
  );
}
