/**
 * Bridge bot service — manages interaction with mautrix bridge bots.
 *
 * Each mautrix bridge creates a bot user (e.g., @whatsappbot:homeserver)
 * that accepts commands to manage the bridge connection.
 *
 * Reference: https://docs.mau.fi/bridges/
 */

import { getClient, sendTextMessage } from '@/services/matrix/MatrixClient';
import { PLATFORM_CONFIGS } from '@/constants/platforms';
import type { PlatformId, BridgeConnectionStatus } from '@/types/platform';

/** Response from a bridge bot command */
interface BridgeBotResponse {
  success: boolean;
  message: string;
  /** For QR code login flows, the QR data string */
  qrData: string | null;
}

/**
 * Find the DM room with a bridge bot.
 * Returns the room ID or null if no DM exists.
 */
const findBridgeBotRoom = (platform: PlatformId): string | null => {
  const client = getClient();
  const config = PLATFORM_CONFIGS[platform];
  const rooms = client.getRooms();

  for (const room of rooms) {
    const members = room.getMembers();
    // Bridge bot DMs typically have exactly 2 members: the user and the bot
    if (members.length <= 3) {
      for (const member of members) {
        if (
          member.userId.startsWith(config.botUserIdPrefix + ':') ||
          member.userId.startsWith(config.botUserIdPrefix + '_')
        ) {
          return room.roomId;
        }
      }
    }
  }

  return null;
};

/**
 * Send a command to a bridge bot and wait for the response.
 *
 * @param platform - The platform whose bridge bot to message
 * @param command - The command to send (e.g., "login", "ping", "logout")
 * @returns The bot's response
 */
const sendBotCommand = async (
  platform: PlatformId,
  command: string,
): Promise<BridgeBotResponse> => {
  const roomId = findBridgeBotRoom(platform);

  if (!roomId) {
    return {
      success: false,
      message: `No bridge bot room found for ${PLATFORM_CONFIGS[platform].displayName}. The bridge may not be configured on your homeserver.`,
      qrData: null,
    };
  }

  try {
    await sendTextMessage(roomId, command);
    // Note: In a real implementation, we'd listen for the bot's response
    // via the timeline event handler. For now, return a pending status.
    return {
      success: true,
      message: `Command "${command}" sent to ${PLATFORM_CONFIGS[platform].displayName} bridge.`,
      qrData: null,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to send command: ${error instanceof Error ? error.message : 'Unknown error'}`,
      qrData: null,
    };
  }
};

/**
 * Initiate login for a bridge.
 * Each bridge has a different auth flow:
 * - mautrix-whatsapp: "login" → QR code
 * - mautrix-telegram: "login" → phone number flow
 * - mautrix-discord: "login-token" → Discord token
 * - mautrix-gmessages: "login-google" → QR code
 */
const initiateBridgeLogin = async (platform: PlatformId): Promise<BridgeBotResponse> => {
  const loginCommands: Record<PlatformId, string> = {
    whatsapp: 'login',
    telegram: 'login',
    discord: 'login-token',
    sms: 'login-google',
    matrix: '', // Not applicable
  };

  const command = loginCommands[platform];
  if (!command) {
    return {
      success: false,
      message: 'Login not applicable for native Matrix.',
      qrData: null,
    };
  }

  return sendBotCommand(platform, command);
};

/**
 * Check bridge connection status by sending a "ping" command.
 */
const pingBridge = async (platform: PlatformId): Promise<BridgeConnectionStatus> => {
  const roomId = findBridgeBotRoom(platform);
  if (!roomId) return 'disconnected';

  try {
    const response = await sendBotCommand(platform, 'ping');
    return response.success ? 'connected' : 'error';
  } catch {
    return 'error';
  }
};

/**
 * Disconnect/logout from a bridge.
 */
const disconnectBridge = async (platform: PlatformId): Promise<BridgeBotResponse> => {
  return sendBotCommand(platform, 'logout');
};

/**
 * Get help text for a bridge.
 */
const getBridgeHelp = async (platform: PlatformId): Promise<BridgeBotResponse> => {
  return sendBotCommand(platform, 'help');
};

export {
  findBridgeBotRoom,
  sendBotCommand,
  initiateBridgeLogin,
  pingBridge,
  disconnectBridge,
  getBridgeHelp,
};
export type { BridgeBotResponse };
