/**
 * Notification preferences and state store.
 *
 * Manages push notification registration, per-room mute settings,
 * and global notification preferences. The actual notification
 * display is handled by NotificationService (Phase 7).
 */

import { create } from 'zustand';

interface NotificationPreferences {
  /** Whether push notifications are enabled globally */
  pushEnabled: boolean;
  /** Whether to show message preview text in notifications */
  showMessagePreview: boolean;
  /** Whether to show in-app notification banners for foreground messages */
  showInAppBanners: boolean;
  /** Whether to play a sound on notification */
  soundEnabled: boolean;
  /** Whether to vibrate on notification */
  vibrationEnabled: boolean;
}

interface NotificationState {
  /** Expo Push Token (registered with the Matrix homeserver) */
  pushToken: string | null;
  /** Whether push permission has been granted by the OS */
  permissionGranted: boolean;
  /** Whether we've checked the permission status */
  permissionChecked: boolean;
  /** Global notification preferences */
  preferences: NotificationPreferences;
  /** Set of room IDs that are muted (no notifications) */
  mutedRoomIds: Set<string>;
}

interface NotificationActions {
  /** Set the Expo Push Token after registration */
  setPushToken: (token: string) => void;
  /** Update permission status */
  setPermission: (granted: boolean) => void;
  /** Update a notification preference */
  updatePreference: <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K],
  ) => void;
  /** Mute notifications for a room */
  muteRoom: (roomId: string) => void;
  /** Unmute notifications for a room */
  unmuteRoom: (roomId: string) => void;
  /** Check if a room is muted */
  isRoomMuted: (roomId: string) => boolean;
  /** Reset all notification state (on logout) */
  reset: () => void;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  showMessagePreview: true,
  showInAppBanners: true,
  soundEnabled: true,
  vibrationEnabled: true,
};

const useNotificationStore = create<NotificationState & NotificationActions>()(
  (set, get) => ({
    // --- State ---
    pushToken: null,
    permissionGranted: false,
    permissionChecked: false,
    preferences: { ...DEFAULT_PREFERENCES },
    mutedRoomIds: new Set(),

    // --- Actions ---

    setPushToken: (token: string) => {
      set({ pushToken: token });
    },

    setPermission: (granted: boolean) => {
      set({ permissionGranted: granted, permissionChecked: true });
    },

    updatePreference: <K extends keyof NotificationPreferences>(
      key: K,
      value: NotificationPreferences[K],
    ) => {
      set((state) => ({
        preferences: { ...state.preferences, [key]: value },
      }));
    },

    muteRoom: (roomId: string) => {
      set((state) => {
        const next = new Set(state.mutedRoomIds);
        next.add(roomId);
        return { mutedRoomIds: next };
      });
    },

    unmuteRoom: (roomId: string) => {
      set((state) => {
        const next = new Set(state.mutedRoomIds);
        next.delete(roomId);
        return { mutedRoomIds: next };
      });
    },

    isRoomMuted: (roomId: string): boolean => {
      return get().mutedRoomIds.has(roomId);
    },

    reset: () => {
      set({
        pushToken: null,
        permissionGranted: false,
        permissionChecked: false,
        preferences: { ...DEFAULT_PREFERENCES },
        mutedRoomIds: new Set(),
      });
    },
  }),
);

export { useNotificationStore };
export type { NotificationPreferences };
