export const TEST_TRIP_MARKER = '[test-trip]';
export const ALLOW_TRIP_DELETE_HEADER = 'x-allow-trip-delete';
export const ALLOW_TRIP_DELETE_VALUE = 'allow';
export const ALLOW_TRIP_DELETE_ENV = 'ALLOW_UNSAFE_TRIP_DELETE';

interface TripLike {
  title?: string | null;
  description?: string | null;
}

export function isNonProductionEnvironment(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export function isMarkedTestTrip(trip: TripLike): boolean {
  return [trip.title, trip.description].some(
    (value) => typeof value === 'string' && value.includes(TEST_TRIP_MARKER),
  );
}

export function canBypassTripDeleteSafeguard(headers: Headers): boolean {
  return (
    process.env[ALLOW_TRIP_DELETE_ENV] === 'true' ||
    headers.get(ALLOW_TRIP_DELETE_HEADER) === ALLOW_TRIP_DELETE_VALUE
  );
}

export function withTestTripMarker(value?: string | null): string {
  const trimmed = value?.trim();
  if (trimmed?.includes(TEST_TRIP_MARKER)) {
    return trimmed;
  }
  return trimmed ? `${trimmed} ${TEST_TRIP_MARKER}` : TEST_TRIP_MARKER;
}
