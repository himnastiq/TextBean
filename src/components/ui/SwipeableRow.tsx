/**
 * Swipeable row for conversation list actions.
 * Reveals archive, pin, and mute actions on left/right swipe.
 * Uses react-native-gesture-handler for native gesture performance.
 */

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Durations, Radius, Spacing } from '@/constants/theme';

interface SwipeAction {
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
}

interface SwipeableRowProps {
  children: ReactNode;
  /** Actions revealed on right swipe (left side) */
  leftActions?: SwipeAction[];
  /** Actions revealed on left swipe (right side) */
  rightActions?: SwipeAction[];
}

const ACTION_WIDTH = 72;
const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.5 };

const SwipeableRow = ({
  children,
  leftActions = [],
  rightActions = [],
}: SwipeableRowProps) => {
  const translateX = useSharedValue(0);
  const context = useSharedValue(0);

  const maxRight = leftActions.length * ACTION_WIDTH;
  const maxLeft = -(rightActions.length * ACTION_WIDTH);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-5, 5])
    .onStart(() => {
      context.value = translateX.value;
    })
    .onUpdate((event) => {
      const newValue = context.value + event.translationX;
      // Clamp with resistance beyond bounds
      translateX.value = Math.max(
        maxLeft - 20,
        Math.min(maxRight + 20, newValue),
      );
    })
    .onEnd((event) => {
      const velocity = event.velocityX;

      if (translateX.value > maxRight * 0.4 || velocity > 500) {
        translateX.value = withSpring(maxRight, SPRING_CONFIG);
      } else if (translateX.value < maxLeft * 0.4 || velocity < -500) {
        translateX.value = withSpring(maxLeft, SPRING_CONFIG);
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleAction = (action: SwipeAction) => {
    translateX.value = withTiming(0, { duration: Durations.normal });
    action.onPress();
  };

  return (
    <View style={styles.container}>
      {/* Left actions (revealed on right swipe) */}
      {leftActions.length > 0 && (
        <View style={[styles.actionsLeft, { width: maxRight }]}>
          {leftActions.map((action) => (
            <Animated.View
              key={action.label}
              style={[styles.action, { backgroundColor: action.color }]}
            >
              <Text
                style={styles.actionIcon}
                onPress={() => runOnJS(handleAction)(action)}
              >
                {action.icon}
              </Text>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Animated.View>
          ))}
        </View>
      )}

      {/* Right actions (revealed on left swipe) */}
      {rightActions.length > 0 && (
        <View style={[styles.actionsRight, { width: -maxLeft }]}>
          {rightActions.map((action) => (
            <Animated.View
              key={action.label}
              style={[styles.action, { backgroundColor: action.color }]}
            >
              <Text
                style={styles.actionIcon}
                onPress={() => runOnJS(handleAction)(action)}
              >
                {action.icon}
              </Text>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Animated.View>
          ))}
        </View>
      )}

      {/* Content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.content, contentStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  content: {
    zIndex: 1,
  },
  actionsLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  actionsRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  action: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default SwipeableRow;
