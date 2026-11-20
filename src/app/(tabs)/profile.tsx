import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, LevelBadge, Row, Screen, Section } from '@/components/ui';
import { goalLabels } from '@/constants/labels';
import { getNote, tracks } from '@/content';
import { useAccount } from '@/lib/sync';
import { achievementRewardId, achievements } from '@/lib/achievements';
import { Spacing } from '@/constants/theme';
import { currentStreak, dailyGoalXp, masteredIds, trackMastery } from '@/lib/progress';
import { topicStats, useProgress, useStats } from '@/store/progress';
import type { TrackId } from '@/types/content';
import type { Attempt } from '@/types/progress';

export default function ProfileScreen() {
  const profile = useProgress((s) => s.profile);
  const attempts = useProgress((s) => s.attempts);
  const mastered = useMemo(() => masteredIds(attempts), [attempts]);
  const { xp, activity } = useStats();
  const weak = useMemo(() => weakestTopics(attempts), [attempts]);
  const signedIn = useAccount((s) => s.session !== null);
  const rewards = useProgress((s) => s.rewards);
  const unlocked = useMemo(() => new Set(rewards.filter((r) => r.kind === 'achievement').map((r) => r.id)), [rewards]);
  const unlockedCount = achievements.filter((a) => unlocked.has(achievementRewardId(a.id))).length;
  if (!profile) return null;
  const syncLabel = signedIn ? '☁️ Account & sync' : '☁️ Sign in to sync progress';
  const streak = currentStreak(activity);

  return (
    <Screen>
      <ThemedText type="title" accessibilityRole="header">
        {profile.displayName || 'Learner'}
      </ThemedText>

      <Card>
        <ThemedText type="label" color="textSecondary">
          Goal
        </ThemedText>
        <ThemedText type="heading">{goalLabels[profile.goal]}</ThemedText>
        <ThemedText type="small" color="textSecondary">
          Daily goal: {profile.dailyGoalMinutes} minutes ({dailyGoalXp(profile)} XP) · {xp} XP total · 🔥 {streak}-day streak
        </ThemedText>
      </Card>

      <Section title="Tracks">
        {tracks.map((t) => {
          const p = trackMastery(t.id, mastered);
          return (
            <Card key={t.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <ThemedText type="heading">{t.title}</ThemedText>
                <LevelBadge level={profile.selfAssessment[t.id]} />
              </Row>
              <ThemedText type="small" color="textSecondary">
                {p.done} of {p.total} questions mastered
              </ThemedText>
            </Card>
          );
        })}
      </Section>

      <Section title={`Achievements · ${unlockedCount}/${achievements.length}`}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
          {achievements.map((a) => {
            const got = unlocked.has(achievementRewardId(a.id));
            return (
              <View
                key={a.id}
                accessible
                accessibilityLabel={`${a.title}: ${a.description} ${got ? 'Unlocked.' : 'Locked.'}`}
                style={{ width: 96, alignItems: 'center', gap: Spacing.half, opacity: got ? 1 : 0.35 }}>
                <ThemedText style={{ fontSize: 30, lineHeight: 36 }}>{got ? a.icon : '🔒'}</ThemedText>
                <ThemedText type="small" style={{ textAlign: 'center' }}>
                  {a.title}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </Section>

      <Button title="🏆 Weekly leaderboard" variant="secondary" onPress={() => router.push('/leaderboard')} />

      <Section title="Topics to review">
        <Card>
          {weak.length === 0 ? (
            <ThemedText type="small" color="textSecondary">
              Answer a few quiz questions and your weakest topics show up here.
            </ThemedText>
          ) : (
            weak.map((w) => (
              <Row key={w.key} style={{ justifyContent: 'space-between' }}>
                <ThemedText style={{ flex: 1 }}>{w.title}</ThemedText>
                <ThemedText type="small" color="textSecondary">
                  {w.pct}% right
                </ThemedText>
              </Row>
            ))
          )}
        </Card>
      </Section>

      <Button title={syncLabel} variant="secondary" onPress={() => router.push('/account')} />
      <Button title="Settings" variant="secondary" onPress={() => router.push('/settings')} />
    </Screen>
  );
}

/** Topics answered at least twice with under 80% right, worst first. */
function weakestTopics(attempts: Attempt[]) {
  return Object.entries(topicStats(attempts))
    .filter(([, s]) => s.attempts >= 2 && s.correct / s.attempts < 0.8)
    .map(([key, s]) => {
      const [track, topic] = key.split(':') as [TrackId, string];
      return { key, title: getNote(track, topic)?.title ?? topic, pct: Math.round((s.correct / s.attempts) * 100) };
    })
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 5);
}
