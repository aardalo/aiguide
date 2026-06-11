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

/**
 * Helper: create a successful fetch response.
 */
function ok(data: unknown) {
  return { ok: true, json: async () => data };
}

/**
 * Helper: create a failed fetch response.
 */
function fail(status: number, data: unknown) {
  return { ok: false, status, json: async () => data };
}

/**
 * The component's init() fires 4 parallel fetches then, when no segments
 * exist, calls generateRoutes() which fires a POST to /api/route-segments.
 *
 * Parallel:
 *   1. GET /api/daily-destinations?tripId=...
 *   2. GET /api/route-segments?tripId=...
 *   3. GET /api/settings
 *   4. GET /api/branches?tripId=...
 *
 * Then if segments are empty:
 *   5. POST /api/route-segments  (main branch)
 */
function mockInitFetches(
  destinations: DailyDestinationResponse[] = [],
  segments: unknown[] = [],
) {
  mockFetch
    .mockResolvedValueOnce(ok(destinations))   // 1. daily-destinations
    .mockResolvedValueOnce(ok(segments))        // 2. route-segments GET
    .mockResolvedValueOnce(ok([]))              // 3. settings
    .mockResolvedValueOnce(ok([]))              // 4. branches
    // 5. POST route-segments (auto-generate when segments empty)
    .mockResolvedValueOnce(fail(422, { code: 'insufficient_destinations' }));
}

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
      isLayover: false,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    mockFetch.mockReset();
    vi.clearAllMocks();
  });

  it('should render daily itinerary title', async () => {
    mockInitFetches();

    render(<DailyDestinations trip={mockTrip} />);

    expect(screen.getByText('Daily Itinerary')).toBeInTheDocument();
  });

  it('should fetch destinations on mount', async () => {
    mockInitFetches();

    render(<DailyDestinations trip={mockTrip} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/daily-destinations?tripId=${mockTrip.id}`
      );
    });
  });

  it('should display all trip dates', async () => {
    mockInitFetches();

    render(<DailyDestinations trip={mockTrip} />);

    await waitFor(() => {
      // Should show 3 days (June 1, 2, 3)
      expect(screen.getByText(/Jun 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Jun 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Jun 3/i)).toBeInTheDocument();
    });
  });

  it('should display existing destinations', async () => {
    mockInitFetches(mockDestinations);

    render(<DailyDestinations trip={mockTrip} />);

    await waitFor(() => {
      expect(screen.getByText('Paris')).toBeInTheDocument();
      expect(screen.getByText('City of lights')).toBeInTheDocument();
    });
  });

  it('should show "No destination set" for days without destinations', async () => {
    mockInitFetches(mockDestinations);

    render(<DailyDestinations trip={mockTrip} />);

    await waitFor(() => {
      const noDestTexts = screen.getAllByText('No destination set');
      expect(noDestTexts.length).toBe(2); // Days 2 and 3
    });
  });

  it('should show add destination button', async () => {
    mockInitFetches();

    render(<DailyDestinations trip={mockTrip} />);

    await waitFor(() => {
      expect(screen.getByText('+ Add Destination')).toBeInTheDocument();
    });
  });

  it('should show add form when per-day add button is clicked', async () => {
    mockInitFetches();

    const user = userEvent.setup();
    render(<DailyDestinations trip={mockTrip} />);

    // Wait for days to render — each empty day has a per-day "Add destination" icon
    await waitFor(() => {
      expect(screen.getAllByTitle('Add destination').length).toBeGreaterThan(0);
    });

    // Click the first per-day add button (this sets addForDate to the day's date)
    await user.click(screen.getAllByTitle('Add destination')[0]);

    await waitFor(() => {
      expect(screen.getByText('Add Destination', { selector: 'h4' })).toBeInTheDocument();
      expect(screen.getByLabelText(/Describe or search/i)).toBeInTheDocument();
    });
  });

  it('should show edit and delete buttons for existing destinations', async () => {
    mockInitFetches(mockDestinations);

    render(<DailyDestinations trip={mockTrip} />);

    await waitFor(() => {
      expect(screen.getByTitle('Edit destination')).toBeInTheDocument();
      expect(screen.getByTitle('Delete destination')).toBeInTheDocument();
    });
  });

  it('should call delete API when delete button is clicked', async () => {
    mockInitFetches(mockDestinations);

    const user = userEvent.setup();
    render(<DailyDestinations trip={mockTrip} />);

    await waitFor(() => {
      expect(screen.getByTitle('Delete destination')).toBeInTheDocument();
    });

    // After clicking delete, handleDelete fires:
    //   DELETE /api/daily-destinations/:id
    //   GET /api/daily-destinations (fetchDestinations)
    //   POST /api/route-segments (generateRoutes — main)
    mockFetch
      .mockResolvedValueOnce(ok({}))                                         // DELETE
      .mockResolvedValueOnce(ok([]))                                         // GET destinations
      .mockResolvedValueOnce(fail(422, { code: 'insufficient_destinations' })); // POST route-segments

    await user.click(screen.getByTitle('Delete destination'));

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
      mockInitFetches();

      const user = userEvent.setup();
      render(<DailyDestinations trip={mockTrip} />);

      await waitFor(() => {
        expect(screen.getAllByTitle('Add destination').length).toBeGreaterThan(0);
      });

      await user.click(screen.getAllByTitle('Add destination')[0]);

      // Verify all form fields are present
      await waitFor(() => {
        expect(screen.getByLabelText(/Date/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Describe or search/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Notes/i)).toBeInTheDocument();
      });
    });

    it('should cancel form when cancel button is clicked', async () => {
      mockInitFetches();

      const user = userEvent.setup();
      render(<DailyDestinations trip={mockTrip} />);

      await waitFor(() => {
        expect(screen.getAllByTitle('Add destination').length).toBeGreaterThan(0);
      });

      await user.click(screen.getAllByTitle('Add destination')[0]);

      await waitFor(() => {
        expect(screen.getByText('Add Destination', { selector: 'h4' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Cancel/i }));

      await waitFor(() => {
        expect(screen.queryByText('Add Destination', { selector: 'h4' })).not.toBeInTheDocument();
      });
    });

    it('should validate required fields', async () => {
      mockInitFetches();

      const user = userEvent.setup();
      render(<DailyDestinations trip={mockTrip} />);

      await waitFor(() => {
        expect(screen.getAllByTitle('Add destination').length).toBeGreaterThan(0);
      });

      await user.click(screen.getAllByTitle('Add destination')[0]);

      await waitFor(() => {
        expect(screen.getByLabelText(/Describe or search/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/Describe or search/i);

      // Verify input has required attribute
      expect(nameInput).toHaveAttribute('required');

      // Form should not allow submission with empty required field
      expect(nameInput).toHaveValue('');
    });
  });
});
