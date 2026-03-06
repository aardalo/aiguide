/**
 * Trip API Endpoint Integration Tests
 * Tests REST API endpoints for Trip CRUD operations
 * Task: TASK-003, TEST-001
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

// Helper to make API requests
const API_BASE = "http://localhost:3000";

async function makeRequest(
  path: string,
  options: RequestInit = {}
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

describe("Trip API Endpoints", () => {
  const createdTripIds: string[] = [];

  // Clean up test data after all tests
  afterAll(async () => {
    if (createdTripIds.length > 0) {
      await prisma.trip.deleteMany({
        where: {
          id: { in: createdTripIds },
        },
      });
    }
    await prisma.$disconnect();
  });

  describe("POST /api/trips - Create Trip", () => {
    it("should create a new trip with valid data", async () => {
      const tripData = {
        title: "API Test Trip",
        description: "Testing trip creation via API",
        startDate: "2026-06-01",
        stopDate: "2026-06-15",
      };

      const response = await makeRequest("/api/trips", {
        method: "POST",
        body: JSON.stringify(tripData),
      });

      expect(response.status).toBe(201);

      const trip = await response.json();
      createdTripIds.push(trip.id);

      expect(trip.id).toBeDefined();
      expect(trip.title).toBe(tripData.title);
      expect(trip.description).toBe(tripData.description);
      expect(trip.planMode).toBe(false);
      // ISO format dates include time, so check date portion
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

      const response = await makeRequest("/api/trips", {
        method: "POST",
        body: JSON.stringify(tripData),
      });

      expect(response.status).toBe(201);

      const trip = await response.json();
      createdTripIds.push(trip.id);

      expect(trip.description).toBeNull();
    });

    it("should return 400 for missing required fields", async () => {
      const invalidData = {
        description: "Missing title and dates",
      };

      const response = await makeRequest("/api/trips", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });

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

      const response = await makeRequest("/api/trips", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });

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

      const response = await makeRequest("/api/trips", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);
    });

    it("should allow same start and stop date", async () => {
      const tripData = {
        title: "One Day Trip",
        startDate: "2026-08-01",
        stopDate: "2026-08-01",
      };

      const response = await makeRequest("/api/trips", {
        method: "POST",
        body: JSON.stringify(tripData),
      });

      expect(response.status).toBe(201);

      const trip = await response.json();
      createdTripIds.push(trip.id);
    });
  });

  describe("GET /api/trips - List Trips", () => {
    beforeAll(async () => {
      // Create some test trips
      const trips = await Promise.all([
        prisma.trip.create({
          data: {
            title: "List Test Trip 1",
            startDate: new Date("2026-09-01"),
            stopDate: new Date("2026-09-05"),
          },
        }),
        prisma.trip.create({
          data: {
            title: "List Test Trip 2",
            startDate: new Date("2026-10-01"),
            stopDate: new Date("2026-10-05"),
          },
        }),
      ]);
      createdTripIds.push(...trips.map((t) => t.id));
    });

    it("should return a list of trips", async () => {
      const response = await makeRequest("/api/trips", {
        method: "GET",
      });

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
      const response = await makeRequest("/api/trips", {
        method: "GET",
      });

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
    let testTripId: string;

    beforeAll(async () => {
      const trip = await prisma.trip.create({
        data: {
          title: "Get Test Trip",
          description: "For testing GET by ID",
          startDate: new Date("2026-11-01"),
          stopDate: new Date("2026-11-05"),
        },
      });
      testTripId = trip.id;
      createdTripIds.push(trip.id);
    });

    it("should return a trip by ID", async () => {
      const response = await makeRequest(`/api/trips/${testTripId}`, {
        method: "GET",
      });

      expect(response.status).toBe(200);

      const trip = await response.json();
      expect(trip.id).toBe(testTripId);
      expect(trip.title).toBe("Get Test Trip");
      expect(trip.description).toBe("For testing GET by ID");
      expect(trip.planMode).toBe(false);
    });

    it("should return 404 for non-existent trip", async () => {
      const response = await makeRequest("/api/trips/non_existent_id", {
        method: "GET",
      });

      expect(response.status).toBe(404);

      const error = await response.json();
      expect(error.error).toBe("Trip not found");
    });
  });

  describe("PATCH /api/trips/[id] - Update Trip", () => {
    let updateTestTripId: string;

    beforeAll(async () => {
      const trip = await prisma.trip.create({
        data: {
          title: "Original Update Title",
          description: "Original description",
          startDate: new Date("2026-12-01"),
          stopDate: new Date("2026-12-05"),
        },
      });
      updateTestTripId = trip.id;
      createdTripIds.push(trip.id);
    });

    it("should update trip title", async () => {
      const updateData = {
        title: "Updated Title via API",
      };

      const response = await makeRequest(`/api/trips/${updateTestTripId}`, {
        method: "PATCH",
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);

      const trip = await response.json();
      expect(trip.title).toBe(updateData.title);
      expect(trip.description).toBe("Original description"); // Unchanged
    });

    it("should update trip description", async () => {
      const updateData = {
        description: "Updated description via API",
      };

      const response = await makeRequest(`/api/trips/${updateTestTripId}`, {
        method: "PATCH",
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);

      const trip = await response.json();
      expect(trip.description).toBe(updateData.description);
    });

    it("should update trip dates", async () => {
      const updateData = {
        startDate: "2027-01-01",
        stopDate: "2027-01-15",
      };

      const response = await makeRequest(`/api/trips/${updateTestTripId}`, {
        method: "PATCH",
        body: JSON.stringify(updateData),
      });

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

      const response = await makeRequest(`/api/trips/${updateTestTripId}`, {
        method: "PATCH",
        body: JSON.stringify(updateData),
      });

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
      const response = await makeRequest(`/api/trips/${updateTestTripId}`, {
        method: "PATCH",
        body: JSON.stringify({ planMode: false }),
      });

      expect(response.status).toBe(200);
      const trip = await response.json();
      expect(trip.planMode).toBe(false);
    });

    it("should return 404 when updating non-existent trip", async () => {
      const response = await makeRequest("/api/trips/non_existent_id", {
        method: "PATCH",
        body: JSON.stringify({ title: "Update Non-existent" }),
      });

      expect(response.status).toBe(404);

      const error = await response.json();
      expect(error.error).toBe("Trip not found");
    });

    it("should return 400 for invalid update data", async () => {
      const invalidData = {
        startDate: "2027-06-15",
        stopDate: "2027-06-01", // Before start date
      };

      const response = await makeRequest(`/api/trips/${updateTestTripId}`, {
        method: "PATCH",
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/trips/[id] - Delete Trip", () => {
    it("should delete a trip by ID", async () => {
      const trip = await prisma.trip.create({
        data: {
          title: "Trip to Delete via API",
          startDate: new Date("2027-03-01"),
          stopDate: new Date("2027-03-05"),
        },
      });

      const response = await makeRequest(`/api/trips/${trip.id}`, {
        method: "DELETE",
      });

      expect(response.status).toBe(200);

      const deletedTrip = await response.json();
      expect(deletedTrip.id).toBe(trip.id);

      // Verify it's deleted
      const verifyResponse = await makeRequest(`/api/trips/${trip.id}`, {
        method: "GET",
      });
      expect(verifyResponse.status).toBe(404);
    });

    it("should return 404 when deleting non-existent trip", async () => {
      const response = await makeRequest("/api/trips/non_existent_id", {
        method: "DELETE",
      });

      expect(response.status).toBe(404);

      const error = await response.json();
      expect(error.error).toBe("Trip not found");
    });
  });

  describe("API Error Handling", () => {
    it("should handle malformed JSON in POST request", async () => {
      const response = await fetch(`${API_BASE}/api/trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid json }",
      });

      expect(response.status).toBe(500);
    });

    it("should return proper error structure for validation failures", async () => {
      const response = await makeRequest("/api/trips", {
        method: "POST",
        body: JSON.stringify({ title: "" }), // Empty title
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error.error).toBe("Validation failed");
      expect(error.issues).toBeDefined();
    });
  });
});
