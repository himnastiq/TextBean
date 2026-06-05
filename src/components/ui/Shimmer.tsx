/**
 * Skeleton loading placeholder with animated shimmer sweep.
 * Used as a loading state for conversation lists, messages, etc.
 */

import { useEffect } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Durations, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ShimmerProps extends ViewProps {
  /** Width of the shimmer block */
  width: number | `${number}%`;
  /** Height of the shimmer block */
  height: number;
  /** Border radius */
  borderRadius?: number;
}

const Shimmer = ({
  width,
  height,
  borderRadius = Radius.sm,
  style,
  ...rest
}: ShimmerProps) => {
  const theme = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.4, 0.8, 0.4]),
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.shimmerBase,
        },
        animatedStyle,
        style,
      ]}
      {...rest}
    />
  );
};

/** Pre-built shimmer row matching ConversationListItem layout */
const ShimmerConversationRow = () => {
  return (
    <View style={shimmerStyles.row}>
      <Shimmer width={48} height={48} borderRadius={Radius.full} />
      <View style={shimmerStyles.textBlock}>
        <Shimmer width="60%" height={14} />
        <Shimmer width="85%" height={12} />
      </View>
      <Shimmer width={40} height={10} />
    </View>
  );
};

const shimmerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  textBlock: {
    flex: 1,
    gap: 8,
  },
});

export { Shimmer, ShimmerConversationRow };
export default Shimmer;
