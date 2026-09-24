/**
 * Platform icon component — renders a colored circle with platform initial.
 * v1 uses text-based icons; can be swapped for SVGs in v2.
 */

import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getPlatformConfig } from '@/constants/platforms';
import { Radius } from '@/constants/theme';
import type { PlatformId } from '@/types/platform';

interface PlatformIconProps {
  platform: PlatformId;
  size?: number;
}

/** Icon names for each platform */
const PLATFORM_ICONS: Record<PlatformId, React.ComponentProps<typeof Ionicons>['name']> = {
  whatsapp: 'logo-whatsapp',
  telegram: 'paper-plane',
  discord: 'logo-discord',
  sms: 'chatbubble',
  matrix: 'ellipse',
};

const PlatformIcon = ({ platform, size = 24 }: PlatformIconProps) => {
  const config = getPlatformConfig(platform);
  const iconSize = size * 0.5;

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
      <Ionicons name={PLATFORM_ICONS[platform]} size={iconSize} color="#fff" />
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
