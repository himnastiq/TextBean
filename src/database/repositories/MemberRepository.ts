/**
 * Member repository — CRUD for room members/participants.
 * All methods accept a SQLiteDatabase instance from useSQLiteContext().
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import type { RoomMember } from '@/types/room';

/** Raw row shape from SQLite */
interface MemberRow {
  user_id: string;
  room_id: string;
  display_name: string;
  avatar_url: string | null;
  membership: string;
  power_level: number;
}

/** Convert a raw row to our RoomMember interface */
const rowToMember = (row: MemberRow): RoomMember => ({
  userId: row.user_id,
  roomId: row.room_id,
  displayName: row.display_name,
  avatarUrl: row.avatar_url,
  membership: row.membership as RoomMember['membership'],
  powerLevel: row.power_level,
});

/**
 * Get all joined members of a room.
 */
const getMembersByRoom = async (
  db: SQLiteDatabase,
  roomId: string,
): Promise<RoomMember[]> => {
  const rows = await db.getAllAsync<MemberRow>(
    `SELECT * FROM members
     WHERE room_id = ? AND membership = 'join'
     ORDER BY power_level DESC, display_name ASC`,
    [roomId],
  );
  return rows.map(rowToMember);
};

/**
 * Get a specific member in a room.
 */
const getMember = async (
  db: SQLiteDatabase,
  userId: string,
  roomId: string,
): Promise<RoomMember | null> => {
  const row = await db.getFirstAsync<MemberRow>(
    'SELECT * FROM members WHERE user_id = ? AND room_id = ?',
    [userId, roomId],
  );
  return row ? rowToMember(row) : null;
};

/**
 * Get a member's display name (useful for resolving sender names).
 * Falls back to userId if no display name is set.
 */
const getMemberDisplayName = async (
  db: SQLiteDatabase,
  userId: string,
  roomId: string,
): Promise<string> => {
  const row = await db.getFirstAsync<{ display_name: string }>(
    'SELECT display_name FROM members WHERE user_id = ? AND room_id = ?',
    [userId, roomId],
  );
  return row?.display_name || userId;
};

/**
 * Upsert a member — insert or update on conflict.
 */
const upsertMember = async (
  db: SQLiteDatabase,
  member: RoomMember,
): Promise<void> => {
  await db.runAsync(
    `INSERT INTO members (user_id, room_id, display_name, avatar_url, membership, power_level)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, room_id) DO UPDATE SET
       display_name = excluded.display_name,
       avatar_url = excluded.avatar_url,
       membership = excluded.membership,
       power_level = excluded.power_level`,
    [
      member.userId,
      member.roomId,
      member.displayName,
      member.avatarUrl,
      member.membership,
      member.powerLevel,
    ],
  );
};

/**
 * Batch upsert members in an exclusive transaction.
 */
const upsertMembers = async (
  db: SQLiteDatabase,
  members: RoomMember[],
): Promise<void> => {
  if (members.length === 0) return;
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const member of members) {
      await txn.runAsync(
        `INSERT INTO members (user_id, room_id, display_name, avatar_url, membership, power_level)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, room_id) DO UPDATE SET
           display_name = excluded.display_name,
           avatar_url = excluded.avatar_url,
           membership = excluded.membership,
           power_level = excluded.power_level`,
        [
          member.userId,
          member.roomId,
          member.displayName,
          member.avatarUrl,
          member.membership,
          member.powerLevel,
        ],
      );
    }
  });
};

/**
 * Get member count for a room (joined members only).
 */
const getMemberCount = async (
  db: SQLiteDatabase,
  roomId: string,
): Promise<number> => {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM members
     WHERE room_id = ? AND membership = 'join'`,
    [roomId],
  );
  return row?.count ?? 0;
};

/**
 * Remove a member from a room.
 */
const removeMember = async (
  db: SQLiteDatabase,
  userId: string,
  roomId: string,
): Promise<void> => {
  await db.runAsync(
    'DELETE FROM members WHERE user_id = ? AND room_id = ?',
    [userId, roomId],
  );
};

/**
 * Delete all members for a room (used when leaving/deleting a room).
 */
const deleteMembersForRoom = async (
  db: SQLiteDatabase,
  roomId: string,
): Promise<void> => {
  await db.runAsync('DELETE FROM members WHERE room_id = ?', [roomId]);
};

export {
  getMembersByRoom,
  getMember,
  getMemberDisplayName,
  upsertMember,
  upsertMembers,
  getMemberCount,
  removeMember,
  deleteMembersForRoom,
};
