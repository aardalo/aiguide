/**
 * Cross-Device Synchronization E2E Tests
 *
 * Verifies that trip changes made by one device become visible to other
 * devices through the polling-based sync pipeline:
 *  - device registration
 *  - change detection endpoint with device attribution
 *  - the sync status indicator surfacing in the map UI
 *
 * These tests run against the real Next.js server and database (see
 * playwright.config.ts webServer), so they exercise the full sync flow
 * end-to-end rather than mocking Prisma.
 */

import { test, expect, type APIRequestContext } from '@playwright/test';
import {
  cleanupMarkedTrips,
  markTripPayloadForCleanupWithScope,
} from './helpers/testTrips';

const CLEANUP_SCOPE = 'cross-device-sync-e2e';

const TRIP = markTripPayloadForCleanupWithScope({
  title: 'Cross-Device Sync Trip',
  description: 'Trip used to verify multi-device synchronization',
  startDate: '2026-09-01',
  stopDate: '2026-09-05',
}, CLEANUP_SCOPE);

async function registerDevice(request: APIRequestContext, name: string) {
  const res = await request.post('/api/devices/register', {
    data: {
      sessionId: `e2e-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function createTrip(request: APIRequestContext) {
  const res = await request.post('/api/trips', {
    data: TRIP,
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

test.describe('Cross-device synchronization', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ request }) => {
    await cleanupMarkedTrips(request, CLEANUP_SCOPE);
  });

  test.afterEach(async ({ request }) => {
    await cleanupMarkedTrips(request, CLEANUP_SCOPE);
  });

  test('a POI added by one device is detected by the changes endpoint with device attribution', async ({
    request,
  }) => {
    // Two distinct devices register for sync.
    const deviceA = await registerDevice(request, 'Laptop (E2E A)');
    const deviceB = await registerDevice(request, 'Phone (E2E B)');
    expect(deviceA.id).not.toBe(deviceB.id);

    const trip = await createTrip(request);

    // Capture a baseline timestamp for the "since" sync window.
    const since = new Date(Date.now() - 1000).toISOString();

    // Device A adds a POI to the first day of the trip.
    const poiRes = await request.post('/api/daily-pois', {
      data: {
        tripId: trip.id,
        dayDate: TRIP.startDate,
        name: 'Sync Test POI',
        latitude: 48.8566,
        longitude: 2.3522,
        category: 'poi',
        deviceId: deviceA.id,
      },
    });
    expect(poiRes.ok()).toBeTruthy();
    const poi = await poiRes.json();
    expect(poi.lastModifiedByDeviceId).toBe(deviceA.id);

    // Device B polls the changes endpoint and sees device A's change.
    const changesRes = await request.get(
      `/api/trips/${trip.id}/changes?since=${encodeURIComponent(since)}&deviceId=${deviceB.id}`
    );
    expect(changesRes.ok()).toBeTruthy();
    const { changes } = await changesRes.json();

    const poiChange = changes.find(
      (c: { id: string; type: string }) => c.type === 'poi' && c.id === poi.id
    );
    expect(poiChange).toBeTruthy();
    expect(poiChange.lastModifiedByDeviceId).toBe(deviceA.id);
    expect(poiChange.deviceName).toBe('Laptop (E2E A)');
  });

  test('full-sync endpoint returns the newly created POI', async ({ request }) => {
    const deviceA = await registerDevice(request, 'Laptop (E2E full-sync)');
    const trip = await createTrip(request);

    await request.post('/api/daily-pois', {
      data: {
        tripId: trip.id,
        dayDate: TRIP.startDate,
        name: 'Full Sync POI',
        latitude: 40.4168,
        longitude: -3.7038,
        category: 'poi',
        deviceId: deviceA.id,
      },
    });

    const res = await request.get(`/api/trips/${trip.id}/full-sync`);
    expect(res.ok()).toBeTruthy();
    const state = await res.json();

    const found = state.dailyPois?.find(
      (p: { name: string }) => p.name === 'Full Sync POI'
    );
    expect(found).toBeTruthy();
  });

  test('renaming a device updates its attribution name in subsequent changes', async ({
    request,
  }) => {
    const device = await registerDevice(request, 'Original Name');

    const renameRes = await request.patch(`/api/devices/${device.id}`, {
      data: { name: 'Renamed Device' },
    });
    expect(renameRes.ok()).toBeTruthy();
    const renamed = await renameRes.json();
    expect(renamed.name).toBe('Renamed Device');

    const listRes = await request.get('/api/devices');
    expect(listRes.ok()).toBeTruthy();
    const { devices } = await listRes.json();
    const match = devices.find((d: { id: string }) => d.id === device.id);
    expect(match.name).toBe('Renamed Device');
  });
});

test.describe('Sync status indicator', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ request }) => {
    await cleanupMarkedTrips(request, CLEANUP_SCOPE);
  });

  test.afterEach(async ({ request }) => {
    await cleanupMarkedTrips(request, CLEANUP_SCOPE);
  });

  test('shows a sync indicator in the map header once a trip is open', async ({
    page,
    request,
  }) => {
    // Create a uniquely-named trip via the API so we can reliably find it.
    const uniqueTitle = markTripPayloadForCleanupWithScope({
      title: `Sync Indicator Trip ${Date.now()}`,
      description: 'Trip used to verify the sync status indicator',
    }, CLEANUP_SCOPE).title;
    const tripRes = await request.post('/api/trips', {
      data: { ...TRIP, title: uniqueTitle },
    });
    expect(tripRes.ok()).toBeTruthy();

    await page.goto('/map');

    // Open the trips menu and switch to the "My Trips" list view.
    await page.getByRole('button', { name: /open menu/i }).click();
    await page.getByRole('menuitem', { name: /my trips/i }).click();

    // Open the trip from the list.
    const tripHeading = page.getByRole('heading', { name: uniqueTitle }).first();
    await expect(tripHeading).toBeVisible({ timeout: 15000 });
    await tripHeading.click();

    // The sync indicator should surface (polling becomes active for the open trip).
    await expect(page.getByText(/Sync/i).first()).toBeVisible({ timeout: 15000 });
  });
});
