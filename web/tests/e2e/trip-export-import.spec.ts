/**
 * Trip Export / Import E2E Tests
 *
 * Exercises the full export → import round-trip and merge dedup behavior
 * through the public API using Playwright's request fixture.
 */

import { test, expect } from '@playwright/test';
import {
  cleanupMarkedTrips,
  markTripPayloadForCleanupWithScope,
} from './helpers/testTrips';

const CLEANUP_SCOPE = 'trip-export-import-e2e';

const TRIP = markTripPayloadForCleanupWithScope({
  title: 'Export Import E2E Trip',
  description: 'Round-trip export/import',
  startDate: '2026-09-01',
  stopDate: '2026-09-03',
}, CLEANUP_SCOPE);

async function createTrip(request: any) {
  const res = await request.post('/api/trips', { data: TRIP });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function addDestination(request: any, tripId: string, dayDate: string, name: string) {
  const res = await request.post('/api/daily-destinations', {
    data: {
      tripId,
      dayDate,
      name,
      municipality: name,
      latitude: 59.9,
      longitude: 10.7,
      isLayover: false,
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

test.describe('Trip export/import', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ request }) => {
    await cleanupMarkedTrips(request, CLEANUP_SCOPE);
  });

  test.afterEach(async ({ request }) => {
    await cleanupMarkedTrips(request, CLEANUP_SCOPE);
  });

  test('exports a trip to a versioned JSON envelope', async ({ request }) => {
    const trip = await createTrip(request);
    await addDestination(request, trip.id, '2026-09-01', 'Oslo');

    const res = await request.get(`/api/trips/${trip.id}/export`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-disposition']).toContain('attachment');

    const envelope = await res.json();
    expect(envelope.kind).toBe('trip-planner-export');
    expect(envelope.formatVersion).toBeGreaterThanOrEqual(1);
    expect(envelope.schema.version).toBe(envelope.formatVersion);
    expect(envelope.data.trip.title).toBe(TRIP.title);
    expect(envelope.data.dailyDestinations.length).toBeGreaterThanOrEqual(1);
  });

  test('imports an exported file as a new trip', async ({ request }) => {
    const trip = await createTrip(request);
    await addDestination(request, trip.id, '2026-09-01', 'Oslo');
    await addDestination(request, trip.id, '2026-09-02', 'Bergen');

    const exportRes = await request.get(`/api/trips/${trip.id}/export`);
    const envelope = await exportRes.json();

    const importRes = await request.post('/api/trips/import', {
      data: { document: envelope, mode: 'new' },
    });
    expect(importRes.status()).toBe(201);
    const report = await importRes.json();
    expect(report.mode).toBe('new');
    expect(report.tripId).not.toBe(trip.id);
    expect(report.created.destinations).toBe(2);

    // The new trip should be independently retrievable.
    const newTrip = await request.get(`/api/trips/${report.tripId}`);
    expect(newTrip.ok()).toBeTruthy();
    const newTripBody = await newTrip.json();
    expect(newTripBody.title).toBe(TRIP.title);
  });

  test('merge skips out-of-range days and duplicate destinations', async ({ request }) => {
    // Source trip spans 3 days.
    const source = await createTrip(request);
    await addDestination(request, source.id, '2026-09-01', 'Oslo');
    await addDestination(request, source.id, '2026-09-02', 'Bergen');
    await addDestination(request, source.id, '2026-09-03', 'Trondheim');

    const envelope = await (await request.get(`/api/trips/${source.id}/export`)).json();

    // Target trip only covers the first two days.
    const targetRes = await request.post('/api/trips', {
      data: {
        ...markTripPayloadForCleanupWithScope({
          title: 'Merge Target Trip',
          description: 'Target',
        }, CLEANUP_SCOPE),
        startDate: '2026-09-01',
        stopDate: '2026-09-02',
      },
    });
    const target = await targetRes.json();

    // First merge: day 3 is out of range, days 1-2 imported.
    const firstMerge = await request.post('/api/trips/import', {
      data: { document: envelope, mode: 'merge', targetTripId: target.id },
    });
    expect(firstMerge.status()).toBe(201);
    const firstReport = await firstMerge.json();
    expect(firstReport.created.destinations).toBe(2);
    expect(firstReport.skipped.outOfRangeDays).toBeGreaterThan(0);

    // Second merge of the same file: everything is a duplicate now.
    const secondMerge = await request.post('/api/trips/import', {
      data: { document: envelope, mode: 'merge', targetTripId: target.id },
    });
    expect(secondMerge.status()).toBe(201);
    const secondReport = await secondMerge.json();
    expect(secondReport.created.destinations).toBe(0);
    expect(secondReport.skipped.destinations).toBeGreaterThanOrEqual(2);
  });

  test('rejects a file from a newer schema version with 409', async ({ request }) => {
    const trip = await createTrip(request);
    const envelope = await (await request.get(`/api/trips/${trip.id}/export`)).json();
    envelope.formatVersion = 9999;

    const res = await request.post('/api/trips/import', {
      data: { document: envelope, mode: 'new' },
    });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('unsupported_version');
  });
});
