import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/store/settings';

/** Characters that are slow to reach on a phone keyboard, one tap each. */
const KEYS = ['⇥', '{', '}', '(', ')', '[', ']', '=>', ';', "'", '"', '`', '<', '>', '/', '=', '.', ':', '!', '&', '|'];
const PAIRS: Record<string, string> = { '{': '}', '(': ')', '[': ']' };

/**
 * A plain-text code editor built on TextInput: monospace, no autocorrect, and
 * a row of symbol keys above the keyboard. Tab inserts two spaces.
 */
export function CodeEditor({
  value,
  onChange,
  editable = true,
  label = 'Code editor',
  minLines = 8,
}: {
  value: string;
  onChange: (code: string) => void;
  editable?: boolean;
  label?: string;
  minLines?: number;
}) {
  const theme = useTheme();
  const fontSize = useSettings((s) => s.editorFontSize);
  const lineHeight = Math.round(fontSize * 1.5);
  const selection = useRef({ start: value.length, end: value.length });
  const [controlledSelection, setControlledSelection] = useState<{ start: number; end: number } | undefined>();
  const lines = Math.max(minLines, value.split('\n').length + 1);

  const insert = (key: string) => {
    const text = key === '⇥' ? '  ' : key;
    const { start, end } = selection.current;
    const closing = PAIRS[key] && start === end ? PAIRS[key] : '';
    const next = value.slice(0, start) + text + closing + value.slice(end);
    const cursor = start + text.length;
    onChange(next);
    selection.current = { start: cursor, end: cursor };
    setControlledSelection({ start: cursor, end: cursor });
  };

  return (
    <View style={[styles.wrap, { backgroundColor: theme.codeBg, borderColor: theme.border }]}>
      <TextInput
        value={value}
        onChangeText={(t) => {
          setControlledSelection(undefined);
          onChange(t);
        }}
        onSelectionChange={(e) => {
          selection.current = e.nativeEvent.selection;
        }}
        selection={controlledSelection}
        editable={editable}
        multiline
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        keyboardType={Platform.OS === 'ios' ? 'ascii-capable' : 'default'}
        textAlignVertical="top"
        // Web: keep long lines on one line and stop the browser from inserting smart quotes.
        {...(Platform.OS === 'web' ? ({ wrap: 'off', 'data-gramm': 'false' } as object) : {})}
        style={[
          styles.input,
          {
            color: theme.codeText,
            fontFamily: Fonts.mono,
            fontSize,
            lineHeight,
            minHeight: lines * lineHeight + Spacing.three * 2,
          },
          Platform.OS === 'web' && ({ outlineStyle: 'none', whiteSpace: 'pre', overflowX: 'auto' } as object),
        ]}
      />
      {editable && (
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="always"
          showsHorizontalScrollIndicator={false}
          style={[styles.keys, { borderColor: theme.border }]}
          contentContainerStyle={{ gap: Spacing.one, paddingHorizontal: Spacing.two }}>
          {KEYS.map((k) => (
            <Pressable
              key={k}
              accessibilityRole="button"
              accessibilityLabel={k === '⇥' ? 'Insert indent' : `Insert ${k}`}
              onPress={() => insert(k)}
              style={({ pressed }) => [styles.key, { backgroundColor: pressed ? theme.primary : theme.surfaceAlt }]}>
              <ThemedText type="code" style={{ color: theme.text }}>
                {k}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: Radius.md, overflow: 'hidden' },
  input: { padding: Spacing.three },
  keys: { borderTopWidth: 1, paddingVertical: Spacing.one, flexGrow: 0 },
  key: { minWidth: 40, minHeight: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.two },
});
