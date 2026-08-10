/**
 * Room/conversation list state store.
 *
 * Drives the ChatsPage — holds all rooms, filter/sort state,
 * and actions for archive/pin/mute. Reads from SQLite via
 * repositories and updates reactively from sync events.
 */

import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { PlatformId } from '@/types/platform';
import type { Room, RoomFilter, TypingState } from '@/types/room';
import * as RoomRepo from '@/database/repositories/RoomRepository';

interface RoomState {
  /** All rooms indexed by room_id for O(1) lookup */
  rooms: Map<string, Room>;
  /** Currently active/open room ID (the ChatPage the user is viewing) */
  activeRoomId: string | null;
  /** Current filter/search state */
  filter: RoomFilter;
  /** Typing indicator state per room */
  typingByRoom: Map<string, TypingState>;
  /** Whether the room list is loading from DB */
  isLoading: boolean;
}

interface RoomActions {
  /** Load all rooms from the database into the store */
  loadRooms: (db: SQLiteDatabase) => Promise<void>;
  /** Set or update a single room (called by EventHandler on sync events) */
  setRoom: (room: Room) => void;
  /** Batch set rooms (called during initial sync) */
  setRooms: (rooms: Room[]) => void;
  /** Set the currently active/open room */
  setActiveRoom: (roomId: string | null) => void;
  /** Update filter criteria */
  setFilter: (filter: Partial<RoomFilter>) => void;
  /** Archive a room */
  archiveRoom: (db: SQLiteDatabase, roomId: string) => Promise<void>;
  /** Unarchive a room */
  unarchiveRoom: (db: SQLiteDatabase, roomId: string) => Promise<void>;
  /** Toggle pin status */
  togglePin: (db: SQLiteDatabase, roomId: string) => Promise<void>;
  /** Toggle mute status */
  toggleMute: (db: SQLiteDatabase, roomId: string) => Promise<void>;
  /** Update unread count for a room */
  updateUnreadCount: (roomId: string, count: number) => void;
  /** Reset unread count to zero (when user opens the room) */
  clearUnread: (db: SQLiteDatabase, roomId: string) => Promise<void>;
  /** Update typing indicator for a room */
  setTyping: (typing: TypingState) => void;
  /** Remove a room from the store */
  removeRoom: (roomId: string) => void;
}

/** Derived selectors — import these for memoized access */

/** Get rooms sorted by pinned-first, then last activity descending */
const selectSortedRooms = (state: RoomState): Room[] => {
  const rooms = Array.from(state.rooms.values());
  const { platform, searchQuery, showArchived } = state.filter;

  let filtered = rooms;

  // Filter by archive status
  if (!showArchived) {
    filtered = filtered.filter((r) => !r.isArchived);
  } else {
    filtered = filtered.filter((r) => r.isArchived);
  }

  // Filter by platform
  if (platform !== 'all') {
    filtered = filtered.filter((r) => r.platform === platform);
  }

  // Filter by search query
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter((r) => r.name.toLowerCase().includes(query));
  }

  // Sort: pinned first, then by last activity
  return filtered.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.lastActivityAt - a.lastActivityAt;
  });
};

/** Get rooms filtered by a specific platform */
const selectRoomsByPlatform = (platform: PlatformId) => (state: RoomState): Room[] => {
  return Array.from(state.rooms.values())
    .filter((r) => r.platform === platform && !r.isArchived)
    .sort((a, b) => b.lastActivityAt - a.lastActivityAt);
};

/** Get total unread count across all rooms */
const selectTotalUnreadCount = (state: RoomState): number => {
  let count = 0;
  for (const room of state.rooms.values()) {
    if (!room.isArchived && !room.isMuted) {
      count += room.unreadCount;
    }
  }
  return count;
};

/** Get the currently active room object */
const selectActiveRoom = (state: RoomState & RoomActions): Room | null => {
  if (!state.activeRoomId) return null;
  return state.rooms.get(state.activeRoomId) ?? null;
};

const useRoomStore = create<RoomState & RoomActions>()((set, get) => ({
  // --- State ---
  rooms: new Map(),
  activeRoomId: null,
  filter: {
    platform: 'all',
    searchQuery: '',
    showArchived: false,
  },
  typingByRoom: new Map(),
  isLoading: false,

  // --- Actions ---

  loadRooms: async (db: SQLiteDatabase) => {
    set({ isLoading: true });
    try {
      const dbRooms = await RoomRepo.getAllRooms(db);
      const map = new Map<string, Room>();
      for (const room of dbRooms) {
        map.set(room.roomId, room);
      }
      set({ rooms: map, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setRoom: (room: Room) => {
    set((state) => {
      const next = new Map(state.rooms);
      next.set(room.roomId, room);
      return { rooms: next };
    });
  },

  setRooms: (rooms: Room[]) => {
    set((state) => {
      const next = new Map(state.rooms);
      for (const room of rooms) {
        next.set(room.roomId, room);
      }
      return { rooms: next };
    });
  },

  setActiveRoom: (roomId: string | null) => {
    set({ activeRoomId: roomId });
  },

  setFilter: (filter: Partial<RoomFilter>) => {
    set((state) => ({
      filter: { ...state.filter, ...filter },
    }));
  },

  archiveRoom: async (db: SQLiteDatabase, roomId: string) => {
    await RoomRepo.setArchived(db, roomId, true);
    set((state) => {
      const next = new Map(state.rooms);
      const room = next.get(roomId);
      if (room) {
        next.set(roomId, { ...room, isArchived: true });
      }
      return { rooms: next };
    });
  },

  unarchiveRoom: async (db: SQLiteDatabase, roomId: string) => {
    await RoomRepo.setArchived(db, roomId, false);
    set((state) => {
      const next = new Map(state.rooms);
      const room = next.get(roomId);
      if (room) {
        next.set(roomId, { ...room, isArchived: false });
      }
      return { rooms: next };
    });
  },

  togglePin: async (db: SQLiteDatabase, roomId: string) => {
    const room = get().rooms.get(roomId);
    if (!room) return;

    const newPinned = !room.isPinned;
    await RoomRepo.setPinned(db, roomId, newPinned);

    set((state) => {
      const next = new Map(state.rooms);
      const current = next.get(roomId);
      if (current) {
        next.set(roomId, { ...current, isPinned: newPinned });
      }
      return { rooms: next };
    });
  },

  toggleMute: async (db: SQLiteDatabase, roomId: string) => {
    const room = get().rooms.get(roomId);
    if (!room) return;

    const newMuted = !room.isMuted;
    await RoomRepo.setMuted(db, roomId, newMuted);

    set((state) => {
      const next = new Map(state.rooms);
      const current = next.get(roomId);
      if (current) {
        next.set(roomId, { ...current, isMuted: newMuted });
      }
      return { rooms: next };
    });
  },

  updateUnreadCount: (roomId: string, count: number) => {
    set((state) => {
      const next = new Map(state.rooms);
      const room = next.get(roomId);
      if (room) {
        next.set(roomId, { ...room, unreadCount: count });
      }
      return { rooms: next };
    });
  },

  clearUnread: async (db: SQLiteDatabase, roomId: string) => {
    await RoomRepo.updateUnreadCount(db, roomId, 0);
    set((state) => {
      const next = new Map(state.rooms);
      const room = next.get(roomId);
      if (room) {
        next.set(roomId, { ...room, unreadCount: 0 });
      }
      return { rooms: next };
    });
  },

  setTyping: (typing: TypingState) => {
    set((state) => {
      const next = new Map(state.typingByRoom);
      if (typing.userIds.length === 0) {
        next.delete(typing.roomId);
      } else {
        next.set(typing.roomId, typing);
      }
      return { typingByRoom: next };
    });
  },

  removeRoom: (roomId: string) => {
    set((state) => {
      const next = new Map(state.rooms);
      next.delete(roomId);
      return { rooms: next };
    });
  },
}));

export { useRoomStore, selectSortedRooms, selectRoomsByPlatform, selectTotalUnreadCount, selectActiveRoom };
