/**
 * TripDetail Component Tests
 * Task: TASK-006
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import TripDetail from '@/app/map/components/TripDetail';
import type { TripResponse } from '@/lib/schemas/trip';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

const mockTrip: TripResponse = {
  id: 'trip123',
  title: 'Summer Road Trip 2026',
  description: 'A wonderful adventure across the western United States, visiting national parks and scenic routes.',
  planMode: false,
  startDate: '2026-06-01',
  stopDate: '2026-06-15',
  createdAt: '2026-03-01T10:30:00Z',
  updatedAt: '2026-03-02T15:45:00Z',
};

describe('TripDetail Component', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('No Trip Selected State', () => {
    it('should show "no trip selected" state when tripId is null', () => {
      render(<TripDetail tripId={null} />);

      expect(screen.getByText(/select a trip from the list/i)).toBeInTheDocument();
    });

    it('should not fetch trip when tripId is null', () => {
      render(<TripDetail tripId={null} />);

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching trip', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<TripDetail tripId="trip123" />);
      
      expect(screen.getByText(/loading trip details/i)).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch trip from API when tripId is provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrip,
      });

      render(<TripDetail tripId="trip123" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/trips/trip123');
      });
    });

    it('should refetch trip when tripId changes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTrip,
      });

      const { rerender } = render(<TripDetail tripId="trip1" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/trips/trip1');
      });

      rerender(<TripDetail tripId="trip2" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/trips/trip2');
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should clear trip data when tripId changes to null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrip,
      });

      const { rerender } = render(<TripDetail tripId="trip123" />);

      await waitFor(() => {
        expect(screen.getByText('Summer Road Trip 2026')).toBeInTheDocument();
      });

      rerender(<TripDetail tripId={null} />);

      await waitFor(() => {
        expect(screen.queryByText('Summer Road Trip 2026')).not.toBeInTheDocument();
        expect(screen.getByText(/select a trip from the list/i)).toBeInTheDocument();
      });
    });
  });

  describe('Trip Display', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrip,
      });
    });

    it('should display trip title', async () => {
      render(<TripDetail tripId="trip123" />);

      await waitFor(() => {
        expect(screen.getByText('Summer Road Trip 2026')).toBeInTheDocument();
      });
    });

    it('should display trip description', async () => {
      render(<TripDetail tripId="trip123" />);

      await waitFor(() => {
        expect(screen.getByText(/a wonderful adventure across the western united states/i)).toBeInTheDocument();
      });
    });

    it('should not show description section when null', async () => {
      const tripWithoutDescription = { ...mockTrip, description: null };
       mockFetch.mockReset();
       mockFetch.mockResolvedValue({
        ok: true,
        json: async () => tripWithoutDescription,
      });

      render(<TripDetail tripId="trip123" />);

      await waitFor(() => {
        expect(screen.getByText('Summer Road Trip 2026')).toBeInTheDocument();
      });

        // Should not have description text, but should have the "no trip" message if description is missing
        const descriptionElement = screen.queryByText(/a wonderful adventure/i);
        expect(descriptionElement).not.toBeInTheDocument();
    });

    it('should display start date', async () => {
      render(<TripDetail tripId="trip123" />);

      await waitFor(() => {
          expect(screen.getByText(/monday, june 1, 2026/i)).toBeInTheDocument();
      });
    });

    it('should display end date', async () => {
      render(<TripDetail tripId="trip123" />);

      await waitFor(() => {
        expect(screen.getByText(/monday, june 15, 2026/i)).toBeInTheDocument();
      });
    });

    it('should display trip duration', async () => {
      render(<TripDetail tripId="trip123" />);

      await waitFor(() => {
        expect(screen.getByText(/15 days/i)).toBeInTheDocument();
      });
    });

    it('should display created timestamp', async () => {
      render(<TripDetail tripId="trip123" />);

      await waitFor(() => {
        expect(screen.getByText(/mar 1, 2026/i)).toBeInTheDocument();
      });
    });

    it('should display updated timestamp', async () => {
      render(<TripDetail tripId="trip123" />);

      await waitFor(() => {
        expect(screen.getByText(/mar 2, 2026/i)).toBeInTheDocument();
      });
    });

    it('should display trip ID', async () => {
      render(<TripDetail tripId="trip123" />);

      await waitFor(() => {
        expect(screen.getByText('trip123')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message when trip not found (404)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      render(<TripDetail tripId="nonexistent" />);

      await waitFor(() => {
          expect(screen.getByText('Trip not found')).toBeInTheDocument();
      });
    });

    it('should show error message when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      render(<TripDetail tripId="trip123" />);

      await waitFor(() => {
          expect(screen.getByText('Failed to fetch trip: Internal Server Error')).toBeInTheDocument();
      });
    });

    it('should show error message on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<TripDetail tripId="trip123" />);

      await waitFor(() => {
          expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      // First call fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<TripDetail tripId="trip123" />);

      await waitFor(() => {
          expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrip,
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Summer Road Trip 2026')).toBeInTheDocument();
      });
    });

    it('should show back button in error state when onBack provided', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const onBack = vi.fn();
      render(<TripDetail tripId="trip123" onBack={onBack} />);

      await waitFor(() => {
            expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /go back/i });
      fireEvent.click(backButton);

      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('User Interactions', () => {
    it('should call onBack when back button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrip,
      });

      const onBack = vi.fn();
      render(<TripDetail tripId="trip123" onBack={onBack} />);

      await waitFor(() => {
        expect(screen.getByText('Summer Road Trip 2026')).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /back to list/i });
      fireEvent.click(backButton);

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('should not show back button when onBack not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrip,
      });

      render(<TripDetail tripId="trip123" />);

      await waitFor(() => {
        expect(screen.getByText('Summer Road Trip 2026')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /back to list/i })).not.toBeInTheDocument();
    });

    it('should call onEdit when edit button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrip,
      });

      const onEdit = vi.fn();
      render(<TripDetail tripId="trip123" onEdit={onEdit} />);

      await waitFor(() => {
        expect(screen.getByText('Summer Road Trip 2026')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit trip/i });
      fireEvent.click(editButton);

      expect(onEdit).toHaveBeenCalledWith(mockTrip);
    });

    it('should call onDelete when delete button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrip,
      });

      const onDelete = vi.fn();
      render(<TripDetail tripId="trip123" onDelete={onDelete} />);

      await waitFor(() => {
        expect(screen.getByText('Summer Road Trip 2026')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete trip/i });
      fireEvent.click(deleteButton);

      expect(onDelete).toHaveBeenCalledWith(mockTrip);
    });

    it('should not show action buttons when callbacks not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrip,
      });

      render(<TripDetail tripId="trip123" />);

      await waitFor(() => {
        expect(screen.getByText('Summer Road Trip 2026')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /edit trip/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete trip/i })).not.toBeInTheDocument();
    });
  });
});
