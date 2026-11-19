import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, ProgressBar, PressableCard, Row, Screen, Section } from '@/components/ui';
import { TrackColors } from '@/constants/theme';
import { getUnit, tracks } from '@/content';
import { nextLesson, trackLessonProgress } from '@/lib/progress';
import { useProgress } from '@/store/progress';

export default function HomeScreen() {
  const profile = useProgress((s) => s.profile);
  const completed = useProgress((s) => s.completedLessons);
  const next = nextLesson(completed);
  const lessonsDone = Object.keys(completed).length;

  return (
    <Screen>
      <ThemedText type="title" accessibilityRole="header">
        Hi {profile?.displayName || 'there'} 👋
      </ThemedText>

      <Card>
        <ThemedText type="label" color="textSecondary">
          Your progress
        </ThemedText>
        <ThemedText type="subtitle">
          {lessonsDone} {lessonsDone === 1 ? 'lesson' : 'lessons'} completed
        </ThemedText>
        <ThemedText type="small" color="textSecondary">
          XP, streaks and daily challenges unlock with quizzes in the next update.
        </ThemedText>
      </Card>

      {next ? (
        <Section title="Continue learning">
          <Card accent={TrackColors[next.track]}>
            <ThemedText type="small" color="textSecondary">
              {getUnit(next.lesson.unitId)?.title} · {next.lesson.minutes} min
            </ThemedText>
            <ThemedText type="heading">{next.lesson.title}</ThemedText>
            <Button
              title="Start lesson"
              onPress={() =>
                router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: next.lesson.id } })
              }
            />
          </Card>
        </Section>
      ) : (
        <Card>
          <ThemedText type="heading">🎉 Every lesson is complete</ThemedText>
          <ThemedText type="small" color="textSecondary">
            New practice modes are on the way.
          </ThemedText>
        </Card>
      )}

      <Section title="Tracks">
        {tracks.map((t) => {
          const p = trackLessonProgress(t.id, completed);
          return (
            <PressableCard
              key={t.id}
              accent={TrackColors[t.id]}
              accessibilityLabel={`${t.title}, ${p.done} of ${p.total} lessons done`}
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
