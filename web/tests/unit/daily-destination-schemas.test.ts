/**
 * Daily Destination Schema Unit Tests
 * Location: tests/unit/schemas.test.ts (additions)
 * Task: TASK-009
 * 
 * Tests for:
 * - dailyDestinationCreateSchema
 * - dailyDestinationUpdateSchema
 * - dailyDestinationResponseSchema
 */

import { describe, it, expect } from "vitest";
import {
  dailyDestinationCreateSchema,
  dailyDestinationUpdateSchema,
  dailyDestinationResponseSchema,
} from "@/lib/schemas/trip";

describe("Daily Destination Schemas", () => {
  describe("dailyDestinationCreateSchema", () => {
    it("should validate a complete daily destination", () => {
      const data = {
        dayDate: "2026-06-02",
        name: "Paris",
        latitude: 48.8566,
        longitude: 2.3522,
        notes: "City of lights",
      };

      const result = dailyDestinationCreateSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.name).toBe(data.name);
        expect(result.data.latitude).toBe(data.latitude);
      }
    });

    it("should allow optional coordinates and notes", () => {
      const data = {
        dayDate: "2026-06-02",
        name: "Paris",
      };

      const result = dailyDestinationCreateSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.latitude).toBeUndefined();
        expect(result.data.longitude).toBeUndefined();
        expect(result.data.notes).toBeUndefined();
      }
    });

    it("should reject empty name", () => {
      const data = {
        dayDate: "2026-06-02",
        name: "",
      };

      const result = dailyDestinationCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject invalid date format", () => {
      const data = {
        dayDate: "invalid-date",
        name: "Paris",
      };

      const result = dailyDestinationCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject name longer than 200 characters", () => {
      const data = {
        dayDate: "2026-06-02",
        name: "A".repeat(201),
      };

      const result = dailyDestinationCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject invalid latitude (> 90)", () => {
      const data = {
        dayDate: "2026-06-02",
        name: "Invalid",
        latitude: 91,
      };

      const result = dailyDestinationCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject invalid longitude (> 180)", () => {
      const data = {
        dayDate: "2026-06-02",
        name: "Invalid",
        longitude: 181,
      };

      const result = dailyDestinationCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should accept nullable coordinates", () => {
      const data = {
        dayDate: "2026-06-02",
        name: "Paris",
        latitude: null,
        longitude: null,
      };

      const result = dailyDestinationCreateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject notes longer than 1000 characters", () => {
      const data = {
        dayDate: "2026-06-02",
        name: "Paris",
        notes: "A".repeat(1001),
      };

      const result = dailyDestinationCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("dailyDestinationUpdateSchema", () => {
    it("should allow partial updates", () => {
      const data = {
        name: "Updated Name",
      };

      const result = dailyDestinationUpdateSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.name).toBe(data.name);
        expect(result.data.dayDate).toBeUndefined();
      }
    });

    it("should allow empty update", () => {
      const data = {};

      const result = dailyDestinationUpdateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should validate individual fields", () => {
      const data = {
        latitude: 45.5,
      };

      const result = dailyDestinationUpdateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("dailyDestinationResponseSchema", () => {
    it("should validate a complete daily destination response", () => {
      const data = {
        id: "cm9g1up4c0000zf8o0x0x2fz1",
        tripId: "cm9g1up4c0001zf8o0x0x2fz2",
        dayDate: "2026-06-02", // String from API
        name: "Paris",
        latitude: 48.8566,
        longitude: 2.3522,
        notes: "City of lights",
        createdAt: "2026-03-02T12:00:00Z",
        updatedAt: "2026-03-02T12:00:00Z",
      };

      const result = dailyDestinationResponseSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.id).toBe(data.id);
        expect(result.data.tripId).toBe(data.tripId);
      }
    });

    it("should accept null coordinates", () => {
      const data = {
        id: "cm9g1up4c0002zf8o0x0x2fz3",
        tripId: "cm9g1up4c0003zf8o0x0x2fz4",
        dayDate: "2026-06-02", // String from API
        name: "Paris",
        latitude: null,
        longitude: null,
        notes: "City of lights",
        createdAt: "2026-03-02T12:00:00Z",
        updatedAt: "2026-03-02T12:00:00Z",
      };

      const result = dailyDestinationResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject missing required fields", () => {
      const data = {
        id: "cm9g1up4c0004zf8o0x0x2fz5",
        tripId: "cm9g1up4c0005zf8o0x0x2fz6",
        dayDate: "2026-06-02",
        name: "Paris",
        // missing createdAt
      };

      const result = dailyDestinationResponseSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
