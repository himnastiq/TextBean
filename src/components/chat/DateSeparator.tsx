/**
 * DateSeparator — visual divider between message groups from different days.
 *
 * Labels:
 * - "Today", "Yesterday"
 * - Day name within the last week ("Monday", "Tuesday")
 * - "Jan 5, 2025" for older dates
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Typography, Spacing, useScheme } from '@/constants/theme';
import { formatDateLabel } from '@/utils/date-utils';

/* ─── Props ──────────────────────────────────────────────── */

interface DateSeparatorProps {
  timestamp: number;
}

/* ─── Component ──────────────────────────────────────────── */

function DateSeparator({ timestamp }: DateSeparatorProps) {
  const scheme = useScheme();
  const C = Colors[scheme];
  const label = formatDateLabel(timestamp);

  return (
    <View style={styles.container}>
      <View style={[styles.line, { backgroundColor: C.border }]} />
      <Text style={[styles.label, { color: C.textTertiary, backgroundColor: C.background }]}>
        {label}
      </Text>
      <View style={[styles.line, { backgroundColor: C.border }]} />
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
    paddingHorizontal: Spacing.xs,
  },
});

export default DateSeparator;
export { formatDateLabel };
