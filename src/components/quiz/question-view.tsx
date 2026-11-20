import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CodeBlock } from '@/components/code-block';
import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Answer } from '@/lib/quiz';
import { useSettings } from '@/store/settings';
import type {
  BugFindQuestion,
  FillBlankQuestion,
  MatchQuestion,
  OrderQuestion,
  Question,
} from '@/types/content';

/**
 * Renders one quiz question of any type and collects the learner's answer.
 * After "Check" (`revealed`), it shows what was right and wrong in place.
 * Right/wrong is always shown with a ✓/✗ mark and words, never by color alone.
 */
export interface QuestionViewProps {
  question: Question;
  answer: Answer;
  onChange: (answer: Answer) => void;
  /** Display order from `displayOrder()`, fixed for this question. */
  order: number[];
  revealed: boolean;
}

export function QuestionView(props: QuestionViewProps) {
  const { question: q } = props;
  return (
    <View style={{ gap: Spacing.three }}>
      <RichText type="heading">{q.prompt}</RichText>
      {q.code && q.type !== 'bug_find' && q.type !== 'fill_blank' && <CodeBlock code={q.code} />}
      <Body {...props} />
    </View>
  );
}

function Body({ question: q, answer, onChange, order, revealed }: QuestionViewProps) {
  switch (q.type) {
    case 'mcq':
    case 'output': {
      const choice = answer.type === 'mcq' || answer.type === 'output' ? answer.choice : null;
      return (
        <View accessibilityRole="radiogroup" style={styles.options}>
          {order.map((i) => (
            <Option
              key={i}
              label={q.options[i]}
              mono={q.type === 'output'}
              role="radio"
              selected={choice === i}
              isAnswer={q.answer === i}
              revealed={revealed}
              onPress={() => onChange({ type: q.type, choice: i })}
            />
          ))}
        </View>
      );
    }
    case 'multi': {
      const choices = answer.type === 'multi' ? answer.choices : [];
      return (
        <View style={styles.options}>
          <ThemedText type="small" color="textSecondary">
            Select all that apply.
          </ThemedText>
          {order.map((i) => (
            <Option
              key={i}
              label={q.options[i]}
              role="checkbox"
              selected={choices.includes(i)}
              isAnswer={q.answers.includes(i)}
              revealed={revealed}
              onPress={() =>
                onChange({
                  type: 'multi',
                  choices: choices.includes(i) ? choices.filter((c) => c !== i) : [...choices, i],
                })
              }
            />
          ))}
        </View>
      );
    }
    case 'true_false': {
      const value = answer.type === 'true_false' ? answer.value : null;
      return (
        <View accessibilityRole="radiogroup" style={styles.options}>
          {[true, false].map((v) => (
            <Option
              key={String(v)}
              label={v ? 'True' : 'False'}
              role="radio"
              selected={value === v}
              isAnswer={q.answer === v}
              revealed={revealed}
              onPress={() => onChange({ type: 'true_false', value: v })}
            />
          ))}
        </View>
      );
    }
    case 'fill_blank':
      return <FillBlank q={q} text={answer.type === 'fill_blank' ? answer.text : ''} onChange={onChange} revealed={revealed} />;
    case 'bug_find':
      return (
        <BugFind
          q={q}
          line={answer.type === 'bug_find' ? answer.line : null}
          onChange={onChange}
          revealed={revealed}
        />
      );
    case 'order':
      return (
        <OrderLines
          q={q}
          placed={answer.type === 'order' ? answer.placed : []}
          bank={order}
          onChange={onChange}
          revealed={revealed}
        />
      );
    case 'match':
      return (
        <MatchPairs
          q={q}
          links={answer.type === 'match' ? answer.links : {}}
          rightOrder={order}
          onChange={onChange}
          revealed={revealed}
        />
      );
  }
}

// ------------------------------------------------------------------ options

type Status = 'idle' | 'selected' | 'correct' | 'wrong' | 'missed' | 'dim';

function statusOf(selected: boolean, isAnswer: boolean, revealed: boolean): Status {
  if (!revealed) return selected ? 'selected' : 'idle';
  if (selected) return isAnswer ? 'correct' : 'wrong';
  return isAnswer ? 'missed' : 'dim';
}

const statusText: Record<Status, string> = {
  idle: '',
  selected: '',
  correct: 'Correct',
  wrong: 'Your answer, incorrect',
  missed: 'Correct answer',
  dim: '',
};

function colorsFor(theme: ReturnType<typeof useTheme>, status: Status) {
  switch (status) {
    case 'selected':
      return { bg: theme.surfaceAlt, border: theme.primary, mark: '' };
    case 'correct':
      return { bg: theme.successBg, border: theme.success, mark: '✓' };
    case 'missed':
      return { bg: theme.surface, border: theme.success, mark: '✓' };
    case 'wrong':
      return { bg: theme.dangerBg, border: theme.danger, mark: '✗' };
    default:
      return { bg: theme.surface, border: theme.border, mark: '' };
  }
}

function Option({
  label,
  mono,
  role,
  selected,
  isAnswer,
  revealed,
  onPress,
}: {
  label: string;
  mono?: boolean;
  role: 'radio' | 'checkbox';
  selected: boolean;
  isAnswer: boolean;
  revealed: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const status = statusOf(selected, isAnswer, revealed);
  const c = colorsFor(theme, status);
  const box = role === 'checkbox' ? (selected ? '☑' : '☐') : selected ? '◉' : '○';
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ checked: selected, disabled: revealed }}
      accessibilityHint={statusText[status] || undefined}
      disabled={revealed}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        { backgroundColor: c.bg, borderColor: c.border, borderWidth: status === 'idle' || status === 'dim' ? 1 : 2 },
        status === 'dim' && { opacity: 0.6 },
        pressed && { opacity: 0.75 },
      ]}>
      <ThemedText style={{ color: selected ? theme.primary : theme.textSecondary, fontSize: 18 }}>{box}</ThemedText>
      {mono ? (
        <ThemedText type="code" style={{ flex: 1 }}>
          {label}
        </ThemedText>
      ) : (
        <RichText style={{ flex: 1 }}>{label}</RichText>
      )}
      {c.mark ? <Mark ok={c.mark === '✓'} /> : null}
    </Pressable>
  );
}

function Mark({ ok }: { ok: boolean }) {
  return (
    <ThemedText type="heading" color={ok ? 'success' : 'danger'} accessibilityElementsHidden importantForAccessibility="no">
      {ok ? '✓' : '✗'}
    </ThemedText>
  );
}

// ------------------------------------------------------------------ fill in the blank

function FillBlank({
  q,
  text,
  onChange,
  revealed,
}: {
  q: FillBlankQuestion;
  text: string;
  onChange: (a: Answer) => void;
  revealed: boolean;
}) {
  const theme = useTheme();
  const shown = revealed ? q.code.replace('___', q.answer) : q.code;
  return (
    <View style={{ gap: Spacing.two }}>
      <CodeBlock code={shown} caption={revealed ? `Answer: \`${q.answer}\`` : 'Type what goes in the `___`.'} />
      <TextInput
        value={text}
        onChangeText={(t) => onChange({ type: 'fill_blank', text: t })}
        editable={!revealed}
        placeholder="Your answer"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Answer for the blank"
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        style={[
          styles.input,
          { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface, fontFamily: Fonts.mono },
        ]}
      />
    </View>
  );
}

// ------------------------------------------------------------------ bug find

function BugFind({
  q,
  line,
  onChange,
  revealed,
}: {
  q: BugFindQuestion;
  line: number | null;
  onChange: (a: Answer) => void;
  revealed: boolean;
}) {
  const theme = useTheme();
  const fontSize = useSettings((s) => s.editorFontSize);
  const lines = q.code.split('\n');
  return (
    <View style={{ gap: Spacing.one }}>
      <ThemedText type="small" color="textSecondary">
        Tap the line with the bug.
      </ThemedText>
      <ScrollView horizontal style={[styles.codeBox, { backgroundColor: theme.codeBg }]} contentContainerStyle={{ minWidth: '100%' }}>
        <View accessibilityRole="radiogroup" style={{ flexGrow: 1 }}>
          {lines.map((text, i) => {
            const n = i + 1;
            const status = statusOf(line === n, q.bugLine === n, revealed);
            const tint =
              status === 'selected'
                ? 'rgba(139,128,255,0.35)'
                : status === 'correct' || status === 'missed'
                  ? 'rgba(76,201,138,0.3)'
                  : status === 'wrong'
                    ? 'rgba(240,114,114,0.35)'
                    : 'transparent';
            return (
              <Pressable
                key={i}
                accessibilityRole="radio"
                accessibilityState={{ checked: line === n, disabled: revealed }}
                accessibilityLabel={`Line ${n}: ${text.trim() || 'blank'}`}
                accessibilityHint={statusText[status] || undefined}
                disabled={revealed}
                onPress={() => onChange({ type: 'bug_find', line: n })}
                style={[styles.codeLine, { backgroundColor: tint }]}>
                <ThemedText type="code" style={[styles.lineNo, { fontSize, lineHeight: fontSize * 1.9 }]}>
                  {n}
                </ThemedText>
                <ThemedText type="code" style={{ color: theme.codeText, fontSize, lineHeight: fontSize * 1.9, flex: 1 }}>
                  {text || ' '}
                </ThemedText>
                {revealed && (status === 'correct' || status === 'missed' || status === 'wrong') ? (
                  <ThemedText type="smallBold" style={{ color: status === 'wrong' ? '#F07272' : '#4CC98A', paddingRight: Spacing.two }}>
                    {status === 'wrong' ? '✗' : '✓ bug'}
                  </ThemedText>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ------------------------------------------------------------------ order

function OrderLines({
  q,
  placed,
  bank,
  onChange,
  revealed,
}: {
  q: OrderQuestion;
  placed: number[];
  bank: number[];
  onChange: (a: Answer) => void;
  revealed: boolean;
}) {
  const theme = useTheme();
  const remaining = bank.filter((i) => !placed.includes(i));
  return (
    <View style={{ gap: Spacing.three }}>
      <View style={{ gap: Spacing.one }}>
        <ThemedText type="label" color="textSecondary">
          Your order {revealed ? '' : '· tap a line to remove it'}
        </ThemedText>
        <View style={[styles.dropZone, { borderColor: theme.border }]}>
          {placed.length === 0 && (
            <ThemedText type="small" color="textSecondary">
              Tap the lines below in the right order.
            </ThemedText>
          )}
          {placed.map((li, pos) => {
            const ok = q.lines[li] === q.lines[pos];
            const status: Status = revealed ? (ok ? 'correct' : 'wrong') : 'idle';
            return (
              <LineChip
                key={li}
                text={q.lines[li]}
                index={pos + 1}
                status={status}
                disabled={revealed}
                hint="Removes this line"
                onPress={() => onChange({ type: 'order', placed: placed.filter((p) => p !== li) })}
              />
            );
          })}
        </View>
      </View>
      {!revealed && remaining.length > 0 && (
        <View style={{ gap: Spacing.one }}>
          <ThemedText type="label" color="textSecondary">
            Lines
          </ThemedText>
          {remaining.map((li) => (
            <LineChip
              key={li}
              text={q.lines[li]}
              status="idle"
              hint="Adds this line next"
              onPress={() => onChange({ type: 'order', placed: [...placed, li] })}
            />
          ))}
        </View>
      )}
      {revealed && !placed.every((li, pos) => q.lines[li] === q.lines[pos]) && (
        <CodeBlock code={q.lines.join('\n')} caption="The correct order" />
      )}
    </View>
  );
}

function LineChip({
  text,
  index,
  status,
  disabled,
  hint,
  onPress,
}: {
  text: string;
  index?: number;
  status: Status;
  disabled?: boolean;
  hint: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const c = colorsFor(theme, status);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${index ? `${index}. ` : ''}${text}`}
      accessibilityHint={disabled ? statusText[status] || undefined : hint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.lineChip,
        { backgroundColor: c.bg, borderColor: c.border },
        pressed && { opacity: 0.7 },
      ]}>
      {index ? (
        <ThemedText type="smallBold" color="textSecondary">
          {index}
        </ThemedText>
      ) : null}
      <ThemedText type="code" style={{ flex: 1 }}>
        {text}
      </ThemedText>
      {c.mark ? <Mark ok={c.mark === '✓'} /> : null}
    </Pressable>
  );
}

// ------------------------------------------------------------------ match

function MatchPairs({
  q,
  links,
  rightOrder,
  onChange,
  revealed,
}: {
  q: MatchQuestion;
  links: Record<number, number>;
  rightOrder: number[];
  onChange: (a: Answer) => void;
  revealed: boolean;
}) {
  const theme = useTheme();
  const firstOpen = q.pairs.findIndex((_, i) => links[i] === undefined);
  const [active, setActive] = useState<number>(firstOpen === -1 ? 0 : firstOpen);
  const used = new Set(Object.values(links));

  const pick = (right: number) => {
    const next: Record<number, number> = {};
    // A right-hand item can only be linked once: move it if it was used elsewhere.
    for (const [l, r] of Object.entries(links)) if (r !== right) next[Number(l)] = r;
    next[active] = right;
    onChange({ type: 'match', links: next });
    const open = q.pairs.findIndex((_, i) => next[i] === undefined);
    if (open !== -1) setActive(open);
  };

  return (
    <View style={{ gap: Spacing.three }}>
      {!revealed && (
        <ThemedText type="small" color="textSecondary">
          Pick an item on the left, then its match below.
        </ThemedText>
      )}
      <View style={{ gap: Spacing.two }}>
        {q.pairs.map((pair, i) => {
          const linked = links[i];
          const ok = linked !== undefined && q.pairs[linked].right === pair.right;
          const status: Status = revealed ? (ok ? 'correct' : 'wrong') : active === i ? 'selected' : 'idle';
          const c = colorsFor(theme, status);
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityState={{ selected: active === i, disabled: revealed }}
              accessibilityLabel={`${pair.left}: ${linked !== undefined ? `matched with ${q.pairs[linked].right}` : 'not matched yet'}`}
              accessibilityHint={revealed ? statusText[status] : 'Selects this item to match'}
              disabled={revealed}
              onPress={() => setActive(i)}
              style={[styles.matchRow, { backgroundColor: c.bg, borderColor: c.border }]}>
              <View style={{ flex: 1, gap: Spacing.half }}>
                <RichText type="smallBold">{pair.left}</RichText>
                <RichText type="small" color={linked !== undefined ? 'text' : 'textSecondary'}>
                  {linked !== undefined ? `→ ${q.pairs[linked].right}` : '→ ?'}
                </RichText>
                {revealed && !ok && (
                  <RichText type="small" color="success">{`✓ ${pair.right}`}</RichText>
                )}
              </View>
              {revealed ? <Mark ok={ok} /> : null}
            </Pressable>
          );
        })}
      </View>
      {!revealed && (
        <View style={styles.bank}>
          {rightOrder.map((r) => (
            <Pressable
              key={r}
              accessibilityRole="button"
              accessibilityLabel={q.pairs[r].right}
              accessibilityHint={`Matches it with ${q.pairs[active]?.left ?? 'the selected item'}`}
              onPress={() => pick(r)}
              style={({ pressed }) => [
                styles.bankItem,
                { backgroundColor: theme.surface, borderColor: theme.border },
                used.has(r) && { opacity: 0.45 },
                pressed && { opacity: 0.7 },
              ]}>
              <RichText type="small">{q.pairs[r].right}</RichText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  options: { gap: Spacing.two },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  input: { minHeight: 48, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.three, fontSize: 16 },
  codeBox: { borderRadius: Radius.md, paddingVertical: Spacing.two },
  codeLine: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  lineNo: { color: '#6B7085', width: 40, textAlign: 'right', paddingRight: Spacing.three },
  dropZone: { minHeight: 56, borderWidth: 1, borderStyle: 'dashed', borderRadius: Radius.md, padding: Spacing.two, gap: Spacing.two },
  lineChip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  matchRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.two },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  bankItem: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.three },
});
