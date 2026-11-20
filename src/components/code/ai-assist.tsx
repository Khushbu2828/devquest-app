import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AiText } from '@/components/ai-text';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Row } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { aiEnabled, aiHint, aiReview } from '@/lib/ai';
import { useDrafts } from '@/store/drafts';

/**
 * "✨ AI hint" while the learner is stuck, "✨ AI code review" once the tests
 * pass. Reads the learner's current code from their draft. Hidden without the
 * DevQuest server.
 */
export function AiAssist({
  taskId,
  draftKey,
  starterCode,
  failures,
  passed,
}: {
  taskId: string;
  draftKey: string;
  starterCode: string;
  /** Failing test messages from the last run, sent with hint requests. */
  failures: string[];
  passed: boolean;
}) {
  const code = useDrafts((s) => s.drafts[draftKey]) ?? starterCode;
  const [answer, setAnswer] = useState<{ kind: 'hint' | 'review'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!aiEnabled) return null;

  const ask = async (kind: 'hint' | 'review') => {
    setBusy(true);
    setError(null);
    try {
      const text = kind === 'hint' ? await aiHint(taskId, code, failures) : await aiReview(taskId, code);
      setAnswer({ kind, text });
    } catch (e) {
      setError(e instanceof Error && e.name !== 'AbortError' ? e.message : 'The AI took too long. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: Spacing.two }}>
      {passed ? (
        <Button title={busy ? 'Reviewing…' : '✨ AI code review'} variant="secondary" disabled={busy} onPress={() => ask('review')} />
      ) : (
        <Button title={busy ? 'Thinking…' : '✨ Ask AI for a hint'} variant="secondary" disabled={busy} onPress={() => ask('hint')} />
      )}
      {busy && (
        <Row>
          <ActivityIndicator />
          <ThemedText type="small" color="textSecondary">
            Reading your code…
          </ThemedText>
        </Row>
      )}
      {error && <ThemedText color="danger">{error}</ThemedText>}
      {answer && (
        <Card>
          <ThemedText type="label" color="primary">
            ✨ {answer.kind === 'hint' ? 'AI hint' : 'AI code review'}
          </ThemedText>
          <AiText text={answer.text} />
          <ThemedText type="small" color="textSecondary">
            AI can be wrong. The tests are the final word.
          </ThemedText>
        </Card>
      )}
    </View>
  );
}
