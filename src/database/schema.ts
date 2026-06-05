/**
 * SQLite schema definitions for TextBean.
 * Uses FTS5 virtual table for full-text message search.
 *
 * Schema version is tracked in the `sync_state` table under key 'schema_version'.
 */

/** Current schema version — increment when adding migrations */
const SCHEMA_VERSION = 1;

/**
 * SQL statements to create the initial schema.
 * Executed inside a transaction during database initialization.
 */
const CREATE_TABLES_SQL = `
-- Core rooms table
CREATE TABLE IF NOT EXISTS rooms (
  room_id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  topic TEXT,
  platform TEXT NOT NULL DEFAULT 'matrix',
  is_direct INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_muted INTEGER NOT NULL DEFAULT 0,
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_message_preview TEXT,
  last_message_sender TEXT,
  last_activity_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);

-- Index for sorting by last activity (conversation list)
CREATE INDEX IF NOT EXISTS idx_rooms_last_activity
  ON rooms(is_archived, is_pinned DESC, last_activity_at DESC);

-- Index for filtering by platform
CREATE INDEX IF NOT EXISTS idx_rooms_platform
  ON rooms(platform);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  event_id TEXT PRIMARY KEY NOT NULL,
  room_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_display_name TEXT NOT NULL DEFAULT '',
  sender_avatar_url TEXT,
  content TEXT NOT NULL DEFAULT '',
  msg_type TEXT NOT NULL DEFAULT 'm.text',
  timestamp INTEGER NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  is_edited INTEGER NOT NULL DEFAULT 0,
  is_redacted INTEGER NOT NULL DEFAULT 0,
  reply_to_event_id TEXT,
  platform TEXT NOT NULL DEFAULT 'matrix',
  delivery_status TEXT NOT NULL DEFAULT 'sent',
  media_url TEXT,
  media_type TEXT,
  media_size INTEGER,
  thumbnail_url TEXT,
  FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
);

-- Index for loading messages by room, ordered by time (paginated)
CREATE INDEX IF NOT EXISTS idx_messages_room_time
  ON messages(room_id, timestamp DESC);

-- Index for unread messages
CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON messages(room_id, is_read) WHERE is_read = 0;

-- Members table
CREATE TABLE IF NOT EXISTS members (
  user_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  membership TEXT NOT NULL DEFAULT 'join',
  power_level INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, room_id),
  FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
);

-- Index for looking up members of a room
CREATE INDEX IF NOT EXISTS idx_members_room
  ON members(room_id, membership);

-- FTS5 virtual table for full-text search on message content
-- Uses content-sync (external content) pointing to the messages table
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
  content,
  sender_display_name,
  content='messages',
  content_rowid='rowid'
);

-- Triggers to keep FTS5 index in sync with the messages table
CREATE TRIGGER IF NOT EXISTS messages_fts_insert AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts(rowid, content, sender_display_name)
    VALUES (new.rowid, new.content, new.sender_display_name);
END;

CREATE TRIGGER IF NOT EXISTS messages_fts_delete BEFORE DELETE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, content, sender_display_name)
    VALUES ('delete', old.rowid, old.content, old.sender_display_name);
END;

CREATE TRIGGER IF NOT EXISTS messages_fts_update AFTER UPDATE OF content ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, content, sender_display_name)
    VALUES ('delete', old.rowid, old.content, old.sender_display_name);
  INSERT INTO messages_fts(rowid, content, sender_display_name)
    VALUES (new.rowid, new.content, new.sender_display_name);
END;

-- Sync state tracking (stores sync tokens, schema version, etc.)
CREATE TABLE IF NOT EXISTS sync_state (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

-- Seed schema version
INSERT OR IGNORE INTO sync_state (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}');
`;

/**
 * Migration definitions: each entry runs when upgrading from
 * (version - 1) to (version). Add new migrations here.
 */
interface Migration {
  version: number;
  sql: string;
}

const MIGRATIONS: Migration[] = [
  // Future migrations go here:
  // { version: 2, sql: 'ALTER TABLE messages ADD COLUMN reactions TEXT;' },
];

export { SCHEMA_VERSION, CREATE_TABLES_SQL, MIGRATIONS };
export type { Migration };
