/**
 * Authentication state store.
 *
 * Manages Matrix login/logout lifecycle, session persistence,
 * and sync state. Uses expo-secure-store for token storage
 * via the MatrixClient service layer.
 */

import { create } from 'zustand';

import type { MatrixLoginCredentials, MatrixSession } from '@/types/matrix';
import * as MatrixClient from '@/services/matrix/MatrixClient';

/** Sync connection status (mirrors SyncManager's SyncStatus) */
type SyncStatus = 'initial' | 'syncing' | 'synced' | 'reconnecting' | 'error' | 'stopped';

interface AuthState {
  /** Current user's Matrix ID (e.g., "@user:homeserver.com") */
  userId: string | null;
  /** Homeserver base URL */
  homeserverUrl: string | null;
  /** Matrix device ID for this session */
  deviceId: string | null;
  /** Whether the user is authenticated and has a valid session */
  isLoggedIn: boolean;
  /** Whether a login/restore operation is in progress */
  isLoading: boolean;
  /** Whether session restoration has been attempted */
  isSessionRestored: boolean;
  /** Current /sync loop status */
  syncStatus: SyncStatus;
  /** Human-readable error message from last login attempt */
  loginError: string | null;
}

interface AuthActions {
  /** Log in with Matrix username + password credentials */
  login: (credentials: MatrixLoginCredentials) => Promise<void>;
  /** Log out, clear session, and stop sync */
  logout: () => Promise<void>;
  /** Attempt to restore a persisted session from secure storage */
  restoreSession: () => Promise<boolean>;
  /** Update the sync loop status (called by SyncManager) */
  setSyncStatus: (status: SyncStatus) => void;
  /** Clear any displayed login error */
  clearLoginError: () => void;
}

const useAuthStore = create<AuthState & AuthActions>()((set, get) => ({
  // --- State ---
  userId: null,
  homeserverUrl: null,
  deviceId: null,
  isLoggedIn: false,
  isLoading: false,
  isSessionRestored: false,
  syncStatus: 'initial',
  loginError: null,

  // --- Actions ---

  login: async (credentials: MatrixLoginCredentials) => {
    set({ isLoading: true, loginError: null });

    try {
      const session: MatrixSession = await MatrixClient.login(credentials);

      set({
        userId: session.userId,
        homeserverUrl: session.homeserverUrl,
        deviceId: session.deviceId,
        isLoggedIn: true,
        isLoading: false,
        loginError: null,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Login failed. Please check your credentials.';

      set({
        isLoading: false,
        isLoggedIn: false,
        loginError: message,
      });
    }
  },

  logout: async () => {
    set({ isLoading: true });

    try {
      await MatrixClient.logout();
    } catch {
      // Ignore — session might already be invalid
    }

    set({
      userId: null,
      homeserverUrl: null,
      deviceId: null,
      isLoggedIn: false,
      isLoading: false,
      isSessionRestored: false,
      syncStatus: 'stopped',
      loginError: null,
    });
  },

  restoreSession: async () => {
    set({ isLoading: true });

    try {
      const session = await MatrixClient.restoreSession();

      if (session) {
        set({
          userId: session.userId,
          homeserverUrl: session.homeserverUrl,
          deviceId: session.deviceId,
          isLoggedIn: true,
          isLoading: false,
          isSessionRestored: true,
        });
        return true;
      }

      set({ isLoading: false, isSessionRestored: true });
      return false;
    } catch {
      set({ isLoading: false, isSessionRestored: true });
      return false;
    }
  },

  setSyncStatus: (status: SyncStatus) => {
    set({ syncStatus: status });
  },

  clearLoginError: () => {
    set({ loginError: null });
  },
}));

export { useAuthStore };
export type { SyncStatus };
