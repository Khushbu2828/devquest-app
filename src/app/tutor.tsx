import { Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AiText } from '@/components/ai-text';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, Row } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { getNote, getUnit } from '@/content';
import { useTheme } from '@/hooks/use-theme';
import { aiEnabled, aiTutor, type TutorMessage } from '@/lib/ai';

const STARTERS = ['Explain closures simply', 'When should I use useEffect?', 'What is the difference between == and ===?', 'How do Server Components work?'];

/**
 * AI tutor chat. Opened from anywhere; when opened from a quiz it gets the
 * unit, topic and question as context so "I don't get this" just works.
 */
export default function TutorScreen() {
  const params = useLocalSearchParams<{ unitId?: string; topic?: string; question?: string }>();
  const theme = useTheme();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unit = params.unitId ? getUnit(params.unitId) : undefined;
  const topicTitle = unit && params.topic ? getNote(unit.track, params.topic)?.title : undefined;
  const starters = topicTitle ? [`Explain "${topicTitle}" another way`, 'Why was my answer wrong?', 'Give me a similar example'] : STARTERS;

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const next: TutorMessage[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setDraft('');
    setBusy(true);
    setError(null);
    try {
      const reply = await aiTutor(next, { unitId: params.unitId, topic: params.topic, question: params.question });
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e) {
      setError(e instanceof Error && e.name !== 'AbortError' ? e.message : 'The tutor took too long to answer. Try again.');
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  if (!aiEnabled) {
    return (
      <SafeAreaView edges={['bottom']} style={[styles.fill, { backgroundColor: theme.background, padding: Spacing.three }]}>
        <Stack.Screen options={{ title: 'AI tutor' }} />
        <Card>
          <ThemedText type="heading">The tutor needs the DevQuest server</ThemedText>
          <ThemedText color="textSecondary">Set EXPO_PUBLIC_AI_SERVER_URL and run `npm run server` (see the README).</ThemedText>
        </Card>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.fill, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: 'AI tutor' }} />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            {messages.length === 0 && (
              <>
                <ThemedText type="subtitle" accessibilityRole="header">
                  🤖 Ask me anything about web development
                </ThemedText>
                {topicTitle && (
                  <ThemedText color="textSecondary">I know you&apos;re working on {topicTitle}.</ThemedText>
                )}
                <Row style={{ flexWrap: 'wrap' }}>
                  {starters.map((s) => (
                    <Chip key={s} label={s} selected={false} onPress={() => send(s)} />
                  ))}
                </Row>
              </>
            )}
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <View key={i} style={[styles.bubble, styles.mine, { backgroundColor: theme.primary }]}>
                  <ThemedText style={{ color: theme.primaryText }}>{m.content}</ThemedText>
                </View>
              ) : (
                <Card key={i}>
                  <AiText text={m.content} />
                </Card>
              ),
            )}
            {busy && (
              <Row>
                <ActivityIndicator color={theme.primary} />
                <ThemedText color="textSecondary">Thinking…</ThemedText>
              </Row>
            )}
            {error && (
              <ThemedText color="danger" accessibilityLiveRegion="polite">
                {error}
              </ThemedText>
            )}
            <ThemedText type="small" color="textSecondary">
              AI answers can be wrong. Check them against the lessons and your own code.
            </ThemedText>
          </View>
        </ScrollView>
        <View style={[styles.composer, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={[styles.inner, { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask a question…"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel="Message to the tutor"
              multiline
              maxLength={2000}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            />
            <Button title="Send" disabled={!draft.trim() || busy} onPress={() => send(draft)} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', paddingVertical: Spacing.three },
  inner: { width: '100%', maxWidth: MaxContentWidth, paddingHorizontal: Spacing.three, gap: Spacing.three },
  bubble: { borderRadius: Radius.md, padding: Spacing.three, maxWidth: '85%' },
  mine: { alignSelf: 'flex-end' },
  composer: { borderTopWidth: 1, alignItems: 'center', paddingVertical: Spacing.two },
  input: { flex: 1, minHeight: 48, maxHeight: 140, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, fontSize: 16 },
});
