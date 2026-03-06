/**
 * DailyDestinations Component Unit Tests
 * Location: tests/unit/DailyDestinations.test.tsx
 * Task: STORY-004
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DailyDestinations from '@/app/map/components/DailyDestinations';
import type { TripResponse, DailyDestinationResponse } from '@/lib/schemas/trip';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock confirm
global.confirm = vi.fn(() => true);

describe('DailyDestinations Component', () => {
  const mockTrip: TripResponse = {
    id: 'test-trip-id',
    title: 'Test Trip',
    description: 'Test Description',
    planMode: true,
    startDate: '2026-06-01T00:00:00.000Z',
    stopDate: '2026-06-03T00:00:00.000Z',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  };

  const mockDestinations: DailyDestinationResponse[] = [
    {
      id: 'dest-1',
      tripId: 'test-trip-id',
      dayDate: '2026-06-01',
      name: 'Paris',
      municipality: null,
      latitude: 48.8566,
      longitude: 2.3522,
      notes: 'City of lights',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    mockFetch.mockReset();
    vi.clearAllMocks();
  });

  it('should render daily itinerary title', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<DailyDestinations trip={mockTrip} />);

    expect(screen.getByText('Daily Itinerary')).toBeInTheDocument();
  });

  it('should fetch destinations on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDestinations,
    });

    render(<DailyDestinations trip={mockTrip} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/daily-destinations?tripId=${mockTrip.id}`
      );
    });
  });

  it('should display all trip dates', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<DailyDestinations trip={mockTrip} />);

    await waitFor(() => {
      // Should show 3 days (June 1, 2, 3)
      expect(screen.getByText(/Jun 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Jun 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Jun 3/i)).toBeInTheDocument();
    });
  });

  it('should display existing destinations', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockDestinations })
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // route-segments GET
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // settings
      .mockResolvedValueOnce({ ok: false, json: async () => ({ code: 'insufficient_destinations' }) }); // route-segments POST (auto-generate)

    render(<DailyDestinations trip={mockTrip} />);

    await waitFor(() => {
      expect(screen.getByText('Paris')).toBeInTheDocument();
      expect(screen.getByText('City of lights')).toBeInTheDocument();
    });
  });

  it('should show "No destination set" for days without destinations', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockDestinations })
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // route-segments GET
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // settings
      .mockResolvedValueOnce({ ok: false, json: async () => ({ code: 'insufficient_destinations' }) }); // route-segments POST (auto-generate)

    render(<DailyDestinations trip={mockTrip} />);

    await waitFor(() => {
      const noDestTexts = screen.getAllByText('No destination set');
      expect(noDestTexts.length).toBe(2); // Days 2 and 3
    });
  });

  it('should show add destination button', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<DailyDestinations trip={mockTrip} />);

    await waitFor(() => {
      expect(screen.getByText('+ Add Destination')).toBeInTheDocument();
    });
  });

  it('should show add form when add button is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] }); // route-segments

    const user = userEvent.setup();
    render(<DailyDestinations trip={mockTrip} />);

    await waitFor(() => {
      expect(screen.getByText('+ Add Destination')).toBeInTheDocument();
    });

    await user.click(screen.getByText('+ Add Destination'));

    await waitFor(() => {
      expect(screen.getByText('Add Destination', { selector: 'h4' })).toBeInTheDocument();
      expect(screen.getByLabelText(/^Destination/i)).toBeInTheDocument();
    });
  });

  it('should show edit and delete buttons for existing destinations', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockDestinations })
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // route-segments GET
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // settings
      .mockResolvedValueOnce({ ok: false, json: async () => ({ code: 'insufficient_destinations' }) }); // route-segments POST (auto-generate)

    render(<DailyDestinations trip={mockTrip} />);

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('should call delete API when delete button is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDestinations,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    const user = userEvent.setup();
    render(<DailyDestinations trip={mockTrip} />);

    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/daily-destinations/${mockDestinations[0].id}`,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  it('should handle fetch error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<DailyDestinations trip={mockTrip} />);

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  describe('Destination Form', () => {
    it('should render form with all required fields', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({ ok: true, json: async () => [] }); // route-segments

      const user = userEvent.setup();
      render(<DailyDestinations trip={mockTrip} />);

      await waitFor(() => {
        expect(screen.getByText('+ Add Destination')).toBeInTheDocument();
      });

      await user.click(screen.getByText('+ Add Destination'));

      // Verify all form fields are present
      await waitFor(() => {
        expect(screen.getByLabelText(/Date/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Destination/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Notes/i)).toBeInTheDocument();
      });
    });

    it('should cancel form when cancel button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const user = userEvent.setup();
      render(<DailyDestinations trip={mockTrip} />);

      await waitFor(() => {
        expect(screen.getByText('+ Add Destination')).toBeInTheDocument();
      });

      await user.click(screen.getByText('+ Add Destination'));

      await waitFor(() => {
        expect(screen.getByText('Add Destination', { selector: 'h4' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Cancel/i }));

      await waitFor(() => {
        expect(screen.queryByText('Add Destination', { selector: 'h4' })).not.toBeInTheDocument();
      });
    });

    it('should validate required fields', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({ ok: true, json: async () => [] }); // route-segments

      const user = userEvent.setup();
      render(<DailyDestinations trip={mockTrip} />);

      await waitFor(() => {
        expect(screen.getByText('+ Add Destination')).toBeInTheDocument();
      });

      await user.click(screen.getByText('+ Add Destination'));

      await waitFor(() => {
        expect(screen.getByLabelText(/^Destination/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/^Destination/i);
      
      // Verify input has required attribute
      expect(nameInput).toHaveAttribute('required');
      
      // Form should not allow submission with empty required field
      expect(nameInput).toHaveValue('');
    });
  });
});
