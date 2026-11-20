import { allDebugChallenges, allQuestions } from '@/content';
import { shuffle } from '@/lib/quiz';
import type { CodeLanguage, TrackId } from '@/types/content';
import type { Reward } from '@/types/progress';

export type GameId = 'bug-hunter' | 'output-rush';

export interface Game {
  id: GameId;
  title: string;
  icon: string;
  tagline: string;
  rules: string;
}

export const games: Game[] = [
  {
    id: 'bug-hunter',
    title: 'Bug Hunter',
    icon: '🐞',
    tagline: 'Spot the buggy line before the clock runs out.',
    rules: 'You have 60 seconds. Tap the line with the bug. Each right answer in a row raises your combo; a wrong tap resets it.',
  },
  {
    id: 'output-rush',
    title: 'Output Rush',
    icon: '⚡',
    tagline: 'Predict what the code logs, fast.',
    rules: 'You have 60 seconds. Pick what each snippet prints. Answer quickly for a speed bonus; streaks multiply your points.',
  },
];

export const GAME_SECONDS = 60;

/** One round in a game: either tap the bug line, or pick the printed output. */
export type GameItem =
  | { kind: 'bug'; id: string; track: TrackId; code: string; language: CodeLanguage; bugLine: number; prompt: string; explanation: string }
  | { kind: 'output'; id: string; track: TrackId; code: string; options: string[]; answer: number; explanation: string };

/** Every playable item for a game, optionally limited to one track. */
export function gamePool(game: GameId, track: TrackId | 'all'): GameItem[] {
  const inTrack = (t: TrackId) => track === 'all' || t === track;
  if (game === 'output-rush') {
    return allQuestions()
      .filter((q) => q.type === 'output' && inTrack(q.track))
      .map((q) =>
        q.type === 'output'
          ? { kind: 'output' as const, id: q.id, track: q.track, code: q.code, options: q.options, answer: q.answer, explanation: q.explanation }
          : null,
      )
      .filter((x): x is Extract<GameItem, { kind: 'output' }> => x !== null);
  }
  const fromQuestions: GameItem[] = allQuestions().flatMap((q) =>
    q.type === 'bug_find' && inTrack(q.track)
      ? [{ kind: 'bug' as const, id: q.id, track: q.track, code: q.code, language: q.language ?? 'js', bugLine: q.bugLine, prompt: q.prompt, explanation: q.explanation }]
      : [],
  );
  // Debug challenges with exactly one bug line work as Bug Hunter rounds too.
  const fromChallenges: GameItem[] = allDebugChallenges
    .filter((d) => d.bugLines.length === 1 && inTrack(d.track))
    .map((d) => ({
      kind: 'bug' as const,
      id: d.id,
      track: d.track,
      code: d.buggyCode,
      language: d.language,
      bugLine: d.bugLines[0],
      prompt: `${d.title}: tap the buggy line.`,
      explanation: d.explanation,
    }));
  return [...fromQuestions, ...fromChallenges];
}

/** Points for one right answer: base 10, up to +10 for speed, times the combo (max ×4). */
export function pointsFor(msTaken: number, combo: number): number {
  const speed = Math.max(0, Math.round(10 - msTaken / 1000));
  return (10 + speed) * Math.min(4, Math.max(1, combo));
}

/** XP for a finished game: a tenth of the score, capped so games don't outpace learning. */
export function xpForScore(score: number): number {
  return Math.min(40, Math.floor(score / 10));
}

export function bestScore(rewards: Reward[], game: GameId): number {
  return rewards.filter((r) => r.kind === 'game' && r.ref === game).reduce((best, r) => Math.max(best, r.score ?? 0), 0);
}

export { shuffle };
