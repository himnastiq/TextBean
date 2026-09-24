/**
 * BridgesPage — bridge connection manager.
 *
 * Shows a card for each mautrix bridge with connection status,
 * per-bridge authentication flows, feature support badges,
 * and disconnect actions.
 *
 * Bridge interaction model follows:
 * https://matrix.org/ecosystem/bridges/
 */

import React, { useCallback, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';

import { Colors, Typography, Spacing, Radius, Shadows, useScheme } from '@/constants/theme';
import { BRIDGED_PLATFORMS, PLATFORM_CONFIGS } from '@/constants/platforms';
import type { PlatformId } from '@/types/platform';
import type { PlatformConfig } from '@/types/platform';

/* ─── Feature badge ──────────────────────────────────────── */

type FeatureKey = keyof PlatformConfig['supportedFeatures'];

const FEATURE_LABELS: Partial<Record<FeatureKey, string>> = {
  dms: 'DMs',
  groups: 'Groups',
  messageMedia: 'Media',
  reactions: 'Reactions',
  replies: 'Replies',
  editing: 'Editing',
  typingNotifications: 'Typing',
  readReceipts: 'Read Receipts',
  threads: 'Threads',
};

function FeatureBadge({ label, supported }: { label: string; supported: boolean }) {
  const scheme = useScheme();
  const C = Colors[scheme];

  return (
    <View
      style={[
        styles.featureBadge,
        {
          backgroundColor: supported ? Colors.dark.success + '18' : C.backgroundElement,
          borderColor: supported ? Colors.dark.success + '40' : C.border,
        },
      ]}
    >
      <Ionicons name={supported ? 'checkmark-circle' : 'remove-outline'} size={12} color={supported ? Colors.dark.success : C.textTertiary} style={{ marginRight: 3 }} />
      <Text style={[styles.featureBadgeText, { color: supported ? Colors.dark.success : C.textTertiary }]}>
        {label}
      </Text>
    </View>
  );
}

/* ─── Connection status indicator ────────────────────────── */

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error' | 'unknown';

function StatusDot({ status }: { status: ConnectionStatus }) {
  const color =
    status === 'connected'
      ? '#00BA7C'
      : status === 'connecting'
      ? '#FFB800'
      : status === 'error'
      ? '#F4212E'
      : '#8B98A5';

  return <View style={[styles.statusDot, { backgroundColor: color }]} />;
}

function statusLabel(s: ConnectionStatus): string {
  switch (s) {
    case 'connected': return 'Connected';
    case 'connecting': return 'Connecting…';
    case 'error': return 'Error';
    case 'disconnected': return 'Not connected';
    default: return 'Unknown';
  }
}

/* ─── Auth method descriptions ───────────────────────────── */

function authDescription(platformId: PlatformId): string {
  switch (platformId) {
    case 'whatsapp': return 'Scan a QR code to pair as a WhatsApp linked device';
    case 'telegram': return 'Enter your phone number and verification code';
    case 'discord': return 'Provide your Discord auth token';
    case 'sms': return 'Scan a QR code to pair with Google Messages';
    default: return '';
  }
}

function authButtonLabel(platformId: PlatformId): string {
  switch (platformId) {
    case 'whatsapp':
    case 'sms': return 'Scan QR Code';
    case 'telegram': return 'Enter Phone Number';
    case 'discord': return 'Enter Token';
    default: return 'Connect';
  }
}

/* ─── Bridge card ────────────────────────────────────────── */

interface BridgeCardProps {
  platformId: PlatformId;
  config: PlatformConfig;
  status: ConnectionStatus;
  onConnect: () => void;
  onDisconnect: () => void;
}

function BridgeCard({ platformId, config, status, onConnect, onDisconnect }: BridgeCardProps) {
  const scheme = useScheme();
  const C = Colors[scheme];
  const [expanded, setExpanded] = useState(false);
  const scale = new Animated.Value(1);

  const platformColor = scheme === 'dark' ? config.darkColor : config.color;
  const isConnected = status === 'connected';

  const handlePressIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 40 }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  const featureEntries = Object.entries(FEATURE_LABELS) as Array<[FeatureKey, string]>;

  return (
    <Animated.View style={[styles.card, { backgroundColor: C.backgroundElevated, transform: [{ scale }] }, Shadows.small]}>
      <Pressable
        id={`bridge-card-${platformId}`}
        onPress={() => setExpanded((e) => !e)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.cardHeader}
      >
        {/* Color accent */}
        <View style={[styles.cardAccent, { backgroundColor: platformColor }]} />

        {/* Icon placeholder */}
        <View style={[styles.platformIcon, { backgroundColor: platformColor + '22', borderColor: platformColor + '44' }]}>
          <Ionicons name={platformIconName(platformId)} size={24} color={platformColor} />
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: C.text }]}>{config.displayName}</Text>
            {config.maturity === 'beta' && (
              <View style={styles.betaPill}>
                <Text style={styles.betaPillText}>BETA</Text>
              </View>
            )}
          </View>
          <View style={styles.cardStatusRow}>
            <StatusDot status={status} />
            <Text style={[styles.cardStatus, { color: C.textSecondary }]}>{statusLabel(status)}</Text>
          </View>
        </View>

        {/* Expand chevron */}
        <Text style={[styles.chevron, { color: C.textTertiary }]}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {/* Expanded content */}
      {expanded && (
        <View style={[styles.cardBody, { borderTopColor: C.border }]}>
          {/* Auth description */}
          <Text style={[styles.authDesc, { color: C.textSecondary }]}>{authDescription(platformId)}</Text>

          {/* Feature support */}
          <Text style={[styles.sectionLabel, { color: C.textTertiary }]}>Feature Support</Text>
          <View style={styles.featuresGrid}>
            {featureEntries.map(([key, label]) => (
              <FeatureBadge key={key} label={label} supported={config.supportedFeatures[key] ?? false} />
            ))}
          </View>

          {/* Actions */}
          <View style={styles.cardActions}>
            {!isConnected ? (
              <Pressable
                id={`bridge-connect-${platformId}`}
                style={[styles.connectButton, { backgroundColor: platformColor }]}
                onPress={onConnect}
              >
                <Text style={styles.connectButtonText}>{authButtonLabel(platformId)}</Text>
              </Pressable>
            ) : (
              <Pressable
                id={`bridge-disconnect-${platformId}`}
                style={[styles.disconnectButton, { borderColor: C.border }]}
                onPress={onDisconnect}
              >
                <Text style={[styles.disconnectButtonText, { color: C.textSecondary }]}>Disconnect</Text>
              </Pressable>
            )}
          </View>

          {/* Docs link */}
          <Text style={[styles.docsLink, { color: C.accent }]}>View bridge docs →</Text>
        </View>
      )}
    </Animated.View>
  );
}

/* ─── BridgesPage ────────────────────────────────────────── */

export default function BridgesPage() {
  const scheme = useScheme();
  const C = Colors[scheme];
  const insets = useSafeAreaInsets();

  // Bridge status state (placeholder until BridgeBotService integration in Phase 6)
  const [statuses, setStatuses] = useState<Record<PlatformId, ConnectionStatus>>({
    whatsapp: 'disconnected',
    telegram: 'disconnected',
    discord: 'disconnected',
    sms: 'disconnected',
    matrix: 'connected',
  });

  const handleConnect = useCallback((platformId: PlatformId) => {
    // TODO: trigger BridgeBotService auth flow (Phase 6)
    setStatuses((prev) => ({ ...prev, [platformId]: 'connecting' }));
    // Simulate connection attempt
    setTimeout(() => {
      setStatuses((prev) => ({ ...prev, [platformId]: 'disconnected' }));
    }, 3000);
  }, []);

  const handleDisconnect = useCallback((platformId: PlatformId) => {
    setStatuses((prev) => ({ ...prev, [platformId]: 'disconnected' }));
  }, []);

  const connectedCount = BRIDGED_PLATFORMS.filter((p) => statuses[p] === 'connected').length;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={[styles.title, { color: C.text }]}>Bridges</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>
          {connectedCount === 0
            ? 'Connect bridges to unify your messages'
            : `${connectedCount} bridge${connectedCount > 1 ? 's' : ''} connected`}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        {/* Info banner */}
        <View style={[styles.infoBanner, { backgroundColor: C.accentLight, borderColor: C.accent + '40' }]}>
          <Ionicons name="information-circle-outline" size={18} color={C.accent} style={{ marginTop: 1 }} />
          <Text style={[styles.infoText, { color: C.accent }]}>
            Bridges require a self-hosted Matrix homeserver with mautrix bridges configured.
          </Text>
        </View>

        {/* Bridge cards */}
        {BRIDGED_PLATFORMS.map((platformId) => (
          <BridgeCard
            key={platformId}
            platformId={platformId}
            config={PLATFORM_CONFIGS[platformId]}
            status={statuses[platformId]}
            onConnect={() => handleConnect(platformId)}
            onDisconnect={() => handleDisconnect(platformId)}
          />
        ))}

        {/* Footer note */}
        <Text style={[styles.footerNote, { color: C.textTertiary }]}>
          Powered by mautrix bridges · matrix.org/ecosystem/bridges
        </Text>
      </ScrollView>
    </View>
  );
}

/* ─── Helpers ────────────────────────────────────────────── */

function platformIconName(id: PlatformId): React.ComponentProps<typeof Ionicons>['name'] {
  switch (id) {
    case 'whatsapp': return 'logo-whatsapp';
    case 'telegram': return 'paper-plane';
    case 'discord': return 'logo-discord';
    case 'sms': return 'chatbubble';
    default: return 'link';
  }
}

/* ─── Styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  title: {
    ...Typography.largeTitle,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    ...Typography.small,
    marginTop: Spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  infoEmoji: {
    fontSize: 16,
    marginTop: 1,
  },
  infoText: {
    ...Typography.small,
    flex: 1,
    lineHeight: 20,
  },

  // Bridge card
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  cardAccent: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    borderTopLeftRadius: Radius.lg,
    borderBottomLeftRadius: Radius.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingLeft: Spacing.lg + 4,
    gap: Spacing.md,
  },
  platformIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformIconText: {
    fontSize: 24,
  },
  cardInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cardTitle: {
    ...Typography.headline,
    fontWeight: '700',
  },
  betaPill: {
    backgroundColor: '#FFB80022',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
  },
  betaPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFB800',
    letterSpacing: 0.5,
  },
  cardStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardStatus: {
    ...Typography.small,
  },
  chevron: {
    fontSize: 12,
  },

  // Card body
  cardBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  authDesc: {
    ...Typography.small,
    lineHeight: 20,
  },
  sectionLabel: {
    ...Typography.label,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.xs,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
  },
  featureBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardActions: {
    marginTop: Spacing.xs,
  },
  connectButton: {
    borderRadius: Radius.md,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButtonText: {
    ...Typography.body,
    fontWeight: '700',
    color: '#fff',
  },
  disconnectButton: {
    borderRadius: Radius.md,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  disconnectButtonText: {
    ...Typography.body,
    fontWeight: '600',
  },
  docsLink: {
    ...Typography.small,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Footer
  footerNote: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
});
