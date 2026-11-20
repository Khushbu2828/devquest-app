import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AiAssist } from '@/components/code/ai-assist';
import { CodeChallenge } from '@/components/code/code-challenge';
import { ProjectPreview } from '@/components/code/project-preview';
import { CodeBlock } from '@/components/code-block';
import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { Accordion, Card, ProgressBar, Row, Screen } from '@/components/ui';
import { Spacing, TrackColors } from '@/constants/theme';
import { getProject } from '@/content';
import { useTheme } from '@/hooks/use-theme';
import { checkpointRewardId } from '@/lib/progress';
import { useDrafts } from '@/store/drafts';
import { useProgress } from '@/store/progress';
import type { BuildProject } from '@/types/content';

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = getProject(id);
  if (!project) {
    return (
      <Screen edges={[]}>
        <ThemedText>Project not found.</ThemedText>
      </Screen>
    );
  }
  return <Project p={project} />;
}

function Project({ p }: { p: BuildProject }) {
  const theme = useTheme();
  const rewards = useProgress((s) => s.rewards);
  const addReward = useProgress((s) => s.addReward);
  const done = useMemo(() => new Set(rewards.filter((r) => r.kind === 'checkpoint').map((r) => r.id)), [rewards]);
  const doneCount = p.checkpoints.filter((c) => done.has(checkpointRewardId(p, c.id))).length;
  const current = p.checkpoints.findIndex((c) => !done.has(checkpointRewardId(p, c.id)));
  const [open, setOpen] = useState(current === -1 ? p.checkpoints.length - 1 : current);
  const [failures, setFailures] = useState<string[]>([]);
  const [justEarned, setJustEarned] = useState<number | null>(null);
  const stepXp = Math.round(p.xp / p.checkpoints.length);
  const cp = p.checkpoints[open];
  const draftKey = `${p.id}/${cp.id}`;
  const code = useDrafts((s) => s.drafts[draftKey]) ?? cp.starterCode;
  const stepDone = done.has(checkpointRewardId(p, cp.id));

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: p.title }} />
      <ThemedText color="textSecondary">{p.description}</ThemedText>
      <Card accent={TrackColors[p.track]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <ThemedText type="heading">
            Step {Math.min(open + 1, p.checkpoints.length)} of {p.checkpoints.length}
          </ThemedText>
          <ThemedText type="small" color="textSecondary">
            {doneCount === p.checkpoints.length ? '🏁 Project complete' : `${stepXp} XP per step`}
          </ThemedText>
        </Row>
        <ProgressBar value={doneCount / p.checkpoints.length} color={TrackColors[p.track]} label={`${doneCount} of ${p.checkpoints.length} steps done`} />
        <Row style={{ flexWrap: 'wrap' }}>
          {p.checkpoints.map((c, i) => {
            const isDone = done.has(checkpointRewardId(p, c.id));
            const locked = i > 0 && !done.has(checkpointRewardId(p, p.checkpoints[i - 1].id));
            return (
              <ThemedText
                key={c.id}
                type="small"
                accessibilityRole="button"
                accessibilityState={{ selected: i === open, disabled: locked }}
                onPress={locked ? undefined : () => setOpen(i)}
                color={i === open ? 'primary' : locked ? 'textSecondary' : 'text'}
                style={{ paddingVertical: Spacing.one, fontWeight: i === open ? '700' : '400' }}>
                {isDone ? '✓' : locked ? '🔒' : '○'} {i + 1}. {c.title}
              </ThemedText>
            );
          })}
        </Row>
      </Card>

      <View style={{ gap: Spacing.three }}>
        <ThemedText type="subtitle" accessibilityRole="header">
          {cp.title}
        </ThemedText>
        <RichText>{cp.instructions}</RichText>
        <CodeChallenge
          key={draftKey}
          draftKey={draftKey}
          language={p.language}
          starterCode={cp.starterCode}
          tests={cp.tests}
          onRun={({ passed, result }) => {
            setFailures(result.results.filter((r) => !r.passed).map((r) => `${r.name}: ${r.error ?? 'failed'}`));
            if (passed && addReward({ id: checkpointRewardId(p, cp.id), kind: 'checkpoint', xp: stepXp, ref: p.id })) {
              setJustEarned(stepXp);
            }
          }}
        />
        {justEarned !== null && (
          <Card style={{ backgroundColor: theme.successBg, borderColor: theme.success }}>
            <ThemedText type="heading" color="success" accessibilityLiveRegion="polite">
              ✓ Step complete! +{justEarned} XP
            </ThemedText>
            {open + 1 < p.checkpoints.length && (
              <ThemedText
                accessibilityRole="button"
                color="primary"
                onPress={() => {
                  setJustEarned(null);
                  setFailures([]);
                  setOpen(open + 1);
                }}>
                Next step: {p.checkpoints[open + 1].title} →
              </ThemedText>
            )}
          </Card>
        )}
        <AiAssist key={`ai-${draftKey}`} taskId={draftKey} draftKey={draftKey} starterCode={cp.starterCode} failures={failures} passed={stepDone} />
        <ProjectPreview projectId={p.id} code={code} language={p.language} />
        {stepDone && (
          <Accordion title="Model solution for this step" icon="🔑">
            <CodeBlock code={cp.solution} />
          </Accordion>
        )}
      </View>
    </Screen>
  );
}
