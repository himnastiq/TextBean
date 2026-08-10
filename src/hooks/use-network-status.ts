/**
 * useNetworkStatus — monitors device network connectivity.
 *
 * Exposes `isConnected` and `isInternetReachable` state so components
 * can show offline banners and the Matrix sync layer can trigger
 * reconnection when connectivity is restored.
 *
 * Uses React Native's built-in NetInfo-compatible event system via
 * the `react-native` AppState API combined with periodic fetch probes,
 * since we don't have @react-native-community/netinfo in the dependency list.
 *
 * Implementation: Uses a lightweight connectivity probe approach that
 * works without external dependencies.
 */

import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

interface NetworkStatus {
  /** Whether the device has any network connection */
  isConnected: boolean;
  /** Whether the internet is actually reachable (probe succeeded) */
  isInternetReachable: boolean;
  /** Timestamp of the last successful connectivity check */
  lastCheckedAt: number | null;
}

/** Probe URL — lightweight, widely available */
const PROBE_URL = 'https://clients3.google.com/generate_204';
const PROBE_TIMEOUT_MS = 5000;
const POLL_INTERVAL_MS = 30_000; // Check every 30s while foregrounded

/**
 * Attempt a lightweight connectivity probe.
 * Returns true if the fetch succeeds within the timeout.
 */
async function probeConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    const response = await fetch(PROBE_URL, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok || response.status === 204;
  } catch {
    return false;
  }
}

/**
 * Hook that tracks device network connectivity status.
 *
 * @returns Current network status with `isConnected` and `isInternetReachable`
 */
function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true, // optimistic default
    isInternetReachable: true,
    lastCheckedAt: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runProbe = async () => {
    const reachable = await probeConnectivity();
    setStatus({
      isConnected: reachable,
      isInternetReachable: reachable,
      lastCheckedAt: Date.now(),
    });
  };

  useEffect(() => {
    // Initial probe
    runProbe();

    // Start polling while app is active
    intervalRef.current = setInterval(runProbe, POLL_INTERVAL_MS);

    // Listen for app state changes — re-probe on foreground
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        runProbe();
        // Restart polling
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(runProbe, POLL_INTERVAL_MS);
      } else {
        // Pause polling when backgrounded
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      subscription.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return status;
}

export { useNetworkStatus, type NetworkStatus };
