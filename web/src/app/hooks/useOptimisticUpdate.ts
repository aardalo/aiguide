/**
 * Optimistic Update Hook
 * Location: src/app/hooks/useOptimisticUpdate.ts
 * 
 * Provides optimistic updates for mutations while syncing changes in the background.
 * Shows changes immediately to the user, then confirms or rolls back based on API response.
 */

import { useCallback, useRef, useState } from 'react';

export interface OptimisticUpdateOptions<T> {
  onMutate: (data: T) => Promise<unknown>; // API call function
  onSettled?: (success: boolean, error?: string) => void; // Called after sync completes
  onError?: (error: string) => void; // Called on error
}

export interface UseOptimisticUpdateReturn<T> {
  optimisticUpdate: (data: T) => Promise<void>;
  isUpdating: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * useOptimisticUpdate Hook
 * 
 * Enables optimistic UI updates with background synchronization.
 * 
 * Usage:
 * ```
 * const { optimisticUpdate, isUpdating, error } = useOptimisticUpdate({
 *   onMutate: async (poi) => {
 *     const response = await fetch('/api/daily-pois', {
 *       method: 'POST',
 *       body: JSON.stringify({ ...poi, deviceId })
 *     });
 *     return response.json();
 *   },
 *   onSettled: (success) => {
 *     if (success) {
 *       toast.success('POI saved');
 *     } else {
 *       toast.error('Failed to save POI');
 *     }
 *   }
 * });
 * 
 * // In event handler:
 * const handleSavePOI = async (poi) => {
 *   setLocalPOI(poi); // Update UI immediately (optimistic)
 *   await optimisticUpdate(poi); // Sync in background
 * };
 * ```
 * 
 * Parameters:
 * - onMutate: Async function that performs the API mutation. Should throw on error.
 * - onSettled: Called when mutation completes (success or error)
 * - onError: Called specifically on error
 * 
 * Returns:
 * - optimisticUpdate: Function to queue an optimistic update
 * - isUpdating: Whether an update is currently in progress
 * - error: Error message if the last mutation failed
 * - clearError: Function to clear the error state
 */
export function useOptimisticUpdate<T>(
  options: OptimisticUpdateOptions<T>
): UseOptimisticUpdateReturn<T> {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef<Set<string>>(new Set());

  const optimisticUpdate = useCallback(
    async (data: T) => {
      const mutationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Prevent duplicate submissions
      if (inFlightRef.current.has(mutationId)) {
        console.warn('[useOptimisticUpdate] Duplicate mutation attempt detected');
        return;
      }

      inFlightRef.current.add(mutationId);
      setIsUpdating(true);
      setError(null);

      try {
        // Execute the mutation
        await options.onMutate(data);

        // Success
        options.onSettled?.(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error during update';
        console.error('[useOptimisticUpdate] Mutation error:', message);
        
        setError(message);
        options.onError?.(message);
        options.onSettled?.(false, message);
      } finally {
        inFlightRef.current.delete(mutationId);
        setIsUpdating(false);
      }
    },
    [options]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    optimisticUpdate,
    isUpdating,
    error,
    clearError,
  };
}

