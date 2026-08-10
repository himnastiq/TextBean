/**
 * ChatsPage — main conversation list screen.
 *
 * Features:
 * - Sticky header with app logo + filter chips (All / per platform)
 * - Platform-filtered conversation list with SwipeableRow
 * - Pull-to-refresh triggers sync
 * - FAB for new conversation
 * - Empty state with onboarding prompt
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Colors, Typography, Spacing, Radius, ConversationRowHeight, useScheme } from '@/constants/theme';
import { BRIDGED_PLATFORMS, PLATFORM_CONFIGS } from '@/constants/platforms';
import { useRoomStore, selectSortedRooms } from '@/stores/room-store';
import { useAuthStore } from '@/stores/auth-store';
import type { Room } from '@/types/room';
import type { PlatformId } from '@/types/platform';
import { formatRelativeTime } from '@/utils/date-utils';

import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Shimmer from '@/components/ui/Shimmer';
import SwipeableRow from '@/components/ui/SwipeableRow';

/* ─── Platform filter chip ───────────────────────────────── */

function PlatformChip({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  const scheme = useScheme();
  const C = Colors[scheme];

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? color : C.backgroundElement, borderColor: active ? color : 'transparent' },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? '#fff' : C.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

/* ─── Conversation row ───────────────────────────────────── */

function ConversationRow({ room }: { room: Room }) {
  const scheme = useScheme();
  const C = Colors[scheme];
  const platformConfig = PLATFORM_CONFIGS[room.platform];
  const platformColor = scheme === 'dark' ? platformConfig.darkColor : platformConfig.color;

  const handlePress = useCallback(() => {
    router.push(`/chat/${room.roomId}`);
  }, [room.roomId]);

  const db = useSQLiteContext();
  const { archiveRoom, togglePin, toggleMute } = useRoomStore();

  return (
    <SwipeableRow
      leftActions={[
        {
          label: room.isPinned ? 'Unpin' : 'Pin',
          icon: '📌',
          color: '#FFB800',
          onPress: () => togglePin(db, room.roomId),
        },
      ]}
      rightActions={[
        {
          label: room.isMuted ? 'Unmute' : 'Mute',
          icon: '🔇',
          color: '#8B98A5',
          onPress: () => toggleMute(db, room.roomId),
        },
        {
          label: 'Archive',
          icon: '📁',
          color: '#536471',
          onPress: () => archiveRoom(db, room.roomId),
        },
      ]}
    >
      <Pressable
        id={`chat-row-${room.roomId}`}
        style={({ pressed }) => [styles.row, { backgroundColor: pressed ? C.backgroundSelected : C.background }]}
        onPress={handlePress}
      >
        {/* Platform color accent bar */}
        <View style={[styles.accentBar, { backgroundColor: platformColor }]} />

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <Avatar
            imageUrl={room.avatarUrl ?? null}
            name={room.name}
            size="md"
            platform={room.platform}
          />
        </View>

        {/* Content */}
        <View style={styles.rowContent}>
          <View style={styles.rowTopLine}>
            <View style={styles.rowNameRow}>
              {room.isPinned ? <Text style={styles.pinIcon}>📌 </Text> : null}
              {room.isMuted ? <Text style={styles.muteIcon}>🔇 </Text> : null}
              <Text
                style={[styles.roomName, { color: C.text, fontWeight: room.unreadCount > 0 ? '700' : '500' }]}
                numberOfLines={1}
              >
                {room.name}
              </Text>
            </View>
            <Text style={[styles.timestamp, { color: C.textTertiary }]}>{formatRelativeTime(room.lastActivityAt)}</Text>
          </View>
          <View style={styles.rowBottomLine}>
            <Text
              style={[
                styles.lastMessage,
                { color: room.unreadCount > 0 ? C.text : C.textSecondary, fontWeight: room.unreadCount > 0 ? '500' : '400' },
              ]}
              numberOfLines={1}
            >
              {room.lastMessagePreview ?? 'No messages yet'}
            </Text>
            {room.unreadCount > 0 && !room.isMuted ? (
              <Badge count={room.unreadCount} color={platformColor} />
            ) : null}
          </View>
        </View>
      </Pressable>
    </SwipeableRow>
  );
}

/* ─── Shimmer skeleton rows ──────────────────────────────── */

function SkeletonRows() {
  return (
    <>
      {[...Array(8)].map((_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <Shimmer width={44} height={44} borderRadius={22} style={styles.skeletonAvatar} />
          <View style={styles.skeletonContent}>
            <Shimmer width={`${60 + (i % 3) * 15}%` as any} height={14} borderRadius={7} style={styles.skeletonLine} />
            <Shimmer width={`${40 + (i % 4) * 12}%` as any} height={12} borderRadius={6} />
          </View>
        </View>
      ))}
    </>
  );
}

/* ─── Empty state ────────────────────────────────────────── */

function EmptyChats({ platformFilter }: { platformFilter: string }) {
  const scheme = useScheme();
  const C = Colors[scheme];

  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{platformFilter === 'all' ? '💬' : '🔗'}</Text>
      <Text style={[styles.emptyTitle, { color: C.text }]}>
        {platformFilter === 'all' ? 'No conversations yet' : `No ${PLATFORM_CONFIGS[platformFilter as PlatformId]?.displayName ?? ''} chats`}
      </Text>
      <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>
        {platformFilter === 'all'
          ? 'Connect a bridge to start chatting with your existing contacts'
          : 'Connect this bridge in the Bridges tab to see your chats'}
      </Text>
      {platformFilter === 'all' && (
        <Pressable
          id="empty-go-bridges"
          style={styles.emptyButton}
          onPress={() => router.push('/(tabs)/bridges')}
        >
          <Text style={styles.emptyButtonText}>Set up bridges →</Text>
        </Pressable>
      )}
    </View>
  );
}

/* ─── ChatsPage ──────────────────────────────────────────── */

export default function ChatsPage() {
  const scheme = useScheme();
  const C = Colors[scheme];
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();

  const { syncStatus } = useAuthStore();
  const { filter, setFilter, loadRooms, isLoading } = useRoomStore();
  const sortedRooms = useRoomStore(selectSortedRooms);

  const isRefreshing = syncStatus === 'syncing';
  const headerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadRooms(db);
  }, []);

  const handleRefresh = useCallback(() => {
    // Pull-to-refresh just re-triggers room load; actual sync comes from MatrixClient
    loadRooms(db);
  }, [db]);

  const handlePlatformFilter = useCallback(
    (platform: PlatformId | 'all') => {
      setFilter({ platform });
    },
    [setFilter],
  );

  const renderItem = useCallback(
    ({ item }: { item: Room }) => <ConversationRow room={item} />,
    [],
  );

  const keyExtractor = useCallback((item: Room) => item.roomId, []);

  const ALL_FILTERS: Array<{ id: PlatformId | 'all'; label: string; color: string }> = [
    { id: 'all', label: 'All', color: C.accent },
    ...BRIDGED_PLATFORMS.map((p) => ({
      id: p,
      label: PLATFORM_CONFIGS[p].displayName,
      color: PLATFORM_CONFIGS[p].color,
    })),
  ];

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <Animated.View style={[styles.header, { paddingTop: insets.top + Spacing.sm, backgroundColor: C.background, opacity: headerOpacity }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: C.text }]}>Messages</Text>
          <View style={styles.headerActions}>
            {syncStatus === 'syncing' || syncStatus === 'reconnecting' ? (
              <Text style={[styles.syncLabel, { color: C.textTertiary }]}>Syncing…</Text>
            ) : null}
          </View>
        </View>

        {/* Platform filter chips */}
        <FlatList
          horizontal
          data={ALL_FILTERS}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipList}
          renderItem={({ item }) => (
            <PlatformChip
              label={item.label}
              active={filter.platform === item.id}
              color={item.color}
              onPress={() => handlePlatformFilter(item.id)}
            />
          )}
        />
      </Animated.View>

      {/* Room list */}
      {isLoading && sortedRooms.length === 0 ? (
        <SkeletonRows />
      ) : (
        <FlatList
          id="chat-list"
          data={sortedRooms}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContent,
            sortedRooms.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={<EmptyChats platformFilter={filter.platform} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={C.accent}
              colors={[C.accent]}
            />
          }
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: C.borderLight }]} />
          )}
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({
            length: ConversationRowHeight,
            offset: ConversationRowHeight * index,
            index,
          })}
        />
      )}

      {/* FAB */}
      <Pressable
        id="new-chat-fab"
        style={[styles.fab, { bottom: insets.bottom + 72 }]}
        onPress={() => {
          // TODO: open room picker — Phase 6
        }}
      >
        <Text style={styles.fabIcon}>✏️</Text>
      </Pressable>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    ...Typography.largeTitle,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  syncLabel: {
    ...Typography.caption,
  },
  chipList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  chip: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1.5,
  },
  chipText: {
    ...Typography.label,
    fontWeight: '600',
  },

  // List
  listContent: {
    flexGrow: 1,
  },
  listContentEmpty: {
    justifyContent: 'center',
  },

  // Conversation row
  row: {
    flexDirection: 'row',
    height: ConversationRowHeight,
    alignItems: 'center',
    paddingRight: Spacing.lg,
  },
  accentBar: {
    width: 3,
    height: '55%',
    borderRadius: Radius.full,
    marginRight: Spacing.md,
    marginLeft: Spacing.xs,
  },
  avatarContainer: {
    marginRight: Spacing.md,
  },
  rowContent: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  rowTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  pinIcon: {
    fontSize: 11,
  },
  muteIcon: {
    fontSize: 11,
  },
  roomName: {
    ...Typography.body,
    flex: 1,
  },
  timestamp: {
    ...Typography.caption,
  },
  rowBottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    ...Typography.small,
    flex: 1,
    marginRight: Spacing.sm,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.lg + 3 + Spacing.md + 44 + Spacing.md,
  },

  // Skeleton
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    height: ConversationRowHeight,
    gap: Spacing.md,
  },
  skeletonAvatar: {},
  skeletonContent: {
    flex: 1,
    gap: Spacing.sm,
  },
  skeletonLine: {},

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
    paddingTop: Spacing.massive,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.headline,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.small,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  emptyButton: {
    backgroundColor: '#1D9BF0',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  emptyButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: '#fff',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1D9BF0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#1D9BF0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  fabIcon: {
    fontSize: 22,
  },
});
