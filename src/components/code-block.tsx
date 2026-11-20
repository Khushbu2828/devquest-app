import { ScrollView, StyleSheet, View } from 'react-native';

import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/store/settings';

/**
 * Read-only code display with line numbers. The interactive editor (CodeMirror
 * in a WebView) arrives in Phase 3; this is used for topic notes and questions.
 */
export function CodeBlock({ code, caption }: { code: string; caption?: string }) {
  const theme = useTheme();
  const fontSize = useSettings((s) => s.editorFontSize);
  const lines = code.split('\n');
  const lineHeight = Math.round(fontSize * 1.5);
  return (
    <View style={{ gap: Spacing.one }}>
      <View
        accessible
        accessibilityLabel={`Code example, ${lines.length} lines: ${code}`}
        style={[styles.block, { backgroundColor: theme.codeBg }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.inner}>
            <View style={styles.gutter}>
              {lines.map((_, i) => (
                <ThemedText key={i} type="code" style={[styles.lineNo, { fontSize, lineHeight }]}>
                  {i + 1}
                </ThemedText>
              ))}
            </View>
            <View>
              {lines.map((line, i) => (
                <ThemedText key={i} type="code" style={{ color: theme.codeText, fontSize, lineHeight }}>
                  {line || ' '}
                </ThemedText>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
      {caption ? (
        <RichText type="small" color="textSecondary">
          {caption}
        </RichText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { borderRadius: Radius.md, paddingVertical: Spacing.three },
  inner: { flexDirection: 'row', paddingRight: Spacing.three },
  gutter: { paddingHorizontal: Spacing.three, alignItems: 'flex-end' },
  lineNo: { color: '#6B7085' },
});
