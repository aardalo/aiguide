'use client';

import { useParams, useRouter } from 'next/navigation';
import TripDetail from '@/app/map/components/TripDetail';
import type { TripResponse } from '@/lib/schemas/trip';

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);

  const handleDelete = async (trip: TripResponse) => {
    if (!confirm(`Delete "${trip.title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/trips/${trip.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      router.push('/trips');
    } catch {
      alert('Failed to delete trip. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-neutral-900">Trip Details</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-6">
        <TripDetail
          tripId={id}
          onBack={() => router.push('/trips')}
          onEdit={(trip) => router.push(`/trips/${trip.id}/edit`)}
          onDelete={handleDelete}
        />
      </main>
    </div>
  );
}
