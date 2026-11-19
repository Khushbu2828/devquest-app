import { Stack, router, useLocalSearchParams } from 'expo-router';

import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { Card, LevelBadge, PressableCard, Row, Screen, Section } from '@/components/ui';
import { TrackColors } from '@/constants/theme';
import { getUnit, lessonsForUnit, practiceCountsForUnit } from '@/content';
import { useProgress } from '@/store/progress';

export default function UnitScreen() {
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const completed = useProgress((s) => s.completedLessons);
  const unit = getUnit(unitId);

  if (!unit) {
    return (
      <Screen edges={[]}>
        <ThemedText>Unit not found.</ThemedText>
      </Screen>
    );
  }

  const lessons = lessonsForUnit(unit.id);
  const counts = practiceCountsForUnit(unit.id);
  const practice = [
    { label: 'Quiz questions', count: counts.questions },
    { label: 'Coding exercises', count: counts.exercises },
    { label: 'Debug challenges', count: counts.debugChallenges },
  ].filter((p) => p.count > 0);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: unit.title }} />
      <LevelBadge level={unit.level} />
      <RichText color="textSecondary">{unit.summary}</RichText>

      <Section title="Lessons">
        {lessons.map((l) => {
          const done = !!completed[l.id];
          return (
            <PressableCard
              key={l.id}
              accent={TrackColors[unit.track]}
              accessibilityLabel={`${l.title}, ${l.minutes} minutes${done ? ', completed' : ''}`}
              onPress={() => router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: l.id } })}>
              <Row style={{ justifyContent: 'space-between' }}>
                <ThemedText type="heading" style={{ flex: 1 }}>
                  {l.title}
                </ThemedText>
                <ThemedText type="small" color={done ? 'success' : 'textSecondary'}>
                  {done ? '✓ Done' : `${l.minutes} min`}
                </ThemedText>
              </Row>
            </PressableCard>
          );
        })}
      </Section>

      {practice.length > 0 && (
        <Section title="Practice">
          <Card>
            {practice.map((p) => (
              <Row key={p.label} style={{ justifyContent: 'space-between' }}>
                <ThemedText>{p.label}</ThemedText>
                <ThemedText type="smallBold">{p.count}</ThemedText>
              </Row>
            ))}
            <ThemedText type="small" color="textSecondary">
              Quizzes open in the next update; exercises and debugging follow once the code editor lands.
            </ThemedText>
          </Card>
        </Section>
      )}
    </Screen>
  );
}
