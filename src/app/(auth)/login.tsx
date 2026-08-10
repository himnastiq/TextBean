/**
 * LoginPage — Matrix authentication screen.
 *
 * Supports:
 * - Homeserver URL with /.well-known/matrix/client auto-discovery
 * - Username + password login (m.login.password)
 * - Access token stored via MatrixClient → expo-secure-store
 * - Premium animated dark gradient UI
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuthStore } from '@/stores/auth-store';
import { Colors, Fonts, Radius, Spacing, Typography, Durations } from '@/constants/theme';

/* ─── Constants ─────────────────────────────────────────── */

const MATRIX_WELL_KNOWN = '/.well-known/matrix/client';
const DISCOVERY_TIMEOUT_MS = 3000;

/* ─── Well-known discovery ──────────────────────────────── */

async function discoverHomeserver(input: string): Promise<string> {
  let base = input.trim();
  if (!base.startsWith('http')) {
    base = `https://${base}`;
  }
  // Remove trailing slash
  base = base.replace(/\/$/, '');

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS);

    const res = await fetch(`${base}${MATRIX_WELL_KNOWN}`, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const json = await res.json();
      const discovered = json?.['m.homeserver']?.['base_url'];
      if (discovered) return discovered.replace(/\/$/, '');
    }
  } catch {
    // Fall through — use raw input
  }
  return base;
}

/* ─── Component ─────────────────────────────────────────── */

export default function LoginPage() {
  const insets = useSafeAreaInsets();
  const { login, isLoading, isLoggedIn, loginError, clearLoginError } = useAuthStore();

  const [homeserver, setHomeserver] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryNote, setDiscoveryNote] = useState('');

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;

  // Input refs for keyboard navigation
  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Redirect when authenticated
  useEffect(() => {
    if (isLoggedIn) {
      router.replace('/(tabs)/');
    }
  }, [isLoggedIn]);

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.timing(fadeIn, { toValue: 1, duration: Durations.slower, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }),
    ]).start();
  }, []);

  // Shake animation on error
  useEffect(() => {
    if (loginError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Animated.sequence([
        Animated.timing(shake, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [loginError]);

  const handleHomeserverBlur = useCallback(async () => {
    if (!homeserver.trim()) return;
    setDiscovering(true);
    setDiscoveryNote('');
    try {
      const discovered = await discoverHomeserver(homeserver);
      if (discovered !== homeserver.trim() && discovered !== `https://${homeserver.trim()}`) {
        setDiscoveryNote(`Using ${discovered}`);
      }
    } finally {
      setDiscovering(false);
    }
  }, [homeserver]);

  const handleLogin = useCallback(async () => {
    clearLoginError();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const resolvedHomeserver = await discoverHomeserver(homeserver);

    await login({
      homeserverUrl: resolvedHomeserver,
      username: username.trim(),
      password,
    });
  }, [homeserver, username, password, login, clearLoginError]);

  const canSubmit = homeserver.trim() && username.trim() && password.length > 0 && !isLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background gradient layers */}
      <View style={styles.bgLayer1} />
      <View style={styles.bgLayer2} />
      <View style={styles.bgLayer3} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xxxl, paddingBottom: insets.bottom + Spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <Animated.View style={[styles.logoSection, { transform: [{ scale: logoScale }], opacity: fadeIn }]}>
          <View style={styles.logoMark}>
            <Text style={styles.logoEmoji}>🫘</Text>
          </View>
          <Text style={styles.appName}>TextBean</Text>
          <Text style={styles.tagline}>All your messages, one place</Text>
        </Animated.View>

        {/* Card */}
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeIn, transform: [{ translateY: slideUp }, { translateX: shake }] },
          ]}
        >
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSubtitle}>Connect to your Matrix homeserver</Text>

          {/* Error banner */}
          {loginError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠ {loginError}</Text>
            </View>
          ) : null}

          {/* Homeserver URL */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Homeserver</Text>
            <View style={styles.inputRow}>
              <TextInput
                id="login-homeserver"
                style={styles.input}
                placeholder="matrix.org or your.server.com"
                placeholderTextColor={COLORS.textTertiary}
                value={homeserver}
                onChangeText={setHomeserver}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="next"
                onSubmitEditing={() => usernameRef.current?.focus()}
                onBlur={handleHomeserverBlur}
                editable={!isLoading}
              />
              {discovering && <ActivityIndicator size="small" color={COLORS.accent} style={styles.inputAdornment} />}
            </View>
            {discoveryNote ? <Text style={styles.discoveryNote}>{discoveryNote}</Text> : null}
          </View>

          {/* Username */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              id="login-username"
              ref={usernameRef}
              style={styles.input}
              placeholder="@you:matrix.org"
              placeholderTextColor={COLORS.textTertiary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!isLoading}
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                id="login-password"
                ref={passwordRef}
                style={[styles.input, styles.inputFlex]}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!passwordVisible}
                returnKeyType="go"
                onSubmitEditing={canSubmit ? handleLogin : undefined}
                editable={!isLoading}
              />
              <Pressable
                id="login-password-toggle"
                style={styles.eyeButton}
                onPress={() => setPasswordVisible((v) => !v)}
                hitSlop={12}
              >
                <Text style={styles.eyeIcon}>{passwordVisible ? '🙈' : '👁'}</Text>
              </Pressable>
            </View>
          </View>

          {/* Login button */}
          <Pressable
            id="login-submit"
            style={({ pressed }) => [styles.loginButton, !canSubmit && styles.loginButtonDisabled, pressed && styles.loginButtonPressed]}
            onPress={canSubmit ? handleLogin : undefined}
            disabled={!canSubmit}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </Pressable>

          {/* Matrix info link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have a homeserver?</Text>
            <Text style={styles.footerLink}> Learn about Matrix →</Text>
          </View>
        </Animated.View>

        {/* Powered by Matrix */}
        <Animated.Text style={[styles.poweredBy, { opacity: fadeIn }]}>
          Powered by the Matrix Protocol
        </Animated.Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ─── Colors (dark-only login screen) ───────────────────── */

const COLORS = {
  bg: '#080B14',
  card: 'rgba(255,255,255,0.05)',
  cardBorder: 'rgba(255,255,255,0.10)',
  accent: '#1D9BF0',
  accentGlow: 'rgba(29,155,240,0.25)',
  inputBg: 'rgba(255,255,255,0.07)',
  inputBorder: 'rgba(255,255,255,0.12)',
  text: '#E7E9EA',
  textSecondary: '#8B98A5',
  textTertiary: '#4A5568',
  error: '#F4212E',
  errorBg: 'rgba(244,33,46,0.12)',
};

/* ─── Styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Background gradient layers (simulated with overlapping views)
  bgLayer1: {
    ...StyleSheet.absoluteFill,
    backgroundColor: COLORS.bg,
  },
  bgLayer2: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(29,155,240,0.08)',
  },
  bgLayer3: {
    position: 'absolute',
    bottom: 0,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(13,189,139,0.06)',
  },

  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },

  // Logo section
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoMark: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.accentGlow,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoEmoji: {
    fontSize: 40,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  tagline: {
    ...Typography.small,
    color: COLORS.textSecondary,
    marginTop: Spacing.xs,
  },

  // Card
  card: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    maxWidth: 420,
  },
  cardTitle: {
    ...Typography.title,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    ...Typography.small,
    color: COLORS.textSecondary,
    marginBottom: Spacing.xl,
  },

  // Error
  errorBanner: {
    backgroundColor: COLORS.errorBg,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(244,33,46,0.3)',
  },
  errorText: {
    ...Typography.small,
    color: COLORS.error,
  },

  // Fields
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.label,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Typography.body,
    color: COLORS.text,
  },
  inputFlex: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  inputAdornment: {
    marginLeft: Spacing.sm,
  },
  eyeButton: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: COLORS.inputBorder,
    borderTopRightRadius: Radius.md,
    borderBottomRightRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  eyeIcon: {
    fontSize: 18,
  },
  discoveryNote: {
    ...Typography.caption,
    color: Colors.dark.success,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },

  // Button
  loginButton: {
    backgroundColor: COLORS.accent,
    borderRadius: Radius.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  loginButtonText: {
    ...Typography.body,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    flexWrap: 'wrap',
  },
  footerText: {
    ...Typography.small,
    color: COLORS.textSecondary,
  },
  footerLink: {
    ...Typography.small,
    color: COLORS.accent,
    fontWeight: '600',
  },

  // Bottom attribution
  poweredBy: {
    ...Typography.caption,
    color: COLORS.textTertiary,
    marginTop: Spacing.xxl,
    textAlign: 'center',
  },
});
