/**
 * Database manager for TextBean.
 *
 * Uses expo-sqlite v56 with:
 * - SQLiteProvider + useSQLiteContext for React component access
 * - WAL journal mode for concurrent reads
 * - FTS5 for full-text search
 * - Schema migration system
 *
 * This module handles initialization, migrations, and provides
 * the onInit callback for SQLiteProvider.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import { CREATE_TABLES_SQL, MIGRATIONS, SCHEMA_VERSION } from './schema';

/** Database file name */
const DATABASE_NAME = 'textbean.db';

/**
 * Initialize the database schema and run pending migrations.
 * Passed as the `onInit` callback to `<SQLiteProvider>`.
 *
 * @param db - The SQLiteDatabase instance provided by expo-sqlite
 */
const initializeDatabase = async (db: SQLiteDatabase): Promise<void> => {
  // PRAGMAs must be executed separately before schema creation
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Create all tables (IF NOT EXISTS ensures idempotency)
  await db.execAsync(CREATE_TABLES_SQL);

  // Check current schema version
  const currentVersion = await getSchemaVersion(db);

  // Run any pending migrations
  if (currentVersion < SCHEMA_VERSION) {
    await runMigrations(db, currentVersion);
  }
};

/**
 * Get the current schema version from the sync_state table.
 */
const getSchemaVersion = async (db: SQLiteDatabase): Promise<number> => {
  try {
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM sync_state WHERE key = 'schema_version'",
    );
    return row ? parseInt(row.value, 10) : 0;
  } catch {
    // Table doesn't exist yet (first run)
    return 0;
  }
};

/**
 * Run all pending migrations in order within an exclusive transaction.
 */
const runMigrations = async (
  db: SQLiteDatabase,
  fromVersion: number,
): Promise<void> => {
  const pendingMigrations = MIGRATIONS.filter((m) => m.version > fromVersion);

  if (pendingMigrations.length === 0) return;

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const migration of pendingMigrations) {
      await txn.execAsync(migration.sql);
      await txn.runAsync(
        "UPDATE sync_state SET value = ? WHERE key = 'schema_version'",
        [String(migration.version)],
      );
    }
  });
};

/**
 * Store a sync state value.
 */
const setSyncState = async (
  db: SQLiteDatabase,
  key: string,
  value: string,
): Promise<void> => {
  await db.runAsync(
    'INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)',
    [key, value],
  );
};

/**
 * Get a sync state value.
 */
const getSyncState = async (
  db: SQLiteDatabase,
  key: string,
): Promise<string | null> => {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_state WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
};

export {
  DATABASE_NAME,
  initializeDatabase,
  getSchemaVersion,
  setSyncState,
  getSyncState,
};
