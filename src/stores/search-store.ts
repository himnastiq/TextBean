/**
 * Full-text search state store.
 *
 * Powers the SearchPage — manages query input, scoped search
 * (all rooms or single room), debounced FTS5 queries, and
 * recent search history.
 */

import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { MessageSearchResult } from '@/types/message';
import * as MessageRepo from '@/database/repositories/MessageRepository';

/** Maximum number of recent searches to retain */
const MAX_RECENT_SEARCHES = 10;

interface SearchState {
  /** Current search query */
  query: string;
  /** Search results from FTS5 */
  results: MessageSearchResult[];
  /** Whether a search is currently running */
  isSearching: boolean;
  /** Scope: search all rooms or within a specific room */
  searchScope: 'all' | 'room';
  /** Room ID when scope is 'room' */
  scopedRoomId: string | null;
  /** Recent search queries (most recent first) */
  recentSearches: string[];
}

interface SearchActions {
  /** Update the query string (does not trigger search) */
  setQuery: (query: string) => void;
  /** Execute a full-text search with the current query */
  search: (db: SQLiteDatabase) => Promise<void>;
  /** Set the search scope */
  setScope: (scope: 'all' | 'room', roomId?: string) => void;
  /** Clear query, results, and reset state */
  clearSearch: () => void;
  /** Add a query to recent searches */
  addRecentSearch: (query: string) => void;
  /** Remove a specific recent search */
  removeRecentSearch: (query: string) => void;
  /** Clear all recent searches */
  clearRecentSearches: () => void;
}

const useSearchStore = create<SearchState & SearchActions>()((set, get) => ({
  // --- State ---
  query: '',
  results: [],
  isSearching: false,
  searchScope: 'all',
  scopedRoomId: null,
  recentSearches: [],

  // --- Actions ---

  setQuery: (query: string) => {
    set({ query });
  },

  search: async (db: SQLiteDatabase) => {
    const { query, searchScope, scopedRoomId } = get();
    const trimmed = query.trim();

    if (!trimmed) {
      set({ results: [], isSearching: false });
      return;
    }

    set({ isSearching: true });

    try {
      let results: MessageSearchResult[];

      if (searchScope === 'room' && scopedRoomId) {
        results = await MessageRepo.searchMessagesInRoom(db, scopedRoomId, trimmed);
      } else {
        results = await MessageRepo.searchMessages(db, trimmed);
      }

      set({ results, isSearching: false });
    } catch {
      set({ results: [], isSearching: false });
    }
  },

  setScope: (scope: 'all' | 'room', roomId?: string) => {
    set({
      searchScope: scope,
      scopedRoomId: scope === 'room' ? (roomId ?? null) : null,
      results: [],
    });
  },

  clearSearch: () => {
    set({
      query: '',
      results: [],
      isSearching: false,
    });
  },

  addRecentSearch: (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    set((state) => {
      // Remove duplicate if it already exists
      const filtered = state.recentSearches.filter((s) => s !== trimmed);
      // Add to front, cap at max
      const next = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      return { recentSearches: next };
    });
  },

  removeRecentSearch: (query: string) => {
    set((state) => ({
      recentSearches: state.recentSearches.filter((s) => s !== query),
    }));
  },

  clearRecentSearches: () => {
    set({ recentSearches: [] });
  },
}));

export { useSearchStore };
