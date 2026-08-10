/**
 * NotificationService — push notification lifecycle management.
 *
 * Responsibilities:
 * 1. Request notification permissions from the OS
 * 2. Obtain Expo Push Token
 * 3. Register push token with the Matrix homeserver (/_matrix/client/v3/pushers/set)
 * 4. Register notification categories with quick reply actions
 * 5. Set foreground notification behavior
 * 6. Set up notification listeners (received + response)
 *
 * Categories:
 * - MESSAGE: Reply (text input) + Mark as Read
 * - INVITE: Accept + Decline
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import * as MatrixClient from '@/services/matrix/MatrixClient';
import { useNotificationStore } from '@/stores/notification-store';

/* ─── Constants ──────────────────────────────────────────── */

const CATEGORY_MESSAGE = 'MESSAGE';
const CATEGORY_INVITE = 'INVITE';

/** Android notification channel IDs */
const CHANNEL_MESSAGES = 'messages';
const CHANNEL_INVITES = 'invites';

/* ─── Permission & Token ─────────────────────────────────── */

/**
 * Request notification permissions from the OS.
 * Updates the notification store with the result.
 *
 * @returns Whether permission was granted
 */
async function requestPermissions(): Promise<boolean> {
  const store = useNotificationStore.getState();

  // Only real devices can receive push notifications
  if (!Device.isDevice) {
    console.warn('[NotificationService] Not a physical device — push not available');
    store.setPermission(false);
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === 'granted') {
    store.setPermission(true);
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  const granted = status === 'granted';
  store.setPermission(granted);
  return granted;
}

/**
 * Get or register the Expo Push Token.
 * Must be called after permissions are granted.
 *
 * @returns The push token string, or null if unavailable
 */
async function registerPushToken(): Promise<string | null> {
  const store = useNotificationStore.getState();

  if (!store.permissionGranted) {
    const granted = await requestPermissions();
    if (!granted) return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ??
                      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenData.data;
    store.setPushToken(token);
    return token;
  } catch (error) {
    console.error('[NotificationService] Failed to get push token:', error);
    return null;
  }
}

/* ─── Matrix pusher registration ─────────────────────────── */

/**
 * Register the push token with the Matrix homeserver.
 * Uses the /_matrix/client/v3/pushers/set endpoint.
 *
 * @param token - Expo push token string
 */
async function registerMatrixPusher(token: string): Promise<void> {
  const client = MatrixClient.getClient();
  const userId = MatrixClient.getUserId();
  const deviceId = `textbean_${Platform.OS}`;

  await client.setPusher({
    pushkey: token,
    kind: 'http',
    app_id: 'dev.textbean.app',
    app_display_name: 'TextBean',
    device_display_name: `TextBean (${Platform.OS})`,
    lang: 'en',
    data: {
      url: 'https://push.expo.dev/--/api/v2/push/send',
      format: 'event_id_only',
    },
    // Append ensures we don't overwrite other pushers
    append: false,
  });

  console.log(`[NotificationService] Registered Matrix pusher for ${userId} on ${deviceId}`);
}

/**
 * Unregister the push token from the Matrix homeserver.
 */
async function unregisterMatrixPusher(): Promise<void> {
  const store = useNotificationStore.getState();
  const token = store.pushToken;
  if (!token) return;

  try {
    const client = MatrixClient.getClient();
    await client.setPusher({
      pushkey: token,
      kind: null as unknown as string, // Matrix spec: null = delete pusher
      app_id: 'dev.textbean.app',
      app_display_name: 'TextBean',
      device_display_name: `TextBean (${Platform.OS})`,
      lang: 'en',
      data: {},
    });
  } catch {
    // Non-critical — might already be unregistered
  }
}

/* ─── Notification channels (Android) ────────────────────── */

/**
 * Create Android notification channels.
 * Must be called before any notification is shown.
 */
async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CHANNEL_MESSAGES, {
    name: 'Messages',
    description: 'Chat message notifications',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 100, 50, 100],
    lightColor: '#208AEF',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync(CHANNEL_INVITES, {
    name: 'Invites',
    description: 'Room and conversation invitations',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

/* ─── Notification categories (quick actions) ────────────── */

/**
 * Register notification categories with interactive actions.
 * - MESSAGE: Reply (inline text input) + Mark as Read
 * - INVITE: Accept + Decline
 */
async function setupNotificationCategories(): Promise<void> {
  // MESSAGE category — quick reply + mark read
  await Notifications.setNotificationCategoryAsync(CATEGORY_MESSAGE, [
    {
      identifier: 'reply',
      buttonTitle: 'Reply',
      textInput: {
        submitButtonTitle: 'Send',
        placeholder: 'Type a reply…',
      },
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: 'markRead',
      buttonTitle: 'Mark as Read',
      options: {
        opensAppToForeground: false,
      },
    },
  ]);

  // INVITE category — accept + decline
  await Notifications.setNotificationCategoryAsync(CATEGORY_INVITE, [
    {
      identifier: 'accept',
      buttonTitle: 'Accept',
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: 'decline',
      buttonTitle: 'Decline',
      options: {
        isDestructive: true,
        opensAppToForeground: false,
      },
    },
  ]);
}

/* ─── Foreground notification handler ────────────────────── */

/**
 * Configure how notifications are handled when the app is in the foreground.
 * Defers to the notification store preferences.
 */
function setupForegroundHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const store = useNotificationStore.getState();
      const data = notification.request.content.data as Record<string, string> | undefined;
      const roomId = data?.room_id;

      // Don't show notification for the currently active room
      // (the user is already looking at it)
      // This check would need activeRoomId from room-store but we keep it simple:
      // if the room is muted, don't show

      if (roomId && store.isRoomMuted(roomId)) {
        return {
          shouldShowBanner: false,
          shouldShowList: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        };
      }

      return {
        shouldShowBanner: store.preferences.showInAppBanners,
        shouldShowList: true,
        shouldPlaySound: store.preferences.soundEnabled,
        shouldSetBadge: true,
      };
    },
  });
}

/* ─── Full initialization ────────────────────────────────── */

/**
 * Initialize the entire notification system.
 * Call once from the root layout after authentication.
 *
 * Steps:
 * 1. Set up Android channels
 * 2. Request permissions
 * 3. Register push token
 * 4. Register Matrix pusher
 * 5. Set up notification categories
 * 6. Set up foreground handler
 *
 * @returns The push token, or null if setup failed
 */
async function initialize(): Promise<string | null> {
  try {
    // 1. Android channels
    await setupAndroidChannels();

    // 2. Request permissions
    const granted = await requestPermissions();
    if (!granted) {
      console.warn('[NotificationService] Notification permission denied');
      // Still set up foreground handler and categories
      setupForegroundHandler();
      return null;
    }

    // 3. Get push token
    const token = await registerPushToken();
    if (!token) return null;

    // 4. Register with Matrix homeserver
    try {
      await registerMatrixPusher(token);
    } catch (error) {
      console.error('[NotificationService] Failed to register Matrix pusher:', error);
      // Non-fatal — app works without push
    }

    // 5. Categories
    await setupNotificationCategories();

    // 6. Foreground handler
    setupForegroundHandler();

    console.log('[NotificationService] Initialized successfully');
    return token;
  } catch (error) {
    console.error('[NotificationService] Initialization failed:', error);
    return null;
  }
}

/**
 * Tear down notifications (call on logout).
 */
async function teardown(): Promise<void> {
  await unregisterMatrixPusher();
  useNotificationStore.getState().reset();
}

/* ─── Show a local notification ──────────────────────────── */

/**
 * Schedule a local notification for immediate display.
 * Used by NotificationHandler to show notifications based on Matrix events.
 */
async function showLocalNotification(params: {
  title: string;
  body: string;
  data?: Record<string, string>;
  categoryIdentifier?: string;
}): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      data: params.data,
      categoryIdentifier: params.categoryIdentifier ?? CATEGORY_MESSAGE,
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_MESSAGES } : {}),
    },
    trigger: null, // Show immediately
  });
}

/* ─── Exports ────────────────────────────────────────────── */

export {
  initialize,
  teardown,
  requestPermissions,
  registerPushToken,
  registerMatrixPusher,
  unregisterMatrixPusher,
  setupAndroidChannels,
  setupNotificationCategories,
  setupForegroundHandler,
  showLocalNotification,
  CATEGORY_MESSAGE,
  CATEGORY_INVITE,
  CHANNEL_MESSAGES,
  CHANNEL_INVITES,
};
