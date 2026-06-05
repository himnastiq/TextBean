/**
 * Bridge detector — identifies which mautrix bridge a room belongs to.
 *
 * Detection strategy (in order of reliability):
 * 1. Inspect m.bridge state events (set by mautrix bridges)
 * 2. Check for bridge bot user presence in the room
 * 3. Check member user ID patterns for puppeted users
 *
 * Reference: https://matrix.org/ecosystem/bridges/
 */

import type { Room as MatrixRoom } from 'matrix-js-sdk';

import { PLATFORM_CONFIGS, BRIDGED_PLATFORMS } from '@/constants/platforms';
import type { PlatformId } from '@/types/platform';

/** Cache detected platforms to avoid re-scanning */
const platformCache = new Map<string, PlatformId>();

/**
 * Detect which platform a room belongs to.
 * Returns 'matrix' for native Matrix rooms (not bridged).
 */
const detectPlatformFromRoom = (room: MatrixRoom): PlatformId => {
  const cached = platformCache.get(room.roomId);
  if (cached) return cached;

  const detected = detectPlatformUncached(room);
  platformCache.set(room.roomId, detected);
  return detected;
};

/**
 * Internal detection logic — tries each method in order of reliability.
 */
const detectPlatformUncached = (room: MatrixRoom): PlatformId => {
  // Strategy 1: Check m.bridge state events (most reliable)
  const bridgePlatform = detectFromBridgeStateEvent(room);
  if (bridgePlatform) return bridgePlatform;

  // Strategy 2: Check for bridge bot user in the room
  const botPlatform = detectFromBridgeBot(room);
  if (botPlatform) return botPlatform;

  // Strategy 3: Check member user ID patterns
  const memberPlatform = detectFromMemberIds(room);
  if (memberPlatform) return memberPlatform;

  return 'matrix';
};

/**
 * Strategy 1: Look for m.bridge state events.
 * Mautrix bridges set these state events with bridge info.
 */
const detectFromBridgeStateEvent = (room: MatrixRoom): PlatformId | null => {
  try {
    const state = room.currentState;
    if (!state) return null;

    // Check for uk.half-shot.bridge or m.bridge state events
    // Mautrix bridges use the bridge bot as the state_key
    const bridgeEvents = state.getStateEvents('uk.half-shot.bridge') ??
                         state.getStateEvents('m.bridge');

    if (bridgeEvents && Array.isArray(bridgeEvents)) {
      for (const event of bridgeEvents) {
        const content = event.getContent();
        const protocol = content?.protocol?.id?.toLowerCase() ?? '';
        const bridgeBot = content?.bridgebot ?? '';

        for (const platform of BRIDGED_PLATFORMS) {
          const config = PLATFORM_CONFIGS[platform];
          if (
            protocol.includes(platform) ||
            bridgeBot.startsWith(config.botUserIdPrefix)
          ) {
            return platform;
          }
        }
      }
    }
  } catch {
    // State access can fail during initial sync
  }
  return null;
};

/**
 * Strategy 2: Check if a bridge bot user is a member of the room.
 * Bridge bots have predictable user ID prefixes (e.g., @whatsappbot:homeserver).
 */
const detectFromBridgeBot = (room: MatrixRoom): PlatformId | null => {
  try {
    const members = room.getMembers();
    for (const member of members) {
      const userId = member.userId;
      for (const platform of BRIDGED_PLATFORMS) {
        const config = PLATFORM_CONFIGS[platform];
        if (userId.startsWith(config.botUserIdPrefix + ':') ||
            userId.startsWith(config.botUserIdPrefix + '_')) {
          return platform;
        }
      }
    }
  } catch {
    // Member list may not be loaded yet with lazy loading
  }
  return null;
};

/**
 * Strategy 3: Check member user IDs for puppeted user patterns.
 * Mautrix bridges create puppet users with predictable prefixes:
 * - @whatsapp_<phone>:homeserver
 * - @telegram_<id>:homeserver
 * - @discord_<id>:homeserver
 * - @gmessages_<phone>:homeserver
 */
const detectFromMemberIds = (room: MatrixRoom): PlatformId | null => {
  try {
    const members = room.getMembers();
    for (const member of members) {
      const userId = member.userId;
      for (const platform of BRIDGED_PLATFORMS) {
        const config = PLATFORM_CONFIGS[platform];
        if (config.puppetUserIdPrefix && userId.startsWith(config.puppetUserIdPrefix)) {
          return platform;
        }
      }
    }
  } catch {
    // Member list may not be loaded yet
  }
  return null;
};

/**
 * Clear the detection cache (useful when room state changes).
 */
const clearPlatformCache = (roomId?: string): void => {
  if (roomId) {
    platformCache.delete(roomId);
  } else {
    platformCache.clear();
  }
};

/**
 * Force re-detection for a room (e.g., after bridge bot joins).
 */
const redetectPlatform = (room: MatrixRoom): PlatformId => {
  platformCache.delete(room.roomId);
  return detectPlatformFromRoom(room);
};

export {
  detectPlatformFromRoom,
  clearPlatformCache,
  redetectPlatform,
};
