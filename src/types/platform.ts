/**
 * Platform types for bridged messaging services.
 * Based on official Matrix bridges: https://matrix.org/ecosystem/bridges/
 */

/** Supported platform identifiers matching mautrix bridge naming */
type PlatformId = 'whatsapp' | 'telegram' | 'discord' | 'sms' | 'matrix';

/** Bridge maturity status from matrix.org/ecosystem/bridges */
type BridgeMaturity = 'stable' | 'beta' | 'alpha' | 'obsolete';

/** Connection status of a bridge */
type BridgeConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/** Authentication method required by each bridge */
type BridgeAuthMethod = 'qr_code' | 'phone_verification' | 'token' | 'password';

/** Visual and metadata configuration for a bridged platform */
interface PlatformConfig {
  id: PlatformId;
  displayName: string;
  color: string;
  darkColor: string;
  /** Maturity per matrix.org docs */
  maturity: BridgeMaturity;
  /** mautrix bridge package name (e.g., "mautrix-whatsapp") */
  bridgeName: string;
  /** Bridge bot user ID prefix (e.g., "@whatsappbot") */
  botUserIdPrefix: string;
  /** Puppeted user ID prefix for detecting bridged users (e.g., "@whatsapp_") */
  puppetUserIdPrefix: string;
  /** Authentication method for this bridge */
  authMethod: BridgeAuthMethod;
  /** GitHub repository URL */
  repoUrl: string;
  /** Official documentation URL */
  docsUrl: string;
  /** Features supported by this bridge (from matrix.org feature matrix) */
  supportedFeatures: BridgeFeatureSet;
}

/** Feature support matrix per bridge — from matrix.org/ecosystem/bridges */
interface BridgeFeatureSet {
  dms: boolean;
  groups: boolean;
  channels: boolean;
  messageMedia: boolean;
  reactions: boolean;
  replies: boolean;
  editing: boolean;
  redactions: boolean;
  mentions: boolean;
  typingNotifications: boolean;
  readReceipts: boolean;
  presence: boolean;
  threads: boolean;
  formattedText: boolean;
}

/** Runtime state of a bridge connection */
interface BridgeStatus {
  platformId: PlatformId;
  status: BridgeConnectionStatus;
  /** User-facing status message (e.g., "Connected as +1234567890") */
  statusMessage: string;
  /** Timestamp of last successful sync */
  lastSyncAt: number | null;
  /** Error message if status is 'error' */
  errorMessage: string | null;
}

export type {
  PlatformId,
  BridgeMaturity,
  BridgeConnectionStatus,
  BridgeAuthMethod,
  PlatformConfig,
  BridgeFeatureSet,
  BridgeStatus,
};
