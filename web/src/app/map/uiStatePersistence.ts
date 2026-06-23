/**
 * Persistence of map-page UI state (open trip, map position, selected day) in
 * localStorage, scoped to the signed-in user.
 *
 * The userId is stamped on every save via {@link savePersistedState} so that a
 * later reload can verify the saved state belongs to the current user before
 * restoring it (see {@link canRestoreState}). Making userId a required argument
 * — rather than an optional field on the state object — guarantees no caller
 * can accidentally drop it (which previously broke trip restoration on reload).
 */

const STORAGE_KEY = 'tripPlanner:uiState';

export interface PersistedUiState {
  userId: string;
  tripId: string | null;
  mapLat: number;
  mapLng: number;
  mapZoom: number;
  selectedDayDestId: string | null;
}

/** The persisted fields a caller supplies; userId is added by savePersistedState. */
export type PersistableUiState = Omit<PersistedUiState, 'userId'>;

export function loadPersistedState(): PersistedUiState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedUiState;
  } catch {
    return null;
  }
}

export function savePersistedState(userId: string, state: PersistableUiState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, ...state }));
  } catch {
    // Ignore quota / serialization errors — persistence is best-effort.
  }
}

/**
 * True only when there is saved state, the current user is known, and the saved
 * state was written by that same user. Prevents restoring one user's open trip
 * into another user's session.
 */
export function canRestoreState(
  saved: PersistedUiState | null,
  userId: string | undefined,
): saved is PersistedUiState {
  return !!saved && !!userId && saved.userId === userId;
}
