/**
 * InAppBanner — floating notification banner for foreground messages.
 *
 * Slides down from the top of the screen when a notification arrives
 * while the app is open. Supports:
 * - Avatar + sender name + message preview
 * - Tap to navigate to the conversation
 * - Swipe up to dismiss
 * - Auto-dismiss after 4 seconds
 * - Glassmorphic blur background on iOS
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors, Typography, Spacing, Radius, Durations, Shadows, useScheme } from '@/constants/theme';
import Avatar from '@/components/ui/Avatar';

/* ─── Props ──────────────────────────────────────────────── */

interface InAppBannerProps {
  /** Whether the banner is visible */
  visible: boolean;
  /** Room ID for navigation on tap */
  roomId: string;
  /** Sender display name */
  senderName: string;
  /** Message content preview */
  content: string;
  /** Avatar URL (MXC or HTTP) */
  avatarUrl: string | null;
  /** Called when the banner is dismissed (swipe or timeout) */
  onDismiss: () => void;
}

/* ─── Constants ──────────────────────────────────────────── */

const BANNER_HEIGHT = 80;
const AUTO_DISMISS_MS = 4000;
const SWIPE_THRESHOLD = -30; // Negative = upward swipe

/* ─── Component ──────────────────────────────────────────── */

function InAppBanner({
  visible,
  roomId,
  senderName,
  content,
  avatarUrl,
  onDismiss,
}: InAppBannerProps) {
  const scheme = useScheme();
  const C = Colors[scheme];
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(-(BANNER_HEIGHT + insets.top + 20))).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pan responder for swipe-to-dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          // Allow upward swipe only
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < SWIPE_THRESHOLD) {
          // Swipe was far enough — dismiss
          dismiss();
        } else {
          // Snap back
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            speed: 40,
          }).start();
        }
      },
    }),
  ).current;

  const dismiss = useCallback(() => {
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current);
      autoDismissTimer.current = null;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -(BANNER_HEIGHT + insets.top + 20),
        duration: Durations.normal,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: Durations.fast,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  }, [translateY, opacity, insets.top, onDismiss]);

  const handleTap = useCallback(() => {
    dismiss();
    // Navigate to the conversation after dismiss animation starts
    setTimeout(() => {
      router.push(`/chat/${roomId}`);
    }, 100);
  }, [roomId, dismiss]);

  // Show/hide animation
  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 30,
          bounciness: 6,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: Durations.normal,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss timer
      autoDismissTimer.current = setTimeout(() => {
        dismiss();
      }, AUTO_DISMISS_MS);
    }

    return () => {
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current);
      }
    };
  }, [visible, translateY, opacity, dismiss]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing.xs,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Pressable
        id="in-app-banner"
        style={[
          styles.banner,
          {
            backgroundColor: scheme === 'dark'
              ? 'rgba(30, 32, 38, 0.95)'
              : 'rgba(255, 255, 255, 0.95)',
            ...Shadows.medium,
          },
        ]}
        onPress={handleTap}
      >
        {/* Avatar */}
        <Avatar imageUrl={avatarUrl} name={senderName} size="sm" />

        {/* Text content */}
        <View style={styles.textContent}>
          <Text style={[styles.senderName, { color: C.text }]} numberOfLines={1}>
            {senderName}
          </Text>
          <Text style={[styles.messagePreview, { color: C.textSecondary }]} numberOfLines={1}>
            {content}
          </Text>
        </View>

        {/* Time indicator */}
        <Text style={[styles.timeLabel, { color: C.textTertiary }]}>now</Text>
      </Pressable>

      {/* Grab indicator */}
      <View style={styles.grabContainer}>
        <View style={[styles.grabHandle, { backgroundColor: C.textTertiary + '40' }]} />
      </View>
    </Animated.View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: Spacing.md,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    minHeight: 64,
  },
  textContent: {
    flex: 1,
    gap: 2,
  },
  senderName: {
    ...Typography.body,
    fontWeight: '700',
  },
  messagePreview: {
    ...Typography.small,
  },
  timeLabel: {
    ...Typography.caption,
    flexShrink: 0,
  },
  grabContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xxs,
    paddingBottom: Spacing.xs,
  },
  grabHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
});

export default InAppBanner;
