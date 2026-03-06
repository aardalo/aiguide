/**
 * Trip Model Integration Tests
 * Tests Prisma Trip model CRUD operations against real database
 * Task: TASK-002, TEST-001
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";

// Test data
const testTrip = {
  title: "Test Road Trip",
  description: "A test trip for integration testing",
  startDate: new Date("2026-06-01"),
  stopDate: new Date("2026-06-15"),
};

describe("Trip Model Integration Tests", () => {
  // Track created trip IDs for cleanup
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

  describe("CREATE operations", () => {
    it("should create a trip with all required fields", async () => {
      const trip = await prisma.trip.create({
        data: testTrip,
      });

      createdTripIds.push(trip.id);

      expect(trip).toBeDefined();
      expect(trip.id).toBeDefined();
      expect(trip.title).toBe(testTrip.title);
      expect(trip.description).toBe(testTrip.description);
      expect(trip.startDate).toEqual(testTrip.startDate);
      expect(trip.stopDate).toEqual(testTrip.stopDate);
      expect(trip.planMode).toBe(false);
      expect(trip.createdAt).toBeInstanceOf(Date);
      expect(trip.updatedAt).toBeInstanceOf(Date);
    });

    it("should create a trip without optional description", async () => {
      const tripWithoutDescription = {
        title: "Minimal Trip",
        startDate: new Date("2026-07-01"),
        stopDate: new Date("2026-07-05"),
      };

      const trip = await prisma.trip.create({
        data: tripWithoutDescription,
      });

      createdTripIds.push(trip.id);

      expect(trip).toBeDefined();
      expect(trip.title).toBe(tripWithoutDescription.title);
      expect(trip.description).toBeNull();
    });

    it("should auto-generate CUID for id field", async () => {
      const trip = await prisma.trip.create({
        data: {
          title: "ID Test Trip",
          startDate: new Date("2026-08-01"),
          stopDate: new Date("2026-08-03"),
        },
      });

      createdTripIds.push(trip.id);

      expect(trip.id).toMatch(/^c[a-z0-9]{24}$/); // CUID format
    });

    it("should set createdAt and updatedAt timestamps automatically", async () => {
      const beforeCreate = new Date();
      
      const trip = await prisma.trip.create({
        data: {
          title: "Timestamp Test",
          startDate: new Date("2026-09-01"),
          stopDate: new Date("2026-09-03"),
        },
      });

      createdTripIds.push(trip.id);

      const afterCreate = new Date();

      expect(trip.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(trip.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
      expect(trip.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(trip.updatedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe("READ operations", () => {
    let existingTripId: string;

    beforeAll(async () => {
      const trip = await prisma.trip.create({
        data: {
          title: "Read Test Trip",
          description: "For testing read operations",
          startDate: new Date("2026-10-01"),
          stopDate: new Date("2026-10-10"),
        },
      });
      existingTripId = trip.id;
      createdTripIds.push(trip.id);
    });

    it("should find a trip by ID", async () => {
      const trip = await prisma.trip.findUnique({
        where: { id: existingTripId },
      });

      expect(trip).toBeDefined();
      expect(trip?.id).toBe(existingTripId);
      expect(trip?.title).toBe("Read Test Trip");
    });

    it("should return null for non-existent trip ID", async () => {
      const trip = await prisma.trip.findUnique({
        where: { id: "non_existent_id" },
      });

      expect(trip).toBeNull();
    });

    it("should find all trips", async () => {
      const trips = await prisma.trip.findMany();

      expect(trips).toBeDefined();
      expect(Array.isArray(trips)).toBe(true);
      expect(trips.length).toBeGreaterThan(0);
    });

    it("should find trips ordered by createdAt descending", async () => {
      const trips = await prisma.trip.findMany({
        orderBy: { createdAt: "desc" },
        take: 2,
      });

      expect(trips.length).toBeGreaterThan(0);
      if (trips.length > 1) {
        expect(trips[0].createdAt.getTime()).toBeGreaterThanOrEqual(
          trips[1].createdAt.getTime()
        );
      }
    });
  });

  describe("UPDATE operations", () => {
    let updateTestTripId: string;

    beforeAll(async () => {
      const trip = await prisma.trip.create({
        data: {
          title: "Original Title",
          description: "Original description",
          startDate: new Date("2026-11-01"),
          stopDate: new Date("2026-11-05"),
        },
      });
      updateTestTripId = trip.id;
      createdTripIds.push(trip.id);
    });

    it("should update trip title", async () => {
      const updatedTrip = await prisma.trip.update({
        where: { id: updateTestTripId },
        data: { title: "Updated Title" },
      });

      expect(updatedTrip.title).toBe("Updated Title");
      expect(updatedTrip.description).toBe("Original description");
    });

    it("should update trip dates", async () => {
      const newStartDate = new Date("2026-12-01");
      const newStopDate = new Date("2026-12-15");

      const updatedTrip = await prisma.trip.update({
        where: { id: updateTestTripId },
        data: {
          startDate: newStartDate,
          stopDate: newStopDate,
        },
      });

      expect(updatedTrip.startDate).toEqual(newStartDate);
      expect(updatedTrip.stopDate).toEqual(newStopDate);
    });

    it("should update updatedAt timestamp on modification", async () => {
      const originalTrip = await prisma.trip.findUnique({
        where: { id: updateTestTripId },
      });

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updatedTrip = await prisma.trip.update({
        where: { id: updateTestTripId },
        data: { title: "Another Update" },
      });

      expect(updatedTrip.updatedAt.getTime()).toBeGreaterThan(
        originalTrip!.updatedAt.getTime()
      );
    });

    it("should clear description when set to null", async () => {
      const updatedTrip = await prisma.trip.update({
        where: { id: updateTestTripId },
        data: { description: null },
      });

      expect(updatedTrip.description).toBeNull();
    });

    it("should update planMode flag", async () => {
      const updatedTrip = await prisma.trip.update({
        where: { id: updateTestTripId },
        data: { planMode: true },
      });

      expect(updatedTrip.planMode).toBe(true);
    });
  });

  describe("DELETE operations", () => {
    it("should delete a trip by ID", async () => {
      const trip = await prisma.trip.create({
        data: {
          title: "Trip to Delete",
          startDate: new Date("2027-01-01"),
          stopDate: new Date("2027-01-05"),
        },
      });

      const deletedTrip = await prisma.trip.delete({
        where: { id: trip.id },
      });

      expect(deletedTrip.id).toBe(trip.id);

      // Verify it's actually deleted
      const foundTrip = await prisma.trip.findUnique({
        where: { id: trip.id },
      });

      expect(foundTrip).toBeNull();
    });

    it("should throw error when deleting non-existent trip", async () => {
      await expect(
        prisma.trip.delete({
          where: { id: "non_existent_id" },
        })
      ).rejects.toThrow();
    });
  });

  describe("Database constraints", () => {
    it("should enforce title max length (200 chars)", async () => {
      const longTitle = "A".repeat(201);

      await expect(
        prisma.trip.create({
          data: {
            title: longTitle,
            startDate: new Date("2027-02-01"),
            stopDate: new Date("2027-02-05"),
          },
        })
      ).rejects.toThrow();
    });

    it("should allow title at max length (200 chars)", async () => {
      const maxTitle = "A".repeat(200);

      const trip = await prisma.trip.create({
        data: {
          title: maxTitle,
          startDate: new Date("2027-03-01"),
          stopDate: new Date("2027-03-05"),
        },
      });

      createdTripIds.push(trip.id);

      expect(trip.title).toBe(maxTitle);
      expect(trip.title.length).toBe(200);
    });
  });

  describe("Index performance", () => {
    it("should efficiently query trips by createdAt using index", async () => {
      // Create multiple trips for index test
      const tripPromises = Array.from({ length: 5 }, (_, i) =>
        prisma.trip.create({
          data: {
            title: `Index Test Trip ${i}`,
            startDate: new Date("2027-04-01"),
            stopDate: new Date("2027-04-05"),
          },
        })
      );

      const trips = await Promise.all(tripPromises);
      createdTripIds.push(...trips.map((t) => t.id));

      const startTime = Date.now();
      const orderedTrips = await prisma.trip.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      });
      const queryTime = Date.now() - startTime;

      expect(orderedTrips.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(100); // Should be fast with index
    });
  });
});
