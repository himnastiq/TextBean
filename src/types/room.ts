/**
 * Room/conversation interfaces for TextBean unified inbox.
 */

import type { PlatformId } from './platform';

/** A conversation/room in the unified inbox */
interface Room {
  /** Matrix room ID (e.g., "!abc123:homeserver.com") */
  roomId: string;
  /** Display name of the room/conversation */
  name: string;
  /** Avatar MXC URL */
  avatarUrl: string | null;
  /** Room topic/description */
  topic: string | null;
  /** Which platform this room is bridged from */
  platform: PlatformId;
  /** Whether this is a 1:1 direct message */
  isDirect: boolean;
  /** Whether the user has archived this conversation */
  isArchived: boolean;
  /** Whether the user has pinned this conversation */
  isPinned: boolean;
  /** Whether notifications are muted for this room */
  isMuted: boolean;
  /** Number of unread messages */
  unreadCount: number;
  /** Preview text of the last message */
  lastMessagePreview: string | null;
  /** Sender of the last message */
  lastMessageSender: string | null;
  /** Timestamp of last activity (unix ms) */
  lastActivityAt: number;
  /** Room creation timestamp (unix ms) */
  createdAt: number;
  /** Last update timestamp (unix ms) */
  updatedAt: number;
}

/** A member/participant in a room */
interface RoomMember {
  /** Matrix user ID */
  userId: string;
  /** Room this membership belongs to */
  roomId: string;
  /** Display name */
  displayName: string;
  /** Avatar MXC URL */
  avatarUrl: string | null;
  /** Membership state */
  membership: 'join' | 'invite' | 'leave' | 'ban';
  /** Power level (0-100) */
  powerLevel: number;
}

/** Filter options for the conversation list */
interface RoomFilter {
  /** Filter by platform */
  platform: PlatformId | 'all';
  /** Search query for room names */
  searchQuery: string;
  /** Whether to show archived rooms */
  showArchived: boolean;
}

/** Typing indicator state for a room */
interface TypingState {
  roomId: string;
  /** User IDs currently typing */
  userIds: string[];
  /** Display names for typing users */
  displayNames: string[];
}

export type {
  Room,
  RoomMember,
  RoomFilter,
  TypingState,
};
