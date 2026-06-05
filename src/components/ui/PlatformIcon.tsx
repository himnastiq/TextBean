/**
 * Platform icon component — renders a colored circle with platform initial.
 * v1 uses text-based icons; can be swapped for SVGs in v2.
 */

import { StyleSheet, Text, View } from 'react-native';

import { getPlatformConfig } from '@/constants/platforms';
import { Radius } from '@/constants/theme';
import type { PlatformId } from '@/types/platform';

interface PlatformIconProps {
  platform: PlatformId;
  size?: number;
}

/** Emoji icons for each platform (lightweight, no SVG dependencies) */
const PLATFORM_EMOJI: Record<PlatformId, string> = {
  whatsapp: '💬',
  telegram: '✈️',
  discord: '🎮',
  sms: '📱',
  matrix: '🟢',
};

const PlatformIcon = ({ platform, size = 24 }: PlatformIconProps) => {
  const config = getPlatformConfig(platform);
  const emojiSize = size * 0.5;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: Radius.full,
          backgroundColor: config.color,
        },
      ]}
    >
      <Text style={{ fontSize: emojiSize }}>{PLATFORM_EMOJI[platform]}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PlatformIcon;
