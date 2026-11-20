import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { achievementRewardId, newlyUnlocked, type Achievement } from '@/lib/achievements';
import { useProgress } from '@/store/progress';

/**
 * Awards achievements the moment their condition is met and shows a short
 * banner. Achievement XP is a reward like any other, so it syncs and can't be
 * awarded twice.
 */
export function AchievementWatcher() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState<Achievement[]>([]);

  useEffect(() => {
    const check = () => {
      const { attempts, rewards, addReward, profile } = useProgress.getState();
      if (!profile) return;
      const fresh = newlyUnlocked({ attempts, rewards });
      if (!fresh.length) return;
      for (const a of fresh) addReward({ id: achievementRewardId(a.id), kind: 'achievement', xp: a.xp, ref: a.id });
      setQueue((q) => [...q, ...fresh]);
    };
    check();
    return useProgress.subscribe((s, prev) => {
      if (s.attempts !== prev.attempts || s.rewards !== prev.rewards) check();
    });
  }, []);

  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), 3500);
    return () => clearTimeout(t);
  }, [current]);

  if (!current) return null;
  return (
    <Pressable
      accessibilityRole="alert"
      accessibilityLabel={`Achievement unlocked: ${current.title}. ${current.description} Plus ${current.xp} XP.`}
      onPress={() => setQueue((q) => q.slice(1))}
      style={[styles.toast, { top: insets.top + Spacing.two, backgroundColor: theme.surface, borderColor: theme.warning }]}>
      <ThemedText style={{ fontSize: 28, lineHeight: 34 }}>{current.icon}</ThemedText>
      <ThemedText type="smallBold" style={{ flex: 1 }}>
        Achievement unlocked: {current.title}
        {'\n'}
        <ThemedText type="small" color="textSecondary">
          {current.description} +{current.xp} XP
        </ThemedText>
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    maxWidth: 520,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 1000,
  },
});
