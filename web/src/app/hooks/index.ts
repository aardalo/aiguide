/**
 * Trip Planner Hooks
 * Location: src/app/hooks/index.ts
 * 
 * Central export for all custom hooks used in the application.
 */

export { useDeviceIdentity } from './useDeviceIdentity';
export type { Device, UseDeviceIdentityReturn } from './useDeviceIdentity';

export { useTripsPolling } from './useTripsPolling';
export type { ChangeItem, UseTripsPollingReturn } from './useTripsPolling';

export { useOptimisticUpdate } from './useOptimisticUpdate';
export type { OptimisticUpdateOptions, UseOptimisticUpdateReturn } from './useOptimisticUpdate';
