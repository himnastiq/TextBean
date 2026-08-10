/**
 * MessageBubble — individual chat message with delivery status, reply quotes,
 * link detection, animated entrance, and long-press context menu trigger.
 *
 * Rendering modes:
 * - Sent (right-aligned, accent bubble)
 * - Received (left-aligned, surface bubble)
 * - Grouped (collapsed avatar/sender for consecutive same-sender messages)
 * - Redacted (italicised "message deleted" placeholder)
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Colors, Typography, Spacing, Radius, Durations, useScheme } from '@/constants/theme';
import Avatar from '@/components/ui/Avatar';
import { formatTime } from '@/utils/date-utils';
import { parseTextWithLinks, type TextSegment } from '@/utils/message-utils';
import type { Message } from '@/types/message';

/* ─── Delivery status icon ───────────────────────────────── */

function deliveryIcon(status: Message['deliveryStatus']): string {
  switch (status) {
    case 'sending': return '⏳';
    case 'failed': return '⚠️';
    case 'read': return '✓✓';
    case 'delivered': return '✓✓';
    case 'sent':
    default: return '✓';
  }
}

/* ─── Reply quote ────────────────────────────────────────── */

function ReplyQuote({
  senderName,
  content,
}: {
  senderName: string;
  content: string;
}) {
  const scheme = useScheme();
  const C = Colors[scheme];

  return (
    <View style={[styles.replyQuote, { borderLeftColor: C.accent, backgroundColor: C.accent + '10' }]}>
      <Text style={[styles.replyQuoteSender, { color: C.accent }]}>{senderName}</Text>
      <Text style={[styles.replyQuoteText, { color: C.textSecondary }]} numberOfLines={1}>
        {content}
      </Text>
    </View>
  );
}

/* ─── Props ──────────────────────────────────────────────── */

interface MessageBubbleProps {
  message: Message;
  /** Whether this message was sent by the current user */
  isSent: boolean;
  /** Whether the previous message is from the same sender within 5 minutes */
  isGrouped: boolean;
  /** The replied-to message content (if message.replyToEventId is set) */
  replyMessage?: { senderDisplayName: string; content: string } | null;
  /** Called on long-press — parent opens context menu */
  onLongPress: (message: Message) => void;
}

/* ─── Component ──────────────────────────────────────────── */

function MessageBubble({
  message,
  isSent,
  isGrouped,
  replyMessage,
  onLongPress,
}: MessageBubbleProps) {
  const scheme = useScheme();
  const C = Colors[scheme];
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isSent ? 12 : -12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: Durations.normal,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 40,
        bounciness: 4,
      }),
    ]).start();
  }, []);

  const bubbleBg = isSent ? C.bubbleSent : C.bubbleReceived;
  const textColor = isSent ? C.bubbleSentText : C.bubbleReceivedText;
  const metaColor = textColor + 'AA';

  // Parse text for URL detection
  const textSegments = message.isRedacted ? [] : parseTextWithLinks(message.content);

  return (
    <Animated.View
      style={[
        styles.row,
        isSent ? styles.rowSent : styles.rowReceived,
        { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
      ]}
    >
      {/* Sender avatar (received messages, first in group only) */}
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
        {/* Sender name (received, first in group) */}
        {!isSent && !isGrouped && (
          <Text style={[styles.senderName, { color: C.accent }]}>{message.senderDisplayName}</Text>
        )}

        {/* Reply quote */}
        {replyMessage && (
          <ReplyQuote
            senderName={replyMessage.senderDisplayName}
            content={replyMessage.content}
          />
        )}

        {/* Message content */}
        {message.isRedacted ? (
          <Text style={[styles.redactedText, { color: metaColor }]}>🚫 This message was deleted</Text>
        ) : (
          <Text style={[styles.messageText, { color: textColor }]}>
            {textSegments.map((seg, i) =>
              seg.isUrl ? (
                <Text key={i} style={[styles.linkText, { color: isSent ? '#BCE0FD' : C.accent }]}>
                  {seg.text}
                </Text>
              ) : (
                <Text key={i}>{seg.text}</Text>
              ),
            )}
          </Text>
        )}

        {/* Meta: time + edited + delivery */}
        <View style={styles.meta}>
          <Text style={[styles.metaText, { color: metaColor }]}>
            {formatTime(message.timestamp)}
            {message.isEdited ? ' · edited' : ''}
          </Text>
          {isSent && (
            <Text
              style={[
                styles.deliveryIcon,
                { color: message.deliveryStatus === 'read' ? '#4FC3F7' : metaColor },
              ]}
            >
              {deliveryIcon(message.deliveryStatus)}
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 2,
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  rowSent: {
    justifyContent: 'flex-end',
  },
  rowReceived: {
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
  linkText: {
    textDecorationLine: 'underline',
  },
  redactedText: {
    ...Typography.small,
    fontStyle: 'italic',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.xxs,
    marginTop: 2,
  },
  metaText: {
    fontSize: 10,
    lineHeight: 14,
  },
  deliveryIcon: {
    fontSize: 10,
  },

  // Reply quote
  replyQuote: {
    borderLeftWidth: 3,
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    marginBottom: Spacing.xxs,
  },
  replyQuoteSender: {
    ...Typography.caption,
    fontWeight: '700',
  },
  replyQuoteText: {
    ...Typography.caption,
  },
});

export default MessageBubble;
export { formatTime, parseTextWithLinks };
