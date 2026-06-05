/**
 * Unread count badge with animated entrance.
 * Supports platform-colored variants.
 */

import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface BadgeProps {
  /** The count to display. Hidden when 0. */
  count: number;
  /** Custom background color (defaults to accent) */
  color?: string;
  /** Size variant */
  size?: 'sm' | 'md';
}

const Badge = ({ count, color, size = 'md' }: BadgeProps) => {
  const theme = useTheme();

  if (count <= 0) return null;

  const displayText = count > 99 ? '99+' : String(count);
  const isSmall = size === 'sm';
  const height = isSmall ? 16 : 20;
  const minWidth = isSmall ? 16 : 20;
  const fontSize = isSmall ? Typography.caption.fontSize : Typography.label.fontSize;
  const paddingHorizontal = displayText.length > 1 ? Spacing.xs + 1 : 0;

  return (
    <Animated.View
      entering={ZoomIn.duration(200)}
      exiting={ZoomOut.duration(150)}
      style={[
        styles.badge,
        {
          height,
          minWidth,
          paddingHorizontal,
          borderRadius: Radius.full,
          backgroundColor: color ?? theme.accent,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize }]}>
        {displayText}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default Badge;
