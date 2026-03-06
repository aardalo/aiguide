/**
 * Trip Form Component Tests
 * Tests form rendering, validation, and API integration
 * Task: TASK-004, TEST-001
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TripForm from '@/app/map/components/TripForm';

// Mock fetch
global.fetch = vi.fn();

describe('TripForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Form Rendering', () => {
    it('should render all form fields', () => {
      render(<TripForm />);

      expect(screen.getByLabelText(/trip title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create trip/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });

    it('should display required field indicators', () => {
      render(<TripForm />);

      const requiredElements = screen.getAllByText('*');
      expect(requiredElements.length).toBeGreaterThanOrEqual(3); // title, startDate, stopDate
    });

    it('should show character count for description', () => {
      render(<TripForm />);

      expect(screen.getByText(/0 \/ 1000 characters/i)).toBeInTheDocument();
    });
  });

  describe('Client-side Validation', () => {
    it('should show error when title is missing', async () => {
      render(<TripForm />);

      const submitButton = screen.getByRole('button', { name: /create trip/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when dates are missing', async () => {
      render(<TripForm />);

      const titleInput = screen.getByLabelText(/trip title/i);
      fireEvent.change(titleInput, { target: { value: 'Test Trip' } });

      const submitButton = screen.getByRole('button', { name: /create trip/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Zod will show date validation errors
        const startDateError = screen.queryByText(/start date must be a valid date/i);
        const stopDateError = screen.queryByText(/stop date must be a valid date/i);
        expect(startDateError || stopDateError).toBeTruthy();
      });
    });

    it('should show error when end date is before start date', async () => {
      render(<TripForm />);

      fireEvent.change(screen.getByLabelText(/trip title/i), {
        target: { value: 'Test Trip' },
      });
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: '2026-06-15' },
      });
      fireEvent.change(screen.getByLabelText(/end date/i), {
        target: { value: '2026-06-01' }, // Before start date
      });

      const submitButton = screen.getByRole('button', { name: /create trip/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/stop date must be equal to or after/i)
        ).toBeInTheDocument();
      });
    });

    it('should allow same start and end date', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'test-id',
          title: 'One Day Trip',
          startDate: '2026-06-01',
          stopDate: '2026-06-01',
        }),
      });

      render(<TripForm />);

      fireEvent.change(screen.getByLabelText(/trip title/i), {
        target: { value: 'One Day Trip' },
      });
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: '2026-06-01' },
      });
      fireEvent.change(screen.getByLabelText(/end date/i), {
        target: { value: '2026-06-01' }, // Same as start
      });

      const submitButton = screen.getByRole('button', { name: /create trip/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should clear field error when user types', async () => {
      render(<TripForm />);

      // Submit to trigger validation errors
      const submitButton = screen.getByRole('button', { name: /create trip/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      });

      // Type in title field
      const titleInput = screen.getByLabelText(/trip title/i);
      fireEvent.change(titleInput, { target: { value: 'New Trip' } });

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/title is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call API with correct data on valid submission', async () => {
      const mockTrip = {
        id: 'test-trip-id',
        title: 'API Test Trip',
        description: 'Test description',
        startDate: '2026-06-01',
        stopDate: '2026-06-15',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrip,
      });

      render(<TripForm />);

      // Fill out form
      fireEvent.change(screen.getByLabelText(/trip title/i), {
        target: { value: 'API Test Trip' },
      });
      fireEvent.change(screen.getByLabelText(/description/i), {
        target: { value: 'Test description' },
      });
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: '2026-06-01' },
      });
      fireEvent.change(screen.getByLabelText(/end date/i), {
        target: { value: '2026-06-15' },
      });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create trip/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/trips', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'API Test Trip',
            description: 'Test description',
            startDate: '2026-06-01',
            stopDate: '2026-06-15',
          }),
        });
      });
    });

    it('should show success message on successful submission', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'test-id', title: 'Success Trip' }),
      });

      render(<TripForm />);

      fireEvent.change(screen.getByLabelText(/trip title/i), {
        target: { value: 'Success Trip' },
      });
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: '2026-06-01' },
      });
      fireEvent.change(screen.getByLabelText(/end date/i), {
        target: { value: '2026-06-05' },
      });

      fireEvent.click(screen.getByRole('button', { name: /create trip/i }));

      await waitFor(() => {
        expect(screen.getByText(/trip created successfully/i)).toBeInTheDocument();
      });
    });

    it('should call onSuccess callback on successful submission', async () => {
      const mockTrip = { id: 'test-id', title: 'Callback Trip' };
      const onSuccess = vi.fn();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrip,
      });

      render(<TripForm onSuccess={onSuccess} />);

      fireEvent.change(screen.getByLabelText(/trip title/i), {
        target: { value: 'Callback Trip' },
      });
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: '2026-07-01' },
      });
      fireEvent.change(screen.getByLabelText(/end date/i), {
        target: { value: '2026-07-05' },
      });

      fireEvent.click(screen.getByRole('button', { name: /create trip/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockTrip);
      });
    });

    it('should clear form after successful submission', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'test-id' }),
      });

      render(<TripForm />);

      const titleInput = screen.getByLabelText(/trip title/i) as HTMLInputElement;
      const descInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;

      fireEvent.change(titleInput, { target: { value: 'Clear Test' } });
      fireEvent.change(descInput, { target: { value: 'Should be cleared' } });
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: '2026-08-01' },
      });
      fireEvent.change(screen.getByLabelText(/end date/i), {
        target: { value: '2026-08-05' },
      });

      fireEvent.click(screen.getByRole('button', { name: /create trip/i }));

      await waitFor(() => {
        expect(titleInput.value).toBe('');
        expect(descInput.value).toBe('');
      });
    });

    it('should show error message on API failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Database connection failed' }),
      });

      render(<TripForm />);

      fireEvent.change(screen.getByLabelText(/trip title/i), {
        target: { value: 'Error Trip' },
      });
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: '2026-09-01' },
      });
      fireEvent.change(screen.getByLabelText(/end date/i), {
        target: { value: '2026-09-05' },
      });

      fireEvent.click(screen.getByRole('button', { name: /create trip/i }));

      await waitFor(() => {
        expect(screen.getByText(/database connection failed/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(<TripForm />);

      fireEvent.change(screen.getByLabelText(/trip title/i), {
        target: { value: 'Network Error Trip' },
      });
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: '2026-10-01' },
      });
      fireEvent.change(screen.getByLabelText(/end date/i), {
        target: { value: '2026-10-05' },
      });

      fireEvent.click(screen.getByRole('button', { name: /create trip/i }));

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should disable form during submission', async () => {
      (global.fetch as any).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ id: 'test-id' }),
                }),
              100
            );
          })
      );

      render(<TripForm />);

      fireEvent.change(screen.getByLabelText(/trip title/i), {
        target: { value: 'Slow Trip' },
      });
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: '2026-11-01' },
      });
      fireEvent.change(screen.getByLabelText(/end date/i), {
        target: { value: '2026-11-05' },
      });

      const submitButton = screen.getByRole('button', { name: /create trip/i });
      fireEvent.click(submitButton);

      // Check button shows loading state
      await waitFor(() => {
        expect(screen.getByText(/creating.../i)).toBeInTheDocument();
      });

      // Wait for submission to complete
      await waitFor(
        () => {
          expect(screen.getByText(/trip created successfully/i)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Form Reset', () => {
    it('should clear all fields when reset button is clicked', () => {
      render(<TripForm />);

      // Fill out form
      const titleInput = screen.getByLabelText(/trip title/i) as HTMLInputElement;
      const descInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
      const startInput = screen.getByLabelText(/start date/i) as HTMLInputElement;
      const stopInput = screen.getByLabelText(/end date/i) as HTMLInputElement;

      fireEvent.change(titleInput, { target: { value: 'Reset Test' } });
      fireEvent.change(descInput, { target: { value: 'Reset description' } });
      fireEvent.change(startInput, { target: { value: '2026-12-01' } });
      fireEvent.change(stopInput, { target: { value: '2026-12-05' } });

      expect(titleInput.value).toBe('Reset Test');
      expect(descInput.value).toBe('Reset description');

      // Click reset
      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);

      // All fields should be empty
      expect(titleInput.value).toBe('');
      expect(descInput.value).toBe('');
      expect(startInput.value).toBe('');
      expect(stopInput.value).toBe('');
    });

    it('should clear validation errors when reset', async () => {
      render(<TripForm />);

      // Submit to trigger errors
      fireEvent.click(screen.getByRole('button', { name: /create trip/i }));

      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      });

      // Click reset
      fireEvent.click(screen.getByRole('button', { name: /reset/i }));

      // Errors should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/title is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Character Limits', () => {
    it('should enforce title max length (200 chars)', () => {
      render(<TripForm />);

      const titleInput = screen.getByLabelText(/trip title/i) as HTMLInputElement;
      expect(titleInput.maxLength).toBe(200);
    });

    it('should enforce description max length (1000 chars)', () => {
      render(<TripForm />);

      const descInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
      expect(descInput.maxLength).toBe(1000);
    });

    it('should update character count as user types in description', () => {
      render(<TripForm />);

      const descInput = screen.getByLabelText(/description/i);
      fireEvent.change(descInput, { target: { value: 'Hello world' } }); // 11 chars

      expect(screen.getByText(/11 \/ 1000 characters/i)).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('should prefill fields and submit PATCH to trip endpoint', async () => {
      const updatedTrip = {
        id: 'trip-123',
        title: 'Updated Trip',
        description: 'Updated description',
        startDate: '2026-06-02',
        stopDate: '2026-06-16',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedTrip,
      });

      render(
        <TripForm
          mode="edit"
          tripId="trip-123"
          initialData={{
            title: 'Summer Road Trip 2026',
            description: 'Original description',
            startDate: '2026-06-01',
            stopDate: '2026-06-15',
          }}
        />
      );

      expect((screen.getByLabelText(/trip title/i) as HTMLInputElement).value).toBe('Summer Road Trip 2026');
      expect((screen.getByLabelText(/start date/i) as HTMLInputElement).value).toBe('2026-06-01');
      expect((screen.getByLabelText(/end date/i) as HTMLInputElement).value).toBe('2026-06-15');

      fireEvent.change(screen.getByLabelText(/trip title/i), {
        target: { value: 'Updated Trip' },
      });
      fireEvent.change(screen.getByLabelText(/description/i), {
        target: { value: 'Updated description' },
      });
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: '2026-06-02' },
      });
      fireEvent.change(screen.getByLabelText(/end date/i), {
        target: { value: '2026-06-16' },
      });

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/trips/trip-123', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'Updated Trip',
            description: 'Updated description',
            startDate: '2026-06-02',
            stopDate: '2026-06-16',
          }),
        });
      });
    });

    it('should call onCancel when cancel is clicked in edit mode', () => {
      const onCancel = vi.fn();

      render(
        <TripForm
          mode="edit"
          tripId="trip-123"
          initialData={{
            title: 'Summer Road Trip 2026',
            startDate: '2026-06-01',
            stopDate: '2026-06-15',
          }}
          onCancel={onCancel}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
