import '@/global.css';

import { Platform } from 'react-native';

import type { TrackId } from '@/types/content';

/**
 * Design tokens. Every screen reads colors through `useTheme()` so light and
 * dark mode stay in sync. Feedback colors are always paired with an icon or
 * label in the UI so they never carry meaning on color alone.
 */
export const Colors = {
  light: {
    text: '#11131A',
    textSecondary: '#5B6170',
    background: '#F7F8FC',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF0F6',
    border: '#DDE1EB',
    primary: '#5B4BF5',
    primaryText: '#FFFFFF',
    success: '#1E8E5A',
    successBg: '#E3F6EC',
    danger: '#C93B3B',
    dangerBg: '#FBE7E7',
    warning: '#B26A00',
    warningBg: '#FFF1DB',
    codeBg: '#1E2030',
    codeText: '#E6E8F2',
  },
  dark: {
    text: '#F2F3F8',
    textSecondary: '#A3A9B8',
    background: '#0E1016',
    surface: '#171A23',
    surfaceAlt: '#20242F',
    border: '#2C3140',
    primary: '#8B80FF',
    primaryText: '#0E1016',
    success: '#4CC98A',
    successBg: '#16301F',
    danger: '#F07272',
    dangerBg: '#3A1A1A',
    warning: '#F2B14C',
    warningBg: '#3A2A10',
    codeBg: '#0A0B10',
    codeText: '#E6E8F2',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };
export type ThemeColor = keyof ThemeColors;

/** One accent per learning track. Readable on both light and dark surfaces. */
export const TrackColors: Record<TrackId, string> = {
  js: '#D9A400',
  ts: '#3178C6',
  react: '#149ECA',
  nextjs: '#7C7C8A',
};

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', rounded: 'ui-rounded', mono: 'ui-monospace' },
  web: { sans: 'var(--font-display)', rounded: 'var(--font-rounded)', mono: 'var(--font-mono)' },
  default: { sans: 'normal', rounded: 'normal', mono: 'monospace' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

export const MaxContentWidth = 720;
