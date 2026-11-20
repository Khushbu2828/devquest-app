import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, ProgressBar, PressableCard, Row, Screen, Section } from '@/components/ui';
import { Spacing, TrackColors } from '@/constants/theme';
import { getQuestion, getTrackContent, tracks } from '@/content';
import { aiEnabled } from '@/lib/ai';
import { dueForReview } from '@/lib/review';
import { currentStreak, dailyGoalXp, masteredIds, nextUnit, trackMastery, unitMastery } from '@/lib/progress';
import { dayKey, useProgress, useStats } from '@/store/progress';

export default function HomeScreen() {
  const profile = useProgress((s) => s.profile);
  const attempts = useProgress((s) => s.attempts);
  const { xp, activity } = useStats();
  const mastered = useMemo(() => masteredIds(attempts), [attempts]);

  const streak = currentStreak(activity);
  const goal = dailyGoalXp(profile);
  const todayXp = activity[dayKey()]?.xp ?? 0;
  const next = nextUnit(profile, mastered);
  const due = useMemo(() => dueForReview(attempts, (id) => !!getQuestion(id)).length, [attempts]);
  const nextProgress = next ? unitMastery(next.id, mastered) : null;

  return (
    <Screen>
      <ThemedText type="title" accessibilityRole="header">
        Hi {profile?.displayName || 'there'} 👋
      </ThemedText>

      <View style={styles.stats}>
        <Stat icon="🔥" value={streak} label="day streak" />
        <Stat icon="⭐" value={xp} label="total XP" />
        <Stat icon="✅" value={mastered.size} label="mastered" />
      </View>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <ThemedText type="label" color="textSecondary">
            Today&apos;s goal
          </ThemedText>
          <ThemedText type="smallBold" color={todayXp >= goal ? 'success' : 'text'}>
            {todayXp >= goal ? '✓ ' : ''}
            {Math.min(todayXp, goal)} / {goal} XP
          </ThemedText>
        </Row>
        <ProgressBar value={todayXp / goal} label={`Daily goal: ${todayXp} of ${goal} XP`} />
      </Card>

      {due > 0 && (
        <PressableCard
          accent="#F2B14C"
          accessibilityLabel={`Review: ${due} questions are due`}
          onPress={() => router.push({ pathname: '/quiz/[unitId]', params: { unitId: 'review' } })}>
          <ThemedText type="heading">🔁 {due} {due === 1 ? 'question' : 'questions'} to review</ThemedText>
          <ThemedText type="small" color="textSecondary">
            Quick review of things you answered a while ago, so they stick.
          </ThemedText>
        </PressableCard>
      )}

      {next && nextProgress ? (
        <Section title="Up next">
          <Card accent={TrackColors[next.track]}>
            <ThemedText type="small" color="textSecondary">
              {getTrackContent(next.track)?.track.title} · {nextProgress.done}/{nextProgress.total} mastered
            </ThemedText>
            <ThemedText type="heading">{next.title}</ThemedText>
            <RichText type="small" color="textSecondary">
              {next.summary}
            </RichText>
            <Button
              title={nextProgress.done > 0 ? 'Continue quiz' : 'Start quiz'}
              onPress={() => router.push({ pathname: '/quiz/[unitId]', params: { unitId: next.id } })}
            />
          </Card>
        </Section>
      ) : (
        <Card>
          <ThemedText type="heading">🎉 You have mastered every question</ThemedText>
          <ThemedText type="small" color="textSecondary">
            Open any unit to practice again. Fresh AI-generated quizzes are on the way.
          </ThemedText>
        </Card>
      )}

      {aiEnabled && (
        <PressableCard accessibilityLabel="Ask the AI tutor" onPress={() => router.push('/tutor')}>
          <ThemedText type="heading">🤖 Ask the AI tutor</ThemedText>
          <ThemedText type="small" color="textSecondary">
            Stuck on a concept? Get it explained another way.
          </ThemedText>
        </PressableCard>
      )}

      <Section title="Tracks">
        {tracks.map((t) => {
          const p = trackMastery(t.id, mastered);
          return (
            <PressableCard
              key={t.id}
              accent={TrackColors[t.id]}
              accessibilityLabel={`${t.title}, ${p.done} of ${p.total} questions mastered`}
              onPress={() => router.push({ pathname: '/track/[trackId]', params: { trackId: t.id } })}>
              <Row style={{ justifyContent: 'space-between' }}>
                <ThemedText type="heading">{t.title}</ThemedText>
                <ThemedText type="small" color="textSecondary">
                  {p.done}/{p.total}
                </ThemedText>
              </Row>
              <ProgressBar value={p.fraction} color={TrackColors[t.id]} label={`${t.title} progress`} />
            </PressableCard>
          );
        })}
      </Section>
    </Screen>
  );
}

function Stat({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <Card style={styles.stat}>
      <View accessible accessibilityLabel={`${value} ${label}`} style={{ alignItems: 'center' }}>
        <ThemedText style={{ fontSize: 22, lineHeight: 28 }}>{icon}</ThemedText>
        <ThemedText type="subtitle">{value}</ThemedText>
        <ThemedText type="small" color="textSecondary">
          {label}
        </ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.two },
});
