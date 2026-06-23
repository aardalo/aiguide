/**
 * Unit tests for map UI-state persistence (localStorage).
 *
 * Regression target: the map `moveend` and day-select handlers used to persist
 * state WITHOUT the userId, which then failed the restore guard on reload — so
 * the open trip (and its POIs/destinations) never reloaded. The persistence
 * helper now stamps the userId for every save so this can't happen.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadPersistedState,
  savePersistedState,
  canRestoreState,
} from '@/app/map/uiStatePersistence';

describe('uiStatePersistence', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips the full state including userId', () => {
    savePersistedState('user-1', {
      tripId: 'trip-1',
      mapLat: 60,
      mapLng: 8,
      mapZoom: 5,
      selectedDayDestId: null,
    });

    expect(loadPersistedState()).toEqual({
      userId: 'user-1',
      tripId: 'trip-1',
      mapLat: 60,
      mapLng: 8,
      mapZoom: 5,
      selectedDayDestId: null,
    });
  });

  it('stamps userId when persisting only a map move (regression)', () => {
    savePersistedState('user-1', {
      tripId: 'trip-1',
      mapLat: 1,
      mapLng: 2,
      mapZoom: 3,
      selectedDayDestId: 'day-9',
    });

    expect(loadPersistedState()?.userId).toBe('user-1');
  });

  it('returns null when nothing is stored', () => {
    expect(loadPersistedState()).toBeNull();
  });

  describe('canRestoreState', () => {
    const save = (userId: string) =>
      savePersistedState(userId, {
        tripId: 'trip-1',
        mapLat: 0,
        mapLng: 0,
        mapZoom: 0,
        selectedDayDestId: null,
      });

    it('allows restore when saved userId matches current user', () => {
      save('user-1');
      expect(canRestoreState(loadPersistedState(), 'user-1')).toBe(true);
    });

    it('rejects restore when saved state belongs to a different user', () => {
      save('user-2');
      expect(canRestoreState(loadPersistedState(), 'user-1')).toBe(false);
    });

    it('rejects restore when there is no saved state', () => {
      expect(canRestoreState(null, 'user-1')).toBe(false);
    });

    it('rejects restore when the current user is unknown', () => {
      save('user-1');
      expect(canRestoreState(loadPersistedState(), undefined)).toBe(false);
    });
  });
});
