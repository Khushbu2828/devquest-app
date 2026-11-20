import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AiAssist } from '@/components/code/ai-assist';
import { CodeChallenge } from '@/components/code/code-challenge';
import { Console } from '@/components/code/run-output';
import { CodeBlock } from '@/components/code-block';
import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { Accordion, Button, Card, Row, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { getDebugChallenge } from '@/content';
import { useTheme } from '@/hooks/use-theme';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import type { DebugChallenge } from '@/types/content';

const categoryLabels: Record<DebugChallenge['category'], string> = {
  syntax: 'Syntax error',
  logic: 'Logic bug',
  type: 'Type error',
  async: 'Async bug',
  react: 'React bug',
  hydration: 'Hydration error',
  nextjs: 'Next.js error',
};

export default function DebugScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = getDebugChallenge(id);
  if (!d) {
    return (
      <Screen edges={[]}>
        <ThemedText>Challenge not found.</ThemedText>
      </Screen>
    );
  }
  return <Debug d={d} />;
}

function Debug({ d }: { d: DebugChallenge }) {
  const theme = useTheme();
  const rewardId = `debug-${d.id}`;
  const done = useProgress((s) => s.rewards.some((r) => r.id === rewardId));
  const addReward = useProgress((s) => s.addReward);
  const [earned, setEarned] = useState<number | null>(null);
  const [showBugLines, setShowBugLines] = useState(false);
  const [solved, setSolved] = useState(done);
  const [failures, setFailures] = useState<string[]>([]);

  const succeed = (xp: number) => {
    setSolved(true);
    if (addReward({ id: rewardId, kind: 'debug', xp, ref: d.id })) setEarned(xp);
  };
  const xp = showBugLines ? Math.ceil(d.xp / 2) : d.xp;

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: d.title }} />
      <Row style={{ justifyContent: 'space-between' }}>
        <ThemedText type="label" color="textSecondary">
          🐞 {categoryLabels[d.category]}
        </ThemedText>
        <ThemedText type="label" color={done ? 'success' : 'textSecondary'}>
          {done ? '✓ Completed' : `${d.xp} XP`}
        </ThemedText>
      </Row>
      <RichText>{d.prompt}</RichText>
      {d.errorOutput && <Console lines={d.errorOutput.split('\n')} title="Error" tone="error" />}

      {d.tests?.length ? (
        <>
          <ThemedText type="small" color="textSecondary">
            Fix the code so every test passes.
          </ThemedText>
          <CodeChallenge
            draftKey={d.id}
            language={d.language}
            starterCode={d.buggyCode}
            tests={d.tests}
            onRun={({ passed, result }) => {
              setFailures(result.results.filter((r) => !r.passed).map((r) => `${r.name}: ${r.error ?? 'failed'}`));
              if (passed) succeed(xp);
            }}
            actions={
              !showBugLines && !solved ? (
                <Button title="Where's the bug?" variant="secondary" onPress={() => setShowBugLines(true)} />
              ) : null
            }
          />
          <AiAssist taskId={d.id} draftKey={d.id} starterCode={d.buggyCode} failures={failures} passed={solved} />
          {showBugLines && !solved && (
            <Card style={{ backgroundColor: theme.warningBg, borderColor: theme.warning }}>
              <ThemedText>
                Look at line{d.bugLines.length > 1 ? 's' : ''} {d.bugLines.join(', ')}. (Half XP from here.)
              </ThemedText>
            </Card>
          )}
        </>
      ) : (
        <LinePicker d={d} onCorrect={(firstTry) => succeed(firstTry ? d.xp : Math.ceil(d.xp / 2))} />
      )}

      {earned !== null && (
        <Card style={{ backgroundColor: theme.successBg, borderColor: theme.success }}>
          <ThemedText type="heading" color="success" accessibilityLiveRegion="polite">
            🎉 Bug squashed! +{earned} XP
          </ThemedText>
          <Button title="Back to unit" variant="secondary" onPress={() => router.back()} />
        </Card>
      )}

      {solved && (
        <>
          <Card>
            <ThemedText type="heading">Why it broke</ThemedText>
            <RichText>{d.explanation}</RichText>
          </Card>
          <Accordion title="The fixed code" icon="🔧" defaultOpen={!d.tests?.length}>
            <CodeBlock code={d.fixedCode} />
          </Accordion>
        </>
      )}
    </Screen>
  );
}

/** For bugs that can't be run here (React warnings, hydration): tap every buggy line, then check. */
function LinePicker({ d, onCorrect }: { d: DebugChallenge; onCorrect: (firstTry: boolean) => void }) {
  const theme = useTheme();
  const fontSize = useSettings((s) => s.editorFontSize);
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState<null | boolean>(null);
  const [missed, setMissed] = useState(false);
  const lines = d.buggyCode.split('\n');

  const check = () => {
    const ok = picked.length === d.bugLines.length && d.bugLines.every((l) => picked.includes(l));
    setChecked(ok);
    if (ok) onCorrect(!missed);
    else setMissed(true);
  };

  return (
    <View style={{ gap: Spacing.three }}>
      <ThemedText type="small" color="textSecondary">
        Tap the line{d.bugLines.length > 1 ? 's' : ''} that cause{d.bugLines.length > 1 ? '' : 's'} this error
        {d.bugLines.length > 1 ? ` (${d.bugLines.length} lines)` : ''}, then check.
      </ThemedText>
      <ScrollView horizontal style={[styles.code, { backgroundColor: theme.codeBg }]} contentContainerStyle={{ minWidth: '100%' }}>
        <View style={{ flexGrow: 1 }}>
          {lines.map((text, i) => {
            const n = i + 1;
            const on = picked.includes(n);
            const isBug = d.bugLines.includes(n);
            const tint =
              checked === null
                ? on
                  ? 'rgba(139,128,255,0.35)'
                  : 'transparent'
                : isBug
                  ? 'rgba(76,201,138,0.3)'
                  : on
                    ? 'rgba(240,114,114,0.35)'
                    : 'transparent';
            return (
              <Pressable
                key={i}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on, disabled: checked === true }}
                accessibilityLabel={`Line ${n}: ${text.trim() || 'blank'}`}
                disabled={checked === true}
                onPress={() => {
                  setChecked(null);
                  setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
                }}
                style={[styles.line, { backgroundColor: tint }]}>
                <ThemedText type="code" style={[styles.lineNo, { fontSize, lineHeight: fontSize * 1.9 }]}>
                  {n}
                </ThemedText>
                <ThemedText type="code" style={{ color: theme.codeText, fontSize, lineHeight: fontSize * 1.9, flex: 1 }}>
                  {text || ' '}
                </ThemedText>
                {checked !== null && isBug ? (
                  <ThemedText type="smallBold" style={{ color: '#4CC98A', paddingRight: Spacing.two }}>
                    ✓ bug
                  </ThemedText>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      {checked === false && (
        <Card style={{ backgroundColor: theme.dangerBg, borderColor: theme.danger }}>
          <ThemedText color="danger">✗ Not quite. The real bug lines are highlighted in green; read the error again. (Half XP from here.)</ThemedText>
        </Card>
      )}
      {checked !== true && <Button title="Check" disabled={picked.length === 0} onPress={check} />}
    </View>
  );
}

const styles = StyleSheet.create({
  code: { borderRadius: Radius.md, paddingVertical: Spacing.two },
  line: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  lineNo: { color: '#6B7085', width: 40, textAlign: 'right', paddingRight: Spacing.three },
});
