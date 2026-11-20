import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { AiAssist } from '@/components/code/ai-assist';
import { CodeChallenge } from '@/components/code/code-challenge';
import { CodeBlock } from '@/components/code-block';
import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { Accordion, Button, Card, Row, Screen } from '@/components/ui';
import { getExercise } from '@/content';
import { useTheme } from '@/hooks/use-theme';
import { aiEnabled, serverTypecheck } from '@/lib/ai';
import { useProgress } from '@/store/progress';
import type { CodingExercise } from '@/types/content';

const kindLabels: Record<CodingExercise['kind'], string> = {
  write_function: 'Write code',
  fix_tests: 'Make the tests pass',
  refactor: 'Refactor',
  add_types: 'Add types',
};

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ex = getExercise(id);
  if (!ex) {
    return (
      <Screen edges={[]}>
        <ThemedText>Exercise not found.</ThemedText>
      </Screen>
    );
  }
  return <Exercise ex={ex} />;
}

function Exercise({ ex }: { ex: CodingExercise }) {
  const theme = useTheme();
  const rewardId = `exercise-${ex.id}`;
  const done = useProgress((s) => s.rewards.some((r) => r.id === rewardId));
  const addReward = useProgress((s) => s.addReward);
  const [hintsShown, setHintsShown] = useState(0);
  const [failedRuns, setFailedRuns] = useState(0);
  const [solutionSeen, setSolutionSeen] = useState(false);
  const [earned, setEarned] = useState<number | null>(null);
  const [last, setLast] = useState<{ passed: boolean; failures: string[] }>({ passed: done, failures: [] });

  const canShowSolution = done || hintsShown >= ex.hints.length || failedRuns >= 3;
  const typeCheck =
    ex.kind === 'add_types' && (ex.language === 'ts' || ex.language === 'tsx')
      ? async (code: string) => {
          const errors = aiEnabled ? await serverTypecheck(code, ex.language as 'ts' | 'tsx') : null;
          if (errors === null) {
            // Without the server the app can only strip types, not check them.
            return [{ name: 'Type check (needs the DevQuest server, skipped)', passed: true }];
          }
          return errors.length
            ? [{ name: 'Type check (strict)', passed: false, error: errors.slice(0, 3).join('\n') }]
            : [{ name: 'Type check (strict)', passed: true }];
        }
      : undefined;

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: ex.title }} />
      <Row style={{ justifyContent: 'space-between' }}>
        <ThemedText type="label" color="textSecondary">
          {kindLabels[ex.kind]} · {ex.language.toUpperCase()}
        </ThemedText>
        <ThemedText type="label" color={done ? 'success' : 'textSecondary'}>
          {done ? '✓ Completed' : `${ex.xp} XP`}
        </ThemedText>
      </Row>
      <RichText>{ex.prompt}</RichText>

      <CodeChallenge
        draftKey={ex.id}
        language={ex.language}
        starterCode={ex.starterCode}
        tests={ex.tests}
        extraCheck={typeCheck}
        onRun={({ passed, result }) => {
          setLast({ passed, failures: result.results.filter((r) => !r.passed).map((r) => `${r.name}: ${r.error ?? 'failed'}`) });
          if (!passed) {
            setFailedRuns((n) => n + 1);
            return;
          }
          const xp = solutionSeen ? Math.ceil(ex.xp / 2) : ex.xp;
          if (addReward({ id: rewardId, kind: 'exercise', xp, ref: ex.id })) setEarned(xp);
        }}
        actions={
          hintsShown < ex.hints.length ? (
            <Button
              title={`Hint ${hintsShown + 1}/${ex.hints.length}`}
              variant="secondary"
              onPress={() => setHintsShown((n) => n + 1)}
            />
          ) : null
        }
      />

      <AiAssist taskId={ex.id} draftKey={ex.id} starterCode={ex.starterCode} failures={last.failures} passed={last.passed} />

      {earned !== null && (
        <Card style={{ backgroundColor: theme.successBg, borderColor: theme.success }}>
          <ThemedText type="heading" color="success" accessibilityLiveRegion="polite">
            🎉 Solved! +{earned} XP
          </ThemedText>
          <Button title="Back to unit" variant="secondary" onPress={() => router.back()} />
        </Card>
      )}

      {hintsShown > 0 && (
        <Card style={{ backgroundColor: theme.warningBg, borderColor: theme.warning }}>
          <ThemedText type="label" style={{ color: theme.warning }}>
            💡 Hints
          </ThemedText>
          {ex.hints.slice(0, hintsShown).map((h, i) =>
            i === 2 ? <CodeBlock key={i} code={h} /> : <RichText key={i}>{`${i + 1}. ${h}`}</RichText>,
          )}
        </Card>
      )}

      {canShowSolution && (
        <Accordion title={done ? 'Model solution' : 'Show the solution (half XP)'} icon="🔑">
          <SolutionReveal code={ex.solution} onSeen={() => !done && setSolutionSeen(true)} />
        </Accordion>
      )}
    </Screen>
  );
}

/** Marks the solution as seen the first time it renders (the accordion only renders it when opened). */
function SolutionReveal({ code, onSeen }: { code: string; onSeen: () => void }) {
  const seen = useRef(onSeen);
  useEffect(() => {
    seen.current();
  }, []);
  return <CodeBlock code={code} />;
}
