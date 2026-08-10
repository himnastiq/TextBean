/**
 * Message timeline state store.
 *
 * Manages message lists per room, optimistic sends with pending
 * messages, reply state, and pagination for the ChatPage.
 */

import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Message, PendingMessage } from '@/types/message';
import * as MessageRepo from '@/database/repositories/MessageRepository';
import * as MatrixClient from '@/services/matrix/MatrixClient';

/** Page size for message pagination */
const PAGE_SIZE = 50;

interface MessageState {
  /** Messages indexed by room_id → sorted array (newest first) */
  messagesByRoom: Map<string, Message[]>;
  /** Pending (optimistic) outgoing messages awaiting server confirmation */
  pendingMessages: Map<string, PendingMessage>;
  /** The message being replied to (set from ChatPage UI) */
  replyingTo: Message | null;
  /** Whether messages are currently loading for a room */
  loadingRoomId: string | null;
  /** Whether more messages are available for pagination */
  hasMoreByRoom: Map<string, boolean>;
}

interface MessageActions {
  /** Load initial messages for a room from the database */
  loadMessages: (db: SQLiteDatabase, roomId: string) => Promise<void>;
  /** Load older messages (pagination) */
  loadMore: (db: SQLiteDatabase, roomId: string) => Promise<void>;
  /** Add a new message from a sync event (inserts at correct position) */
  addMessage: (message: Message) => void;
  /** Update an existing message (e.g. after edit) */
  updateMessage: (eventId: string, roomId: string, updates: Partial<Message>) => void;
  /** Mark a message as redacted */
  redactMessage: (eventId: string, roomId: string) => void;
  /** Send a text message — optimistic insert + server send + confirmation */
  sendMessage: (db: SQLiteDatabase, roomId: string, content: string) => Promise<void>;
  /** Set the message being replied to */
  setReplyingTo: (message: Message | null) => void;
  /** Clear all messages for a room (e.g., on room leave) */
  clearRoom: (roomId: string) => void;
  /** Mark messages in a room as read (updates delivery status locally) */
  markAsRead: (db: SQLiteDatabase, roomId: string) => Promise<void>;
}

/** Generate a temporary local ID for optimistic messages */
const generateLocalId = (): string => `~local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const useMessageStore = create<MessageState & MessageActions>()((set, get) => ({
  // --- State ---
  messagesByRoom: new Map(),
  pendingMessages: new Map(),
  replyingTo: null,
  loadingRoomId: null,
  hasMoreByRoom: new Map(),

  // --- Actions ---

  loadMessages: async (db: SQLiteDatabase, roomId: string) => {
    set({ loadingRoomId: roomId });

    try {
      const messages = await MessageRepo.getMessagesByRoom(db, roomId, PAGE_SIZE, 0);

      set((state) => {
        const next = new Map(state.messagesByRoom);
        next.set(roomId, messages);

        const hasMore = new Map(state.hasMoreByRoom);
        hasMore.set(roomId, messages.length >= PAGE_SIZE);

        return { messagesByRoom: next, hasMoreByRoom: hasMore, loadingRoomId: null };
      });
    } catch {
      set({ loadingRoomId: null });
    }
  },

  loadMore: async (db: SQLiteDatabase, roomId: string) => {
    const { messagesByRoom, hasMoreByRoom, loadingRoomId } = get();

    // Don't load if already loading or no more messages
    if (loadingRoomId === roomId) return;
    if (!hasMoreByRoom.get(roomId)) return;

    const existing = messagesByRoom.get(roomId) ?? [];
    set({ loadingRoomId: roomId });

    try {
      const olderMessages = await MessageRepo.getMessagesByRoom(
        db,
        roomId,
        PAGE_SIZE,
        existing.length,
      );

      set((state) => {
        const next = new Map(state.messagesByRoom);
        const current = next.get(roomId) ?? [];
        next.set(roomId, [...current, ...olderMessages]);

        const hasMore = new Map(state.hasMoreByRoom);
        hasMore.set(roomId, olderMessages.length >= PAGE_SIZE);

        return { messagesByRoom: next, hasMoreByRoom: hasMore, loadingRoomId: null };
      });
    } catch {
      set({ loadingRoomId: null });
    }
  },

  addMessage: (message: Message) => {
    set((state) => {
      const next = new Map(state.messagesByRoom);
      const existing = next.get(message.roomId) ?? [];

      // Don't add duplicates
      if (existing.some((m) => m.eventId === message.eventId)) {
        return state;
      }

      // Messages are sorted newest-first; new message goes to front
      next.set(message.roomId, [message, ...existing]);

      // Remove matching pending message (optimistic → confirmed)
      const nextPending = new Map(state.pendingMessages);
      // Find pending message in same room with similar content+timestamp
      for (const [localId, pending] of nextPending) {
        if (pending.roomId === message.roomId && pending.content === message.content) {
          nextPending.delete(localId);
          break;
        }
      }

      return { messagesByRoom: next, pendingMessages: nextPending };
    });
  },

  updateMessage: (eventId: string, roomId: string, updates: Partial<Message>) => {
    set((state) => {
      const next = new Map(state.messagesByRoom);
      const messages = next.get(roomId);
      if (!messages) return state;

      const index = messages.findIndex((m) => m.eventId === eventId);
      if (index === -1) return state;

      const updated = [...messages];
      updated[index] = { ...updated[index], ...updates };
      next.set(roomId, updated);

      return { messagesByRoom: next };
    });
  },

  redactMessage: (eventId: string, roomId: string) => {
    set((state) => {
      const next = new Map(state.messagesByRoom);
      const messages = next.get(roomId);
      if (!messages) return state;

      // Remove redacted messages from the timeline entirely
      next.set(
        roomId,
        messages.filter((m) => m.eventId !== eventId),
      );

      return { messagesByRoom: next };
    });
  },

  sendMessage: async (db: SQLiteDatabase, roomId: string, content: string) => {
    const replyTo = get().replyingTo;
    const localId = generateLocalId();
    const now = Date.now();

    // Create optimistic pending message
    const pending: PendingMessage = {
      localId,
      roomId,
      content,
      msgType: 'm.text',
      timestamp: now,
      replyToEventId: replyTo?.eventId ?? null,
      deliveryStatus: 'sending',
    };

    // Insert pending message
    set((state) => {
      const nextPending = new Map(state.pendingMessages);
      nextPending.set(localId, pending);
      return { pendingMessages: nextPending, replyingTo: null };
    });

    try {
      // Send via Matrix SDK
      const eventId = await MatrixClient.sendTextMessage(roomId, content);

      // Update pending → sent
      set((state) => {
        const nextPending = new Map(state.pendingMessages);
        const msg = nextPending.get(localId);
        if (msg) {
          nextPending.set(localId, { ...msg, deliveryStatus: 'sent' });
        }
        return { pendingMessages: nextPending };
      });

      // The actual message will come back through the sync loop
      // and addMessage() will reconcile with the pending message
    } catch {
      // Mark as failed
      set((state) => {
        const nextPending = new Map(state.pendingMessages);
        const msg = nextPending.get(localId);
        if (msg) {
          nextPending.set(localId, { ...msg, deliveryStatus: 'failed' });
        }
        return { pendingMessages: nextPending };
      });
    }
  },

  setReplyingTo: (message: Message | null) => {
    set({ replyingTo: message });
  },

  clearRoom: (roomId: string) => {
    set((state) => {
      const nextMessages = new Map(state.messagesByRoom);
      nextMessages.delete(roomId);

      const nextHasMore = new Map(state.hasMoreByRoom);
      nextHasMore.delete(roomId);

      return { messagesByRoom: nextMessages, hasMoreByRoom: nextHasMore };
    });
  },

  markAsRead: async (db: SQLiteDatabase, roomId: string) => {
    await MessageRepo.markRoomAsRead(db, roomId);

    // Also send read receipt to server for the latest message
    const messages = get().messagesByRoom.get(roomId);
    if (messages && messages.length > 0) {
      const latestEventId = messages[0].eventId;
      try {
        await MatrixClient.sendReadReceipt(roomId, latestEventId);
      } catch {
        // Non-critical — ignore
      }
    }
  },
}));

/**
 * Select messages for a room, including pending messages merged in.
 * Pending messages are appended at the front (newest) of the list.
 */
const selectMessagesForRoom = (roomId: string) => (state: MessageState): Message[] => {
  const messages = state.messagesByRoom.get(roomId) ?? [];
  const pendingInRoom: Message[] = [];

  for (const pending of state.pendingMessages.values()) {
    if (pending.roomId === roomId) {
      // Convert PendingMessage to Message for unified rendering
      pendingInRoom.push({
        eventId: pending.localId,
        roomId: pending.roomId,
        senderId: '', // Will be filled by the UI from auth store
        senderDisplayName: 'You',
        senderAvatarUrl: null,
        content: pending.content,
        msgType: pending.msgType,
        timestamp: pending.timestamp,
        isRead: true,
        isEdited: false,
        isRedacted: false,
        replyToEventId: pending.replyToEventId,
        platform: 'matrix',
        deliveryStatus: pending.deliveryStatus,
        mediaUrl: null,
        mediaType: null,
        mediaSize: null,
        thumbnailUrl: null,
      });
    }
  }

  // Pending messages appear at the top (newest first)
  return [...pendingInRoom, ...messages];
};

export { useMessageStore, selectMessagesForRoom, PAGE_SIZE };
