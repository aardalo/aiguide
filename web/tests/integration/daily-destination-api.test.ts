/**
 * Daily Destination Integration Tests
 * Location: tests/integration/daily-destination-api.test.ts
 * Task: TASK-009
 *
 * Tests for:
 * - POST /api/daily-destinations (create)
 * - GET /api/daily-destinations?tripId=xxx (list)
 * - GET /api/daily-destinations/[id] (get by ID)
 * - PATCH /api/daily-destinations/[id] (update)
 * - DELETE /api/daily-destinations/[id] (delete)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      trip: {
        findUnique: vi.fn(),
      },
      dailyDestination: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
      branch: {
        findUnique: vi.fn(),
      },
      routeSegment: {
        deleteMany: vi.fn(),
      },
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/auth/access', () => {
  class AccessError extends Error { constructor(public status: number, m: string) { super(m); } }
  return {
    AccessError,
    getSessionUser: vi.fn(async () => ({ id: 'test-user' })),
    assertTripAccess: vi.fn(async () => { return; }),
    accessErrorResponse: () => null,
  };
});

import { NextRequest } from 'next/server';
import { GET as collectionGET, POST } from '../../app/api/daily-destinations/route';
import { GET as idGET, PATCH, DELETE } from '../../app/api/daily-destinations/[id]/route';

const TEST_TRIP_ID = 'cltest000000000000000000001';
const DEST_ID_1 = 'cldest00000000000000000001';
const DEST_ID_2 = 'cldest00000000000000000002';
const DEST_ID_3 = 'cldest00000000000000000003';
const DEST_ID_4 = 'cldest00000000000000000004';
const DEST_ID_5 = 'cldest00000000000000000005';

const TEST_TRIP = {
  id: TEST_TRIP_ID,
  title: 'Daily Destination Test Trip',
  startDate: new Date('2026-06-01T00:00:00.000Z'),
  stopDate: new Date('2026-06-10T00:00:00.000Z'),
  planMode: true,
  ownerId: 'test-user',
};

describe("Daily Destination API Endpoints", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("POST /api/daily-destinations - Create Daily Destination", () => {
    it("should create a daily destination with valid data", async () => {
      const destinationData = {
        tripId: TEST_TRIP_ID,
        dayDate: "2026-06-02",
        name: "Paris",
        latitude: 48.8566,
        longitude: 2.3522,
        notes: "City of lights",
      };

      mockPrisma.trip.findUnique.mockResolvedValue(TEST_TRIP);
      mockPrisma.dailyDestination.create.mockResolvedValue({
        id: DEST_ID_1,
        tripId: TEST_TRIP_ID,
        dayDate: new Date('2026-06-02T00:00:00.000Z'),
        name: 'Paris',
        latitude: 48.8566,
        longitude: 2.3522,
        notes: 'City of lights',
        municipality: null,
        isLayover: false,
        branchId: null,
        lastModifiedByDeviceId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new Request('http://localhost:3000/api/daily-destinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(destinationData),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(201);

      const destination = await response.json();
      expect(destination.id).toBeDefined();
      expect(destination.tripId).toBe(TEST_TRIP_ID);
      expect(destination.name).toBe(destinationData.name);
      expect(destination.latitude).toBe(destinationData.latitude);
      expect(destination.longitude).toBe(destinationData.longitude);
      expect(destination.notes).toBe(destinationData.notes);
    });

    it("should create a destination without optional coordinates", async () => {
      const destinationData = {
        tripId: TEST_TRIP_ID,
        dayDate: "2026-06-03",
        name: "Lyon",
      };

      mockPrisma.trip.findUnique.mockResolvedValue(TEST_TRIP);
      mockPrisma.dailyDestination.create.mockResolvedValue({
        id: DEST_ID_2,
        tripId: TEST_TRIP_ID,
        dayDate: new Date('2026-06-03T00:00:00.000Z'),
        name: 'Lyon',
        latitude: null,
        longitude: null,
        notes: null,
        municipality: null,
        isLayover: false,
        branchId: null,
        lastModifiedByDeviceId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new Request('http://localhost:3000/api/daily-destinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(destinationData),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(201);

      const destination = await response.json();
      expect(destination.name).toBe(destinationData.name);
      expect(destination.latitude).toBeNull();
      expect(destination.longitude).toBeNull();
    });

    it("should return 400 for missing required fields", async () => {
      const request = new Request('http://localhost:3000/api/daily-destinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: TEST_TRIP_ID,
          dayDate: "2026-06-04",
          // missing name
        }),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(400);
    });

    it("should return 404 for non-existent trip", async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/daily-destinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: 'clnonexistent000000000001',
          dayDate: "2026-06-04",
          name: "Some City",
        }),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(404);
    });

    it("should return 400 if day date is outside trip range", async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(TEST_TRIP);

      const request = new Request('http://localhost:3000/api/daily-destinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: TEST_TRIP_ID,
          dayDate: "2026-07-01", // Outside trip range
          name: "Tokyo",
        }),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("within trip");
    });
  });

  describe("GET /api/daily-destinations - List Daily Destinations", () => {
    it("should return a list of daily destinations for a trip", async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(TEST_TRIP);
      mockPrisma.dailyDestination.findMany.mockResolvedValue([
        {
          id: DEST_ID_1,
          tripId: TEST_TRIP_ID,
          dayDate: new Date('2026-06-02T00:00:00.000Z'),
          name: 'Paris',
          latitude: 48.8566,
          longitude: 2.3522,
          notes: 'City of lights',
          municipality: null,
          isLayover: false,
          branchId: null,
          lastModifiedByDeviceId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const url = new URL('http://localhost:3000/api/daily-destinations');
      url.searchParams.set('tripId', TEST_TRIP_ID);
      const request = new NextRequest(url.toString());

      const response = await collectionGET(request as any);
      expect(response.status).toBe(200);

      const destinations = await response.json();
      expect(Array.isArray(destinations)).toBe(true);
      expect(destinations.length).toBeGreaterThan(0);
      expect(destinations.every((d: any) => d.tripId === TEST_TRIP_ID)).toBe(true);
    });

    it("should return 400 if tripId query parameter is missing", async () => {
      const request = new NextRequest('http://localhost:3000/api/daily-destinations');

      const response = await collectionGET(request as any);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("tripId");
    });

    it("should return 404 for non-existent trip", async () => {
      // assertTripAccess is mocked to pass, so we rely on the trip.findUnique returning null
      mockPrisma.trip.findUnique.mockResolvedValue(null);

      const url = new URL('http://localhost:3000/api/daily-destinations');
      url.searchParams.set('tripId', 'clnonexistent000000000001');
      const request = new NextRequest(url.toString());

      const response = await collectionGET(request as any);
      expect(response.status).toBe(404);
    });

    it("should return destinations sorted by date ascending", async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(TEST_TRIP);
      mockPrisma.dailyDestination.findMany.mockResolvedValue([
        {
          id: DEST_ID_1,
          tripId: TEST_TRIP_ID,
          dayDate: new Date('2026-06-02T00:00:00.000Z'),
          name: 'Paris',
          latitude: null, longitude: null, notes: null, municipality: null, isLayover: false, branchId: null, lastModifiedByDeviceId: null, createdAt: new Date(), updatedAt: new Date(),
        },
        {
          id: DEST_ID_2,
          tripId: TEST_TRIP_ID,
          dayDate: new Date('2026-06-03T00:00:00.000Z'),
          name: 'Lyon',
          latitude: null, longitude: null, notes: null, municipality: null, isLayover: false, branchId: null, lastModifiedByDeviceId: null, createdAt: new Date(), updatedAt: new Date(),
        },
      ]);

      const url = new URL('http://localhost:3000/api/daily-destinations');
      url.searchParams.set('tripId', TEST_TRIP_ID);
      const request = new NextRequest(url.toString());

      const response = await collectionGET(request as any);
      expect(response.status).toBe(200);

      const destinations = await response.json();
      for (let i = 1; i < destinations.length; i++) {
        const prev = new Date(destinations[i - 1].dayDate);
        const curr = new Date(destinations[i].dayDate);
        expect(curr >= prev).toBe(true);
      }
    });
  });

  describe("GET /api/daily-destinations/[id] - Get Daily Destination by ID", () => {
    it("should return a daily destination by ID", async () => {
      mockPrisma.dailyDestination.findUnique.mockResolvedValue({
        id: DEST_ID_3,
        tripId: TEST_TRIP_ID,
        dayDate: new Date('2026-06-05T00:00:00.000Z'),
        name: 'Marseille',
        latitude: null, longitude: null, notes: null, municipality: null, isLayover: false, branchId: null, lastModifiedByDeviceId: null, createdAt: new Date(), updatedAt: new Date(),
      });

      const request = new Request(`http://localhost:3000/api/daily-destinations/${DEST_ID_3}`);

      const response = await idGET(request as any, { params: Promise.resolve({ id: DEST_ID_3 }) });
      expect(response.status).toBe(200);

      const destination = await response.json();
      expect(destination.id).toBe(DEST_ID_3);
      expect(destination.name).toBe("Marseille");
    });

    it("should return 404 for non-existent ID", async () => {
      mockPrisma.dailyDestination.findUnique.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/daily-destinations/non_existent');

      const response = await idGET(request as any, { params: Promise.resolve({ id: 'non_existent' }) });
      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /api/daily-destinations/[id] - Update Daily Destination", () => {
    it("should update destination name", async () => {
      mockPrisma.dailyDestination.findUnique.mockResolvedValue({
        id: DEST_ID_4,
        tripId: TEST_TRIP_ID,
        branchId: null,
        dayDate: new Date('2026-06-06T00:00:00.000Z'),
        name: 'Nice',
        latitude: 43.7102,
        longitude: 7.262,
        notes: null, municipality: null, isLayover: false, lastModifiedByDeviceId: null, createdAt: new Date(), updatedAt: new Date(),
        trip: {
          startDate: new Date('2026-06-01T00:00:00.000Z'),
          stopDate: new Date('2026-06-10T00:00:00.000Z'),
        },
        branch: null,
      });
      mockPrisma.dailyDestination.update.mockResolvedValue({
        id: DEST_ID_4,
        tripId: TEST_TRIP_ID,
        dayDate: new Date('2026-06-06T00:00:00.000Z'),
        name: 'Nice - Updated',
        latitude: 43.7102,
        longitude: 7.262,
        notes: null, municipality: null, isLayover: false, branchId: null, lastModifiedByDeviceId: null, createdAt: new Date(), updatedAt: new Date(),
      });

      const updateData = { name: "Nice - Updated" };
      const request = new Request(`http://localhost:3000/api/daily-destinations/${DEST_ID_4}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request as any, { params: Promise.resolve({ id: DEST_ID_4 }) });
      expect(response.status).toBe(200);

      const destination = await response.json();
      expect(destination.name).toBe(updateData.name);
      expect(destination.latitude).toBe(43.7102); // Should remain unchanged
    });

    it("should update coordinates", async () => {
      mockPrisma.dailyDestination.findUnique.mockResolvedValue({
        id: DEST_ID_4,
        tripId: TEST_TRIP_ID,
        branchId: null,
        dayDate: new Date('2026-06-06T00:00:00.000Z'),
        name: 'Nice - Updated',
        latitude: 43.7102,
        longitude: 7.262,
        notes: null, municipality: null, isLayover: false, lastModifiedByDeviceId: null, createdAt: new Date(), updatedAt: new Date(),
        trip: {
          startDate: new Date('2026-06-01T00:00:00.000Z'),
          stopDate: new Date('2026-06-10T00:00:00.000Z'),
        },
        branch: null,
      });
      mockPrisma.dailyDestination.update.mockResolvedValue({
        id: DEST_ID_4,
        tripId: TEST_TRIP_ID,
        dayDate: new Date('2026-06-06T00:00:00.000Z'),
        name: 'Nice - Updated',
        latitude: 43.71,
        longitude: 7.26,
        notes: null, municipality: null, isLayover: false, branchId: null, lastModifiedByDeviceId: null, createdAt: new Date(), updatedAt: new Date(),
      });

      const updateData = { latitude: 43.71, longitude: 7.26 };
      const request = new Request(`http://localhost:3000/api/daily-destinations/${DEST_ID_4}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request as any, { params: Promise.resolve({ id: DEST_ID_4 }) });
      expect(response.status).toBe(200);

      const destination = await response.json();
      expect(destination.latitude).toBe(updateData.latitude);
      expect(destination.longitude).toBe(updateData.longitude);
    });

    it("should update notes", async () => {
      mockPrisma.dailyDestination.findUnique.mockResolvedValue({
        id: DEST_ID_4,
        tripId: TEST_TRIP_ID,
        branchId: null,
        dayDate: new Date('2026-06-06T00:00:00.000Z'),
        name: 'Nice - Updated',
        latitude: 43.71,
        longitude: 7.26,
        notes: null, municipality: null, isLayover: false, lastModifiedByDeviceId: null, createdAt: new Date(), updatedAt: new Date(),
        trip: {
          startDate: new Date('2026-06-01T00:00:00.000Z'),
          stopDate: new Date('2026-06-10T00:00:00.000Z'),
        },
        branch: null,
      });
      mockPrisma.dailyDestination.update.mockResolvedValue({
        id: DEST_ID_4,
        tripId: TEST_TRIP_ID,
        dayDate: new Date('2026-06-06T00:00:00.000Z'),
        name: 'Nice - Updated',
        latitude: 43.71,
        longitude: 7.26,
        notes: 'Beach destination', municipality: null, isLayover: false, branchId: null, lastModifiedByDeviceId: null, createdAt: new Date(), updatedAt: new Date(),
      });

      const updateData = { notes: "Beach destination" };
      const request = new Request(`http://localhost:3000/api/daily-destinations/${DEST_ID_4}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request as any, { params: Promise.resolve({ id: DEST_ID_4 }) });
      expect(response.status).toBe(200);

      const destination = await response.json();
      expect(destination.notes).toBe(updateData.notes);
    });

    it("should return 404 when updating non-existent destination", async () => {
      mockPrisma.dailyDestination.findUnique.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/daily-destinations/non_existent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: "Updated" }),
      });

      const response = await PATCH(request as any, { params: Promise.resolve({ id: 'non_existent' }) });
      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/daily-destinations/[id] - Delete Daily Destination", () => {
    it("should delete a daily destination by ID", async () => {
      const destToDelete = {
        id: DEST_ID_5,
        tripId: TEST_TRIP_ID,
        dayDate: new Date('2026-06-07T00:00:00.000Z'),
        name: 'Cannes',
        latitude: null, longitude: null, notes: null, municipality: null, isLayover: false, branchId: null, lastModifiedByDeviceId: null, createdAt: new Date(), updatedAt: new Date(),
      };

      mockPrisma.dailyDestination.findUnique.mockResolvedValueOnce(destToDelete);
      mockPrisma.routeSegment.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.dailyDestination.delete.mockResolvedValue(destToDelete);

      // After deletion, the subsequent findUnique should return null
      mockPrisma.dailyDestination.findUnique.mockResolvedValueOnce(null);

      const request = new Request(`http://localhost:3000/api/daily-destinations/${DEST_ID_5}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request as any, { params: Promise.resolve({ id: DEST_ID_5 }) });
      expect(response.status).toBe(200);

      const deletedDestination = await response.json();
      expect(deletedDestination.id).toBe(DEST_ID_5);

      // Verify it's deleted by calling GET
      const getRequest = new Request(`http://localhost:3000/api/daily-destinations/${DEST_ID_5}`);
      const verifyResponse = await idGET(getRequest as any, { params: Promise.resolve({ id: DEST_ID_5 }) });
      expect(verifyResponse.status).toBe(404);
    });

    it("should return 404 when deleting non-existent destination", async () => {
      mockPrisma.dailyDestination.findUnique.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/daily-destinations/non_existent', {
        method: 'DELETE',
      });

      const response = await DELETE(request as any, { params: Promise.resolve({ id: 'non_existent' }) });
      expect(response.status).toBe(404);
    });
  });
});
