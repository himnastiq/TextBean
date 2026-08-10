/**
 * NotificationHandler — processes incoming notifications and user interactions.
 *
 * Responsibilities:
 * 1. Parse Matrix push notification payloads
 * 2. Fetch sender display name and room info for rich notifications
 * 3. Handle notification tap → navigate to ChatPage
 * 4. Handle quick reply → send message via Matrix SDK
 * 5. Handle "Mark as Read" action → send read receipt
 * 6. In-app notification banner dispatch (foreground)
 */

import { type EventSubscription } from 'expo-modules-core';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import * as MatrixClient from '@/services/matrix/MatrixClient';
import { useMessageStore } from '@/stores/message-store';
import { useRoomStore } from '@/stores/room-store';
import { useNotificationStore } from '@/stores/notification-store';
import { CATEGORY_MESSAGE } from './NotificationService';

/* ─── Types ──────────────────────────────────────────────── */

/** Matrix push notification payload (event_id_only format) */
interface MatrixPushPayload {
  /** Room ID the notification is for */
  room_id?: string;
  /** Event ID that triggered the notification */
  event_id?: string;
  /** Sender's Matrix user ID */
  sender?: string;
  /** Sender's display name */
  sender_display_name?: string;
  /** Room display name */
  room_name?: string;
  /** Message body (may be redacted for privacy) */
  content?: string;
  /** Message type */
  type?: string;
  /** Number of unread notifications */
  unread_count?: number;
}

/** Callback for in-app banner notifications */
type InAppBannerCallback = (data: {
  roomId: string;
  senderName: string;
  content: string;
  avatarUrl: string | null;
}) => void;

/* ─── State ──────────────────────────────────────────────── */

let receivedSubscription: EventSubscription | null = null;
let responseSubscription: EventSubscription | null = null;
let inAppBannerCallback: InAppBannerCallback | null = null;

/* ─── Parsing ────────────────────────────────────────────── */

/**
 * Parse the data payload from a notification into a Matrix push payload.
 */
function parsePayload(data: Record<string, unknown> | undefined): MatrixPushPayload {
  if (!data) return {};
  return {
    room_id: data.room_id as string | undefined,
    event_id: data.event_id as string | undefined,
    sender: data.sender as string | undefined,
    sender_display_name: data.sender_display_name as string | undefined,
    room_name: data.room_name as string | undefined,
    content: data.content as string | undefined,
    type: data.type as string | undefined,
    unread_count: data.unread_count as number | undefined,
  };
}

/**
 * Enrich a notification payload by fetching missing data from the Matrix client.
 * Falls back to payload data if the client isn't available.
 */
function enrichPayload(payload: MatrixPushPayload): {
  roomName: string;
  senderName: string;
  content: string;
  avatarUrl: string | null;
} {
  let roomName = payload.room_name ?? 'Unknown Room';
  let senderName = payload.sender_display_name ?? payload.sender ?? 'Someone';
  let content = payload.content ?? 'New message';
  let avatarUrl: string | null = null;

  // Try to enrich from the Matrix client's local state
  if (payload.room_id && MatrixClient.isClientInitialized()) {
    try {
      const room = MatrixClient.getRoom(payload.room_id);
      if (room) {
        roomName = room.name ?? roomName;
        avatarUrl = room.getMxcAvatarUrl()
          ? MatrixClient.mxcToHttpUrl(room.getMxcAvatarUrl(), 64, 64)
          : null;

        // Get sender display name from room member
        if (payload.sender) {
          const member = room.getMember(payload.sender);
          if (member) {
            senderName = member.name ?? senderName;
          }
        }
      }
    } catch {
      // Client might not be ready — use payload defaults
    }
  }

  return { roomName, senderName, content, avatarUrl };
}

/* ─── Notification received (foreground) ─────────────────── */

/**
 * Handle a notification received while the app is in the foreground.
 * Dispatches to the in-app banner if configured.
 */
function handleNotificationReceived(notification: Notifications.Notification): void {
  const data = notification.request.content.data as Record<string, unknown> | undefined;
  const payload = parsePayload(data);

  if (!payload.room_id) return;

  // Check if this room is muted
  const notifStore = useNotificationStore.getState();
  if (notifStore.isRoomMuted(payload.room_id)) return;

  // Check if user is currently viewing this room
  const roomStore = useRoomStore.getState();
  if (roomStore.activeRoomId === payload.room_id) return;

  // Enrich and dispatch to in-app banner
  const enriched = enrichPayload(payload);

  if (inAppBannerCallback && notifStore.preferences.showInAppBanners) {
    inAppBannerCallback({
      roomId: payload.room_id,
      senderName: enriched.senderName,
      content: enriched.content,
      avatarUrl: enriched.avatarUrl,
    });
  }
}

/* ─── Notification response (tap or quick action) ────────── */

/**
 * Handle user interaction with a notification.
 * Routes based on action identifier.
 */
async function handleNotificationResponse(
  response: Notifications.NotificationResponse,
): Promise<void> {
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  const payload = parsePayload(data);
  const actionId = response.actionIdentifier;

  if (!payload.room_id) return;

  // Default tap — navigate to chat
  if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
    router.push(`/chat/${payload.room_id}`);
    return;
  }

  // Quick reply action
  if (actionId === 'reply') {
    const userText = response.userText;
    if (userText && userText.trim().length > 0) {
      try {
        await MatrixClient.sendTextMessage(payload.room_id, userText.trim());
      } catch (error) {
        console.error('[NotificationHandler] Quick reply failed:', error);
      }
    }
    return;
  }

  // Mark as read action
  if (actionId === 'markRead') {
    try {
      // Send read receipt for the triggering event
      if (payload.event_id) {
        await MatrixClient.sendReadReceipt(payload.room_id, payload.event_id);
      }
    } catch (error) {
      console.error('[NotificationHandler] Mark as read failed:', error);
    }
    return;
  }

  // Invite accept
  if (actionId === 'accept' && payload.room_id) {
    try {
      const client = MatrixClient.getClient();
      await client.joinRoom(payload.room_id);
      router.push(`/chat/${payload.room_id}`);
    } catch (error) {
      console.error('[NotificationHandler] Accept invite failed:', error);
    }
    return;
  }

  // Invite decline
  if (actionId === 'decline' && payload.room_id) {
    try {
      const client = MatrixClient.getClient();
      await client.leave(payload.room_id);
    } catch (error) {
      console.error('[NotificationHandler] Decline invite failed:', error);
    }
    return;
  }
}

/* ─── Listener management ────────────────────────────────── */

/**
 * Register all notification listeners.
 * Call once from the root layout.
 *
 * @param onInAppBanner - Optional callback for displaying in-app banner
 * @returns Cleanup function to remove all listeners
 */
function registerListeners(onInAppBanner?: InAppBannerCallback): () => void {
  // Store banner callback
  inAppBannerCallback = onInAppBanner ?? null;

  // Notification received in foreground
  receivedSubscription = Notifications.addNotificationReceivedListener(
    handleNotificationReceived,
  );

  // User interacted with notification
  responseSubscription = Notifications.addNotificationResponseReceivedListener(
    handleNotificationResponse,
  );

  // Check for notification that launched the app
  Notifications.getLastNotificationResponseAsync().then((lastResponse) => {
    if (lastResponse) {
      handleNotificationResponse(lastResponse);
    }
  });

  return () => {
    receivedSubscription?.remove();
    responseSubscription?.remove();
    receivedSubscription = null;
    responseSubscription = null;
    inAppBannerCallback = null;
  };
}

/**
 * Remove all notification listeners.
 */
function removeListeners(): void {
  receivedSubscription?.remove();
  responseSubscription?.remove();
  receivedSubscription = null;
  responseSubscription = null;
  inAppBannerCallback = null;
}

/* ─── Exports ────────────────────────────────────────────── */

export {
  registerListeners,
  removeListeners,
  handleNotificationReceived,
  handleNotificationResponse,
  parsePayload,
  enrichPayload,
};
export type { MatrixPushPayload, InAppBannerCallback };
