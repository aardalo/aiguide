'use client';

/**
 * Settings Page
 * Location: src/app/settings/page.tsx
 *
 * Global configuration: routing providers and API keys.
 */

import Link from 'next/link';
import HomeForm from './components/HomeForm';
import RoutingProviderForm from './components/RoutingProviderForm';
import TripadvisorSettingsForm from './components/TripadvisorSettingsForm';
import FoursquareSettingsForm from './components/FoursquareSettingsForm';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
            <p className="text-sm text-neutral-600 mt-1">
              Configure map provider and API keys
            </p>
          </div>
          <Link
            href="/map"
            className="text-sm text-primary-600 hover:text-primary-800 font-medium"
          >
            ← Back to Map
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-1">Home Location</h2>
          <p className="text-sm text-neutral-600 mb-4">
            The departure point for all trips. Route planning always starts from here.
          </p>
          <HomeForm />
        </section>
        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-1">Map Provider</h2>
          <p className="text-sm text-neutral-600 mb-4">
            Choose the map platform and configure API keys. Affects map tiles, route planning, and nearby place search.
          </p>
          <RoutingProviderForm />
        </section>
        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-1">Tripadvisor</h2>
          <p className="text-sm text-neutral-600 mb-4">
            API key for nearby place search (hotels, restaurants, attractions).
          </p>
          <TripadvisorSettingsForm />
        </section>
        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-1">Foursquare</h2>
          <p className="text-sm text-neutral-600 mb-4">
            API key for nearby place search (food, hotels, outdoors, shopping).
          </p>
          <FoursquareSettingsForm />
        </section>
      </main>
    </div>
  );
}
