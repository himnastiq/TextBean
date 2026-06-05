/**
 * TextBean Design System
 * Extended theme constants for the unified messaging platform.
 * Covers colors, typography, spacing, shadows, and animation tokens.
 */

import '@/global.css';

import { Platform } from 'react-native';

/* ─── Color Palette ─────────────────────────────────────────────── */

export const Colors = {
  light: {
    text: '#0F1419',
    textSecondary: '#536471',
    textTertiary: '#8B98A5',
    background: '#FFFFFF',
    backgroundElement: '#F0F1F5',
    backgroundSelected: '#E3E5EA',
    backgroundElevated: '#FFFFFF',
    border: '#E1E4E8',
    borderLight: '#EFF1F3',
    accent: '#1D9BF0',
    accentLight: '#E8F5FE',
    accentDark: '#1A8CD8',
    success: '#00BA7C',
    warning: '#FFB800',
    error: '#F4212E',
    errorLight: '#FEE8EA',
    /** Sent message bubble */
    bubbleSent: '#1D9BF0',
    bubbleSentText: '#FFFFFF',
    /** Received message bubble */
    bubbleReceived: '#F0F1F5',
    bubbleReceivedText: '#0F1419',
    /** Overlay for modals */
    overlay: 'rgba(0, 0, 0, 0.4)',
    /** Shimmer gradient colors */
    shimmerBase: '#E1E4E8',
    shimmerHighlight: '#F0F1F5',
  },
  dark: {
    text: '#E7E9EA',
    textSecondary: '#8B98A5',
    textTertiary: '#6E767D',
    background: '#000000',
    backgroundElement: '#16181C',
    backgroundSelected: '#1D1F23',
    backgroundElevated: '#1C1E22',
    border: '#2F3336',
    borderLight: '#1C1E22',
    accent: '#1D9BF0',
    accentLight: '#031A2E',
    accentDark: '#1A8CD8',
    success: '#00BA7C',
    warning: '#FFB800',
    error: '#F4212E',
    errorLight: '#2D1215',
    bubbleSent: '#1D9BF0',
    bubbleSentText: '#FFFFFF',
    bubbleReceived: '#16181C',
    bubbleReceivedText: '#E7E9EA',
    overlay: 'rgba(0, 0, 0, 0.7)',
    shimmerBase: '#2F3336',
    shimmerHighlight: '#3A3D41',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/* ─── Typography ────────────────────────────────────────────────── */

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** Typography scale — font sizes + line heights */
export const Typography = {
  /** 10px — timestamp, badge */
  caption: { fontSize: 10, lineHeight: 14 },
  /** 12px — code, label */
  label: { fontSize: 12, lineHeight: 16 },
  /** 13px — message metadata */
  footnote: { fontSize: 13, lineHeight: 18 },
  /** 14px — secondary text */
  small: { fontSize: 14, lineHeight: 20 },
  /** 16px — body text, messages */
  body: { fontSize: 16, lineHeight: 22 },
  /** 18px — section headers */
  headline: { fontSize: 18, lineHeight: 24 },
  /** 22px — screen titles */
  title: { fontSize: 22, lineHeight: 28 },
  /** 28px — large title */
  largeTitle: { fontSize: 28, lineHeight: 34 },
  /** 36px — hero text */
  display: { fontSize: 36, lineHeight: 42 },
} as const;

/* ─── Spacing ───────────────────────────────────────────────────── */

export const Spacing = {
  /** 2px */
  xxs: 2,
  /** 4px */
  xs: 4,
  /** 8px */
  sm: 8,
  /** 12px */
  md: 12,
  /** 16px */
  lg: 16,
  /** 20px */
  xl: 20,
  /** 24px */
  xxl: 24,
  /** 32px */
  xxxl: 32,
  /** 48px */
  huge: 48,
  /** 64px */
  massive: 64,
} as const;

/* ─── Border Radius ─────────────────────────────────────────────── */

export const Radius = {
  /** 4px — small chips */
  xs: 4,
  /** 8px — cards, inputs */
  sm: 8,
  /** 12px — buttons */
  md: 12,
  /** 16px — larger cards */
  lg: 16,
  /** 20px — message bubbles */
  xl: 20,
  /** 24px — sheets */
  xxl: 24,
  /** Full circle */
  full: 9999,
} as const;

/* ─── Shadows (Android elevation + iOS shadow) ──────────────────── */

export const Shadows = {
  small: Platform.select({
    android: { elevation: 2 },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
    },
  }),
  medium: Platform.select({
    android: { elevation: 4 },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
    },
  }),
  large: Platform.select({
    android: { elevation: 8 },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
    },
  }),
} as const;

/* ─── Animation Durations ───────────────────────────────────────── */

export const Durations = {
  /** 100ms — micro interactions (press feedback) */
  fast: 100,
  /** 200ms — standard transitions */
  normal: 200,
  /** 300ms — page transitions, modals */
  slow: 300,
  /** 500ms — complex animations */
  slower: 500,
} as const;

/* ─── Layout Constants ──────────────────────────────────────────── */

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/** Conversation list item height */
export const ConversationRowHeight = 76;

/** Message input bar min height */
export const InputBarMinHeight = 52;

/** Avatar sizes */
export const AvatarSizes = {
  sm: 28,
  md: 40,
  lg: 52,
  xl: 72,
} as const;
