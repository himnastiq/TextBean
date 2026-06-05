/**
 * Avatar component with presence indicator and platform badge.
 * Used throughout the app for user/room avatars.
 */

import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { AvatarSizes, Colors, Radius, Spacing } from '@/constants/theme';
import { getPlatformConfig } from '@/constants/platforms';
import { useTheme } from '@/hooks/use-theme';
import type { PlatformId } from '@/types/platform';

interface AvatarProps {
  /** MXC URL or HTTP URL for the avatar image */
  imageUrl: string | null;
  /** Fallback name for initials generation */
  name: string;
  /** Size variant */
  size?: keyof typeof AvatarSizes;
  /** Show online presence dot */
  isOnline?: boolean;
  /** Platform badge overlay */
  platform?: PlatformId;
}

/** Extract initials from a display name (max 2 characters) */
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

/** Generate a deterministic background color from a name string */
const getColorFromName = (name: string): string => {
  const palette = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F1948A', '#82E0AA',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
};

const Avatar = ({
  imageUrl,
  name,
  size = 'md',
  isOnline,
  platform,
}: AvatarProps) => {
  const theme = useTheme();
  const dimension = AvatarSizes[size];
  const initialsSize = dimension * 0.38;
  const presenceDotSize = dimension * 0.25;
  const platformBadgeSize = dimension * 0.35;

  return (
    <View style={[styles.container, { width: dimension, height: dimension }]}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[
            styles.image,
            {
              width: dimension,
              height: dimension,
              borderRadius: Radius.full,
            },
          ]}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: dimension,
              height: dimension,
              borderRadius: Radius.full,
              backgroundColor: getColorFromName(name),
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: initialsSize }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}

      {/* Online presence indicator */}
      {isOnline !== undefined && (
        <View
          style={[
            styles.presenceDot,
            {
              width: presenceDotSize,
              height: presenceDotSize,
              borderRadius: Radius.full,
              borderColor: theme.background,
              backgroundColor: isOnline
                ? Colors.light.success
                : theme.textTertiary,
            },
          ]}
        />
      )}

      {/* Platform badge */}
      {platform && platform !== 'matrix' && (
        <View
          style={[
            styles.platformBadge,
            {
              width: platformBadgeSize,
              height: platformBadgeSize,
              borderRadius: Radius.full,
              backgroundColor: getPlatformConfig(platform).color,
              borderColor: theme.background,
            },
          ]}
        >
          <Text
            style={[
              styles.platformBadgeText,
              { fontSize: platformBadgeSize * 0.5 },
            ]}
          >
            {getPlatformConfig(platform).displayName[0]}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    backgroundColor: '#E1E4E8',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  presenceDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
  },
  platformBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  platformBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default Avatar;
