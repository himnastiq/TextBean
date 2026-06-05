/**
 * Room repository — CRUD operations for conversations/rooms.
 * All methods accept a SQLiteDatabase instance from useSQLiteContext().
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import type { PlatformId } from '@/types/platform';
import type { Room } from '@/types/room';

/** Raw row shape returned from SQLite (integers for booleans) */
interface RoomRow {
  room_id: string;
  name: string;
  avatar_url: string | null;
  topic: string | null;
  platform: string;
  is_direct: number;
  is_archived: number;
  is_pinned: number;
  is_muted: number;
  unread_count: number;
  last_message_preview: string | null;
  last_message_sender: string | null;
  last_activity_at: number;
  created_at: number;
  updated_at: number;
}

/** Convert a raw SQLite row to our Room interface */
const rowToRoom = (row: RoomRow): Room => ({
  roomId: row.room_id,
  name: row.name,
  avatarUrl: row.avatar_url,
  topic: row.topic,
  platform: row.platform as PlatformId,
  isDirect: row.is_direct === 1,
  isArchived: row.is_archived === 1,
  isPinned: row.is_pinned === 1,
  isMuted: row.is_muted === 1,
  unreadCount: row.unread_count,
  lastMessagePreview: row.last_message_preview,
  lastMessageSender: row.last_message_sender,
  lastActivityAt: row.last_activity_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * Get all non-archived rooms, sorted by pinned-first then last activity descending.
 */
const getAllRooms = async (db: SQLiteDatabase): Promise<Room[]> => {
  const rows = await db.getAllAsync<RoomRow>(
    `SELECT * FROM rooms
     WHERE is_archived = 0
     ORDER BY is_pinned DESC, last_activity_at DESC`,
  );
  return rows.map(rowToRoom);
};

/**
 * Get a single room by ID.
 */
const getRoomById = async (
  db: SQLiteDatabase,
  roomId: string,
): Promise<Room | null> => {
  const row = await db.getFirstAsync<RoomRow>(
    'SELECT * FROM rooms WHERE room_id = ?',
    [roomId],
  );
  return row ? rowToRoom(row) : null;
};

/**
 * Get rooms filtered by platform.
 */
const getRoomsByPlatform = async (
  db: SQLiteDatabase,
  platform: PlatformId,
): Promise<Room[]> => {
  const rows = await db.getAllAsync<RoomRow>(
    `SELECT * FROM rooms
     WHERE platform = ? AND is_archived = 0
     ORDER BY is_pinned DESC, last_activity_at DESC`,
    [platform],
  );
  return rows.map(rowToRoom);
};

/**
 * Get archived rooms.
 */
const getArchivedRooms = async (db: SQLiteDatabase): Promise<Room[]> => {
  const rows = await db.getAllAsync<RoomRow>(
    `SELECT * FROM rooms
     WHERE is_archived = 1
     ORDER BY last_activity_at DESC`,
  );
  return rows.map(rowToRoom);
};

/**
 * Upsert a room — insert or update on conflict.
 */
const upsertRoom = async (db: SQLiteDatabase, room: Room): Promise<void> => {
  await db.runAsync(
    `INSERT INTO rooms (
      room_id, name, avatar_url, topic, platform,
      is_direct, is_archived, is_pinned, is_muted,
      unread_count, last_message_preview, last_message_sender,
      last_activity_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(room_id) DO UPDATE SET
      name = excluded.name,
      avatar_url = excluded.avatar_url,
      topic = excluded.topic,
      platform = excluded.platform,
      is_direct = excluded.is_direct,
      unread_count = excluded.unread_count,
      last_message_preview = excluded.last_message_preview,
      last_message_sender = excluded.last_message_sender,
      last_activity_at = excluded.last_activity_at,
      updated_at = excluded.updated_at`,
    [
      room.roomId,
      room.name,
      room.avatarUrl,
      room.topic,
      room.platform,
      room.isDirect ? 1 : 0,
      room.isArchived ? 1 : 0,
      room.isPinned ? 1 : 0,
      room.isMuted ? 1 : 0,
      room.unreadCount,
      room.lastMessagePreview,
      room.lastMessageSender,
      room.lastActivityAt,
      room.createdAt,
      room.updatedAt,
    ],
  );
};

/**
 * Batch upsert multiple rooms in an exclusive transaction.
 */
const upsertRooms = async (
  db: SQLiteDatabase,
  rooms: Room[],
): Promise<void> => {
  if (rooms.length === 0) return;
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const room of rooms) {
      await txn.runAsync(
        `INSERT INTO rooms (
          room_id, name, avatar_url, topic, platform,
          is_direct, is_archived, is_pinned, is_muted,
          unread_count, last_message_preview, last_message_sender,
          last_activity_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(room_id) DO UPDATE SET
          name = excluded.name,
          avatar_url = excluded.avatar_url,
          topic = excluded.topic,
          platform = excluded.platform,
          is_direct = excluded.is_direct,
          unread_count = excluded.unread_count,
          last_message_preview = excluded.last_message_preview,
          last_message_sender = excluded.last_message_sender,
          last_activity_at = excluded.last_activity_at,
          updated_at = excluded.updated_at`,
        [
          room.roomId,
          room.name,
          room.avatarUrl,
          room.topic,
          room.platform,
          room.isDirect ? 1 : 0,
          room.isArchived ? 1 : 0,
          room.isPinned ? 1 : 0,
          room.isMuted ? 1 : 0,
          room.unreadCount,
          room.lastMessagePreview,
          room.lastMessageSender,
          room.lastActivityAt,
          room.createdAt,
          room.updatedAt,
        ],
      );
    }
  });
};

/**
 * Update the last message preview for a room.
 */
const updateLastMessage = async (
  db: SQLiteDatabase,
  roomId: string,
  preview: string,
  sender: string,
  timestamp: number,
): Promise<void> => {
  await db.runAsync(
    `UPDATE rooms SET
      last_message_preview = ?,
      last_message_sender = ?,
      last_activity_at = ?,
      updated_at = ?
    WHERE room_id = ?`,
    [preview, sender, timestamp, Date.now(), roomId],
  );
};

/**
 * Update unread count for a room.
 */
const updateUnreadCount = async (
  db: SQLiteDatabase,
  roomId: string,
  count: number,
): Promise<void> => {
  await db.runAsync(
    'UPDATE rooms SET unread_count = ?, updated_at = ? WHERE room_id = ?',
    [count, Date.now(), roomId],
  );
};

/**
 * Increment unread count by 1.
 */
const incrementUnreadCount = async (
  db: SQLiteDatabase,
  roomId: string,
): Promise<void> => {
  await db.runAsync(
    'UPDATE rooms SET unread_count = unread_count + 1, updated_at = ? WHERE room_id = ?',
    [Date.now(), roomId],
  );
};

/**
 * Toggle archive status.
 */
const setArchived = async (
  db: SQLiteDatabase,
  roomId: string,
  archived: boolean,
): Promise<void> => {
  await db.runAsync(
    'UPDATE rooms SET is_archived = ?, updated_at = ? WHERE room_id = ?',
    [archived ? 1 : 0, Date.now(), roomId],
  );
};

/**
 * Toggle pin status.
 */
const setPinned = async (
  db: SQLiteDatabase,
  roomId: string,
  pinned: boolean,
): Promise<void> => {
  await db.runAsync(
    'UPDATE rooms SET is_pinned = ?, updated_at = ? WHERE room_id = ?',
    [pinned ? 1 : 0, Date.now(), roomId],
  );
};

/**
 * Toggle mute status.
 */
const setMuted = async (
  db: SQLiteDatabase,
  roomId: string,
  muted: boolean,
): Promise<void> => {
  await db.runAsync(
    'UPDATE rooms SET is_muted = ?, updated_at = ? WHERE room_id = ?',
    [muted ? 1 : 0, Date.now(), roomId],
  );
};

/**
 * Search rooms by name (LIKE query).
 */
const searchRoomsByName = async (
  db: SQLiteDatabase,
  query: string,
): Promise<Room[]> => {
  const rows = await db.getAllAsync<RoomRow>(
    `SELECT * FROM rooms
     WHERE name LIKE ? AND is_archived = 0
     ORDER BY last_activity_at DESC`,
    [`%${query}%`],
  );
  return rows.map(rowToRoom);
};

/**
 * Delete a room and cascade delete its messages and members.
 */
const deleteRoom = async (
  db: SQLiteDatabase,
  roomId: string,
): Promise<void> => {
  await db.runAsync('DELETE FROM rooms WHERE room_id = ?', [roomId]);
};

export {
  getAllRooms,
  getRoomById,
  getRoomsByPlatform,
  getArchivedRooms,
  upsertRoom,
  upsertRooms,
  updateLastMessage,
  updateUnreadCount,
  incrementUnreadCount,
  setArchived,
  setPinned,
  setMuted,
  searchRoomsByName,
  deleteRoom,
};
