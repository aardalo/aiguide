'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TripList from '@/app/map/components/TripList';
import type { TripResponse } from '@/lib/schemas/trip';

export default function TripsPage() {
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDelete = async (trip: TripResponse) => {
    if (!confirm(`Delete "${trip.title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/trips/${trip.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setRefreshTrigger((n) => n + 1);
    } catch {
      alert('Failed to delete trip. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">My Trips</h1>
          <Link
            href="/map"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            + New Trip
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-6">
        <TripList
          onTripSelect={(trip) => router.push(`/trips/${trip.id}`)}
          onTripEdit={(trip) => router.push(`/trips/${trip.id}/edit`)}
          onTripDelete={handleDelete}
          refreshTrigger={refreshTrigger}
        />
      </main>
    </div>
  );
}
