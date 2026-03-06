'use client';

import { useEffect, useState } from 'react';

interface SettingRow {
  key: string;
  value: string;
}

export default function FoursquareSettingsForm() {
  const [apiKey, setApiKey] = useState('');
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
        const sm = Object.fromEntries(rows.map((r) => [r.key, r.value]));
        if (sm['foursquare.api_key']) {
          setApiKey(sm['foursquare.api_key']);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'foursquare.api_key', value: apiKey }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to save');
      }
      setSuccessMessage('Foursquare API key saved.');
      setApiKey('[SET]');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save key');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-neutral-500">Loading...</p>;
  }

  const isSet = apiKey === '[SET]';

  return (
    <form
      onSubmit={handleSubmit}
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
        <label htmlFor="foursquareKey" className="block text-sm font-medium text-neutral-700 mb-1">
          API Key
          {isSet && (
            <span className="ml-2 text-xs text-success-600 font-normal">(configured)</span>
          )}
        </label>
        <input
          id="foursquareKey"
          type="password"
          autoComplete="off"
          placeholder={isSet ? '--------  (leave blank to keep current)' : 'fsq_xxxxxxxxxxxxxxxxxxxxxxxxx'}
          value={isSet ? '' : apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Get a key at{' '}
          <a
            href="https://location.foursquare.com/developer/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline"
          >
            location.foursquare.com/developer
          </a>
          . Set the{' '}
          <code className="bg-neutral-100 px-1 rounded text-neutral-700">FOURSQUARE_API_KEY</code>
          {' '}environment variable to override.
        </p>
      </div>
      <button
        type="submit"
        disabled={isSaving || !apiKey || isSet}
        className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isSaving ? 'Saving...' : 'Save API Key'}
      </button>
    </form>
  );
}
