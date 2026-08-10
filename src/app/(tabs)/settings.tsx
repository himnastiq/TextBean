/**
 * SettingsPage — app preferences and account management.
 *
 * Sections:
 * - Account info + logout
 * - Notification preferences
 * - Theme selection
 * - Storage & data usage
 * - About / version info
 */

import React, { useCallback } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';

import { Colors, Typography, Spacing, Radius, Shadows, useScheme } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import Avatar from '@/components/ui/Avatar';
import Constants from 'expo-constants';

/* ─── SettingRow ─────────────────────────────────────────── */

function SettingRow({
  id,
  icon,
  label,
  sublabel,
  onPress,
  trailing,
  destructive,
}: {
  id: string;
  icon: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
}) {
  const scheme = useScheme();
  const C = Colors[scheme];

  return (
    <Pressable
      id={id}
      style={({ pressed }) => [styles.settingRow, { backgroundColor: pressed && onPress ? C.backgroundSelected : 'transparent' }]}
      onPress={onPress}
      disabled={!onPress && !trailing}
    >
      <View style={[styles.settingIconWrapper, { backgroundColor: destructive ? '#F4212E22' : C.backgroundElement }]}>
        <Text style={styles.settingIcon}>{icon}</Text>
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: destructive ? C.error : C.text }]}>{label}</Text>
        {sublabel ? <Text style={[styles.settingSubLabel, { color: C.textSecondary }]}>{sublabel}</Text> : null}
      </View>
      {trailing ?? (onPress ? <Text style={[styles.settingChevron, { color: C.textTertiary }]}>›</Text> : null)}
    </Pressable>
  );
}

/* ─── Section header ─────────────────────────────────────── */

function SectionHeader({ title }: { title: string }) {
  const scheme = useScheme();
  const C = Colors[scheme];

  return (
    <Text style={[styles.sectionHeader, { color: C.textTertiary }]}>{title.toUpperCase()}</Text>
  );
}

/* ─── Section card ───────────────────────────────────────── */

function SectionCard({ children }: { children: React.ReactNode }) {
  const scheme = useScheme();
  const C = Colors[scheme];

  return (
    <View style={[styles.sectionCard, { backgroundColor: C.backgroundElevated }, Shadows.small]}>
      {children}
    </View>
  );
}

/* ─── SettingsPage ───────────────────────────────────────── */

export default function SettingsPage() {
  const scheme = useScheme();
  const C = Colors[scheme];
  const insets = useSafeAreaInsets();

  const { userId, homeserverUrl, isLoading, logout } = useAuthStore();

  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [vibrationEnabled, setVibrationEnabled] = React.useState(true);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You will need to sign in again to receive messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => logout(),
        },
      ],
    );
  }, [logout]);

  const displayName = userId ? userId.split(':')[0].replace('@', '') : 'Unknown';
  const homeserverDomain = homeserverUrl ? homeserverUrl.replace(/^https?:\/\//, '') : '';
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={[styles.title, { color: C.text }]}>Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        {/* Account */}
        <SectionHeader title="Account" />
        <SectionCard>
          {/* Profile row */}
          <View style={styles.profileRow}>
            <Avatar imageUrl={null} name={displayName} size="lg" />
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: C.text }]}>{displayName}</Text>
              <Text style={[styles.profileId, { color: C.textSecondary }]}>{userId}</Text>
              <Text style={[styles.profileServer, { color: C.textTertiary }]}>{homeserverDomain}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <SettingRow
            id="settings-logout"
            icon="🚪"
            label="Sign Out"
            onPress={handleLogout}
            destructive
          />
        </SectionCard>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <SectionCard>
          <SettingRow
            id="settings-notif-toggle"
            icon="🔔"
            label="Notifications"
            sublabel="Receive message alerts"
            trailing={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: C.border, true: C.accent }}
                thumbColor="#fff"
              />
            }
          />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <SettingRow
            id="settings-sound-toggle"
            icon="🔊"
            label="Sound"
            trailing={
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: C.border, true: C.accent }}
                thumbColor="#fff"
                disabled={!notificationsEnabled}
              />
            }
          />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <SettingRow
            id="settings-vibration-toggle"
            icon="📳"
            label="Vibration"
            trailing={
              <Switch
                value={vibrationEnabled}
                onValueChange={setVibrationEnabled}
                trackColor={{ false: C.border, true: C.accent }}
                thumbColor="#fff"
                disabled={!notificationsEnabled}
              />
            }
          />
        </SectionCard>

        {/* Appearance */}
        <SectionHeader title="Appearance" />
        <SectionCard>
          <SettingRow
            id="settings-theme"
            icon="🎨"
            label="Theme"
            sublabel={scheme === 'dark' ? 'Dark (System)' : 'Light (System)'}
            trailing={<Text style={[styles.settingValue, { color: C.textSecondary }]}>System</Text>}
          />
        </SectionCard>

        {/* Storage */}
        <SectionHeader title="Storage & Data" />
        <SectionCard>
          <SettingRow
            id="settings-cache"
            icon="🗑"
            label="Clear Message Cache"
            sublabel="Removes cached messages from local storage"
            onPress={() => {
              Alert.alert('Clear Cache', 'This will remove cached messages. Messages will reload from the server.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => {} },
              ]);
            }}
          />
        </SectionCard>

        {/* About */}
        <SectionHeader title="About" />
        <SectionCard>
          <SettingRow
            id="settings-version"
            icon="📦"
            label="Version"
            trailing={<Text style={[styles.settingValue, { color: C.textTertiary }]}>{appVersion}</Text>}
          />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <SettingRow
            id="settings-matrix-protocol"
            icon="🌐"
            label="Matrix Protocol"
            trailing={<Text style={[styles.settingValue, { color: C.textTertiary }]}>v1.x</Text>}
          />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <SettingRow
            id="settings-oss"
            icon="📄"
            label="Open Source Licenses"
            onPress={() => {}}
          />
        </SectionCard>

        {/* Attribution */}
        <Text style={[styles.attribution, { color: C.textTertiary }]}>
          TextBean uses the Matrix open standard for messaging.{'\n'}
          Bridges powered by mautrix.
        </Text>
      </ScrollView>
    </View>
  );
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },

  // Section
  sectionHeader: {
    ...Typography.label,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  sectionCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56 + Spacing.md,
  },

  // Profile
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    ...Typography.headline,
    fontWeight: '700',
  },
  profileId: {
    ...Typography.small,
  },
  profileServer: {
    ...Typography.caption,
  },

  // Setting row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  settingIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIcon: {
    fontSize: 18,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    ...Typography.body,
    fontWeight: '500',
  },
  settingSubLabel: {
    ...Typography.caption,
    marginTop: 1,
  },
  settingChevron: {
    fontSize: 20,
    fontWeight: '300',
  },
  settingValue: {
    ...Typography.small,
  },

  // Attribution
  attribution: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
});
