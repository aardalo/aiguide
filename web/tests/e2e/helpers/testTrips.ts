import { expect, type APIRequestContext } from '@playwright/test';
import {
  ALLOW_TRIP_DELETE_HEADER,
  ALLOW_TRIP_DELETE_VALUE,
  isMarkedTestTrip,
  withTestTripMarker,
} from '../../../src/lib/trip-delete-safeguard';

interface TripPayload {
  title: string;
  description?: string;
}

interface TripSummary {
  id: string;
  title: string;
  description: string | null;
}

export function markTripPayloadForCleanup<T extends TripPayload>(trip: T): T {
  return markTripPayloadForCleanupWithScope(trip, 'shared-test-scope');
}

export function markTripPayloadForCleanupWithScope<T extends TripPayload>(
  trip: T,
  scope: string,
): T {
  return {
    ...trip,
    title: withTestTripMarker(`${trip.title} ${scope}`),
    description: withTestTripMarker(
      trip.description ? `${trip.description} ${scope}` : scope,
    ),
  };
}

export async function cleanupMarkedTrips(
  request: APIRequestContext,
  scope: string,
): Promise<void> {
  const listResponse = await request.get('/api/trips');
  expect(listResponse.ok()).toBeTruthy();

  const trips = (await listResponse.json()) as TripSummary[];
  for (const trip of trips) {
    const matchesScope = [trip.title, trip.description].some(
      (value) => typeof value === 'string' && value.includes(scope),
    );
    if (!isMarkedTestTrip(trip) || !matchesScope) continue;

    const deleteResponse = await request.delete(`/api/trips/${trip.id}`, {
      headers: {
        [ALLOW_TRIP_DELETE_HEADER]: ALLOW_TRIP_DELETE_VALUE,
      },
    });
    expect(deleteResponse.ok()).toBeTruthy();
  }
}
