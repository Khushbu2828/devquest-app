import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RunResult } from '@/lib/runner/sandbox-page';

/** Test results (✓/✗ with the failure message) and anything the code logged. */
export function RunOutput({ result }: { result: RunResult }) {
  const theme = useTheme();
  const passed = result.results.filter((r) => r.passed).length;
  const total = result.results.length;
  return (
    <View style={{ gap: Spacing.two }} accessibilityLiveRegion="polite">
      {total > 0 && (
        <Card>
          <ThemedText type="heading" color={passed === total ? 'success' : 'text'}>
            {passed === total ? '✓ ' : ''}
            {passed} of {total} tests passing
          </ThemedText>
          {result.results.map((r) => (
            <View key={r.name} style={styles.row} accessible accessibilityLabel={`${r.name}: ${r.passed ? 'passed' : `failed. ${r.error ?? ''}`}`}>
              <ThemedText type="smallBold" color={r.passed ? 'success' : 'danger'} style={styles.mark}>
                {r.passed ? '✓' : '✗'}
              </ThemedText>
              <View style={{ flex: 1 }}>
                <ThemedText type="small">{r.name}</ThemedText>
                {!r.passed && r.error ? (
                  <ThemedText type="code" color="danger" style={{ fontSize: 12, lineHeight: 18 }}>
                    {r.error}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          ))}
        </Card>
      )}
      {result.error && !result.results.some((r) => r.error?.includes(result.error!)) ? (
        <Card style={{ backgroundColor: theme.dangerBg, borderColor: theme.danger }}>
          <ThemedText type="code" color="danger">
            {result.error}
          </ThemedText>
        </Card>
      ) : null}
      {result.logs.length > 0 && <Console lines={result.logs} title="Console" />}
    </View>
  );
}

export function Console({ lines, title, tone = 'normal' }: { lines: string[]; title: string; tone?: 'normal' | 'error' }) {
  const theme = useTheme();
  return (
    <View style={[styles.console, { backgroundColor: theme.codeBg }]}>
      <ThemedText type="label" style={{ color: tone === 'error' ? '#F07272' : '#8B90A5' }}>
        {title}
      </ThemedText>
      {lines.map((l, i) => (
        <ThemedText key={i} type="code" style={{ color: tone === 'error' ? '#F7A1A1' : theme.codeText, fontSize: 13 }}>
          {l}
        </ThemedText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  mark: { width: 16 },
  console: { borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.one },
});
