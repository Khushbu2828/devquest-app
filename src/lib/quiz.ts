import type { Question } from '@/types/content';
import type { Attempt } from '@/types/progress';

/**
 * Quiz engine: choosing questions, shuffling what the learner sees, and marking
 * answers. Pure functions, so they work the same for seed and AI questions.
 */

/** What the learner has entered so far, one shape per question type. */
export type Answer =
  | { type: 'mcq' | 'output'; choice: number | null }
  | { type: 'multi'; choices: number[] }
  | { type: 'true_false'; value: boolean | null }
  | { type: 'fill_blank'; text: string }
  /** Indexes into `question.lines`, in the order the learner placed them. */
  | { type: 'order'; placed: number[] }
  /** Left index → right index (both index `question.pairs`). */
  | { type: 'match'; links: Record<number, number> }
  | { type: 'bug_find'; line: number | null };

export function emptyAnswer(q: Question): Answer {
  switch (q.type) {
    case 'mcq':
    case 'output':
      return { type: q.type, choice: null };
    case 'multi':
      return { type: 'multi', choices: [] };
    case 'true_false':
      return { type: 'true_false', value: null };
    case 'fill_blank':
      return { type: 'fill_blank', text: '' };
    case 'order':
      return { type: 'order', placed: [] };
    case 'match':
      return { type: 'match', links: {} };
    case 'bug_find':
      return { type: 'bug_find', line: null };
  }
}

/** True once the learner has given a full answer and "Check" can be pressed. */
export function isComplete(q: Question, a: Answer): boolean {
  switch (a.type) {
    case 'mcq':
    case 'output':
      return a.choice !== null;
    case 'multi':
      return a.choices.length > 0;
    case 'true_false':
      return a.value !== null;
    case 'fill_blank':
      return a.text.trim().length > 0;
    case 'order':
      return q.type === 'order' && a.placed.length === q.lines.length;
    case 'match':
      return q.type === 'match' && Object.keys(a.links).length === q.pairs.length;
    case 'bug_find':
      return a.line !== null;
  }
}

const normalize = (s: string) => s.trim().replace(/;$/, '').replace(/\s+/g, ' ');

export function isCorrect(q: Question, a: Answer): boolean {
  switch (q.type) {
    case 'mcq':
    case 'output':
      return (a.type === 'mcq' || a.type === 'output') && a.choice === q.answer;
    case 'multi': {
      if (a.type !== 'multi') return false;
      const want = [...q.answers].sort();
      const got = [...a.choices].sort();
      return want.length === got.length && want.every((v, i) => v === got[i]);
    }
    case 'true_false':
      return a.type === 'true_false' && a.value === q.answer;
    case 'fill_blank': {
      if (a.type !== 'fill_blank') return false;
      const accepted = [q.answer, ...(q.accept ?? [])].map(normalize);
      return accepted.includes(normalize(a.text));
    }
    case 'order':
      // Compare text, so two identical lines (e.g. two closing braces) are interchangeable.
      return a.type === 'order' && a.placed.length === q.lines.length && a.placed.every((li, i) => q.lines[li] === q.lines[i]);
    case 'match':
      return a.type === 'match' && q.pairs.every((p, i) => q.pairs[a.links[i]]?.right === p.right);
    case 'bug_find':
      return a.type === 'bug_find' && a.line === q.bugLine;
  }
}

// ------------------------------------------------------------------ shuffling

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Shuffles indexes 0..n-1, retrying so the result is not already in order. */
function scrambled(n: number) {
  if (n < 2) return range(n);
  for (let tries = 0; tries < 10; tries++) {
    const s = shuffle(range(n));
    if (s.some((v, i) => v !== i)) return s;
  }
  return range(n).reverse();
}

/**
 * The order things are displayed in, fixed for the life of one quiz question:
 * options for choice questions, the line bank for `order`, the right column for `match`.
 * Answers always store original indexes, so shuffling never affects marking.
 */
export function displayOrder(q: Question): number[] {
  switch (q.type) {
    case 'mcq':
    case 'multi':
    case 'output':
      return shuffle(range(q.options.length));
    case 'order':
      return scrambled(q.lines.length);
    case 'match':
      return scrambled(q.pairs.length);
    default:
      return [];
  }
}

// ------------------------------------------------------------------ selection

export const QUIZ_SIZE = 8;

/**
 * Picks the questions for one quiz. Order of preference: never seen, last
 * answered wrong, then the ones answered right longest ago. Ties are random so
 * repeat quizzes feel different.
 */
export function pickQuestions(pool: Question[], attempts: Attempt[], size = QUIZ_SIZE): Question[] {
  const last = lastAttempts(attempts);
  const rank = (q: Question) => {
    const a = last.get(q.id);
    if (!a) return 0;
    return a.correct ? 2 : 1;
  };
  const seenAt = (q: Question) => last.get(q.id)?.answeredAt ?? '';
  return shuffle(pool)
    .sort((a, b) => rank(a) - rank(b) || (rank(a) === 2 ? seenAt(a).localeCompare(seenAt(b)) : 0))
    .slice(0, size);
}

/** Most recent attempt per question id. */
export function lastAttempts(attempts: Attempt[]): Map<string, Attempt> {
  const map = new Map<string, Attempt>();
  for (const a of attempts) map.set(a.questionId, a);
  return map;
}

// ------------------------------------------------------------------ XP

/** XP for one answer: harder questions pay more; a hint halves it. */
export function xpForAnswer(q: Question, correct: boolean, usedHint: boolean): number {
  if (!correct) return 0;
  const base = 10 + (q.difficulty - 1) * 2;
  return usedHint ? Math.ceil(base / 2) : base;
}

export const QUIZ_COMPLETE_BONUS = 10;
export const PERFECT_QUIZ_BONUS = 15;
