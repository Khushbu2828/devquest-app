import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, Row } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { aiEnabled, reportQuestion, type ReportReason } from '@/lib/ai';
import type { Question } from '@/types/content';

const reasons: { value: ReportReason; label: string }[] = [
  { value: 'wrong_answer', label: 'Answer is wrong' },
  { value: 'unclear', label: 'Confusing' },
  { value: 'typo', label: 'Typo or formatting' },
  { value: 'other', label: 'Something else' },
];

/**
 * "Report a problem" for any question. Reports go to the review queue on the
 * DevQuest server; AI questions with enough reports are hidden until reviewed.
 * Hidden when there is no server to send reports to.
 */
export function ReportButton({ question }: { question: Question }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  if (!aiEnabled) return null;
  if (state === 'sent') {
    return (
      <ThemedText type="small" color="textSecondary" accessibilityLiveRegion="polite">
        ⚑ Thanks, we&apos;ll take a look.
      </ThemedText>
    );
  }
  if (!open) {
    return (
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.link} hitSlop={8}>
        <ThemedText type="small" color="textSecondary">
          ⚑ Report a problem with this question
        </ThemedText>
      </Pressable>
    );
  }
  return (
    <Card>
      <ThemedText type="heading">What&apos;s wrong?</ThemedText>
      <Row style={{ flexWrap: 'wrap' }} accessibilityRole="radiogroup">
        {reasons.map((r) => (
          <Chip key={r.value} label={r.label} selected={reason === r.value} onPress={() => setReason(r.value)} />
        ))}
      </Row>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Details (optional)"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Details about the problem"
        maxLength={500}
        multiline
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
      />
      {state === 'failed' && <ThemedText color="danger">Couldn&apos;t send. Check your connection and try again.</ThemedText>}
      <View style={{ gap: Spacing.two }}>
        <Button
          title={state === 'sending' ? 'Sending…' : 'Send report'}
          disabled={!reason || state === 'sending'}
          onPress={async () => {
            setState('sending');
            setState((await reportQuestion(question, reason!, note.trim())) ? 'sent' : 'failed');
          }}
        />
        <Button title="Cancel" variant="secondary" onPress={() => setOpen(false)} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
  input: { minHeight: 64, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, fontSize: 15, textAlignVertical: 'top' },
});
