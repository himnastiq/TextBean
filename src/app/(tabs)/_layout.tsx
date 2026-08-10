/**
 * Tab navigator layout for the main app screens.
 *
 * 4 tabs: Chats, Search, Bridges, Settings
 * Uses the existing NativeTabs (@expo/ui) pattern from the project.
 */

import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Typography, Spacing, useScheme } from '@/constants/theme';
import { useRoomStore, selectTotalUnreadCount } from '@/stores/room-store';

/* ─── Tab Icon component ─────────────────────────────────── */

function TabIcon({
  emoji,
  label,
  focused,
  badge,
}: {
  emoji: string;
  label: string;
  focused: boolean;
  badge?: number;
}) {
  const scheme = useScheme();
  const C = Colors[scheme];

  return (
    <View style={styles.tabItem}>
      <View style={styles.iconWrapper}>
        <Text style={[styles.emoji, focused && styles.emojiActive]}>{emoji}</Text>
        {badge !== undefined && badge > 0 ? (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{badge > 99 ? '99+' : String(badge)}</Text>
          </View>
        ) : null}
      </View>
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? C.accent : C.textSecondary },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/* ─── Layout ─────────────────────────────────────────────── */

export default function TabsLayout() {
  const scheme = useScheme();
  const C = Colors[scheme];
  const insets = useSafeAreaInsets();
  const totalUnread = useRoomStore(selectTotalUnreadCount);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: C.backgroundElevated,
          borderTopColor: C.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="💬" label="Chats" focused={focused} badge={totalUnread} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🔍" label="Search" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="bridges"
        options={{
          title: 'Bridges',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🔗" label="Bridges" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⚙️" label="Settings" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xs,
  },
  iconWrapper: {
    position: 'relative',
  },
  emoji: {
    fontSize: 24,
    opacity: 0.55,
  },
  emojiActive: {
    opacity: 1,
  },
  tabLabel: {
    ...Typography.caption,
    fontWeight: '600',
    marginTop: 2,
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#F4212E',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
});
