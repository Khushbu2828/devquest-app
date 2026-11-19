import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, LevelBadge, Row, Screen, Section } from '@/components/ui';
import { goalLabels } from '@/constants/labels';
import { tracks } from '@/content';
import { trackLessonProgress } from '@/lib/progress';
import { useProgress } from '@/store/progress';

export default function ProfileScreen() {
  const profile = useProgress((s) => s.profile);
  const completed = useProgress((s) => s.completedLessons);
  if (!profile) return null;

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
          Daily goal: {profile.dailyGoalMinutes} minutes
        </ThemedText>
      </Card>

      <Section title="Tracks">
        {tracks.map((t) => {
          const p = trackLessonProgress(t.id, completed);
          return (
            <Card key={t.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <ThemedText type="heading">{t.title}</ThemedText>
                <LevelBadge level={profile.selfAssessment[t.id]} />
              </Row>
              <ThemedText type="small" color="textSecondary">
                {p.done} of {p.total} lessons completed
              </ThemedText>
            </Card>
          );
        })}
      </Section>

      <ThemedText type="small" color="textSecondary">
        Accuracy by topic, badges and history appear here once quizzes are live.
      </ThemedText>

      <Button title="Settings" variant="secondary" onPress={() => router.push('/settings')} />
    </Screen>
  );
}
