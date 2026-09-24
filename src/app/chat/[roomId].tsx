/**
 * ChatPage — individual conversation screen.
 *
 * Features:
 * - Custom header: back arrow, avatar, name, platform badge, online status
 * - Message timeline (inverted FlatList, newest at bottom)
 * - Typing indicator
 * - Date separators between message groups
 * - Message bubbles (sent vs received)
 * - Reply preview when replying
 * - Message input bar with auto-grow TextInput
 * - Long-press message for context menu (reply, copy)
 * - Haptic feedback on send
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { Colors, Typography, Spacing, Radius, Durations, useScheme } from '@/constants/theme';
import { PLATFORM_CONFIGS } from '@/constants/platforms';
import { useRoomStore } from '@/stores/room-store';
import { useAuthStore } from '@/stores/auth-store';
import { useMessageStore, selectMessagesForRoom } from '@/stores/message-store';
import Avatar from '@/components/ui/Avatar';
import Shimmer from '@/components/ui/Shimmer';
import type { Message } from '@/types/message';

/* ─── Date separator ─────────────────────────────────────── */

function DateSeparator({ timestamp }: { timestamp: number }) {
  const rawScheme = useColorScheme();
  const scheme: 'light' | 'dark' = rawScheme === 'light' ? 'light' : 'dark';
  const C = Colors[scheme];
  const label = formatDateLabel(timestamp);

  return (
    <View style={styles.dateSeparator}>
      <View style={[styles.dateSeparatorLine, { backgroundColor: C.border }]} />
      <Text style={[styles.dateSeparatorText, { color: C.textTertiary, backgroundColor: C.background }]}>
        {label}
      </Text>
      <View style={[styles.dateSeparatorLine, { backgroundColor: C.border }]} />
    </View>
  );
}

/* ─── Typing indicator ───────────────────────────────────── */

function TypingIndicator({ names }: { names: string[] }) {
  const rawScheme = useColorScheme();
  const scheme: 'light' | 'dark' = rawScheme === 'light' ? 'light' : 'dark';
  const C = Colors[scheme];
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounce = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: -4, duration: 300, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      );

    const a1 = bounce(dot1, 0);
    const a2 = bounce(dot2, 150);
    const a3 = bounce(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  const label =
    names.length === 1
      ? `${names[0]} is typing…`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing…`
      : 'Several people are typing…';

  return (
    <View style={styles.typingRow}>
      <View style={[styles.typingBubble, { backgroundColor: C.backgroundElement }]}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.typingDot, { backgroundColor: C.textTertiary, transform: [{ translateY: dot }] }]}
          />
        ))}
      </View>
      <Text style={[styles.typingLabel, { color: C.textTertiary }]}>{label}</Text>
    </View>
  );
}

/* ─── Message bubble ─────────────────────────────────────── */

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
  isGrouped: boolean; // same sender as previous message
  onLongPress: (message: Message) => void;
}

function MessageBubble({ message, isSent, isGrouped, onLongPress }: MessageBubbleProps) {
  const rawScheme = useColorScheme();
  const scheme: 'light' | 'dark' = rawScheme === 'light' ? 'light' : 'dark';
  const C = Colors[scheme];
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: Durations.normal, useNativeDriver: true }).start();
  }, []);

  const bubbleBg = isSent ? C.bubbleSent : C.bubbleReceived;
  const textColor = isSent ? C.bubbleSentText : C.bubbleReceivedText;
  const deliveryIconName: React.ComponentProps<typeof Ionicons>['name'] =
    message.deliveryStatus === 'sending' ? 'time-outline'
    : message.deliveryStatus === 'failed' ? 'alert-circle'
    : message.deliveryStatus === 'read' ? 'checkmark-done'
    : message.deliveryStatus === 'delivered' ? 'checkmark-done'
    : 'checkmark';

  return (
    <Animated.View style={[styles.messageRow, isSent ? styles.messageRowSent : styles.messageRowReceived, { opacity: fadeAnim }]}>
      {/* Sender avatar (only for received messages, first in group) */}
      {!isSent && !isGrouped ? (
        <Avatar imageUrl={message.senderAvatarUrl} name={message.senderDisplayName} size="sm" />
      ) : !isSent ? (
        <View style={{ width: 28 }} />
      ) : null}

      <Pressable
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onLongPress(message);
        }}
        delayLongPress={300}
        style={({ pressed }) => [
          styles.bubble,
          { backgroundColor: bubbleBg, opacity: pressed ? 0.85 : 1 },
          isSent ? styles.bubbleSent : styles.bubbleReceived,
          isGrouped && (isSent ? styles.bubbleSentGrouped : styles.bubbleReceivedGrouped),
        ]}
      >
        {/* Sender name (for received group messages, first in group) */}
        {!isSent && !isGrouped && (
          <Text style={[styles.senderName, { color: C.accent }]}>{message.senderDisplayName}</Text>
        )}

        {/* Message content */}
        {message.isRedacted ? (
          <Text style={[styles.redactedText, { color: textColor + '88' }]}>Message deleted</Text>
        ) : (
          <Text style={[styles.messageText, { color: textColor }]}>{message.content}</Text>
        )}

        {/* Footer: time + delivery */}
        <View style={styles.messageMeta}>
          <Text style={[styles.messageTime, { color: textColor + 'AA' }]}>
            {formatMessageTime(message.timestamp)}
            {message.isEdited ? ' · edited' : ''}
          </Text>
          {isSent && (
            <Ionicons name={deliveryIconName} size={10} color={textColor + 'AA'} />
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/* ─── Reply preview bar ──────────────────────────────────── */

function ReplyPreview({ message, onDismiss }: { message: Message; onDismiss: () => void }) {
  const rawScheme = useColorScheme();
  const scheme: 'light' | 'dark' = rawScheme === 'light' ? 'light' : 'dark';
  const C = Colors[scheme];

  return (
    <View style={[styles.replyPreview, { backgroundColor: C.backgroundElement, borderLeftColor: C.accent }]}>
      <View style={styles.replyPreviewContent}>
        <Text style={[styles.replyPreviewSender, { color: C.accent }]}>{message.senderDisplayName}</Text>
        <Text style={[styles.replyPreviewText, { color: C.textSecondary }]} numberOfLines={1}>
          {message.content}
        </Text>
      </View>
      <Pressable id="reply-dismiss" onPress={onDismiss} hitSlop={12}>
        <Text style={[styles.replyDismiss, { color: C.textTertiary }]}>✕</Text>
      </Pressable>
    </View>
  );
}

/* ─── Context menu ───────────────────────────────────────── */

function ContextMenu({
  message,
  visible,
  onClose,
  onReply,
  onCopy,
}: {
  message: Message | null;
  visible: boolean;
  onClose: () => void;
  onReply: () => void;
  onCopy: () => void;
}) {
  const rawScheme = useColorScheme();
  const scheme: 'light' | 'dark' = rawScheme === 'light' ? 'light' : 'dark';
  const C = Colors[scheme];
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();
  }, [visible]);

  if (!visible || !message) return null;

  return (
    <Pressable style={styles.contextOverlay} onPress={onClose}>
      <Animated.View
        style={[styles.contextMenu, { backgroundColor: C.backgroundElevated, transform: [{ scale: scaleAnim }] }]}
      >
        <Pressable id="context-reply" style={styles.contextItem} onPress={onReply}>
          <Ionicons name="arrow-undo-outline" size={20} color={C.text} />
          <Text style={[styles.contextLabel, { color: C.text }]}>Reply</Text>
        </Pressable>
        <View style={[styles.contextDivider, { backgroundColor: C.border }]} />
        <Pressable id="context-copy" style={styles.contextItem} onPress={onCopy}>
          <Ionicons name="copy-outline" size={20} color={C.text} />
          <Text style={[styles.contextLabel, { color: C.text }]}>Copy</Text>
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}

/* ─── ChatPage ───────────────────────────────────────────── */

export default function ChatPage() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const rawScheme = useColorScheme();
  const scheme: 'light' | 'dark' = rawScheme === 'light' ? 'light' : 'dark';
  const C = Colors[scheme];
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();

  const { userId } = useAuthStore();
  const { rooms, typingByRoom, clearUnread, setActiveRoom } = useRoomStore();
  const { loadMessages, loadMore, sendMessage, setReplyingTo, replyingTo, loadingRoomId, hasMoreByRoom } = useMessageStore();
  const messages = useMessageStore(selectMessagesForRoom(roomId ?? ''));

  const room = rooms.get(roomId ?? '');
  const typingState = typingByRoom.get(roomId ?? '');
  const platformConfig = room ? PLATFORM_CONFIGS[room.platform] : PLATFORM_CONFIGS['matrix'];

  const [inputText, setInputText] = useState('');
  const [contextTarget, setContextTarget] = useState<Message | null>(null);
  const [contextVisible, setContextVisible] = useState(false);

  const listRef = useRef<FlatList>(null);

  // Load messages + mark as read on mount
  useEffect(() => {
    if (!roomId) return;
    setActiveRoom(roomId);
    loadMessages(db, roomId);
    clearUnread(db, roomId);

    return () => {
      setActiveRoom(null);
    };
  }, [roomId]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !roomId) return;

    setInputText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await sendMessage(db, roomId, text);
  }, [inputText, roomId, db, sendMessage]);

  const handleLoadMore = useCallback(() => {
    if (!roomId || loadingRoomId === roomId || !hasMoreByRoom.get(roomId)) return;
    loadMore(db, roomId);
  }, [roomId, db, loadMore, loadingRoomId, hasMoreByRoom]);

  const handleLongPress = useCallback((message: Message) => {
    setContextTarget(message);
    setContextVisible(true);
  }, []);

  const handleContextReply = useCallback(() => {
    if (contextTarget) setReplyingTo(contextTarget);
    setContextVisible(false);
    setContextTarget(null);
  }, [contextTarget, setReplyingTo]);

  const handleContextCopy = useCallback(async () => {
    if (contextTarget) {
      await Clipboard.setStringAsync(contextTarget.content);
    }
    setContextVisible(false);
    setContextTarget(null);
  }, [contextTarget]);

  // Build list data with date separators
  const listData = buildListData(messages);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'separator') {
        return <DateSeparator timestamp={item.timestamp} />;
      }
      const msg = item.message;
      const isSent = msg.senderId === userId;
      const idx = messages.findIndex((m) => m.eventId === msg.eventId);
      const prev = messages[idx + 1]; // +1 because inverted
      const isGrouped = prev && prev.senderId === msg.senderId && msg.timestamp - prev.timestamp < 300_000;

      return (
        <MessageBubble
          message={msg}
          isSent={isSent}
          isGrouped={isGrouped}
          onLongPress={handleLongPress}
        />
      );
    },
    [messages, userId, handleLongPress],
  );

  const keyExtractor = useCallback((item: ListItem) => item.key, []);

  if (!room) {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Pressable id="chat-back" onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backIcon, { color: C.accent }]}>‹</Text>
          </Pressable>
        </View>
        <View style={styles.loadingContainer}>
          <Shimmer width={200} height={20} borderRadius={10} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: C.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Custom header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: C.backgroundElevated, borderBottomColor: C.border }]}>
        <Pressable id="chat-back" onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Text style={[styles.backIcon, { color: C.accent }]}>‹</Text>
        </Pressable>

        <Avatar imageUrl={room.avatarUrl ?? null} name={room.name} size="sm" platform={room.platform} />

        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: C.text }]} numberOfLines={1}>{room.name}</Text>
          <Text style={[styles.headerPlatform, { color: platformConfig.color }]}>
            {platformConfig.displayName}
          </Text>
        </View>

        <Pressable id="chat-more" style={styles.moreButton} hitSlop={8}>
          <Text style={[styles.moreIcon, { color: C.textSecondary }]}>•••</Text>
        </Pressable>
      </View>

      {/* Message list (inverted) */}
      <FlatList
        ref={listRef}
        id="message-list"
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        inverted
        contentContainerStyle={styles.messageList}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.2}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          typingState && typingState.userIds.length > 0 ? (
            <TypingIndicator names={typingState.displayNames} />
          ) : null
        }
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      />

      {/* Reply preview */}
      {replyingTo ? (
        <ReplyPreview message={replyingTo} onDismiss={() => setReplyingTo(null)} />
      ) : null}

      {/* Input bar */}
      <View style={[styles.inputBar, { backgroundColor: C.backgroundElevated, borderTopColor: C.border, paddingBottom: insets.bottom || Spacing.md }]}>
        <TextInput
          id="message-input"
          style={[styles.textInput, { backgroundColor: C.backgroundElement, color: C.text }]}
          placeholder="Message…"
          placeholderTextColor={C.textTertiary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={4000}
          returnKeyType="default"
        />
        <Pressable
          id="send-button"
          style={[styles.sendButton, { backgroundColor: inputText.trim() ? C.accent : C.backgroundElement }]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Ionicons name="arrow-up" size={18} color="#fff" />
        </Pressable>
      </View>

      {/* Context menu overlay */}
      <ContextMenu
        message={contextTarget}
        visible={contextVisible}
        onClose={() => setContextVisible(false)}
        onReply={handleContextReply}
        onCopy={handleContextCopy}
      />
    </KeyboardAvoidingView>
  );
}

/* ─── List item types ────────────────────────────────────── */

type ListItem =
  | { type: 'message'; key: string; message: Message }
  | { type: 'separator'; key: string; timestamp: number };

function buildListData(messages: Message[]): ListItem[] {
  const items: ListItem[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const next = messages[i + 1];

    items.push({ type: 'message', key: msg.eventId, message: msg });

    // Add date separator if consecutive messages are on different days
    if (next) {
      const msgDay = new Date(msg.timestamp).toDateString();
      const nextDay = new Date(next.timestamp).toDateString();
      if (msgDay !== nextDay) {
        items.push({ type: 'separator', key: `sep-${msg.timestamp}`, timestamp: msg.timestamp });
      }
    } else {
      // Last message — add separator for its day
      items.push({ type: 'separator', key: `sep-first-${msg.timestamp}`, timestamp: msg.timestamp });
    }
  }

  return items;
}

/* ─── Helpers ────────────────────────────────────────────── */

function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${ampm}`;
}

function formatDateLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - timestamp;

  if (date.toDateString() === now.toDateString()) return 'Today';

  const yesterday = new Date(now.getTime() - 86_400_000);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  if (diff < 7 * 86_400_000) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/* ─── Styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  backIcon: {
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 36,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    ...Typography.body,
    fontWeight: '700',
  },
  headerPlatform: {
    ...Typography.caption,
    fontWeight: '600',
  },
  moreButton: {
    padding: Spacing.xs,
  },
  moreIcon: {
    fontSize: 16,
    letterSpacing: 1,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Messages
  messageList: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 2,
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  messageRowSent: {
    justifyContent: 'flex-end',
  },
  messageRowReceived: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 2,
  },
  bubbleSent: {
    borderBottomRightRadius: Radius.xs,
  },
  bubbleReceived: {
    borderBottomLeftRadius: Radius.xs,
  },
  bubbleSentGrouped: {
    borderTopRightRadius: Radius.xl,
  },
  bubbleReceivedGrouped: {
    borderTopLeftRadius: Radius.xl,
  },
  senderName: {
    ...Typography.caption,
    fontWeight: '700',
    marginBottom: 2,
  },
  messageText: {
    ...Typography.body,
    lineHeight: 22,
  },
  redactedText: {
    ...Typography.small,
    fontStyle: 'italic',
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.xxs,
    marginTop: 2,
  },
  messageTime: {
    fontSize: 10,
    lineHeight: 14,
  },
  deliveryStatus: {
    fontSize: 10,
  },

  // Typing
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 4,
    height: 32,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typingLabel: {
    ...Typography.caption,
  },

  // Date separator
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  dateSeparatorLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dateSeparatorText: {
    ...Typography.caption,
    fontWeight: '600',
    paddingHorizontal: Spacing.xs,
  },

  // Reply preview
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderLeftWidth: 3,
    gap: Spacing.sm,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewSender: {
    ...Typography.caption,
    fontWeight: '700',
  },
  replyPreviewText: {
    ...Typography.caption,
  },
  replyDismiss: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  textInput: {
    flex: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    ...Typography.body,
    maxHeight: 120,
    minHeight: 40,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendIcon: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
  },

  // Context menu overlay
  contextOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  contextMenu: {
    borderRadius: Radius.lg,
    minWidth: 180,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  contextIcon: {
    fontSize: 20,
  },
  contextLabel: {
    ...Typography.body,
    fontWeight: '500',
  },
  contextDivider: {
    height: StyleSheet.hairlineWidth,
  },
});
