/**
 * Message repository — CRUD + FTS5 full-text search for messages.
 * All methods accept a SQLiteDatabase instance from useSQLiteContext().
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import type { PlatformId } from '@/types/platform';
import type { DeliveryStatus, Message, MessageSearchResult, MessageType } from '@/types/message';

/** Raw row shape from SQLite */
interface MessageRow {
  event_id: string;
  room_id: string;
  sender_id: string;
  sender_display_name: string;
  sender_avatar_url: string | null;
  content: string;
  msg_type: string;
  timestamp: number;
  is_read: number;
  is_edited: number;
  is_redacted: number;
  reply_to_event_id: string | null;
  platform: string;
  delivery_status: string;
  media_url: string | null;
  media_type: string | null;
  media_size: number | null;
  thumbnail_url: string | null;
}

/** Convert a raw row to our Message interface */
const rowToMessage = (row: MessageRow): Message => ({
  eventId: row.event_id,
  roomId: row.room_id,
  senderId: row.sender_id,
  senderDisplayName: row.sender_display_name,
  senderAvatarUrl: row.sender_avatar_url,
  content: row.content,
  msgType: row.msg_type as MessageType,
  timestamp: row.timestamp,
  isRead: row.is_read === 1,
  isEdited: row.is_edited === 1,
  isRedacted: row.is_redacted === 1,
  replyToEventId: row.reply_to_event_id,
  platform: row.platform as PlatformId,
  deliveryStatus: row.delivery_status as DeliveryStatus,
  mediaUrl: row.media_url,
  mediaType: row.media_type,
  mediaSize: row.media_size,
  thumbnailUrl: row.thumbnail_url,
});

/**
 * Get messages for a room, paginated, newest first.
 */
const getMessagesByRoom = async (
  db: SQLiteDatabase,
  roomId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<Message[]> => {
  const rows = await db.getAllAsync<MessageRow>(
    `SELECT * FROM messages
     WHERE room_id = ? AND is_redacted = 0
     ORDER BY timestamp DESC
     LIMIT ? OFFSET ?`,
    [roomId, limit, offset],
  );
  return rows.map(rowToMessage);
};

/**
 * Get a single message by event ID.
 */
const getMessageByEventId = async (
  db: SQLiteDatabase,
  eventId: string,
): Promise<Message | null> => {
  const row = await db.getFirstAsync<MessageRow>(
    'SELECT * FROM messages WHERE event_id = ?',
    [eventId],
  );
  return row ? rowToMessage(row) : null;
};

/**
 * Insert a single message.
 * The FTS5 trigger handles updating the search index automatically.
 */
const insertMessage = async (
  db: SQLiteDatabase,
  message: Message,
): Promise<void> => {
  await db.runAsync(
    `INSERT OR IGNORE INTO messages (
      event_id, room_id, sender_id, sender_display_name, sender_avatar_url,
      content, msg_type, timestamp, is_read, is_edited, is_redacted,
      reply_to_event_id, platform, delivery_status,
      media_url, media_type, media_size, thumbnail_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      message.eventId,
      message.roomId,
      message.senderId,
      message.senderDisplayName,
      message.senderAvatarUrl,
      message.content,
      message.msgType,
      message.timestamp,
      message.isRead ? 1 : 0,
      message.isEdited ? 1 : 0,
      message.isRedacted ? 1 : 0,
      message.replyToEventId,
      message.platform,
      message.deliveryStatus,
      message.mediaUrl,
      message.mediaType,
      message.mediaSize,
      message.thumbnailUrl,
    ],
  );
};

/**
 * Batch insert messages in an exclusive transaction.
 * Skips duplicates with INSERT OR IGNORE.
 */
const insertMessages = async (
  db: SQLiteDatabase,
  messages: Message[],
): Promise<void> => {
  if (messages.length === 0) return;
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const msg of messages) {
      await txn.runAsync(
        `INSERT OR IGNORE INTO messages (
          event_id, room_id, sender_id, sender_display_name, sender_avatar_url,
          content, msg_type, timestamp, is_read, is_edited, is_redacted,
          reply_to_event_id, platform, delivery_status,
          media_url, media_type, media_size, thumbnail_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          msg.eventId,
          msg.roomId,
          msg.senderId,
          msg.senderDisplayName,
          msg.senderAvatarUrl,
          msg.content,
          msg.msgType,
          msg.timestamp,
          msg.isRead ? 1 : 0,
          msg.isEdited ? 1 : 0,
          msg.isRedacted ? 1 : 0,
          msg.replyToEventId,
          msg.platform,
          msg.deliveryStatus,
          msg.mediaUrl,
          msg.mediaType,
          msg.mediaSize,
          msg.thumbnailUrl,
        ],
      );
    }
  });
};

/**
 * Update message content (for edits).
 * FTS5 update trigger handles re-indexing.
 */
const updateMessageContent = async (
  db: SQLiteDatabase,
  eventId: string,
  newContent: string,
): Promise<void> => {
  await db.runAsync(
    'UPDATE messages SET content = ?, is_edited = 1 WHERE event_id = ?',
    [newContent, eventId],
  );
};

/**
 * Mark a message as redacted (soft delete).
 */
const redactMessage = async (
  db: SQLiteDatabase,
  eventId: string,
): Promise<void> => {
  await db.runAsync(
    'UPDATE messages SET is_redacted = 1, content = ? WHERE event_id = ?',
    ['', eventId],
  );
};

/**
 * Update delivery status of a message.
 */
const updateDeliveryStatus = async (
  db: SQLiteDatabase,
  eventId: string,
  status: DeliveryStatus,
): Promise<void> => {
  await db.runAsync(
    'UPDATE messages SET delivery_status = ? WHERE event_id = ?',
    [status, eventId],
  );
};

/**
 * Mark all messages in a room as read.
 * Returns the number of messages updated.
 */
const markRoomAsRead = async (
  db: SQLiteDatabase,
  roomId: string,
): Promise<number> => {
  const result = await db.runAsync(
    'UPDATE messages SET is_read = 1 WHERE room_id = ? AND is_read = 0',
    [roomId],
  );
  return result.changes;
};

/**
 * Full-text search across all messages using FTS5.
 * Returns results ranked by relevance with highlighted snippets.
 */
const searchMessages = async (
  db: SQLiteDatabase,
  query: string,
  limit: number = 30,
): Promise<MessageSearchResult[]> => {
  // Sanitize the query for FTS5 (escape special chars, add wildcard)
  const sanitized = sanitizeFtsQuery(query);
  if (!sanitized) return [];

  const rows = await db.getAllAsync<
    MessageRow & { room_name: string; snippet_text: string; rank: number }
  >(
    `SELECT
      m.*,
      r.name AS room_name,
      snippet(messages_fts, 0, '<b>', '</b>', '...', 40) AS snippet_text,
      rank
    FROM messages_fts
    JOIN messages m ON m.rowid = messages_fts.rowid
    JOIN rooms r ON r.room_id = m.room_id
    WHERE messages_fts MATCH ?
    ORDER BY rank
    LIMIT ?`,
    [sanitized, limit],
  );

  return rows.map((row) => ({
    message: rowToMessage(row),
    roomName: row.room_name,
    snippet: row.snippet_text,
    rank: row.rank,
  }));
};

/**
 * Full-text search scoped to a single room.
 */
const searchMessagesInRoom = async (
  db: SQLiteDatabase,
  roomId: string,
  query: string,
  limit: number = 30,
): Promise<MessageSearchResult[]> => {
  const sanitized = sanitizeFtsQuery(query);
  if (!sanitized) return [];

  const rows = await db.getAllAsync<
    MessageRow & { room_name: string; snippet_text: string; rank: number }
  >(
    `SELECT
      m.*,
      r.name AS room_name,
      snippet(messages_fts, 0, '<b>', '</b>', '...', 40) AS snippet_text,
      rank
    FROM messages_fts
    JOIN messages m ON m.rowid = messages_fts.rowid
    JOIN rooms r ON r.room_id = m.room_id
    WHERE messages_fts MATCH ? AND m.room_id = ?
    ORDER BY rank
    LIMIT ?`,
    [sanitized, roomId, limit],
  );

  return rows.map((row) => ({
    message: rowToMessage(row),
    roomName: row.room_name,
    snippet: row.snippet_text,
    rank: row.rank,
  }));
};

/**
 * Get the total message count for a room (non-redacted).
 */
const getMessageCount = async (
  db: SQLiteDatabase,
  roomId: string,
): Promise<number> => {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM messages WHERE room_id = ? AND is_redacted = 0',
    [roomId],
  );
  return row?.count ?? 0;
};

/**
 * Delete all messages for a room.
 */
const deleteMessagesForRoom = async (
  db: SQLiteDatabase,
  roomId: string,
): Promise<void> => {
  await db.runAsync('DELETE FROM messages WHERE room_id = ?', [roomId]);
};

/**
 * Sanitize a user query for FTS5 MATCH syntax.
 * - Strips special FTS5 operators
 * - Appends wildcard (*) for prefix matching
 */
const sanitizeFtsQuery = (query: string): string => {
  const trimmed = query.trim();
  if (!trimmed) return '';

  // Remove FTS5 special characters that could cause syntax errors
  const cleaned = trimmed.replace(/[*"(){}[\]^~:]/g, '');
  if (!cleaned) return '';

  // Split into terms and add prefix wildcard to each
  const terms = cleaned.split(/\s+/).filter(Boolean);
  return terms.map((term) => `"${term}"*`).join(' ');
};

export {
  getMessagesByRoom,
  getMessageByEventId,
  insertMessage,
  insertMessages,
  updateMessageContent,
  redactMessage,
  updateDeliveryStatus,
  markRoomAsRead,
  searchMessages,
  searchMessagesInRoom,
  getMessageCount,
  deleteMessagesForRoom,
};
