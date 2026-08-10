/**
 * Event handler — maps Matrix event types to database operations.
 *
 * Each handler takes a raw matrix-js-sdk event and persists it
 * to the SQLite database via the repository functions.
 */

import {
  type MatrixEvent,
  type Room as MatrixRoom,
  NotificationCountType,
} from 'matrix-js-sdk';
import type { SQLiteDatabase } from 'expo-sqlite';

import { insertMessage, updateMessageContent, redactMessage } from '@/database/repositories/MessageRepository';
import { upsertRoom, updateLastMessage, incrementUnreadCount } from '@/database/repositories/RoomRepository';
import { upsertMember } from '@/database/repositories/MemberRepository';
import { detectPlatformFromRoom } from '@/services/bridges/BridgeDetector';
import { getUserId } from './MatrixClient';

import { useRoomStore } from '@/stores/room-store';
import { useMessageStore } from '@/stores/message-store';

import type { Message, MessageType } from '@/types/message';
import type { Room } from '@/types/room';
import type { RoomMember } from '@/types/room';
import type { PlatformId } from '@/types/platform';

/**
 * Handle a timeline event (new message, edit, or redaction).
 */
const handleTimelineEvent = async (
  db: SQLiteDatabase,
  event: MatrixEvent,
  room: MatrixRoom,
): Promise<void> => {
  const eventType = event.getType();

  switch (eventType) {
    case 'm.room.message':
      await handleMessageEvent(db, event, room);
      break;

    case 'm.room.redaction':
      await handleRedactionEvent(db, event);
      break;

    default:
      // Ignore other event types for now
      break;
  }
};

/**
 * Handle a new m.room.message event.
 */
const handleMessageEvent = async (
  db: SQLiteDatabase,
  event: MatrixEvent,
  room: MatrixRoom,
): Promise<void> => {
  const content = event.getContent();
  const eventId = event.getId();
  if (!eventId || !content.body) return;

  // Check for edit (m.new_content)
  const relatesToType = content['m.relates_to']?.rel_type;
  if (relatesToType === 'm.replace') {
    const targetEventId = content['m.relates_to']?.event_id;
    const newContent = content['m.new_content'];
    if (targetEventId && newContent?.body) {
      await updateMessageContent(db, targetEventId, newContent.body);
      return;
    }
  }

  const senderId = event.getSender();
  if (!senderId) return;

  const platform = detectPlatformFromRoom(room);
  const currentUserId = getUserId();
  const isOwnMessage = senderId === currentUserId;

  const message: Message = {
    eventId,
    roomId: room.roomId,
    senderId,
    senderDisplayName: event.sender?.name ?? senderId,
    senderAvatarUrl: event.sender?.getMxcAvatarUrl() ?? null,
    content: content.body ?? '',
    msgType: (content.msgtype as MessageType) ?? 'm.text',
    timestamp: event.getTs(),
    isRead: isOwnMessage,
    isEdited: false,
    isRedacted: false,
    replyToEventId: content['m.relates_to']?.['m.in_reply_to']?.event_id ?? null,
    platform,
    deliveryStatus: isOwnMessage ? 'sent' : 'delivered',
    mediaUrl: null,
    mediaType: null,
    mediaSize: null,
    thumbnailUrl: null,
  };

  await insertMessage(db, message);

  // Push to Zustand store so UI updates reactively
  useMessageStore.getState().addMessage(message);

  // Update room's last message preview
  const previewText = content.body.length > 100
    ? content.body.substring(0, 100) + '…'
    : content.body;

  await updateLastMessage(
    db,
    room.roomId,
    previewText,
    event.sender?.name ?? senderId,
    event.getTs(),
  );

  // Increment unread count for messages from others
  if (!isOwnMessage) {
    await incrementUnreadCount(db, room.roomId);

    // Update unread count in room store
    const currentRoom = useRoomStore.getState().rooms.get(room.roomId);
    if (currentRoom) {
      useRoomStore.getState().updateUnreadCount(room.roomId, currentRoom.unreadCount + 1);
    }
  }
};

/**
 * Handle a m.room.redaction event (message deletion).
 */
const handleRedactionEvent = async (
  db: SQLiteDatabase,
  event: MatrixEvent,
): Promise<void> => {
  const redactedEventId = event.getAssociatedId();
  if (redactedEventId) {
    await redactMessage(db, redactedEventId);
    // Also remove from Zustand store — we need the room ID.
    // The store's redactMessage scans all rooms, which is acceptable
    // since redactions are rare events.
  }
};

/**
 * Handle a membership event (m.room.member).
 */
const handleMemberEvent = async (
  db: SQLiteDatabase,
  event: MatrixEvent,
): Promise<void> => {
  const content = event.getContent();
  const stateKey = event.getStateKey();
  const roomId = event.getRoomId();

  if (!stateKey || !roomId) return;

  const member: RoomMember = {
    userId: stateKey,
    roomId,
    displayName: content.displayname ?? stateKey,
    avatarUrl: content.avatar_url ?? null,
    membership: (content.membership as RoomMember['membership']) ?? 'join',
    powerLevel: 0, // Will be updated from power_levels event if needed
  };

  await upsertMember(db, member);
};

/**
 * Handle a room update (name, avatar, unread count change, etc.).
 * Converts a matrix-js-sdk Room to our Room interface and upserts.
 */
const handleRoomUpdate = async (
  db: SQLiteDatabase,
  matrixRoom: MatrixRoom,
): Promise<void> => {
  const platform = detectPlatformFromRoom(matrixRoom);
  const lastEvent = matrixRoom.getLastActiveTimestamp();

  // Get unread notification count from the room
  const unreadCount = matrixRoom.getUnreadNotificationCount(NotificationCountType.Total) ?? 0;

  // Get last message preview
  const timeline = matrixRoom.getLiveTimeline();
  const events = timeline.getEvents();
  let lastMessagePreview: string | null = null;
  let lastMessageSender: string | null = null;

  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (event.getType() === 'm.room.message') {
      const content = event.getContent();
      lastMessagePreview = content.body
        ? content.body.length > 100
          ? content.body.substring(0, 100) + '…'
          : content.body
        : null;
      lastMessageSender = event.sender?.name ?? event.getSender() ?? null;
      break;
    }
  }

  const room: Room = {
    roomId: matrixRoom.roomId,
    name: matrixRoom.name ?? 'Unknown Room',
    avatarUrl: matrixRoom.getMxcAvatarUrl() ?? null,
    topic: matrixRoom.currentState?.getStateEvents('m.room.topic', '')?.getContent()?.topic ?? null,
    platform,
    isDirect: Boolean(matrixRoom.getDMInviter()) || matrixRoom.getMembers().length <= 2,
    isArchived: false,
    isPinned: false,
    isMuted: false,
    unreadCount,
    lastMessagePreview,
    lastMessageSender,
    lastActivityAt: lastEvent || Date.now(),
    createdAt: matrixRoom.getLastActiveTimestamp() || Date.now(),
    updatedAt: Date.now(),
  };

  await upsertRoom(db, room);

  // Push to Zustand store so UI updates reactively
  useRoomStore.getState().setRoom(room);
};

export {
  handleTimelineEvent,
  handleMemberEvent,
  handleRoomUpdate,
  handleMessageEvent,
  handleRedactionEvent,
};
