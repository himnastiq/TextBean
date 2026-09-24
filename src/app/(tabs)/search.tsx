/**
 * SearchPage — global full-text search across all conversations.
 *
 * Features:
 * - Auto-focused search input
 * - Real-time results debounced at 200ms
 * - Results grouped by conversation with highlighted matches
 * - Recent searches history
 * - FTS5-powered search via SearchStore
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { Colors, Typography, Spacing, Radius, useScheme } from '@/constants/theme';
import { PLATFORM_CONFIGS } from '@/constants/platforms';
import { useSearchStore } from '@/stores/search-store';
import Avatar from '@/components/ui/Avatar';
import type { MessageSearchResult } from '@/types/message';

/* ─── Result item ────────────────────────────────────────── */

function SearchResultItem({ result, query }: { result: MessageSearchResult; query: string }) {
  const scheme = useScheme();
  const C = Colors[scheme];
  const platformConfig = PLATFORM_CONFIGS[result.message.platform ?? 'matrix'];

  const handlePress = useCallback(() => {
    router.push(`/chat/${result.message.roomId}`);
  }, [result.message.roomId]);

  // Highlight matched portion
  const renderContent = () => {
    const text = result.snippet || result.message.content;
    const queryLower = query.toLowerCase();
    if (!queryLower || !text) {
      return <Text style={[styles.resultContent, { color: C.textSecondary }]} numberOfLines={2}>{text}</Text>;
    }

    const idx = text.toLowerCase().indexOf(queryLower);
    if (idx === -1) {
      return <Text style={[styles.resultContent, { color: C.textSecondary }]} numberOfLines={2}>{text}</Text>;
    }

    return (
      <Text style={[styles.resultContent, { color: C.textSecondary }]} numberOfLines={2}>
        {text.slice(0, idx)}
        <Text style={[styles.highlight, { backgroundColor: C.accentLight, color: C.accent }]}>
          {text.slice(idx, idx + queryLower.length)}
        </Text>
        {text.slice(idx + queryLower.length)}
      </Text>
    );
  };

  return (
    <Pressable
      id={`search-result-${result.message.eventId}`}
      style={({ pressed }) => [styles.resultItem, { backgroundColor: pressed ? C.backgroundSelected : C.background }]}
      onPress={handlePress}
    >
      <Avatar imageUrl={null} name={result.roomName} size="sm" platform={result.message.platform} />
      <View style={styles.resultText}>
        <View style={styles.resultHeader}>
          <Text style={[styles.resultRoom, { color: C.text }]} numberOfLines={1}>
            {result.roomName}
          </Text>
          <View style={[styles.platformPill, { backgroundColor: platformConfig.color + '22' }]}>
            <Text style={[styles.platformPillText, { color: platformConfig.color }]}>
              {platformConfig.displayName}
            </Text>
          </View>
        </View>
        <Text style={[styles.resultSender, { color: C.textTertiary }]}>{result.message.senderDisplayName}</Text>
        {renderContent()}
      </View>
    </Pressable>
  );
}

/* ─── Recent search chip ─────────────────────────────────── */

function RecentChip({ query, onPress, onRemove }: { query: string; onPress: () => void; onRemove: () => void }) {
  const scheme = useScheme();
  const C = Colors[scheme];

  return (
    <View style={[styles.recentChip, { backgroundColor: C.backgroundElement }]}>
      <Pressable onPress={onPress} style={styles.recentChipLabel}>
        <Text style={[styles.recentChipText, { color: C.text }]}><Ionicons name="search-outline" size={12} color={C.textSecondary} /> {query}</Text>
      </Pressable>
      <Pressable onPress={onRemove} hitSlop={8} style={styles.recentChipRemove}>
        <Text style={{ color: C.textTertiary, fontSize: 12 }}>✕</Text>
      </Pressable>
    </View>
  );
}

/* ─── SearchPage ─────────────────────────────────────────── */

export default function SearchPage() {
  const scheme = useScheme();
  const C = Colors[scheme];
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const inputRef = useRef<TextInput>(null);

  const { query, results, isSearching, recentSearches, setQuery, search, clearSearch, addRecentSearch, removeRecentSearch } = useSearchStore();
  const [localQuery, setLocalQuery] = useState(query);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  const handleQueryChange = useCallback(
    (text: string) => {
      setLocalQuery(text);
      setQuery(text);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      if (!text.trim()) {
        clearSearch();
        return;
      }

      debounceTimer.current = setTimeout(() => {
        search(db);
      }, 200);
    },
    [db, setQuery, search, clearSearch],
  );

  const handleRecentPress = useCallback(
    (q: string) => {
      setLocalQuery(q);
      setQuery(q);
      search(db);
    },
    [db, setQuery, search],
  );

  const handleClear = useCallback(() => {
    setLocalQuery('');
    clearSearch();
    inputRef.current?.focus();
  }, [clearSearch]);

  const handleResultPress = useCallback((result: MessageSearchResult) => {
    addRecentSearch(localQuery);
  }, [localQuery, addRecentSearch]);

  const showRecent = !localQuery.trim() && recentSearches.length > 0;
  const showResults = localQuery.trim().length > 0;
  const hasResults = results.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={[styles.title, { color: C.text }]}>Search</Text>

        {/* Search input */}
        <View style={[styles.searchBar, { backgroundColor: C.backgroundElement }]}>
          <Ionicons name="search-outline" size={18} color={C.textTertiary} />
          <TextInput
            id="search-input"
            ref={inputRef}
            style={[styles.searchInput, { color: C.text }]}
            placeholder="Search messages..."
            placeholderTextColor={C.textTertiary}
            value={localQuery}
            onChangeText={handleQueryChange}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {localQuery.length > 0 && (
            <Pressable id="search-clear" onPress={handleClear} hitSlop={8}>
              <Text style={[styles.clearIcon, { color: C.textSecondary }]}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Recent queries */}
      {showRecent && (
        <View style={styles.recentSection}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>Recent</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentList}>
            {recentSearches.map((q) => (
              <RecentChip
                key={q}
                query={q}
                onPress={() => handleRecentPress(q)}
                onRemove={() => removeRecentSearch(q)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Results */}
      {showResults && (
        <>
          {isSearching && (
            <Text style={[styles.searchingLabel, { color: C.textTertiary }]}>Searching…</Text>
          )}

          {!isSearching && !hasResults && localQuery.trim().length > 1 && (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={C.textTertiary} style={{ marginBottom: Spacing.lg }} />
              <Text style={[styles.emptyTitle, { color: C.text }]}>No results found</Text>
              <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>
                Try a different search term
              </Text>
            </View>
          )}

          {hasResults && (
            <>
              <Text style={[styles.resultCount, { color: C.textTertiary }]}>
                {results.length} {results.length === 1 ? 'result' : 'results'}
              </Text>
              <FlatList
                id="search-results-list"
                data={results}
                keyExtractor={(item) => item.message.eventId}
                renderItem={({ item }) => (
                  <SearchResultItem
                    result={item}
                    query={localQuery}
                  />
                )}
                contentContainerStyle={styles.resultsList}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => (
                  <View style={[styles.separator, { backgroundColor: C.borderLight }]} />
                )}
              />
            </>
          )}
        </>
      )}

      {/* Initial state */}
      {!showResults && !showRecent && (
        <View style={styles.initialState}>
          <Ionicons name="chatbubbles-outline" size={48} color={C.textTertiary} style={{ opacity: 0.4 }} />
          <Text style={[styles.initialText, { color: C.textSecondary }]}>
            Search across all your conversations
          </Text>
        </View>
      )}
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  title: {
    ...Typography.largeTitle,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
  },
  clearIcon: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: Spacing.xs,
  },

  // Recent
  recentSection: {
    paddingTop: Spacing.md,
  },
  sectionLabel: {
    ...Typography.label,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  recentList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    height: 36,
  },
  recentChipLabel: {
    paddingRight: Spacing.xs,
  },
  recentChipText: {
    ...Typography.small,
  },
  recentChipRemove: {
    padding: Spacing.xs,
  },

  // Results
  resultCount: {
    ...Typography.label,
    fontWeight: '600',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  resultsList: {
    paddingBottom: Spacing.xl,
  },
  resultItem: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  resultText: {
    flex: 1,
    gap: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  resultRoom: {
    ...Typography.body,
    fontWeight: '600',
    flex: 1,
  },
  platformPill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
  },
  platformPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  resultSender: {
    ...Typography.caption,
  },
  resultContent: {
    ...Typography.small,
    lineHeight: 20,
    marginTop: 2,
  },
  highlight: {
    borderRadius: 2,
    fontWeight: '600',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.lg + 28 + Spacing.md,
  },

  // Status
  searchingLabel: {
    ...Typography.small,
    textAlign: 'center',
    paddingTop: Spacing.xl,
  },

  // Empty / initial
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.massive,
    paddingHorizontal: Spacing.xxxl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.headline,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    ...Typography.small,
    textAlign: 'center',
  },
  initialState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingBottom: 80,
  },
  initialEmoji: {
    fontSize: 48,
    opacity: 0.4,
  },
  initialText: {
    ...Typography.body,
    textAlign: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
});
