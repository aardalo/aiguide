/**
 * TripList Component Tests
 * Task: TASK-006
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import TripList from '@/app/map/components/TripList';
import type { TripResponse } from '@/lib/schemas/trip';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

const mockTrips: TripResponse[] = [
  {
    id: 'trip1',
    title: 'Summer Road Trip',
    description: 'A fun trip across the country',
    planMode: false,
    startDate: '2026-06-01',
    stopDate: '2026-06-15',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'trip2',
    title: 'Weekend Getaway',
    description: null,
    planMode: false,
    startDate: '2026-04-10',
    stopDate: '2026-04-12',
    createdAt: '2026-03-02T14:30:00Z',
    updatedAt: '2026-03-02T14:30:00Z',
  },
];

describe('TripList Component', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching trips', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<TripList />);
      
      expect(screen.getByText(/loading trips/i)).toBeInTheDocument();
      // Check for spinner by className since it doesn't have role="status"
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch trips from API on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrips,
      });

      render(<TripList />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/trips');
      });
    });

    it('should refetch trips when refreshTrigger changes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTrips,
      });

      const { rerender } = render(<TripList refreshTrigger={0} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      rerender(<TripList refreshTrigger={1} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should display trips after successful fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrips,
      });

      render(<TripList />);

      await waitFor(() => {
        expect(screen.getByText('Summer Road Trip')).toBeInTheDocument();
        expect(screen.getByText('Weekend Getaway')).toBeInTheDocument();
      });
    });

    it('should display trip count', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrips,
      });

      render(<TripList />);

      await waitFor(() => {
        expect(screen.getByText(/your trips \(2\)/i)).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no trips exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(<TripList />);

      await waitFor(() => {
        expect(screen.getByText(/no trips yet/i)).toBeInTheDocument();
        expect(screen.getByText(/create your first trip/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      render(<TripList />);

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch trips/i)).toBeInTheDocument();
      });
    });

    it('should show error message on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<TripList />);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<TripList />);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrips,
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Summer Road Trip')).toBeInTheDocument();
      });
    });
  });

  describe('Trip Display', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrips,
      });
    });

    it('should display trip title', async () => {
      render(<TripList />);

      await waitFor(() => {
        expect(screen.getByText('Summer Road Trip')).toBeInTheDocument();
      });
    });

    it('should display trip description when present', async () => {
      render(<TripList />);

      await waitFor(() => {
        expect(screen.getByText(/a fun trip across the country/i)).toBeInTheDocument();
      });
    });

    it('should not show description section when null', async () => {
      render(<TripList />);

      await waitFor(() => {
        const trip2Title = screen.getByText('Weekend Getaway');
        const trip2Container = trip2Title.closest('div');
        expect(trip2Container).not.toHaveTextContent('null');
      });
    });

    it('should display formatted dates', async () => {
      render(<TripList />);

      await waitFor(() => {
        expect(screen.getByText(/jun 1, 2026/i)).toBeInTheDocument();
        expect(screen.getByText(/jun 15, 2026/i)).toBeInTheDocument();
      });
    });

    it('should display trip duration in days', async () => {
      render(<TripList />);

      await waitFor(() => {
        expect(screen.getByText(/15 days/i)).toBeInTheDocument();
        expect(screen.getByText(/3 days/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrips,
      });
    });

    it('should call onTripSelect when trip is clicked', async () => {
      const onTripSelect = vi.fn();
      render(<TripList onTripSelect={onTripSelect} />);

      await waitFor(() => {
        expect(screen.getByText('Summer Road Trip')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Summer Road Trip'));

      expect(onTripSelect).toHaveBeenCalledWith(mockTrips[0]);
    });

    it('should call onTripEdit when edit button is clicked', async () => {
      const onTripEdit = vi.fn();
      render(<TripList onTripEdit={onTripEdit} />);

      await waitFor(() => {
        expect(screen.getByText('Summer Road Trip')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);

      expect(onTripEdit).toHaveBeenCalledWith(mockTrips[0]);
    });

    it('should call onTripDelete when delete button is clicked', async () => {
      const onTripDelete = vi.fn();
      render(<TripList onTripDelete={onTripDelete} />);

      await waitFor(() => {
        expect(screen.getByText('Summer Road Trip')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(onTripDelete).toHaveBeenCalledWith(mockTrips[0]);
    });

    it('should not show edit/delete buttons when callbacks not provided', async () => {
      render(<TripList />);

      await waitFor(() => {
        expect(screen.getByText('Summer Road Trip')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('should stop propagation when action button clicked', async () => {
      const onTripSelect = vi.fn();
      const onTripEdit = vi.fn();
      render(<TripList onTripSelect={onTripSelect} onTripEdit={onTripEdit} />);

      await waitFor(() => {
        expect(screen.getByText('Summer Road Trip')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);

      expect(onTripEdit).toHaveBeenCalledWith(mockTrips[0]);
      expect(onTripSelect).not.toHaveBeenCalled(); // Should not trigger trip select
    });
  });
});
