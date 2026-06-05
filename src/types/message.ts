/**
 * Message interfaces for TextBean.
 * v1: Text-only. Media fields scaffolded for v2.
 */

import type { PlatformId } from './platform';

/** Matrix message event types we handle */
type MessageType =
  | 'm.text'
  | 'm.notice'
  | 'm.emote'
  | 'm.image'   // v2
  | 'm.video'   // v2
  | 'm.audio'   // v2
  | 'm.file';   // v2

/** Delivery status for outgoing messages */
type DeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/** A single message in a conversation */
interface Message {
  /** Matrix event ID (e.g., "$abc123:homeserver.com") */
  eventId: string;
  /** Room this message belongs to */
  roomId: string;
  /** Matrix user ID of the sender */
  senderId: string;
  /** Sender display name (cached from member state) */
  senderDisplayName: string;
  /** Sender avatar MXC URL */
  senderAvatarUrl: string | null;
  /** Text content of the message */
  content: string;
  /** Matrix message type */
  msgType: MessageType;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Whether the current user has read this message */
  isRead: boolean;
  /** Whether this message has been edited */
  isEdited: boolean;
  /** Whether this message has been redacted/deleted */
  isRedacted: boolean;
  /** Event ID of the message being replied to, if any */
  replyToEventId: string | null;
  /** Which platform this message originated from */
  platform: PlatformId;
  /** Delivery status (only relevant for outgoing messages) */
  deliveryStatus: DeliveryStatus;
  // --- v2 media fields (scaffolded) ---
  /** MXC URL for media content */
  mediaUrl: string | null;
  /** MIME type of media */
  mediaType: string | null;
  /** File size in bytes */
  mediaSize: number | null;
  /** MXC URL for thumbnail */
  thumbnailUrl: string | null;
}

/** A pending (optimistic) message awaiting server confirmation */
interface PendingMessage {
  /** Temporary local ID before server assigns event_id */
  localId: string;
  roomId: string;
  content: string;
  msgType: MessageType;
  timestamp: number;
  replyToEventId: string | null;
  deliveryStatus: DeliveryStatus;
}

/** Search result from FTS5 full-text search */
interface MessageSearchResult {
  message: Message;
  /** Room name for display context */
  roomName: string;
  /** Matched text snippet with highlights */
  snippet: string;
  /** FTS5 relevance rank */
  rank: number;
}

export type {
  MessageType,
  DeliveryStatus,
  Message,
  PendingMessage,
  MessageSearchResult,
};
