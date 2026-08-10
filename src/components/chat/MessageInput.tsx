/**
 * MessageInput — composer bar at the bottom of the ChatPage.
 *
 * Features:
 * - Auto-growing TextInput (1–5 lines)
 * - Send button with scale animation (appears when text is non-empty)
 * - Reply preview bar (dismissible)
 * - Haptic feedback on send
 * - Character limit indicator near max
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { Colors, Typography, Spacing, Radius, useScheme } from '@/constants/theme';
import type { Message } from '@/types/message';

/* ─── Reply preview ──────────────────────────────────────── */

function ReplyPreviewBar({
  message,
  onDismiss,
}: {
  message: Message;
  onDismiss: () => void;
}) {
  const scheme = useScheme();
  const C = Colors[scheme];

  return (
    <View style={[styles.replyBar, { backgroundColor: C.backgroundElement, borderLeftColor: C.accent }]}>
      <View style={styles.replyBarContent}>
        <Text style={[styles.replyBarSender, { color: C.accent }]} numberOfLines={1}>
          {message.senderDisplayName}
        </Text>
        <Text style={[styles.replyBarText, { color: C.textSecondary }]} numberOfLines={1}>
          {message.content}
        </Text>
      </View>
      <Pressable id="reply-dismiss" onPress={onDismiss} hitSlop={12} style={styles.replyBarDismiss}>
        <Text style={[styles.replyBarDismissIcon, { color: C.textTertiary }]}>✕</Text>
      </Pressable>
    </View>
  );
}

/* ─── Props ──────────────────────────────────────────────── */

interface MessageInputProps {
  /** Called when the user sends a message */
  onSend: (text: string) => void;
  /** The message being replied to (null when not replying) */
  replyingTo: Message | null;
  /** Dismiss the reply preview */
  onDismissReply: () => void;
  /** Bottom safe area inset */
  bottomInset?: number;
  /** Maximum character count */
  maxLength?: number;
}

/* ─── Component ──────────────────────────────────────────── */

function MessageInput({
  onSend,
  replyingTo,
  onDismissReply,
  bottomInset = 0,
  maxLength = 4000,
}: MessageInputProps) {
  const scheme = useScheme();
  const C = Colors[scheme];
  const inputRef = useRef<TextInput>(null);

  const [text, setText] = useState('');
  const sendScale = useRef(new Animated.Value(0)).current;

  const canSend = text.trim().length > 0;
  const nearLimit = text.length > maxLength * 0.9;
  const remaining = maxLength - text.length;

  // Animate send button visibility
  const animateSend = useCallback(
    (visible: boolean) => {
      Animated.spring(sendScale, {
        toValue: visible ? 1 : 0,
        useNativeDriver: true,
        speed: 40,
        bounciness: 8,
      }).start();
    },
    [sendScale],
  );

  const handleTextChange = useCallback(
    (value: string) => {
      setText(value);
      animateSend(value.trim().length > 0);
    },
    [animateSend],
  );

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(trimmed);
    setText('');
    animateSend(false);
  }, [text, onSend, animateSend]);

  return (
    <View>
      {/* Reply preview */}
      {replyingTo && (
        <ReplyPreviewBar message={replyingTo} onDismiss={onDismissReply} />
      )}

      {/* Input bar */}
      <View
        style={[
          styles.container,
          {
            backgroundColor: C.backgroundElevated,
            borderTopColor: C.border,
            paddingBottom: bottomInset || Spacing.md,
          },
        ]}
      >
        <TextInput
          id="message-input"
          ref={inputRef}
          style={[
            styles.input,
            { backgroundColor: C.backgroundElement, color: C.text },
          ]}
          placeholder="Message…"
          placeholderTextColor={C.textTertiary}
          value={text}
          onChangeText={handleTextChange}
          multiline
          maxLength={maxLength}
          returnKeyType="default"
          textAlignVertical="center"
        />

        {/* Character count (visible near limit) */}
        {nearLimit && (
          <Text
            style={[
              styles.charCount,
              { color: remaining <= 0 ? C.error : C.textTertiary },
            ]}
          >
            {remaining}
          </Text>
        )}

        {/* Send button */}
        <Animated.View style={{ transform: [{ scale: sendScale }] }}>
          <Pressable
            id="send-button"
            style={[
              styles.sendButton,
              { backgroundColor: canSend ? C.accent : C.backgroundElement },
            ]}
            onPress={handleSend}
            disabled={!canSend}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    ...Typography.body,
    maxHeight: 120,
    minHeight: 40,
  },
  charCount: {
    ...Typography.caption,
    position: 'absolute',
    right: 56,
    bottom: 14,
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

  // Reply preview
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderLeftWidth: 3,
    gap: Spacing.sm,
  },
  replyBarContent: {
    flex: 1,
  },
  replyBarSender: {
    ...Typography.caption,
    fontWeight: '700',
  },
  replyBarText: {
    ...Typography.caption,
  },
  replyBarDismiss: {
    padding: Spacing.xs,
  },
  replyBarDismissIcon: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MessageInput;
export { ReplyPreviewBar };
