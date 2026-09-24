/**
 * EmptyState — illustrated empty states for various sections of the app.
 *
 * Variants:
 * - `no-conversations`: No chats yet, prompt to connect bridges
 * - `no-search-results`: FTS returned zero matches
 * - `bridge-disconnected`: A specific bridge is not connected
 * - `no-messages`: Empty chat room
 *
 * Each variant provides an emoji illustration, title, subtitle,
 * and an optional CTA button.
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

import { Colors, Typography, Spacing, Radius, Durations, useScheme } from '@/constants/theme';

/* ─── Variant definitions ────────────────────────────────── */

type EmptyStateVariant =
  | 'no-conversations'
  | 'no-search-results'
  | 'bridge-disconnected'
  | 'no-messages';

interface VariantConfig {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  ctaLabel?: string;
}

const VARIANT_CONFIGS: Record<EmptyStateVariant, VariantConfig> = {
  'no-conversations': {
    iconName: 'chatbubbles-outline',
    title: 'No conversations yet',
    subtitle: 'Connect a bridge to start seeing your messages from WhatsApp, Telegram, Discord, and more.',
    ctaLabel: 'Set up bridges',
  },
  'no-search-results': {
    iconName: 'search-outline',
    title: 'No results found',
    subtitle: 'Try a different search term or check your spelling.',
  },
  'bridge-disconnected': {
    iconName: 'link-outline',
    title: 'Bridge not connected',
    subtitle: 'This messaging platform is not yet linked. Connect it in the Bridges tab to see your conversations.',
    ctaLabel: 'Go to Bridges',
  },
  'no-messages': {
    iconName: 'hand-right-outline',
    title: 'Start the conversation',
    subtitle: 'Send the first message to get things going.',
  },
};

/* ─── Props ──────────────────────────────────────────────── */

interface EmptyStateProps {
  /** Which empty state to display */
  variant: EmptyStateVariant;
  /** Optional override for the subtitle text */
  subtitle?: string;
  /** Called when the CTA button is pressed */
  onAction?: () => void;
  /** Optional custom CTA label */
  actionLabel?: string;
}

/* ─── Component ──────────────────────────────────────────── */

function EmptyState({
  variant,
  subtitle: subtitleOverride,
  onAction,
  actionLabel,
}: EmptyStateProps) {
  const scheme = useScheme();
  const C = Colors[scheme];
  const config = VARIANT_CONFIGS[variant];

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;
  const emojiPulse = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: Durations.slower,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }),
      Animated.spring(emojiPulse, {
        toValue: 1,
        useNativeDriver: true,
        tension: 40,
        friction: 5,
      }),
    ]).start();
  }, [fadeIn, slideUp, emojiPulse]);

  const ctaText = actionLabel || config.ctaLabel;

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeIn, transform: [{ translateY: slideUp }] },
      ]}
    >
      <Animated.View style={[styles.emojiContainer, { transform: [{ scale: emojiPulse }] }]}>
        <Ionicons name={config.iconName} size={56} color={C.textTertiary} />
      </Animated.View>

      <Text style={[styles.title, { color: C.text }]}>{config.title}</Text>

      <Text style={[styles.subtitle, { color: C.textSecondary }]}>
        {subtitleOverride || config.subtitle}
      </Text>

      {ctaText && onAction && (
        <Pressable
          id={`empty-cta-${variant}`}
          style={[styles.ctaButton, { backgroundColor: C.accent }]}
          onPress={onAction}
        >
          <Text style={styles.ctaText}>{ctaText}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.massive,
    gap: Spacing.md,
  },
  emojiContainer: {
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.headline,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.small,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  ctaButton: {
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  ctaText: {
    ...Typography.body,
    fontWeight: '700',
    color: '#fff',
  },
});

export default EmptyState;
export type { EmptyStateVariant };
