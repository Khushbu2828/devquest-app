import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, Row, Screen, Section } from '@/components/ui';
import { goalLabels, levelLabels, levels } from '@/constants/labels';
import { Radius, Spacing } from '@/constants/theme';
import { tracks } from '@/content';
import { useTheme } from '@/hooks/use-theme';
import { useProgress } from '@/store/progress';
import type { Level, TrackId } from '@/types/content';
import type { LearnerProfile, LearningGoal } from '@/types/progress';

const goals = Object.keys(goalLabels) as LearningGoal[];
const dailyGoals: LearnerProfile['dailyGoalMinutes'][] = [5, 10, 15, 20];

/**
 * First-run setup. The placement quiz that refines the self-assessment is
 * added in Phase 2 together with quiz mode.
 */
export default function OnboardingScreen() {
  const theme = useTheme();
  const completeOnboarding = useProgress((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<LearningGoal>('job_ready');
  const [minutes, setMinutes] = useState<LearnerProfile['dailyGoalMinutes']>(10);
  const [assessment, setAssessment] = useState<Record<TrackId, Level>>({
    js: 'beginner',
    ts: 'beginner',
    react: 'beginner',
    nextjs: 'beginner',
  });

  const finish = () => {
    completeOnboarding({
      displayName: name.trim(),
      goal,
      dailyGoalMinutes: minutes,
      selfAssessment: assessment,
      createdAt: new Date().toISOString(),
    });
    router.replace('/');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ThemedText type="label" color="textSecondary">
        Step {step + 1} of 3
      </ThemedText>

      {step === 0 && (
        <>
          <ThemedText type="title" accessibilityRole="header">
            Welcome to DevQuest
          </ThemedText>
          <ThemedText color="textSecondary">
            Learn JavaScript, TypeScript, React and Next.js through quizzes, games, coding exercises and small builds.
          </ThemedText>
          <Section title="What should we call you?">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name (optional)"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel="Your name"
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => setStep(1)}
              maxLength={40}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
            />
          </Section>
          <Section title="What's your goal?">
            <Row style={styles.wrap} accessibilityRole="radiogroup">
              {goals.map((g) => (
                <Chip key={g} label={goalLabels[g]} selected={goal === g} onPress={() => setGoal(g)} />
              ))}
            </Row>
          </Section>
        </>
      )}

      {step === 1 && (
        <>
          <ThemedText type="subtitle" accessibilityRole="header">
            How well do you know each one?
          </ThemedText>
          <ThemedText color="textSecondary">
            Be honest: this only decides where you start.
          </ThemedText>
          {tracks.map((t) => (
            <Card key={t.id}>
              <ThemedText type="heading">{t.title}</ThemedText>
              <Row style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel={`${t.title} level`}>
                {levels.map((l) => (
                  <Chip
                    key={l}
                    label={levelLabels[l]}
                    selected={assessment[t.id] === l}
                    onPress={() => setAssessment((a) => ({ ...a, [t.id]: l }))}
                  />
                ))}
              </Row>
            </Card>
          ))}
        </>
      )}

      {step === 2 && (
        <>
          <ThemedText type="subtitle" accessibilityRole="header">
            Set a daily goal
          </ThemedText>
          <ThemedText color="textSecondary">Short and steady beats long and rare.</ThemedText>
          <Row style={styles.wrap} accessibilityRole="radiogroup">
            {dailyGoals.map((m) => (
              <Chip key={m} label={`${m} min / day`} selected={minutes === m} onPress={() => setMinutes(m)} />
            ))}
          </Row>
        </>
      )}

      <View style={styles.actions}>
        {step > 0 && <Button title="Back" variant="secondary" onPress={() => setStep(step - 1)} />}
        {step < 2 ? (
          <Button title="Continue" onPress={() => setStep(step + 1)} />
        ) : (
          <Button title="Start learning" onPress={finish} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexWrap: 'wrap' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  actions: { gap: Spacing.two, marginTop: Spacing.two },
});
