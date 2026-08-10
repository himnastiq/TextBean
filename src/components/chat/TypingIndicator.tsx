/**
 * TypingIndicator — animated bouncing dots with sender names.
 *
 * Shows up to 2 names ("Alice and Bob are typing…") or
 * "Several people are typing…" for 3+.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Colors, Typography, Spacing, Radius, useScheme } from '@/constants/theme';

/* ─── Props ──────────────────────────────────────────────── */

interface TypingIndicatorProps {
  /** Display names of people currently typing */
  names: string[];
}

/* ─── Component ──────────────────────────────────────────── */

function TypingIndicator({ names }: TypingIndicatorProps) {
  const scheme = useScheme();
  const C = Colors[scheme];

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounce = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: -5, duration: 250, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.delay(400 - delay),
        ]),
      );

    const a1 = bounce(dot1, 0);
    const a2 = bounce(dot2, 150);
    const a3 = bounce(dot3, 300);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  const label =
    names.length === 1
      ? `${names[0]} is typing…`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing…`
      : 'Several people are typing…';

  const dots = [dot1, dot2, dot3];

  return (
    <View style={styles.container}>
      <View style={[styles.dotsContainer, { backgroundColor: C.backgroundElement }]}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: C.textTertiary, transform: [{ translateY: dot }] },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color: C.textTertiary }]}>{label}</Text>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 4,
    height: 32,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    ...Typography.caption,
  },
});

export default TypingIndicator;
