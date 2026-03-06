'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import TripForm from '@/app/map/components/TripForm';
import type { TripResponse } from '@/lib/schemas/trip';

export default function EditTripPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);

  const [trip, setTrip] = useState<TripResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/trips/${id}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(res.status === 404 ? 'Trip not found' : 'Failed to load trip');
        }
        return res.json() as Promise<TripResponse>;
      })
      .then(setTrip)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent" />
          <p className="mt-2 text-sm text-neutral-600">Loading trip...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-error-600">{error ?? 'Trip not found'}</p>
          <Link
            href="/trips"
            className="mt-4 inline-block text-sm text-primary-600 hover:text-primary-800 underline"
          >
            Back to trips
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-neutral-900">Edit Trip</h1>
          <p className="text-sm text-neutral-600 mt-0.5">{trip.title}</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-6 px-4">
        <div className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
          <TripForm
            mode="edit"
            tripId={id}
            initialData={{
              title: trip.title,
              description: trip.description ?? '',
              startDate: trip.startDate as string,
              stopDate: trip.stopDate as string,
            }}
            onSuccess={(updatedTrip) => router.push(`/trips/${updatedTrip.id}`)}
            onCancel={() => router.push(`/trips/${id}`)}
          />
        </div>
      </main>
    </div>
  );
}
