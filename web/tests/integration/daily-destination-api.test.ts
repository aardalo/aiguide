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

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

const API_BASE = "http://localhost:3000";

interface FetchOptions extends RequestInit {
  body?: string;
}

async function makeRequest(
  path: string,
  options: FetchOptions = {}
): Promise<Response> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return response;
}

describe("Daily Destination API Endpoints", () => {
  let testTripId: string;
  let createdDestinationIds: string[] = [];

  beforeAll(async () => {
    // Create a test trip for daily destinations
    const trip = await prisma.trip.create({
      data: {
        title: "Daily Destination Test Trip",
        startDate: new Date("2026-06-01"),
        stopDate: new Date("2026-06-10"),
        planMode: true,
      },
    });
    testTripId = trip.id;
  });

  afterAll(async () => {
    // Cleanup: Delete created daily destinations
    for (const id of createdDestinationIds) {
      await prisma.dailyDestination.deleteMany({
        where: { id },
      });
    }
    // Delete test trip
    await prisma.trip.delete({
      where: { id: testTripId },
    });
  });

  describe("POST /api/daily-destinations - Create Daily Destination", () => {
    it("should create a daily destination with valid data", async () => {
      const destinationData = {
        tripId: testTripId,
        dayDate: "2026-06-02",
        name: "Paris",
        latitude: 48.8566,
        longitude: 2.3522,
        notes: "City of lights",
      };

      const response = await makeRequest("/api/daily-destinations", {
        method: "POST",
        body: JSON.stringify(destinationData),
      });

      expect(response.status).toBe(201);

      const destination = await response.json();
      createdDestinationIds.push(destination.id);

      expect(destination.id).toBeDefined();
      expect(destination.tripId).toBe(testTripId);
      expect(destination.name).toBe(destinationData.name);
      expect(destination.latitude).toBe(destinationData.latitude);
      expect(destination.longitude).toBe(destinationData.longitude);
      expect(destination.notes).toBe(destinationData.notes);
    });

    it("should create a destination without optional coordinates", async () => {
      const destinationData = {
        tripId: testTripId,
        dayDate: "2026-06-03",
        name: "Lyon",
      };

      const response = await makeRequest("/api/daily-destinations", {
        method: "POST",
        body: JSON.stringify(destinationData),
      });

      expect(response.status).toBe(201);

      const destination = await response.json();
      createdDestinationIds.push(destination.id);

      expect(destination.name).toBe(destinationData.name);
      expect(destination.latitude).toBeNull();
      expect(destination.longitude).toBeNull();
    });

    it("should return 400 for missing required fields", async () => {
      const response = await makeRequest("/api/daily-destinations", {
        method: "POST",
        body: JSON.stringify({
          tripId: testTripId,
          dayDate: "2026-06-04",
          // missing name
        }),
      });

      expect(response.status).toBe(400);
    });

    it("should return 404 for non-existent trip", async () => {
      const response = await makeRequest("/api/daily-destinations", {
        method: "POST",
        body: JSON.stringify({
          tripId: "non_existent_trip_id",
          dayDate: "2026-06-04",
          name: "Some City",
        }),
      });

      expect(response.status).toBe(404);
    });

    it("should return 400 if day date is outside trip range", async () => {
      const response = await makeRequest("/api/daily-destinations", {
        method: "POST",
        body: JSON.stringify({
          tripId: testTripId,
          dayDate: "2026-07-01", // Outside trip range
          name: "Tokyo",
        }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("within trip");
    });
  });

  describe("GET /api/daily-destinations - List Daily Destinations", () => {
    it("should return a list of daily destinations for a trip", async () => {
      const response = await makeRequest(
        `/api/daily-destinations?tripId=${testTripId}`
      );

      expect(response.status).toBe(200);

      const destinations = await response.json();
      expect(Array.isArray(destinations)).toBe(true);
      expect(destinations.length).toBeGreaterThan(0);
      expect(destinations.every((d: any) => d.tripId === testTripId)).toBe(
        true
      );
    });

    it("should return 400 if tripId query parameter is missing", async () => {
      const response = await makeRequest("/api/daily-destinations");

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("tripId");
    });

    it("should return 404 for non-existent trip", async () => {
      const response = await makeRequest(
        "/api/daily-destinations?tripId=non_existent_trip_id"
      );

      expect(response.status).toBe(404);
    });

    it("should return destinations sorted by date ascending", async () => {
      const response = await makeRequest(
        `/api/daily-destinations?tripId=${testTripId}`
      );

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
    let destinationId: string;

    beforeAll(async () => {
      // Create a destination to fetch
      const response = await makeRequest("/api/daily-destinations", {
        method: "POST",
        body: JSON.stringify({
          tripId: testTripId,
          dayDate: "2026-06-05",
          name: "Marseille",
        }),
      });
      const destination = await response.json();
      destinationId = destination.id;
      createdDestinationIds.push(destinationId);
    });

    it("should return a daily destination by ID", async () => {
      const response = await makeRequest(
        `/api/daily-destinations/${destinationId}`
      );

      expect(response.status).toBe(200);

      const destination = await response.json();
      expect(destination.id).toBe(destinationId);
      expect(destination.name).toBe("Marseille");
    });

    it("should return 404 for non-existent ID", async () => {
      const response = await makeRequest("/api/daily-destinations/non_existent");

      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /api/daily-destinations/[id] - Update Daily Destination", () => {
    let updateDestinationId: string;

    beforeAll(async () => {
      // Create a destination to update
      const response = await makeRequest("/api/daily-destinations", {
        method: "POST",
        body: JSON.stringify({
          tripId: testTripId,
          dayDate: "2026-06-06",
          name: "Nice",
          latitude: 43.7102,
          longitude: 7.262,
        }),
      });
      const destination = await response.json();
      updateDestinationId = destination.id;
      createdDestinationIds.push(updateDestinationId);
    });

    it("should update destination name", async () => {
      const updateData = { name: "Nice - Updated" };

      const response = await makeRequest(
        `/api/daily-destinations/${updateDestinationId}`,
        {
          method: "PATCH",
          body: JSON.stringify(updateData),
        }
      );

      expect(response.status).toBe(200);

      const destination = await response.json();
      expect(destination.name).toBe(updateData.name);
      expect(destination.latitude).toBe(43.7102); // Should remain unchanged
    });

    it("should update coordinates", async () => {
      const updateData = {
        latitude: 43.71,
        longitude: 7.26,
      };

      const response = await makeRequest(
        `/api/daily-destinations/${updateDestinationId}`,
        {
          method: "PATCH",
          body: JSON.stringify(updateData),
        }
      );

      expect(response.status).toBe(200);

      const destination = await response.json();
      expect(destination.latitude).toBe(updateData.latitude);
      expect(destination.longitude).toBe(updateData.longitude);
    });

    it("should update notes", async () => {
      const updateData = { notes: "Beach destination" };

      const response = await makeRequest(
        `/api/daily-destinations/${updateDestinationId}`,
        {
          method: "PATCH",
          body: JSON.stringify(updateData),
        }
      );

      expect(response.status).toBe(200);

      const destination = await response.json();
      expect(destination.notes).toBe(updateData.notes);
    });

    it("should return 404 when updating non-existent destination", async () => {
      const response = await makeRequest(
        "/api/daily-destinations/non_existent",
        {
          method: "PATCH",
          body: JSON.stringify({ name: "Updated" }),
        }
      );

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/daily-destinations/[id] - Delete Daily Destination", () => {
    let deleteDestinationId: string;

    beforeAll(async () => {
      // Create a destination to delete
      const response = await makeRequest("/api/daily-destinations", {
        method: "POST",
        body: JSON.stringify({
          tripId: testTripId,
          dayDate: "2026-06-07",
          name: "Cannes",
        }),
      });
      const destination = await response.json();
      deleteDestinationId = destination.id;
    });

    it("should delete a daily destination by ID", async () => {
      const response = await makeRequest(
        `/api/daily-destinations/${deleteDestinationId}`,
        {
          method: "DELETE",
        }
      );

      expect(response.status).toBe(200);

      const deletedDestination = await response.json();
      expect(deletedDestination.id).toBe(deleteDestinationId);

      // Verify it's deleted
      const verifyResponse = await makeRequest(
        `/api/daily-destinations/${deleteDestinationId}`
      );
      expect(verifyResponse.status).toBe(404);
    });

    it("should return 404 when deleting non-existent destination", async () => {
      const response = await makeRequest(
        "/api/daily-destinations/non_existent",
        {
          method: "DELETE",
        }
      );

      expect(response.status).toBe(404);
    });
  });
});
