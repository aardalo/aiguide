/**
 * Unit tests for useTripsPolling.
 *
 * Regression target: performSync used to depend on the `lastSyncTime` state it
 * updates on every poll, which recreated the callback and re-ran the polling
 * effect (which immediately re-polls) — a runaway loop firing many requests per
 * second instead of one per interval.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTripsPolling } from '@/app/hooks/useTripsPolling';

describe('useTripsPolling', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchMock: any;

  beforeEach(() => {
    vi.useFakeTimers();
    let sync = 0;
    // Each response returns a DIFFERENT lastSyncTime — the trigger for the loop.
    fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        changes: [],
        lastSyncTime: new Date(2026, 0, 1, 0, 0, sync++).toISOString(),
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not re-poll immediately when lastSyncTime updates (no runaway loop)', async () => {
    renderHook(() => useTripsPolling('trip-1', undefined, 3000, true));

    // Flush microtasks/promise chains several times WITHOUT advancing past the
    // polling interval. A correct hook polls once (the initial sync); the buggy
    // one re-polls on every lastSyncTime change.
    for (let i = 0; i < 6; i++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    }

    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it('still polls once per interval', async () => {
    renderHook(() => useTripsPolling('trip-1', undefined, 3000, true));

    // Initial sync.
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    const afterInitial = fetchMock.mock.calls.length;

    // One interval later → exactly one more poll.
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(fetchMock.mock.calls.length).toBe(afterInitial + 1);
  });
});
