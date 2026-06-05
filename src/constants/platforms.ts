/**
 * Platform registry for bridged messaging services.
 * Source: https://matrix.org/ecosystem/bridges/
 *
 * Each entry maps a PlatformId to its visual config, bridge metadata,
 * and feature support matrix per the official Matrix documentation.
 */

import type { PlatformConfig, PlatformId } from '@/types/platform';

/**
 * Complete platform configurations for all supported bridges.
 * Feature flags sourced from matrix.org/ecosystem/bridges/{platform}/
 */
const PLATFORM_CONFIGS: Record<PlatformId, PlatformConfig> = {
  whatsapp: {
    id: 'whatsapp',
    displayName: 'WhatsApp',
    color: '#25D366',
    darkColor: '#128C7E',
    maturity: 'stable',
    bridgeName: 'mautrix-whatsapp',
    botUserIdPrefix: '@whatsappbot',
    puppetUserIdPrefix: '@whatsapp_',
    authMethod: 'qr_code',
    repoUrl: 'https://github.com/mautrix/whatsapp',
    docsUrl: 'https://docs.mau.fi/bridges/go/setup.html?bridge=whatsapp',
    supportedFeatures: {
      dms: true,
      groups: true,
      channels: true, // Communities
      messageMedia: true,
      reactions: true,
      replies: true,
      editing: true,
      redactions: true,
      mentions: true,
      typingNotifications: true,
      readReceipts: true,
      presence: true,
      threads: false,
      formattedText: false,
    },
  },

  telegram: {
    id: 'telegram',
    displayName: 'Telegram',
    color: '#0088CC',
    darkColor: '#006DAC',
    maturity: 'beta',
    bridgeName: 'mautrix-telegram',
    botUserIdPrefix: '@telegrambot',
    puppetUserIdPrefix: '@telegram_',
    authMethod: 'phone_verification',
    repoUrl: 'https://github.com/mautrix/telegram',
    docsUrl: 'https://docs.mau.fi/bridges/python/setup.html?bridge=telegram',
    supportedFeatures: {
      dms: true,
      groups: true,
      channels: true,
      messageMedia: true,
      reactions: true,
      replies: false,
      editing: true,
      redactions: true,
      mentions: true,
      typingNotifications: false,
      readReceipts: false,
      presence: false,
      threads: false,
      formattedText: false,
    },
  },

  discord: {
    id: 'discord',
    displayName: 'Discord',
    color: '#5865F2',
    darkColor: '#4752C4',
    maturity: 'beta',
    bridgeName: 'mautrix-discord',
    botUserIdPrefix: '@discordbot',
    puppetUserIdPrefix: '@discord_',
    authMethod: 'token',
    repoUrl: 'https://github.com/mautrix/discord',
    docsUrl: 'https://docs.mau.fi/bridges/go/setup.html?bridge=discord',
    supportedFeatures: {
      dms: true,
      groups: true,
      channels: true,
      messageMedia: true,
      reactions: true,
      replies: true,
      editing: true,
      redactions: true,
      mentions: true,
      typingNotifications: true,
      readReceipts: false,
      presence: true,
      threads: true,
      formattedText: true,
    },
  },

  sms: {
    id: 'sms',
    displayName: 'SMS',
    color: '#4CAF50',
    darkColor: '#388E3C',
    maturity: 'stable',
    bridgeName: 'mautrix-gmessages',
    botUserIdPrefix: '@gmessagesbot',
    puppetUserIdPrefix: '@gmessages_',
    authMethod: 'qr_code',
    repoUrl: 'https://github.com/mautrix/gmessages',
    docsUrl: 'https://docs.mau.fi/bridges/go/setup.html?bridge=gmessages',
    supportedFeatures: {
      dms: true,
      groups: true,
      channels: false,
      messageMedia: true, // MMS
      reactions: true,
      replies: true,
      editing: false,
      redactions: false,
      mentions: false,
      typingNotifications: false,
      readReceipts: false,
      presence: false,
      threads: false,
      formattedText: false,
    },
  },

  matrix: {
    id: 'matrix',
    displayName: 'Matrix',
    color: '#0DBD8B',
    darkColor: '#0A9B72',
    maturity: 'stable',
    bridgeName: 'native',
    botUserIdPrefix: '',
    puppetUserIdPrefix: '',
    authMethod: 'password',
    repoUrl: 'https://github.com/matrix-org/matrix-js-sdk',
    docsUrl: 'https://matrix.org/docs/',
    supportedFeatures: {
      dms: true,
      groups: true,
      channels: true,
      messageMedia: true,
      reactions: true,
      replies: true,
      editing: true,
      redactions: true,
      mentions: true,
      typingNotifications: true,
      readReceipts: true,
      presence: true,
      threads: true,
      formattedText: true,
    },
  },
} as const;

/** All bridged platform IDs (excluding native matrix) */
const BRIDGED_PLATFORMS: PlatformId[] = ['whatsapp', 'telegram', 'discord', 'sms'];

/** All platform IDs including native matrix */
const ALL_PLATFORMS: PlatformId[] = ['matrix', ...BRIDGED_PLATFORMS];

/** Quick lookup: get a platform config by ID */
const getPlatformConfig = (id: PlatformId): PlatformConfig => PLATFORM_CONFIGS[id];

export { PLATFORM_CONFIGS, BRIDGED_PLATFORMS, ALL_PLATFORMS, getPlatformConfig };
