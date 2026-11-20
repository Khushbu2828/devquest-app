import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { CodeEditor } from '@/components/code/code-editor';
import { RunOutput } from '@/components/code/run-output';
import { Button, Row } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useCodeRunner } from '@/hooks/use-code-runner';
import type { RunResult } from '@/lib/runner/sandbox-page';
import { useDrafts } from '@/store/drafts';
import type { CodeLanguage, CodeTest } from '@/types/content';

export interface ChallengeOutcome {
  code: string;
  result: RunResult;
  passed: boolean;
}

/**
 * Editor + "Run tests" + results, shared by exercises, debugging challenges
 * and project steps. The learner's code is saved as a draft under `draftKey`.
 * `extraCheck` runs after the tests pass (e.g. server type-checking) and can
 * add failures of its own.
 */
export function CodeChallenge({
  draftKey,
  language,
  starterCode,
  tests,
  onRun,
  extraCheck,
  actions,
}: {
  draftKey: string;
  language: CodeLanguage;
  starterCode: string;
  tests: CodeTest[];
  onRun?: (outcome: ChallengeOutcome) => void;
  extraCheck?: (code: string) => Promise<{ name: string; passed: boolean; error?: string }[]>;
  /** Extra buttons shown next to "Run tests" (hints, solution…). */
  actions?: ReactNode;
}) {
  const draft = useDrafts((s) => s.drafts[draftKey]);
  const setDraft = useDrafts((s) => s.setDraft);
  const clearDraft = useDrafts((s) => s.clearDraft);
  const code = draft ?? starterCode;
  const { run, running, sandbox } = useCodeRunner();
  const [result, setResult] = useState<RunResult | null>(null);
  const [checking, setChecking] = useState(false);

  const runTests = async () => {
    setResult(null);
    const r = await run(code, language, tests);
    if (r.error === 'Cancelled') return;
    let results = r.results;
    if (extraCheck && results.length > 0 && results.every((t) => t.passed)) {
      setChecking(true);
      results = [...results, ...(await extraCheck(code))];
      setChecking(false);
    }
    const full = { ...r, results };
    setResult(full);
    onRun?.({ code, result: full, passed: results.length > 0 && results.every((t) => t.passed) });
  };

  return (
    <View style={{ gap: Spacing.three }}>
      {sandbox}
      <CodeEditor value={code} onChange={(c) => setDraft(draftKey, c)} />
      <Row style={{ flexWrap: 'wrap' }}>
        <View style={{ flexGrow: 1 }}>
          <Button
            title={running ? 'Running…' : checking ? 'Checking types…' : 'Run tests'}
            disabled={running || checking}
            onPress={runTests}
          />
        </View>
        <Button
          title="Reset"
          variant="secondary"
          accessibilityHint="Puts the starting code back"
          onPress={() => {
            clearDraft(draftKey);
            setResult(null);
          }}
        />
        {actions}
      </Row>
      {result && <RunOutput result={result} />}
    </View>
  );
}
