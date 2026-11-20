import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, LevelBadge, PressableCard, ProgressBar, Row, Screen, Section } from '@/components/ui';
import { TrackColors } from '@/constants/theme';
import { debugForUnit, exercisesForUnit, getNote, getUnit, questionsForUnit } from '@/content';
import { aiEnabled } from '@/lib/ai';
import { masteredIds, unitMastery } from '@/lib/progress';
import { QUIZ_SIZE } from '@/lib/quiz';
import { useProgress } from '@/store/progress';

export default function UnitScreen() {
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const attempts = useProgress((s) => s.attempts);
  const rewards = useProgress((s) => s.rewards);
  const rewardIds = useMemo(() => new Set(rewards.map((r) => r.id)), [rewards]);
  const mastered = useMemo(() => masteredIds(attempts), [attempts]);
  const unit = getUnit(unitId);

  if (!unit) {
    return (
      <Screen edges={[]}>
        <ThemedText>Unit not found.</ThemedText>
      </Screen>
    );
  }

  const color = TrackColors[unit.track];
  const questions = questionsForUnit(unit.id);
  const m = unitMastery(unit.id, mastered);
  const quizLength = Math.min(QUIZ_SIZE, questions.length);
  const practice = [
    ...exercisesForUnit(unit.id).map((e) => ({
      key: e.id,
      icon: '⌨️',
      kind: 'Coding exercise',
      title: e.title,
      xp: e.xp,
      done: rewardIds.has(`exercise-${e.id}`),
      open: () => router.push({ pathname: '/exercise/[id]', params: { id: e.id } }),
    })),
    ...debugForUnit(unit.id).map((d) => ({
      key: d.id,
      icon: '🐞',
      kind: 'Debugging challenge',
      title: d.title,
      xp: d.xp,
      done: rewardIds.has(`debug-${d.id}`),
      open: () => router.push({ pathname: '/debug/[id]', params: { id: d.id } }),
    })),
  ];
  const started = attempts.some((a) => questions.some((q) => q.id === a.questionId));

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: unit.title }} />
      <LevelBadge level={unit.level} />
      <RichText color="textSecondary">{unit.summary}</RichText>

      <Card accent={color}>
        <Row style={{ justifyContent: 'space-between' }}>
          <ThemedText type="heading">Quiz</ThemedText>
          <ThemedText type="small" color="textSecondary">
            {quizLength} questions
          </ThemedText>
        </Row>
        <ProgressBar value={m.fraction} color={color} label={`${m.done} of ${m.total} questions mastered`} />
        <ThemedText type="small" color="textSecondary">
          {m.done} of {m.total} mastered. Get one wrong and a short lesson opens right there.
        </ThemedText>
        <Button
          title={m.fraction === 1 ? 'Practice again' : started ? 'Continue quiz' : 'Start quiz'}
          onPress={() => router.push({ pathname: '/quiz/[unitId]', params: { unitId: unit.id } })}
        />
        {aiEnabled && (
          <Button
            title="✨ New AI quiz"
            variant="secondary"
            accessibilityHint="Fresh questions written by AI, focused on the topics you find hardest"
            onPress={() => router.push({ pathname: '/quiz/[unitId]', params: { unitId: unit.id, mode: 'ai' } })}
          />
        )}
      </Card>

      <Section title="Topics">
        <Card>
          {unit.topics.map((topic) => {
            const qs = questions.filter((q) => q.topic === topic);
            const done = qs.filter((q) => mastered.has(q.id)).length;
            const title = getNote(unit.track, topic)?.title ?? topic;
            const complete = qs.length > 0 && done === qs.length;
            return (
              <Row
                key={topic}
                style={{ justifyContent: 'space-between' }}
                accessible
                accessibilityLabel={`${title}: ${done} of ${qs.length} mastered`}>
                <ThemedText style={{ flex: 1 }}>{title}</ThemedText>
                <ThemedText type="small" color={complete ? 'success' : 'textSecondary'}>
                  {qs.length === 0 ? '—' : complete ? '✓' : `${done}/${qs.length}`}
                </ThemedText>
              </Row>
            );
          })}
        </Card>
      </Section>

      {practice.length > 0 && (
        <Section title="Practice">
          {practice.map((p) => (
            <PressableCard
              key={p.key}
              accent={color}
              accessibilityLabel={`${p.kind}: ${p.title}${p.done ? ', completed' : `, ${p.xp} XP`}`}
              onPress={p.open}>
              <Row style={{ justifyContent: 'space-between' }}>
                <ThemedText type="small" color="textSecondary">
                  {p.icon} {p.kind}
                </ThemedText>
                <ThemedText type="small" color={p.done ? 'success' : 'textSecondary'}>
                  {p.done ? '✓ Done' : `${p.xp} XP`}
                </ThemedText>
              </Row>
              <ThemedText type="heading">{p.title}</ThemedText>
            </PressableCard>
          ))}
        </Section>
      )}
    </Screen>
  );
}
