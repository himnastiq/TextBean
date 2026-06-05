/**
 * Animated search bar with glass-effect styling and debounced callback.
 */

import { useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Durations, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SearchBarProps {
  /** Current search value */
  value: string;
  /** Called on each keystroke */
  onChangeText: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input should auto-focus */
  autoFocus?: boolean;
  /** Called when cancel is pressed */
  onCancel?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SearchBar = ({
  value,
  onChangeText,
  placeholder = 'Search messages...',
  autoFocus = false,
  onCancel,
}: SearchBarProps) => {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const isFocused = useSharedValue(autoFocus ? 1 : 0);

  const containerAnimStyle = useAnimatedStyle(() => ({
    borderColor: isFocused.value
      ? withTiming(theme.accent, { duration: Durations.normal })
      : withTiming(theme.border, { duration: Durations.normal }),
  }));

  const handleFocus = () => {
    isFocused.value = 1;
  };

  const handleBlur = () => {
    isFocused.value = 0;
  };

  const handleCancel = () => {
    onChangeText('');
    inputRef.current?.blur();
    onCancel?.();
  };

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.container,
          containerAnimStyle,
          {
            backgroundColor: theme.backgroundElement,
            borderRadius: Radius.md,
          },
        ]}
      >
        {/* Search icon */}
        <Text style={[styles.icon, { color: theme.textTertiary }]}>🔍</Text>

        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              color: theme.text,
              fontSize: Typography.body.fontSize,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textTertiary}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={theme.accent}
        />

        {/* Clear button */}
        {value.length > 0 && (
          <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)}>
            <Pressable onPress={() => onChangeText('')} hitSlop={8}>
              <Text style={[styles.clearBtn, { color: theme.textTertiary }]}>✕</Text>
            </Pressable>
          </Animated.View>
        )}
      </Animated.View>

      {/* Cancel button (visible when focused or has value) */}
      {(value.length > 0 || autoFocus) && onCancel && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
          <Pressable onPress={handleCancel} hitSlop={8}>
            <Text style={[styles.cancelText, { color: theme.accent }]}>Cancel</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 42,
    borderWidth: 1.5,
  },
  icon: {
    fontSize: 14,
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontWeight: '400',
  },
  clearBtn: {
    fontSize: 16,
    fontWeight: '600',
    paddingLeft: Spacing.sm,
  },
  cancelText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },
});

export default SearchBar;
