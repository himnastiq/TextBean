/**
 * Root layout — TextBean app shell.
 *
 * Responsibilities:
 * 1. SQLiteProvider — initializes database and exposes it via useSQLiteContext
 * 2. Session restoration — checks for persisted Matrix session on startup
 * 3. Auth gate — redirects to login if unauthenticated, tabs if authenticated
 * 4. Matrix sync — starts the /sync loop after session restore
 * 5. Push notification initialization (Phase 7)
 * 6. In-app notification banner overlay
 * 7. StatusBar configuration
 *
 * Stack routes:
 * - (auth)  → login screen group
 * - (tabs)  → main app tab bar
 * - chat    → individual conversation screens (pushed on top of tabs)
 */

import '@/services/matrix/polyfills';

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DATABASE_NAME, initializeDatabase } from '@/database/Database';
import { useAuthStore } from '@/stores/auth-store';
import * as MatrixClient from '@/services/matrix/MatrixClient';
import { startSyncListeners, stopSyncListeners } from '@/services/matrix/SyncManager';
import * as NotificationService from '@/services/notifications/NotificationService';
import * as NotificationHandler from '@/services/notifications/NotificationHandler';
import InAppBanner from '@/components/notifications/InAppBanner';
import { Colors, useScheme } from '@/constants/theme';

/* ─── In-app banner state ────────────────────────────────── */

interface BannerData {
  roomId: string;
  senderName: string;
  content: string;
  avatarUrl: string | null;
}

/* ─── AuthGate — handles session restoration, routing, and notification init ─── */

function AuthGate({ onInAppBanner }: { onInAppBanner: NotificationHandler.InAppBannerCallback }) {
  const { isLoggedIn, isLoading, isSessionRestored, restoreSession, setSyncStatus } = useAuthStore();
  const scheme = useScheme();
  const C = Colors[scheme];

  // Get db from SQLiteProvider context for SyncManager
  const db = useSQLiteContext();

  // Attempt to restore session on first render
  useEffect(() => {
    restoreSession().then(async (restored) => {
      if (restored) {
        // Start the sync loop now that we have a valid session
        try {
          setSyncStatus('syncing');
          await MatrixClient.startSync();

          // Wire up sync event listeners to dispatch to DB + Zustand stores
          startSyncListeners(db, (status) => {
            setSyncStatus(status);
          });
        } catch {
          setSyncStatus('error');
        }

        // Initialize push notifications after auth
        NotificationService.initialize().catch((err) => {
          console.warn('[RootLayout] Notification init failed:', err);
        });
      }
    });
  }, [db]);

  // Register notification listeners once authenticated
  useEffect(() => {
    if (!isLoggedIn) return;

    const cleanup = NotificationHandler.registerListeners(onInAppBanner);
    return () => {
      cleanup();
      stopSyncListeners();
    };
  }, [isLoggedIn, onInAppBanner]);

  // Once session check completes, route appropriately
  useEffect(() => {
    if (!isSessionRestored) return;

    if (isLoggedIn) {
      router.replace('/(tabs)/');
    } else {
      router.replace('/(auth)/login');
    }
  }, [isSessionRestored, isLoggedIn]);

  // Show loading screen while restoring session
  if (!isSessionRestored || isLoading) {
    return (
      <View style={[styles.splash, { backgroundColor: C.background }]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return null;
}

/* ─── Root layout ────────────────────────────────────────── */

export default function RootLayout() {
  const scheme = useScheme();
  const C = Colors[scheme];

  // In-app banner state
  const [bannerData, setBannerData] = useState<BannerData | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);

  const handleInAppBanner = useCallback<NotificationHandler.InAppBannerCallback>((data) => {
    setBannerData(data);
    setBannerVisible(true);
  }, []);

  const handleDismissBanner = useCallback(() => {
    setBannerVisible(false);
    // Clear data after dismiss animation completes
    setTimeout(() => setBannerData(null), 300);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeDatabase}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

          {/* Auth gate handles session restore, routing, and notification init */}
          <AuthGate onInAppBanner={handleInAppBanner} />

          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: C.background },
              animation: 'slide_from_right',
            }}
          >
            {/* Auth group — login screen */}
            <Stack.Screen name="(auth)" />

            {/* Main app — tab bar */}
            <Stack.Screen name="(tabs)" />

            {/* Chat screen — slides in over tabs */}
            <Stack.Screen
              name="chat/[roomId]"
              options={{
                animation: 'slide_from_right',
                gestureEnabled: true,
              }}
            />
          </Stack>

          {/* In-app notification banner overlay */}
          {bannerData && (
            <InAppBanner
              visible={bannerVisible}
              roomId={bannerData.roomId}
              senderName={bannerData.senderName}
              content={bannerData.content}
              avatarUrl={bannerData.avatarUrl}
              onDismiss={handleDismissBanner}
            />
          )}
        </SQLiteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splash: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
});
