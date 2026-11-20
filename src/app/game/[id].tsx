import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CodeBlock } from '@/components/code-block';
import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, ProgressBar, Row, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { tracks } from '@/content';
import { useTheme } from '@/hooks/use-theme';
import {
  GAME_SECONDS,
  bestScore,
  gamePool,
  games,
  pointsFor,
  shuffle,
  xpForScore,
  type Game,
  type GameItem,
} from '@/lib/games';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import type { TrackId } from '@/types/content';

type Phase = { name: 'intro' } | { name: 'playing'; endsAt: number } | { name: 'over'; score: number; xp: number; best: boolean };

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const game = games.find((g) => g.id === id);
  if (!game) {
    return (
      <Screen edges={[]}>
        <ThemedText>Game not found.</ThemedText>
      </Screen>
    );
  }
  return <GameRunner game={game} />;
}

function GameRunner({ game }: { game: Game }) {
  const rewards = useProgress((s) => s.rewards);
  const addReward = useProgress((s) => s.addReward);
  const best = bestScore(rewards, game.id);
  const [track, setTrack] = useState<TrackId | 'all'>('all');
  const [phase, setPhase] = useState<Phase>({ name: 'intro' });
  const pool = useMemo(() => gamePool(game.id, track), [game.id, track]);

  const finish = (score: number) => {
    const xp = xpForScore(score);
    addReward({ id: `game-${game.id}-${Date.now()}`, kind: 'game', xp, ref: game.id, score });
    setPhase({ name: 'over', score, xp, best: score > best });
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: game.title }} />
      {phase.name === 'intro' && (
        <>
          <ThemedText style={{ fontSize: 48, lineHeight: 56 }}>{game.icon}</ThemedText>
          <ThemedText type="title" accessibilityRole="header">
            {game.title}
          </ThemedText>
          <ThemedText color="textSecondary">{game.rules}</ThemedText>
          <Card>
            <ThemedText type="label" color="textSecondary">
              Questions from
            </ThemedText>
            <Row style={{ flexWrap: 'wrap' }} accessibilityRole="radiogroup">
              <Chip label="All tracks" selected={track === 'all'} onPress={() => setTrack('all')} />
              {tracks.map((t) => (
                <Chip key={t.id} label={t.title} selected={track === t.id} onPress={() => setTrack(t.id)} />
              ))}
            </Row>
            <ThemedText type="small" color="textSecondary">
              {pool.length} snippets · Best score: {best}
            </ThemedText>
          </Card>
          <Button
            title="Start"
            disabled={pool.length === 0}
            onPress={() => setPhase({ name: 'playing', endsAt: Date.now() + GAME_SECONDS * 1000 })}
          />
        </>
      )}
      {phase.name === 'playing' && <Round key={phase.endsAt} pool={pool} endsAt={phase.endsAt} onEnd={finish} />}
      {phase.name === 'over' && (
        <View style={{ alignItems: 'center', gap: Spacing.three, paddingTop: Spacing.four }}>
          <ThemedText style={{ fontSize: 56, lineHeight: 64 }}>{phase.best ? '🏆' : '⏱️'}</ThemedText>
          <ThemedText type="title" accessibilityRole="header">
            {phase.best ? 'New best!' : "Time's up"}
          </ThemedText>
          <ThemedText type="subtitle">{phase.score} points</ThemedText>
          <ThemedText type="heading" color="success">
            +{phase.xp} XP
          </ThemedText>
          <View style={{ alignSelf: 'stretch', gap: Spacing.two }}>
            <Button title="Play again" onPress={() => setPhase({ name: 'playing', endsAt: Date.now() + GAME_SECONDS * 1000 })} />
            <Button title="Back" variant="secondary" onPress={() => router.back()} />
          </View>
        </View>
      )}
    </Screen>
  );
}

type Flash = { correct: boolean; picked: number } | null;

/** Wall-clock time; only called from event handlers and timers. */
const clock = () => Date.now();

function Round({ pool, endsAt, onEnd }: { pool: GameItem[]; endsAt: number; onEnd: (score: number) => void }) {
  const theme = useTheme();
  const [deck, setDeck] = useState(() => shuffle(pool));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [shownAt, setShownAt] = useState(() => Date.now());
  const [flash, setFlash] = useState<Flash>(null);
  const ended = useRef(false);
  const scoreRef = useRef(0);
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt && !ended.current) {
        ended.current = true;
        clearInterval(timer);
        onEndRef.current(scoreRef.current);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [endsAt]);

  const item = deck[index % deck.length];
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));

  const answer = (picked: number) => {
    if (flash || ended.current) return;
    const correct = item.kind === 'bug' ? picked === item.bugLine : picked === item.answer;
    const nextCombo = correct ? combo + 1 : 0;
    if (correct) {
      const gained = pointsFor(clock() - shownAt, nextCombo);
      scoreRef.current += gained;
      setScore(scoreRef.current);
    }
    setCombo(nextCombo);
    setFlash({ correct, picked });
    setTimeout(
      () => {
        setFlash(null);
        setShownAt(Date.now());
        const next = index + 1;
        // Reshuffle when the deck runs out so long games never stall.
        if (next % deck.length === 0) setDeck(shuffle(pool));
        setIndex(next);
      },
      correct ? 450 : 1400,
    );
  };

  return (
    <View style={{ gap: Spacing.three }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <ThemedText type="heading" accessibilityLabel={`${left} seconds left`}>
          ⏱️ {left}s
        </ThemedText>
        <ThemedText type="heading" accessibilityLabel={`Score ${score}, combo ${combo}`}>
          {combo > 1 ? `🔥×${Math.min(4, combo)}  ` : ''}
          {score} pts
        </ThemedText>
      </Row>
      <ProgressBar value={left / GAME_SECONDS} label={`${left} seconds left`} />

      {item.kind === 'output' ? (
        <>
          <ThemedText type="heading">What does this log?</ThemedText>
          <CodeBlock code={item.code} />
          <View style={{ gap: Spacing.two }}>
            {item.options.map((o, i) => {
              const state = !flash ? 'idle' : i === item.answer ? 'right' : i === flash.picked ? 'wrong' : 'idle';
              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={o}
                  onPress={() => answer(i)}
                  style={[
                    styles.option,
                    {
                      backgroundColor: state === 'right' ? theme.successBg : state === 'wrong' ? theme.dangerBg : theme.surface,
                      borderColor: state === 'right' ? theme.success : state === 'wrong' ? theme.danger : theme.border,
                    },
                  ]}>
                  <ThemedText type="code" style={{ flex: 1 }}>
                    {o}
                  </ThemedText>
                  {state === 'right' ? <ThemedText color="success">✓</ThemedText> : state === 'wrong' ? <ThemedText color="danger">✗</ThemedText> : null}
                </Pressable>
              );
            })}
          </View>
        </>
      ) : (
        <>
          <RichText type="heading">{item.prompt}</RichText>
          <BugLines code={item.code} bugLine={item.bugLine} flash={flash} onPick={answer} />
        </>
      )}
      {flash && !flash.correct && (
        <Card style={{ backgroundColor: theme.dangerBg, borderColor: theme.danger }}>
          <RichText type="small">{item.explanation}</RichText>
        </Card>
      )}
    </View>
  );
}

function BugLines({ code, bugLine, flash, onPick }: { code: string; bugLine: number; flash: Flash; onPick: (line: number) => void }) {
  const theme = useTheme();
  const fontSize = useSettings((s) => s.editorFontSize);
  return (
    <ScrollView horizontal style={[styles.code, { backgroundColor: theme.codeBg }]} contentContainerStyle={{ minWidth: '100%' }}>
      <View style={{ flexGrow: 1 }}>
        {code.split('\n').map((text, i) => {
          const n = i + 1;
          const tint = !flash ? 'transparent' : n === bugLine ? 'rgba(76,201,138,0.3)' : n === flash.picked ? 'rgba(240,114,114,0.35)' : 'transparent';
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`Line ${n}: ${text.trim() || 'blank'}`}
              onPress={() => onPick(n)}
              style={[styles.line, { backgroundColor: tint }]}>
              <ThemedText type="code" style={[styles.lineNo, { fontSize, lineHeight: fontSize * 1.9 }]}>
                {n}
              </ThemedText>
              <ThemedText type="code" style={{ color: theme.codeText, fontSize, lineHeight: fontSize * 1.9, flex: 1 }}>
                {text || ' '}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderRadius: Radius.md, paddingHorizontal: Spacing.three },
  code: { borderRadius: Radius.md, paddingVertical: Spacing.two },
  line: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  lineNo: { color: '#6B7085', width: 40, textAlign: 'right', paddingRight: Spacing.three },
});
