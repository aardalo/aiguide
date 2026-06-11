/**
 * Trip API Endpoint Integration Tests
 * Tests REST API endpoints for Trip CRUD operations
 * Task: TASK-003, TEST-001
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      trip: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn(),
      $disconnect: vi.fn(),
    },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/auth/access", () => ({
  getSessionUser: vi.fn(async () => ({ id: "test-user" })),
  assertTripAccess: vi.fn(async () => {}),
  accessErrorResponse: vi.fn(() => null),
}));

import {
  ALLOW_TRIP_DELETE_HEADER,
  ALLOW_TRIP_DELETE_VALUE,
  TEST_TRIP_MARKER,
} from "@/lib/trip-delete-safeguard";

import { GET as getTrips, POST as postTrip } from "../../app/api/trips/route";
import {
  GET as getTripById,
  PATCH as patchTrip,
  DELETE as deleteTrip,
} from "../../app/api/trips/[id]/route";

// Helpers to build Request objects
function makeRequest(
  url: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as any;
}

const BASE = "http://localhost:3000";

const makeBaseTrip = (overrides: Record<string, unknown> = {}) => ({
  id: "trip-1",
  title: "API Test Trip",
  description: "Testing trip creation via API",
  planMode: false,
  startDate: new Date("2026-06-01T00:00:00.000Z"),
  stopDate: new Date("2026-06-15T00:00:00.000Z"),
  routingPreferences: null,
  ownerId: "test-user",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

describe("Trip API Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/trips - Create Trip", () => {
    it("should create a new trip with valid data", async () => {
      const tripData = {
        title: "API Test Trip",
        description: "Testing trip creation via API",
        startDate: "2026-06-01",
        stopDate: "2026-06-15",
      };

      mockPrisma.trip.create.mockResolvedValue(makeBaseTrip());

      const response = await postTrip(
        makeRequest(`${BASE}/api/trips`, "POST", tripData)
      );

      expect(response.status).toBe(201);

      const trip = await response.json();
      expect(trip.id).toBeDefined();
      expect(trip.title).toBe(tripData.title);
      expect(trip.description).toBe(tripData.description);
      expect(trip.planMode).toBe(false);
      expect(trip.startDate).toMatch(new RegExp(`^${tripData.startDate}`));
      expect(trip.stopDate).toMatch(new RegExp(`^${tripData.stopDate}`));
      expect(trip.createdAt).toBeDefined();
      expect(trip.updatedAt).toBeDefined();
    });

    it("should create a trip without optional description", async () => {
      const tripData = {
        title: "Minimal API Trip",
        startDate: "2026-07-01",
        stopDate: "2026-07-05",
      };

      mockPrisma.trip.create.mockResolvedValue(
        makeBaseTrip({ title: "Minimal API Trip", description: null })
      );

      const response = await postTrip(
        makeRequest(`${BASE}/api/trips`, "POST", tripData)
      );

      expect(response.status).toBe(201);

      const trip = await response.json();
      expect(trip.description).toBeNull();
    });

    it("should return 400 for missing required fields", async () => {
      const invalidData = {
        description: "Missing title and dates",
      };

      const response = await postTrip(
        makeRequest(`${BASE}/api/trips`, "POST", invalidData)
      );

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error.error).toBe("Validation failed");
      expect(error.issues).toBeDefined();
    });

    it("should return 400 when stopDate is before startDate", async () => {
      const invalidData = {
        title: "Invalid Date Range",
        startDate: "2026-06-15",
        stopDate: "2026-06-01", // Before start date
      };

      const response = await postTrip(
        makeRequest(`${BASE}/api/trips`, "POST", invalidData)
      );

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error.error).toBe("Validation failed");
    });

    it("should return 400 for invalid date format", async () => {
      const invalidData = {
        title: "Invalid Date Format",
        startDate: "not-a-date",
        stopDate: "2026-06-15",
      };

      const response = await postTrip(
        makeRequest(`${BASE}/api/trips`, "POST", invalidData)
      );

      expect(response.status).toBe(400);
    });

    it("should allow same start and stop date", async () => {
      const tripData = {
        title: "One Day Trip",
        startDate: "2026-08-01",
        stopDate: "2026-08-01",
      };

      mockPrisma.trip.create.mockResolvedValue(
        makeBaseTrip({
          title: "One Day Trip",
          startDate: new Date("2026-08-01T00:00:00.000Z"),
          stopDate: new Date("2026-08-01T00:00:00.000Z"),
        })
      );

      const response = await postTrip(
        makeRequest(`${BASE}/api/trips`, "POST", tripData)
      );

      expect(response.status).toBe(201);
    });
  });

  describe("GET /api/trips - List Trips", () => {
    it("should return a list of trips", async () => {
      mockPrisma.trip.findMany.mockResolvedValue([
        makeBaseTrip({ id: "trip-1", title: "List Test Trip 1" }),
        makeBaseTrip({ id: "trip-2", title: "List Test Trip 2" }),
      ]);

      const response = await getTrips(
        makeRequest(`${BASE}/api/trips`, "GET")
      );

      expect(response.status).toBe(200);

      const trips = await response.json();
      expect(Array.isArray(trips)).toBe(true);
      expect(trips.length).toBeGreaterThan(0);

      // Verify trip structure
      const trip = trips[0];
      expect(trip.id).toBeDefined();
      expect(trip.title).toBeDefined();
      expect(trip.startDate).toBeDefined();
      expect(trip.stopDate).toBeDefined();
      expect(trip.createdAt).toBeDefined();
      expect(trip.updatedAt).toBeDefined();
    });

    it("should return trips sorted by createdAt descending", async () => {
      const t1 = makeBaseTrip({
        id: "trip-1",
        createdAt: new Date("2026-09-02T00:00:00.000Z"),
      });
      const t2 = makeBaseTrip({
        id: "trip-2",
        createdAt: new Date("2026-09-01T00:00:00.000Z"),
      });
      mockPrisma.trip.findMany.mockResolvedValue([t1, t2]);

      const response = await getTrips(
        makeRequest(`${BASE}/api/trips`, "GET")
      );

      expect(response.status).toBe(200);

      const trips = await response.json();
      if (trips.length > 1) {
        const firstCreatedAt = new Date(trips[0].createdAt).getTime();
        const secondCreatedAt = new Date(trips[1].createdAt).getTime();
        expect(firstCreatedAt).toBeGreaterThanOrEqual(secondCreatedAt);
      }
    });
  });

  describe("GET /api/trips/[id] - Get Trip by ID", () => {
    it("should return a trip by ID", async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(
        makeBaseTrip({
          title: "Get Test Trip",
          description: "For testing GET by ID",
        })
      );

      const response = await getTripById(
        makeRequest(`${BASE}/api/trips/trip-1`, "GET"),
        { params: Promise.resolve({ id: "trip-1" }) }
      );

      expect(response.status).toBe(200);

      const trip = await response.json();
      expect(trip.id).toBe("trip-1");
      expect(trip.title).toBe("Get Test Trip");
      expect(trip.description).toBe("For testing GET by ID");
      expect(trip.planMode).toBe(false);
    });

    it("should return 404 for non-existent trip", async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(null);

      const response = await getTripById(
        makeRequest(`${BASE}/api/trips/non_existent_id`, "GET"),
        { params: Promise.resolve({ id: "non_existent_id" }) }
      );

      expect(response.status).toBe(404);

      const error = await response.json();
      expect(error.error).toBe("Trip not found");
    });
  });

  describe("PATCH /api/trips/[id] - Update Trip", () => {
    it("should update trip title", async () => {
      const updateData = { title: "Updated Title via API" };
      const updated = makeBaseTrip({
        title: "Updated Title via API",
        description: "Original description",
      });
      mockPrisma.trip.findUnique.mockResolvedValue(
        makeBaseTrip({ description: "Original description" })
      );
      mockPrisma.trip.update.mockResolvedValue(updated);

      const response = await patchTrip(
        makeRequest(`${BASE}/api/trips/trip-1`, "PATCH", updateData),
        { params: Promise.resolve({ id: "trip-1" }) }
      );

      expect(response.status).toBe(200);

      const trip = await response.json();
      expect(trip.title).toBe(updateData.title);
      expect(trip.description).toBe("Original description"); // Unchanged
    });

    it("should update trip description", async () => {
      const updateData = { description: "Updated description via API" };
      mockPrisma.trip.findUnique.mockResolvedValue(makeBaseTrip());
      mockPrisma.trip.update.mockResolvedValue(
        makeBaseTrip({ description: "Updated description via API" })
      );

      const response = await patchTrip(
        makeRequest(`${BASE}/api/trips/trip-1`, "PATCH", updateData),
        { params: Promise.resolve({ id: "trip-1" }) }
      );

      expect(response.status).toBe(200);

      const trip = await response.json();
      expect(trip.description).toBe(updateData.description);
    });

    it("should update trip dates", async () => {
      const updateData = {
        startDate: "2027-01-01",
        stopDate: "2027-01-15",
      };
      // Same start as existing, so no shift; stopDate matches existing so no rejection
      // But stopDate differs from existing — the route rejects explicit stopDate when no start shift
      // We need an existing trip whose stopDate matches the new stopDate, or
      // send startDate with a valid shift that carries stopDate along.
      // Here we send both startDate+stopDate as in the original test.
      // The route only rejects if stopDate changes WITHOUT a start shift.
      // So we must send startDate that shifts (differs from existing).
      mockPrisma.trip.findUnique.mockResolvedValue(
        makeBaseTrip({
          startDate: new Date("2026-12-01T00:00:00.000Z"),
          stopDate: new Date("2026-12-05T00:00:00.000Z"),
        })
      );

      // The PATCH handler will try a $transaction for a start shift
      const updatedTrip = makeBaseTrip({
        startDate: new Date("2027-01-01T00:00:00.000Z"),
        stopDate: new Date("2027-01-15T00:00:00.000Z"),
      });

      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => unknown) => {
          const tx = {
            dailyDestination: {
              findMany: vi.fn().mockResolvedValue([]),
              update: vi.fn(),
            },
            dailyPoi: { findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
            routeSegment: {
              findMany: vi.fn().mockResolvedValue([]),
              update: vi.fn(),
            },
            branch: { findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
            trip: { update: vi.fn().mockResolvedValue(updatedTrip) },
          };
          return await callback(tx);
        }
      );

      const response = await patchTrip(
        makeRequest(`${BASE}/api/trips/trip-1`, "PATCH", updateData),
        { params: Promise.resolve({ id: "trip-1" }) }
      );

      expect(response.status).toBe(200);

      const trip = await response.json();
      // ISO format dates include time, so check date portion
      expect(trip.startDate).toMatch(new RegExp(`^${updateData.startDate}`));
      expect(trip.stopDate).toMatch(new RegExp(`^${updateData.stopDate}`));
    });

    it("should update multiple fields at once", async () => {
      const updateData = {
        title: "Multi-field Update",
        description: "All fields updated",
        planMode: true,
        startDate: "2027-02-01",
        stopDate: "2027-02-10",
      };

      // existing trip starts on a different date so there's a shift
      mockPrisma.trip.findUnique.mockResolvedValue(
        makeBaseTrip({
          startDate: new Date("2026-12-01T00:00:00.000Z"),
          stopDate: new Date("2026-12-10T00:00:00.000Z"),
        })
      );

      const updatedTrip = makeBaseTrip({
        title: "Multi-field Update",
        description: "All fields updated",
        planMode: true,
        startDate: new Date("2027-02-01T00:00:00.000Z"),
        stopDate: new Date("2027-02-10T00:00:00.000Z"),
      });

      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => unknown) => {
          const tx = {
            dailyDestination: {
              findMany: vi.fn().mockResolvedValue([]),
              update: vi.fn(),
            },
            dailyPoi: { findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
            routeSegment: {
              findMany: vi.fn().mockResolvedValue([]),
              update: vi.fn(),
            },
            branch: { findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
            trip: { update: vi.fn().mockResolvedValue(updatedTrip) },
          };
          return await callback(tx);
        }
      );

      const response = await patchTrip(
        makeRequest(`${BASE}/api/trips/trip-1`, "PATCH", updateData),
        { params: Promise.resolve({ id: "trip-1" }) }
      );

      expect(response.status).toBe(200);

      const trip = await response.json();
      expect(trip.title).toBe(updateData.title);
      expect(trip.description).toBe(updateData.description);
      expect(trip.planMode).toBe(true);
      // ISO format dates include time, so check date portion
      expect(trip.startDate).toMatch(new RegExp(`^${updateData.startDate}`));
      expect(trip.stopDate).toMatch(new RegExp(`^${updateData.stopDate}`));
    });

    it("should update only planMode", async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(makeBaseTrip());
      mockPrisma.trip.update.mockResolvedValue(
        makeBaseTrip({ planMode: false })
      );

      const response = await patchTrip(
        makeRequest(`${BASE}/api/trips/trip-1`, "PATCH", { planMode: false }),
        { params: Promise.resolve({ id: "trip-1" }) }
      );

      expect(response.status).toBe(200);
      const trip = await response.json();
      expect(trip.planMode).toBe(false);
    });

    it("should return 404 when updating non-existent trip", async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(null);

      const response = await patchTrip(
        makeRequest(`${BASE}/api/trips/non_existent_id`, "PATCH", {
          title: "Update Non-existent",
        }),
        { params: Promise.resolve({ id: "non_existent_id" }) }
      );

      expect(response.status).toBe(404);

      const error = await response.json();
      expect(error.error).toBe("Trip not found");
    });

    it("should return 400 for invalid update data", async () => {
      const invalidData = {
        startDate: "2027-06-15",
        stopDate: "2027-06-01", // Before start date
      };

      const response = await patchTrip(
        makeRequest(`${BASE}/api/trips/trip-1`, "PATCH", invalidData),
        { params: Promise.resolve({ id: "trip-1" }) }
      );

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/trips/[id] - Delete Trip", () => {
    it("should delete a marked test trip by ID", async () => {
      const trip = makeBaseTrip({ title: `Trip to Delete via API ${TEST_TRIP_MARKER}` });
      mockPrisma.trip.findUnique.mockResolvedValue(trip);
      mockPrisma.trip.delete.mockResolvedValue(trip);

      const response = await deleteTrip(
        makeRequest(`${BASE}/api/trips/trip-1`, "DELETE"),
        { params: Promise.resolve({ id: "trip-1" }) }
      );

      expect(response.status).toBe(200);

      const deletedTrip = await response.json();
      expect(deletedTrip.id).toBe(trip.id);
    });

    it("should block deleting an unmarked trip in non-production", async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(
        makeBaseTrip({ title: "Protected Dev Trip" })
      );

      const response = await deleteTrip(
        makeRequest(`${BASE}/api/trips/trip-2`, "DELETE"),
        { params: Promise.resolve({ id: "trip-2" }) }
      );

      expect(response.status).toBe(403);

      const error = await response.json();
      expect(error.code).toBe("trip_delete_blocked_in_non_production");
    });

    it("should allow deleting an unmarked trip when the safeguard is explicitly overridden", async () => {
      const trip = makeBaseTrip({ title: "Explicit Override Trip" });
      mockPrisma.trip.findUnique.mockResolvedValue(trip);
      mockPrisma.trip.delete.mockResolvedValue(trip);

      const response = await deleteTrip(
        makeRequest(`${BASE}/api/trips/trip-3`, "DELETE", undefined, {
          [ALLOW_TRIP_DELETE_HEADER]: ALLOW_TRIP_DELETE_VALUE,
        }),
        { params: Promise.resolve({ id: "trip-3" }) }
      );

      expect(response.status).toBe(200);
    });

    it("should return 404 when deleting non-existent trip", async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(null);

      const response = await deleteTrip(
        makeRequest(`${BASE}/api/trips/non_existent_id`, "DELETE"),
        { params: Promise.resolve({ id: "non_existent_id" }) }
      );

      expect(response.status).toBe(404);

      const error = await response.json();
      expect(error.error).toBe("Trip not found");
    });
  });

  describe("API Error Handling", () => {
    it("should handle malformed JSON in POST request", async () => {
      // Create a request with malformed JSON (non-parseable body)
      const request = new Request(`${BASE}/api/trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid json }",
      }) as any;

      const response = await postTrip(request);

      expect(response.status).toBe(500);
    });

    it("should return proper error structure for validation failures", async () => {
      const response = await postTrip(
        makeRequest(`${BASE}/api/trips`, "POST", { title: "" }) // Empty title
      );

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error.error).toBe("Validation failed");
      expect(error.issues).toBeDefined();
    });
  });
});
