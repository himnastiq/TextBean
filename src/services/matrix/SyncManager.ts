/**
 * Sync manager — orchestrates the Matrix /sync loop and dispatches
 * events to the database and Zustand stores.
 *
 * Listens to matrix-js-sdk events and translates them into
 * TextBean's internal data format.
 */

import {
  type MatrixClient,
  ClientEvent,
  RoomEvent,
  RoomMemberEvent,
  SyncState,
  type Room as MatrixRoom,
  type MatrixEvent,
} from 'matrix-js-sdk';
import type { IRoomTimelineData } from 'matrix-js-sdk/lib/models/event-timeline-set';

import type { SQLiteDatabase } from 'expo-sqlite';
import { getClient } from './MatrixClient';
import { handleTimelineEvent, handleMemberEvent, handleRoomUpdate } from './EventHandler';

/** Sync status for the UI to observe */
type SyncStatus = 'initial' | 'syncing' | 'synced' | 'reconnecting' | 'error' | 'stopped';

/** Callback type for sync status updates */
type SyncStatusCallback = (status: SyncStatus, error?: string) => void;

/** Active listeners cleanup functions */
let cleanupFns: Array<() => void> = [];

/**
 * Start listening to Matrix client events and dispatch to DB/stores.
 *
 * @param db - SQLiteDatabase instance from useSQLiteContext
 * @param onStatusChange - Callback for sync status updates
 * @returns Cleanup function to remove all listeners
 */
const startSyncListeners = (
  db: SQLiteDatabase,
  onStatusChange: SyncStatusCallback,
): (() => void) => {
  const client = getClient();

  // --- Sync state changes ---
  const handleSyncState = (state: SyncState, prevState: SyncState | null) => {
    switch (state) {
      case SyncState.Prepared:
        onStatusChange('synced');
        // Process initial room list after first sync
        processInitialRooms(client, db);
        break;
      case SyncState.Syncing:
        onStatusChange('syncing');
        break;
      case SyncState.Reconnecting:
        onStatusChange('reconnecting');
        break;
      case SyncState.Error:
        onStatusChange('error', 'Sync failed');
        break;
      case SyncState.Stopped:
        onStatusChange('stopped');
        break;
    }
  };

  client.on(ClientEvent.Sync, handleSyncState);
  cleanupFns.push(() => client.off(ClientEvent.Sync, handleSyncState));

  // --- Room timeline events (new messages) ---
  // Only process live events (not back-pagination or removed events)
  const handleTimeline = (
    event: MatrixEvent,
    room: MatrixRoom | undefined,
    toStartOfTimeline: boolean | undefined,
    removed: boolean,
    data: IRoomTimelineData,
  ) => {
    if (!room || removed || !data.liveEvent || toStartOfTimeline) return;
    handleTimelineEvent(db, event, room);
  };
  client.on(RoomEvent.Timeline, handleTimeline);
  cleanupFns.push(() => client.off(RoomEvent.Timeline, handleTimeline));

  // --- Room name/avatar/topic changes ---
  const handleRoomName = (room: MatrixRoom) => {
    handleRoomUpdate(db, room);
  };
  client.on(RoomEvent.Name, handleRoomName);
  cleanupFns.push(() => client.off(RoomEvent.Name, handleRoomName));

  // --- Membership changes ---
  const handleMembership = (event: MatrixEvent, member: unknown) => {
    handleMemberEvent(db, event);
  };
  client.on(RoomMemberEvent.Membership, handleMembership);
  cleanupFns.push(() => client.off(RoomMemberEvent.Membership, handleMembership));

  // --- Room receipt events (read markers) ---
  const handleReceipt = (event: MatrixEvent, room: MatrixRoom) => {
    // Update unread counts when we receive read receipts
    handleRoomUpdate(db, room);
  };
  client.on(RoomEvent.Receipt, handleReceipt);
  cleanupFns.push(() => client.off(RoomEvent.Receipt, handleReceipt));

  // --- New rooms ---
  const handleNewRoom = (room: MatrixRoom) => {
    handleRoomUpdate(db, room);
  };
  client.on(ClientEvent.Room, handleNewRoom);
  cleanupFns.push(() => client.off(ClientEvent.Room, handleNewRoom));

  // Return master cleanup function
  return () => {
    for (const cleanup of cleanupFns) {
      cleanup();
    }
    cleanupFns = [];
  };
};

/**
 * Process the initial set of rooms after first sync (PREPARED state).
 * Batch-inserts all joined rooms into the database.
 */
const processInitialRooms = async (
  client: MatrixClient,
  db: SQLiteDatabase,
): Promise<void> => {
  const rooms = client.getRooms();

  for (const room of rooms) {
    await handleRoomUpdate(db, room);
  }
};

/**
 * Stop all sync listeners.
 */
const stopSyncListeners = (): void => {
  for (const cleanup of cleanupFns) {
    cleanup();
  }
  cleanupFns = [];
};

export { startSyncListeners, stopSyncListeners };
export type { SyncStatus, SyncStatusCallback };
