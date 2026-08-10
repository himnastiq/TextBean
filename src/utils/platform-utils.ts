/**
 * Platform/bridge utilities for TextBean.
 *
 * Convenience helpers that wrap PLATFORM_CONFIGS for common operations:
 * - Resolving theme-aware platform colors
 * - Getting display names and feature flags
 * - Extracting platform IDs from Matrix user IDs
 */

import { PLATFORM_CONFIGS, BRIDGED_PLATFORMS } from '@/constants/platforms';
import type { PlatformId, BridgeFeatureSet } from '@/types/platform';

/**
 * Get the theme-appropriate brand color for a platform.
 *
 * @param platformId  Platform identifier
 * @param scheme      Current color scheme ('light' | 'dark')
 * @returns           Hex color string
 */
function getPlatformColor(platformId: PlatformId, scheme: 'light' | 'dark'): string {
  const config = PLATFORM_CONFIGS[platformId];
  return scheme === 'dark' ? config.darkColor : config.color;
}

/**
 * Get the display name for a platform (e.g., "WhatsApp", "SMS").
 */
function getPlatformDisplayName(platformId: PlatformId): string {
  return PLATFORM_CONFIGS[platformId].displayName;
}

/**
 * Check if a specific feature is supported by a platform.
 *
 * @param platformId  Platform identifier
 * @param feature     Feature key from BridgeFeatureSet
 */
function isPlatformFeatureSupported(
  platformId: PlatformId,
  feature: keyof BridgeFeatureSet,
): boolean {
  return PLATFORM_CONFIGS[platformId].supportedFeatures[feature];
}

/**
 * Attempt to extract a platform ID from a Matrix user ID.
 * Works with puppeted user IDs (e.g., @whatsapp_123:server → 'whatsapp').
 *
 * @param userId  Matrix user ID (e.g., "@whatsapp_12345:example.com")
 * @returns       Detected platform or null
 */
function platformFromUserId(userId: string): PlatformId | null {
  for (const platform of BRIDGED_PLATFORMS) {
    const prefix = PLATFORM_CONFIGS[platform].puppetUserIdPrefix;
    if (prefix && userId.startsWith(prefix)) {
      return platform;
    }
  }
  return null;
}

/**
 * Check whether a user ID belongs to a bridge bot.
 *
 * @param userId  Matrix user ID
 * @returns       true if the user is a known bridge bot
 */
function isBridgeBotUser(userId: string): boolean {
  for (const platform of BRIDGED_PLATFORMS) {
    const prefix = PLATFORM_CONFIGS[platform].botUserIdPrefix;
    if (prefix && (userId.startsWith(prefix + ':') || userId.startsWith(prefix + '_'))) {
      return true;
    }
  }
  return false;
}

/**
 * Get a summary of supported features for display.
 * Returns an array of { label, supported } pairs.
 */
function getFeatureSummary(platformId: PlatformId): Array<{ label: string; supported: boolean }> {
  const features = PLATFORM_CONFIGS[platformId].supportedFeatures;
  const labels: Record<keyof BridgeFeatureSet, string> = {
    dms: 'Direct Messages',
    groups: 'Groups',
    channels: 'Channels',
    messageMedia: 'Media',
    reactions: 'Reactions',
    replies: 'Replies',
    editing: 'Editing',
    redactions: 'Delete',
    mentions: 'Mentions',
    typingNotifications: 'Typing',
    readReceipts: 'Read Receipts',
    presence: 'Presence',
    threads: 'Threads',
    formattedText: 'Formatting',
  };

  return (Object.entries(features) as Array<[keyof BridgeFeatureSet, boolean]>).map(
    ([key, supported]) => ({
      label: labels[key],
      supported,
    }),
  );
}

export {
  getPlatformColor,
  getPlatformDisplayName,
  isPlatformFeatureSupported,
  platformFromUserId,
  isBridgeBotUser,
  getFeatureSummary,
};
