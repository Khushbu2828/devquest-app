import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoteView } from '@/components/note-view';
import { QuestionView } from '@/components/quiz/question-view';
import { ReportButton } from '@/components/quiz/report-button';
import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { Accordion, Button, Card, ProgressBar, Row } from '@/components/ui';
import { MaxContentWidth, Spacing, TrackColors } from '@/constants/theme';
import { getNote, getQuestion, getUnit, questionsForUnit } from '@/content';
import { useTheme } from '@/hooks/use-theme';
import { aiEnabled, fetchAiQuiz } from '@/lib/ai';
import { dueForReview } from '@/lib/review';
import {
  PERFECT_QUIZ_BONUS,
  QUIZ_COMPLETE_BONUS,
  QUIZ_SIZE,
  displayOrder,
  emptyAnswer,
  isComplete,
  isCorrect,
  pickQuestions,
  xpForAnswer,
  type Answer,
} from '@/lib/quiz';
import { useProgress } from '@/store/progress';
import type { Question, Unit } from '@/types/content';

interface Item {
  question: Question;
  order: number[];
}

interface Result {
  question: Question;
  correct: boolean;
  xp: number;
}

const toItems = (questions: Question[]): Item[] => questions.map((q) => ({ question: q, order: displayOrder(q) }));

const pickSeed = (unit: Unit) => pickQuestions(questionsForUnit(unit.id), useProgress.getState().attempts);

/** How long to wait for the AI server before falling back to built-in questions. */
const AI_TIMEOUT_MS = 90_000;
const AI_QUIZ_SIZE = 5;

/** Questions due for spaced-repetition review, as one quiz across all units. */
function reviewQuestions(): Question[] {
  const due = dueForReview(useProgress.getState().attempts, (id) => !!getQuestion(id));
  return due.slice(0, QUIZ_SIZE).map((id) => getQuestion(id)!);
}

export default function QuizScreen() {
  const { unitId, mode } = useLocalSearchParams<{ unitId: string; mode?: string }>();
  if (unitId === 'review') return <ReviewQuiz />;
  const unit = getUnit(unitId);
  if (!unit) {
    return (
      <View style={{ padding: Spacing.four }}>
        <ThemedText>Unit not found.</ThemedText>
      </View>
    );
  }
  if (mode === 'ai') return <AiQuiz unit={unit} />;
  return <Quiz unit={unit} initial={pickSeed(unit)} onNewQuiz={(start) => start(pickSeed(unit))} />;
}

function ReviewQuiz() {
  const [questions] = useState(reviewQuestions);
  if (questions.length === 0) {
    return (
      <View style={{ padding: Spacing.four, gap: Spacing.three }}>
        <Stack.Screen options={{ title: 'Review' }} />
        <ThemedText type="heading">🎉 Nothing to review right now</ThemedText>
        <ThemedText color="textSecondary">Questions come back here a few days after you answer them, so they stick.</ThemedText>
      </View>
    );
  }
  // A review spans units; the first question's unit supplies the colour and title area.
  const first = getUnit(questions[0].unitId)!;
  const unit: Unit = { ...first, id: 'review', title: 'Review' };
  return (
    <Quiz
      unit={unit}
      initial={questions}
      onNewQuiz={(start) => {
        const next = reviewQuestions();
        if (next.length) start(next);
        else router.back();
      }}
    />
  );
}

type Loaded = { questions: Question[]; notice?: string };

/**
 * Asks the AI server for fresh questions. If it is slow, unreachable or returns
 * too few, the quiz is topped up with built-in questions so it always works.
 */
function AiQuiz({ unit }: { unit: Unit }) {
  const theme = useTheme();
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    const attempts = useProgress.getState().attempts;
    fetchAiQuiz(unit, attempts, AI_QUIZ_SIZE, controller.signal)
      .then(({ questions, notice }) => {
        if (cancelled) return;
        if (questions.length >= AI_QUIZ_SIZE) return setLoaded({ questions, notice });
        const topUp = pickSeed(unit).slice(0, AI_QUIZ_SIZE - questions.length);
        setLoaded({
          questions: [...questions, ...topUp],
          notice:
            (notice ? `${notice} ` : '') +
            (questions.length ? 'Some questions in this quiz are built-in ones.' : 'This quiz uses built-in questions instead.'),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setLoaded({
          questions: pickSeed(unit).slice(0, AI_QUIZ_SIZE),
          notice: "Couldn't reach the AI question server, so this quiz uses built-in questions.",
        });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
    // Load once per screen; "New AI quiz" remounts this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit.id]);

  if (!loaded) {
    return (
      <SafeAreaView edges={['bottom']} style={[styles.loading, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: unit.title }} />
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText type="heading" accessibilityLiveRegion="polite">
          ✨ Writing fresh questions…
        </ThemedText>
        <ThemedText color="textSecondary" style={{ textAlign: 'center' }}>
          Each one is checked before you see it. This can take up to a minute.
        </ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <Quiz
      unit={unit}
      initial={loaded.questions}
      notice={loaded.notice}
      onNewQuiz={() =>
        router.replace({ pathname: '/quiz/[unitId]', params: { unitId: unit.id, mode: 'ai', round: String(Date.now()) } })
      }
    />
  );
}

function Quiz({
  unit,
  initial,
  notice,
  onNewQuiz,
}: {
  unit: Unit;
  initial: Question[];
  notice?: string;
  /** Starts a fresh quiz; the built-in mode passes new questions to `start`. */
  onNewQuiz: (start: (questions: Question[]) => void) => void;
}) {
  const theme = useTheme();
  const recordAttempt = useProgress((s) => s.recordAttempt);
  const addReward = useProgress((s) => s.addReward);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const [items, setItems] = useState<Item[]>(() => toItems(initial.slice(0, QUIZ_SIZE)));
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<Answer>(() => emptyAnswer(items[0].question));
  const [revealed, setRevealed] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [results, setResults] = useState<Result[]>([]);
  const [bonus, setBonus] = useState<number | null>(null);

  const item = items[index];
  const q = item?.question;
  const color = TrackColors[unit.track];

  const startRound = (questions: Question[]) => {
    const next = toItems(questions);
    setItems(next);
    setIndex(0);
    setAnswer(emptyAnswer(next[0].question));
    setRevealed(false);
    setHintShown(false);
    setStartedAt(Date.now());
    setResults([]);
    setBonus(null);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const check = () => {
    const correct = isCorrect(q, answer);
    const xp = xpForAnswer(q, correct, hintShown);
    recordAttempt({
      questionId: q.id,
      track: q.track,
      topic: q.topic,
      correct,
      answeredAt: new Date().toISOString(),
      msToAnswer: Date.now() - startedAt,
      usedHint: hintShown,
      xp,
    });
    setResults((r) => [...r, { question: q, correct, xp }]);
    setRevealed(true);
  };

  const next = () => {
    if (index + 1 < items.length) {
      const nextQ = items[index + 1].question;
      setIndex(index + 1);
      setAnswer(emptyAnswer(nextQ));
      setRevealed(false);
      setHintShown(false);
      setStartedAt(Date.now());
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      return;
    }
    const perfect = results.every((r) => r.correct);
    const earned = QUIZ_COMPLETE_BONUS + (perfect ? PERFECT_QUIZ_BONUS : 0);
    addReward({ id: `quiz-${unit.id}-${Date.now()}`, kind: 'quiz', xp: earned, ref: unit.id });
    setBonus(earned);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const finished = bonus !== null;
  const lastResult = revealed ? results[results.length - 1] : undefined;
  const note = q ? getNote(q.track, q.topic) : undefined;

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: unit.title }} />

      {!finished && (
        <View style={[styles.header, { borderColor: theme.border }]}>
          <View style={styles.inner}>
            <Row style={{ justifyContent: 'space-between' }}>
              <ThemedText type="label" color="textSecondary">
                Question {index + 1} of {items.length}
              </ThemedText>
              <ThemedText type="label" color="textSecondary">
                {results.filter((r) => r.correct).length} correct
              </ThemedText>
            </Row>
            <ProgressBar
              value={(index + (revealed ? 1 : 0)) / items.length}
              color={color}
              label={`Quiz progress, question ${index + 1} of ${items.length}`}
            />
          </View>
        </View>
      )}

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.inner, { gap: Spacing.four }]}>
          {finished ? (
            <Results results={results} bonus={bonus} onRetry={startRound} onNewQuiz={() => onNewQuiz(startRound)} />
          ) : (
            <>
              {notice && index === 0 && !revealed && (
                <Card style={{ backgroundColor: theme.warningBg, borderColor: theme.warning }}>
                  <ThemedText type="small">{notice}</ThemedText>
                </Card>
              )}
              {q.source === 'ai' && (
                <ThemedText type="label" color="primary">
                  ✨ AI-written question
                </ThemedText>
              )}
              <QuestionView
                key={`${index}-${q.id}`}
                question={q}
                answer={answer}
                onChange={setAnswer}
                order={item.order}
                revealed={revealed}
              />

              {!revealed && q.hints.length > 0 && (
                hintShown ? (
                  <Card style={{ backgroundColor: theme.warningBg, borderColor: theme.warning }}>
                    <ThemedText type="label" style={{ color: theme.warning }}>
                      💡 Hint · half XP for this question
                    </ThemedText>
                    <RichText>{q.hints[0]}</RichText>
                  </Card>
                ) : null
              )}

              {lastResult && (
                <View
                  style={{ gap: Spacing.three }}
                  onLayout={(e) =>
                    scrollRef.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - Spacing.three), animated: true })
                  }>
                  <Feedback correct={lastResult.correct} xp={lastResult.xp} explanation={q.explanation} />
                  <ReportButton key={`report-${q.id}`} question={q} />
                  {!lastResult.correct && note && (
                    <Accordion key={q.id} title={`Learn this: ${note.title}`} icon="📖" defaultOpen>
                      <NoteView blocks={note.blocks} />
                      {aiEnabled && (
                        <Button
                          title="🤖 Still confused? Ask the tutor"
                          variant="secondary"
                          onPress={() =>
                            router.push({ pathname: '/tutor', params: { unitId: q.unitId, topic: q.topic, question: q.prompt } })
                          }
                        />
                      )}
                    </Accordion>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {!finished && (
        <View style={[styles.footer, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={[styles.inner, styles.footerRow]}>
            {revealed ? (
              <View style={{ flex: 1 }}>
                <Button title={index + 1 < items.length ? 'Next question' : 'See results'} onPress={next} />
              </View>
            ) : (
              <>
                {!hintShown && q.hints.length > 0 && (
                  <Button
                    title="Hint"
                    variant="secondary"
                    accessibilityHint="Shows a hint. You earn half XP for this question."
                    onPress={() => setHintShown(true)}
                  />
                )}
                <View style={{ flex: 1 }}>
                  <Button title="Check" disabled={!isComplete(q, answer)} onPress={check} />
                </View>
              </>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function Feedback({ correct, xp, explanation }: { correct: boolean; xp: number; explanation: string }) {
  const theme = useTheme();
  return (
    <Card
      style={{
        backgroundColor: correct ? theme.successBg : theme.dangerBg,
        borderColor: correct ? theme.success : theme.danger,
      }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <ThemedText type="heading" color={correct ? 'success' : 'danger'} accessibilityRole="header" accessibilityLiveRegion="polite">
          {correct ? '✓ Correct!' : '✗ Not quite'}
        </ThemedText>
        {xp > 0 && (
          <ThemedText type="smallBold" color="success">
            +{xp} XP
          </ThemedText>
        )}
      </Row>
      <RichText>{explanation}</RichText>
    </Card>
  );
}

function Results({
  results,
  bonus,
  onRetry,
  onNewQuiz,
}: {
  results: Result[];
  bonus: number | null;
  onRetry: (questions: Question[]) => void;
  onNewQuiz: () => void;
}) {
  const correct = results.filter((r) => r.correct).length;
  const missed = results.filter((r) => !r.correct);
  const xp = results.reduce((sum, r) => sum + r.xp, 0) + (bonus ?? 0);
  const perfect = missed.length === 0;
  // One note per missed topic, in the order they came up.
  const topics = [...new Map(missed.map((r) => [r.question.topic, r.question])).values()];

  return (
    <>
      <View style={{ alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.three }}>
        <ThemedText style={{ fontSize: 56, lineHeight: 64 }}>{perfect ? '🏆' : correct >= results.length / 2 ? '🎉' : '💪'}</ThemedText>
        <ThemedText type="title" accessibilityRole="header">
          {perfect ? 'Perfect score!' : 'Quiz complete'}
        </ThemedText>
        <ThemedText type="subtitle">
          {correct} / {results.length} correct
        </ThemedText>
        <ThemedText type="heading" color="success">
          +{xp} XP
        </ThemedText>
        <ThemedText type="small" color="textSecondary">
          Includes +{QUIZ_COMPLETE_BONUS} for finishing{perfect ? ` and +${PERFECT_QUIZ_BONUS} for a perfect score` : ''}.
        </ThemedText>
      </View>

      {topics.length > 0 && (
        <View style={{ gap: Spacing.two }}>
          <ThemedText type="label" color="textSecondary" accessibilityRole="header">
            Review what you missed
          </ThemedText>
          {topics.map((q) => {
            const note = getNote(q.track, q.topic);
            return note ? (
              <Accordion key={q.topic} title={note.title} icon="📖">
                <NoteView blocks={note.blocks} />
              </Accordion>
            ) : null;
          })}
        </View>
      )}

      <View style={{ gap: Spacing.two }}>
        {missed.length > 0 && (
          <Button title={`Retry the ${missed.length} you missed`} onPress={() => onRetry(missed.map((r) => r.question))} />
        )}
        <Button
          title="New quiz"
          variant={missed.length > 0 ? 'secondary' : 'primary'}
          onPress={onNewQuiz}
        />
        <Button title="Back to unit" variant="secondary" onPress={() => router.back()} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  header: { borderBottomWidth: 1, alignItems: 'center', paddingVertical: Spacing.two },
  inner: { width: '100%', maxWidth: MaxContentWidth, paddingHorizontal: Spacing.three, gap: Spacing.two },
  scroll: { flexGrow: 1, alignItems: 'center', paddingTop: Spacing.three, paddingBottom: Spacing.five },
  footer: { borderTopWidth: 1, alignItems: 'center', paddingVertical: Spacing.two },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
});
