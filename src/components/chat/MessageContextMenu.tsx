/**
 * MessageContextMenu — overlay context menu triggered by long-press on a message.
 *
 * Actions: Reply, Copy, Forward (stub), Delete (stub)
 *
 * Uses an animated scale+opacity entrance anchored at the center of the screen.
 * Dismisses on backdrop tap.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors, Typography, Spacing, Radius, useScheme } from '@/constants/theme';
import type { Message } from '@/types/message';

/* ─── Action definition ──────────────────────────────────── */

interface ContextAction {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  destructive?: boolean;
  onPress: () => void;
}

/* ─── Props ──────────────────────────────────────────────── */

interface MessageContextMenuProps {
  /** The message the menu is anchored to (null when hidden) */
  message: Message | null;
  /** Whether the menu is visible */
  visible: boolean;
  /** Close the menu */
  onClose: () => void;
  /** Reply to the message */
  onReply: () => void;
  /** Copy message text to clipboard */
  onCopy: () => void;
  /** Forward (stub for v1) */
  onForward?: () => void;
  /** Delete (redact) the message */
  onDelete?: () => void;
}

/* ─── Component ──────────────────────────────────────────── */

function MessageContextMenu({
  message,
  visible,
  onClose,
  onReply,
  onCopy,
  onForward,
  onDelete,
}: MessageContextMenuProps) {
  const scheme = useScheme();
  const C = Colors[scheme];
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 40,
          bounciness: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0,
          useNativeDriver: true,
          speed: 40,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  if (!visible || !message) return null;

  const actions: ContextAction[] = [
    { id: 'reply', icon: 'arrow-undo-outline', label: 'Reply', onPress: onReply },
    { id: 'copy', icon: 'copy-outline', label: 'Copy', onPress: onCopy },
  ];

  if (onForward) {
    actions.push({ id: 'forward', icon: 'arrow-redo-outline', label: 'Forward', onPress: onForward });
  }
  if (onDelete) {
    actions.push({ id: 'delete', icon: 'trash-outline', label: 'Delete', destructive: true, onPress: onDelete });
  }

  const handleAction = (action: ContextAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action.onPress();
    onClose();
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <Animated.View
        style={[
          styles.menu,
          {
            backgroundColor: C.backgroundElevated,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Message preview */}
        <View style={[styles.previewSection, { borderBottomColor: C.border }]}>
          <Text style={[styles.previewSender, { color: C.textSecondary }]}>
            {message.senderDisplayName}
          </Text>
          <Text style={[styles.previewText, { color: C.text }]} numberOfLines={2}>
            {message.isRedacted ? 'Deleted message' : message.content}
          </Text>
        </View>

        {/* Actions */}
        {actions.map((action, index) => (
          <React.Fragment key={action.id}>
            {index > 0 && (
              <View style={[styles.divider, { backgroundColor: C.border }]} />
            )}
            <Pressable
              id={`context-${action.id}`}
              style={({ pressed }) => [
                styles.actionRow,
                pressed && { backgroundColor: C.backgroundSelected },
              ]}
              onPress={() => handleAction(action)}
            >
              <Ionicons name={action.icon} size={20} color={action.destructive ? C.error : C.text} />
              <Text
                style={[
                  styles.actionLabel,
                  { color: action.destructive ? C.error : C.text },
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          </React.Fragment>
        ))}
      </Animated.View>
    </Animated.View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  menu: {
    borderRadius: Radius.lg,
    minWidth: 220,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  previewSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  previewSender: {
    ...Typography.caption,
    fontWeight: '600',
  },
  previewText: {
    ...Typography.small,
    lineHeight: 20,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionLabel: {
    ...Typography.body,
    fontWeight: '500',
  },
});

export default MessageContextMenu;
