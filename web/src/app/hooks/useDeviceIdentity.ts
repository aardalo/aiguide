/**
 * Device Identity Hook
 * Location: src/app/hooks/useDeviceIdentity.ts
 * 
 * Manages device registration and identification across sessions.
 * Uses localStorage to persist device ID and sessionStorage for session-specific data.
 */

import { useEffect, useState } from 'react';

interface Device {
  id: string;
  sessionId: string;
  name: string;
  lastSeenAt: string;
  createdAt: string;
}

interface UseDeviceIdentityReturn {
  deviceId: string | null;
  deviceName: string | null;
  isLoading: boolean;
  error: string | null;
  refreshDevice: () => Promise<void>;
}

const DEVICE_ID_STORAGE_KEY = 'trip-planner-device-id';
const SESSION_ID_STORAGE_KEY = 'trip-planner-session-id';
const DEVICE_NAME_STORAGE_KEY = 'trip-planner-device-name';

/**
 * Generate or retrieve a unique session ID for this device
 */
function getOrCreateSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_ID_STORAGE_KEY);
  
  if (!sessionId) {
    // Generate a unique session ID using timestamp + random string
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
  }
  
  return sessionId;
}

/**
 * Detect device name from user agent
 */
function detectDeviceName(): string {
  if (typeof window === 'undefined') {
    return 'Unknown Device';
  }

  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  // Detect OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('iPhone')) os = 'iOS';
  else if (ua.includes('iPad')) os = 'iPadOS';
  else if (ua.includes('Android')) os = 'Android';

  // Detect Browser
  if (ua.includes('Chrome') && !ua.includes('Chromium')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edge')) browser = 'Edge';
  else if (ua.includes('Opera')) browser = 'Opera';

  return `${browser} on ${os}`;
}

/**
 * useDeviceIdentity Hook
 * 
 * Registers the current device and retrieves its unique ID.
 * On first load, generates a session ID and registers with the backend.
 * On subsequent loads in the same session, reuses the session ID.
 * 
 * Returns:
 * - deviceId: Unique device ID from the server
 * - deviceName: Human-readable device name (e.g., "Chrome on Linux")
 * - isLoading: Whether registration is in progress
 * - error: Any error that occurred during registration
 * - refreshDevice: Manual refresh function to re-register the device
 */
export function useDeviceIdentity(): UseDeviceIdentityReturn {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const registerDevice = async () => {
    try {
      setError(null);
      const sessionId = getOrCreateSessionId();
      const detectedName = detectDeviceName();
      
      // Check if we already have a cached device ID
      const cachedDeviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
      const cachedDeviceName = localStorage.getItem(DEVICE_NAME_STORAGE_KEY);
      
      if (cachedDeviceId && cachedDeviceName) {
        setDeviceId(cachedDeviceId);
        setDeviceName(cachedDeviceName);
        
        // Optionally, still call the API to update lastSeenAt
        // This is a background update, so we don't block on it
        fetch('/api/devices/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, name: detectedName }),
        }).catch((err) => console.warn('[useDeviceIdentity] Background sync failed:', err));
        
        setIsLoading(false);
        return;
      }

      // Register device with backend
      const response = await fetch('/api/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, name: detectedName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to register device');
      }

      const device: Device = await response.json();
      
      // Cache device info locally
      localStorage.setItem(DEVICE_ID_STORAGE_KEY, device.id);
      localStorage.setItem(DEVICE_NAME_STORAGE_KEY, device.name);
      
      setDeviceId(device.id);
      setDeviceName(device.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error during device registration';
      console.error('[useDeviceIdentity] Error:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Register device on mount
    registerDevice();
  }, []);

  return {
    deviceId,
    deviceName,
    isLoading,
    error,
    refreshDevice: registerDevice,
  };
}

export type { Device, UseDeviceIdentityReturn };
