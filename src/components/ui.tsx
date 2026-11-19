import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { levelLabels } from '@/constants/labels';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Level } from '@/types/content';

/** Scrollable page with safe-area padding and a centered max width (for tablets and web). */
export function Screen({
  children,
  edges = ['top'],
  scroll = true,
}: {
  children: ReactNode;
  edges?: Edge[];
  scroll?: boolean;
}) {
  const theme = useTheme();
  const inner = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView edges={edges} style={[styles.screen, { backgroundColor: theme.background }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        <View style={styles.scroll}>{inner}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  accent,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accent?: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
        accent ? { borderLeftColor: accent, borderLeftWidth: 4 } : null,
        style,
      ]}>
      {children}
    </View>
  );
}

/** A card that is a button. Shows a pressed state and is announced as a button. */
export function PressableCard({
  children,
  accent,
  style,
  ...props
}: PressableProps & { children: ReactNode; accent?: string; style?: StyleProp<ViewStyle> }) {
  // Layout styles (flex, margins) go on the Pressable so the card fills it.
  return (
    <Pressable accessibilityRole="button" style={style} {...props}>
      {({ pressed }) => (
        <Card accent={accent} style={pressed && { opacity: 0.7 }}>
          {children}
        </Card>
      )}
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  accessibilityHint,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  accessibilityHint?: string;
}) {
  const theme = useTheme();
  const colors = {
    primary: { bg: theme.primary, fg: theme.primaryText, border: theme.primary },
    secondary: { bg: theme.surface, fg: theme.text, border: theme.border },
    danger: { bg: theme.dangerBg, fg: theme.danger, border: theme.danger },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.bg, borderColor: colors.border },
        (pressed || disabled) && { opacity: disabled ? 0.45 : 0.8 },
      ]}>
      <ThemedText type="smallBold" style={{ color: colors.fg, fontSize: 16 }}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

export function ProgressBar({ value, color, label }: { value: number; color?: string; label: string }) {
  const theme = useTheme();
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={[styles.progressTrack, { backgroundColor: theme.surfaceAlt }]}>
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color ?? theme.primary }]} />
    </View>
  );
}

/** Selectable pill. `selected` is exposed to screen readers, not shown by color alone. */
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}>
      <ThemedText type="smallBold" style={{ color: selected ? theme.primaryText : theme.text }}>
        {selected ? '✓ ' : ''}
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function LevelBadge({ level }: { level: Level }) {
  const theme = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: theme.surfaceAlt }]}>
      <ThemedText type="label" color="textSecondary">
        {levelLabels[level]}
      </ThemedText>
    </View>
  );
}

export function Row({ children, gap = Spacing.two, style, ...props }: ViewProps & { gap?: number }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]} {...props}>
      {children}
    </View>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: Spacing.two }}>
      <ThemedText type="label" color="textSecondary" accessibilityRole="header">
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', paddingBottom: Spacing.five },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.four,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  button: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radius.pill },
  chip: {
    minHeight: 40,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
});
