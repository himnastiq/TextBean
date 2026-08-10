/**
 * ConversationListItem — an individual row in the unified inbox.
 *
 * Renders avatar with platform badge, contact name (bold when unread),
 * last message preview, relative timestamp, unread count badge,
 * muted/pinned indicators, and a platform-colored left border.
 *
 * Designed for FlatList usage in ChatsPage with animated press feedback.
 */

import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Colors, Typography, Spacing, Radius, ConversationRowHeight, useScheme } from '@/constants/theme';
import { PLATFORM_CONFIGS } from '@/constants/platforms';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { formatRelativeTime } from '@/utils/date-utils';
import type { Room } from '@/types/room';

/* ─── Props ──────────────────────────────────────────────── */

interface ConversationListItemProps {
  room: Room;
  /** Called when the row is pressed */
  onPress?: (room: Room) => void;
  /** Called when a swipe action completes */
  onArchive?: (roomId: string) => void;
  onPin?: (roomId: string) => void;
  onMute?: (roomId: string) => void;
}

/* ─── Component ──────────────────────────────────────────── */

function ConversationListItem({
  room,
  onPress,
}: ConversationListItemProps) {
  const scheme = useScheme();
  const C = Colors[scheme];
  const platformConfig = PLATFORM_CONFIGS[room.platform];
  const platformColor = scheme === 'dark' ? platformConfig.darkColor : platformConfig.color;
  const scale = useRef(new Animated.Value(1)).current;

  const hasUnread = room.unreadCount > 0 && !room.isMuted;

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(room);
    } else {
      router.push(`/chat/${room.roomId}`);
    }
  }, [room, onPress]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  // Build sender prefix for group messages
  const senderPrefix =
    !room.isDirect && room.lastMessageSender
      ? `${room.lastMessageSender.split(' ')[0]}: `
      : '';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        id={`conversation-${room.roomId}`}
        style={[
          styles.container,
          { backgroundColor: C.background },
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Platform accent stripe */}
        <View style={[styles.accentStripe, { backgroundColor: platformColor }]} />

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Avatar
            imageUrl={room.avatarUrl}
            name={room.name}
            size="md"
            platform={room.platform}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Top row: name + timestamp */}
          <View style={styles.topRow}>
            <View style={styles.nameRow}>
              {/* Pinned indicator */}
              {room.isPinned && (
                <Text style={styles.pinIcon}>📌</Text>
              )}
              <Text
                style={[
                  styles.name,
                  { color: C.text },
                  hasUnread && styles.nameUnread,
                ]}
                numberOfLines={1}
              >
                {room.name}
              </Text>
              {/* Muted indicator */}
              {room.isMuted && (
                <Text style={[styles.mutedIcon, { color: C.textTertiary }]}>🔇</Text>
              )}
            </View>
            <Text
              style={[
                styles.timestamp,
                { color: hasUnread ? platformColor : C.textTertiary },
              ]}
            >
              {formatRelativeTime(room.lastActivityAt)}
            </Text>
          </View>

          {/* Bottom row: preview + badge */}
          <View style={styles.bottomRow}>
            <Text
              style={[
                styles.preview,
                { color: hasUnread ? C.textSecondary : C.textTertiary },
                hasUnread && styles.previewUnread,
              ]}
              numberOfLines={2}
            >
              {senderPrefix}
              {room.lastMessagePreview ?? 'No messages yet'}
            </Text>

            {hasUnread && (
              <Badge count={room.unreadCount} color={platformColor} />
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ConversationRowHeight,
    paddingRight: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  accentStripe: {
    width: 3,
    height: '60%',
    borderRadius: 2,
    marginRight: 0,
  },
  avatarSection: {
    paddingHorizontal: Spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  name: {
    ...Typography.body,
    fontWeight: '500',
    flex: 1,
  },
  nameUnread: {
    fontWeight: '700',
  },
  pinIcon: {
    fontSize: 11,
  },
  mutedIcon: {
    fontSize: 12,
    marginLeft: 2,
  },
  timestamp: {
    ...Typography.caption,
    fontWeight: '500',
    flexShrink: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  preview: {
    ...Typography.small,
    flex: 1,
    lineHeight: 20,
  },
  previewUnread: {
    fontWeight: '500',
  },
});

export default ConversationListItem;
export { formatRelativeTime };
