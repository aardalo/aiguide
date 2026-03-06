import { describe, it, expect } from 'vitest';
import {
  tripCreateSchema,
  tripUpdateSchema,
  tripResponseSchema,
  validateTripCreate,
  isValidDateRange,
} from '@/lib/schemas/trip';

describe('Trip Validation Schemas', () => {
  describe('tripCreateSchema', () => {
    it('should validate a valid trip creation request', () => {
      const validData = {
        title: 'Summer Road Trip',
        description: 'Cross-country adventure',
        startDate: '2026-06-15',
        stopDate: '2026-06-30',
      };

      const result = tripCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing title', () => {
      const invalidData = {
        description: 'No title provided',
        startDate: '2026-06-15',
        stopDate: '2026-06-30',
      };

      const result = tripCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject stop date before start date', () => {
      const invalidData = {
        title: 'Bad Trip',
        startDate: '2026-06-30',
        stopDate: '2026-06-15',
      };

      const result = tripCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Stop date must be');
      }
    });

    it('should allow same start and stop date', () => {
      const validData = {
        title: 'One Day Trip',
        startDate: '2026-06-15',
        stopDate: '2026-06-15',
      };

      const result = tripCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', () => {
      const invalidData = {
        title: 'Bad Date Format',
        startDate: '06/15/2026',
        stopDate: '2026-06-30',
      };

      const result = tripCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('isValidDateRange helper', () => {
    it('should return valid=true for correct date range', () => {
      const result = isValidDateRange('2026-06-15', '2026-06-30');
      expect(result.valid).toBe(true);
    });

    it('should return valid=false when stop date is before start date', () => {
      const result = isValidDateRange('2026-06-30', '2026-06-15');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Stop date must be');
    });

    it('should allow same date', () => {
      const result = isValidDateRange('2026-06-15', '2026-06-15');
      expect(result.valid).toBe(true);
    });

    it('should handle invalid date format', () => {
      const result = isValidDateRange('invalid', '2026-06-15');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateTripCreate helper', () => {
    it('should validate using the schema safely', () => {
      const validData = {
        title: 'Test Trip',
        startDate: '2026-06-15',
        stopDate: '2026-06-30',
      };

      const result = validateTripCreate(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('tripResponseSchema', () => {
    it('should include planMode in API responses', () => {
      const responseData = {
        id: 'ck1234567890123456789012',
        title: 'Trip with plan mode',
        description: 'Test response payload',
        planMode: false,
        startDate: '2026-06-15',
        stopDate: '2026-06-30',
        createdAt: '2026-03-01T10:30:00.000Z',
        updatedAt: '2026-03-02T15:45:00.000Z',
      };

      const result = tripResponseSchema.safeParse(responseData);
      expect(result.success).toBe(true);
    });
  });
});
