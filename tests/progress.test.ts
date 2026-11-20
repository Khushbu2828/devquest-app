import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { longestStreak, newlyUnlocked } from '../src/lib/achievements';
import { gamePool, pointsFor, xpForScore } from '../src/lib/games';
import { currentStreak } from '../src/lib/progress';
import { INTERVAL_DAYS, dueForReview, schedule } from '../src/lib/review';
import { computeStats, dayKey, mergeAttempts, mergeRewards, weekStart, xpSince } from '../src/lib/stats';
import type { Attempt, Reward } from '../src/types/progress';

const attempt = (questionId: string, correct: boolean, answeredAt: string, xp = correct ? 10 : 0): Attempt => ({
  questionId,
  track: 'js',
  topic: 'types',
  correct,
  answeredAt,
  msToAnswer: 1000,
  usedHint: false,
  xp,
});
const reward = (id: string, xp: number, at: string, kind: Reward['kind'] = 'exercise'): Reward => ({ id, kind, xp, at });
const local = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString();

describe('stats and sync merging', () => {
  test('XP and daily activity are derived from events', () => {
    const stats = computeStats([attempt('a', true, local(2026, 3, 2)), attempt('b', false, local(2026, 3, 2))], [reward('r1', 5, local(2026, 3, 3))]);
    assert.equal(stats.xp, 15);
    assert.deepEqual(stats.activity['2026-03-02'], { xp: 10, answered: 2 });
    assert.deepEqual(stats.activity['2026-03-03'], { xp: 5, answered: 0 });
  });

  test('merging is idempotent and order-independent, so XP is never double-counted', () => {
    const a = [attempt('q1', true, local(2026, 3, 1)), attempt('q2', true, local(2026, 3, 2))];
    const b = [attempt('q2', true, local(2026, 3, 2)), attempt('q3', false, local(2026, 3, 3))];
    const ab = mergeAttempts(a, b);
    assert.equal(ab.length, 3);
    assert.deepEqual(mergeAttempts(ab, b), ab);
    assert.deepEqual(mergeAttempts(b, a), ab);
    const r = mergeRewards([reward('x', 5, local(2026, 3, 1))], [reward('x', 5, local(2026, 3, 1)), reward('y', 7, local(2026, 3, 2))]);
    assert.equal(computeStats([], r).xp, 12);
  });

  test('weeks start on Monday, and weekly XP counts only this week', () => {
    assert.equal(weekStart(new Date(2026, 10, 19)), '2026-11-16'); // a Thursday
    assert.equal(weekStart(new Date(2026, 10, 16)), '2026-11-16'); // the Monday itself
    assert.equal(weekStart(new Date(2026, 10, 22)), '2026-11-16'); // Sunday belongs to the same week
    const events = [attempt('a', true, local(2026, 11, 15)), attempt('b', true, local(2026, 11, 17))];
    assert.equal(xpSince(events, [], '2026-11-16'), 10);
  });

  test('streaks count consecutive days and survive until the end of today', () => {
    const activity = Object.fromEntries(['2026-11-17', '2026-11-18', '2026-11-19'].map((d) => [d, { xp: 10, answered: 1 }]));
    assert.equal(currentStreak(activity, new Date(2026, 10, 19, 20)), 3);
    assert.equal(currentStreak(activity, new Date(2026, 10, 20, 9)), 3); // nothing yet today: still alive
    assert.equal(currentStreak(activity, new Date(2026, 10, 21, 9)), 0);
    assert.equal(dayKey(new Date(2026, 0, 5)), '2026-01-05');
  });
});

describe('spaced repetition', () => {
  test('a miss comes back after a day; each right answer in a row lengthens the gap', () => {
    const t0 = local(2026, 3, 1);
    const [wrong] = schedule([attempt('q', false, t0)]);
    assert.equal(wrong.streak, 0);
    assert.equal(wrong.dueAt - new Date(t0).getTime(), INTERVAL_DAYS[0] * 86_400_000);
    const [twice] = schedule([attempt('q', false, t0), attempt('q', true, local(2026, 3, 2)), attempt('q', true, local(2026, 3, 3))]);
    assert.equal(twice.streak, 2);
    assert.equal(twice.dueAt - new Date(local(2026, 3, 3)).getTime(), INTERVAL_DAYS[2] * 86_400_000);
  });

  test('only due, known questions are offered, most overdue first', () => {
    const events = [attempt('old', false, local(2026, 1, 1)), attempt('newer', false, local(2026, 1, 5)), attempt('gone', false, local(2026, 1, 1))];
    const due = dueForReview(events, (id) => id !== 'gone', new Date(2026, 1, 1).getTime());
    assert.deepEqual(due, ['old', 'newer']);
  });
});

describe('achievements', () => {
  test('longest streak finds the best run of days', () => {
    const days = [local(2026, 3, 1), local(2026, 3, 2), local(2026, 3, 4), local(2026, 3, 5), local(2026, 3, 6)];
    assert.equal(longestStreak(days.map((d, i) => attempt(`q${i}`, true, d)), []), 3);
  });

  test('an achievement unlocks once', () => {
    const attempts = [attempt('q1', true, local(2026, 3, 1))];
    const first = newlyUnlocked({ attempts, rewards: [] });
    assert.ok(first.some((a) => a.id === 'first-answer'));
    const awarded = first.map((a) => reward(`achievement-${a.id}`, a.xp, local(2026, 3, 1), 'achievement'));
    assert.equal(newlyUnlocked({ attempts, rewards: awarded }).length, 0);
  });
});

describe('games', () => {
  test('faster answers and longer combos score more, capped at ×4', () => {
    assert.equal(pointsFor(0, 1), 20);
    assert.ok(pointsFor(1000, 1) > pointsFor(8000, 1));
    assert.equal(pointsFor(0, 9), pointsFor(0, 4));
    assert.equal(xpForScore(1000), 40);
  });

  test('both games have rounds for every track', () => {
    for (const game of ['bug-hunter', 'output-rush'] as const) {
      for (const track of ['js', 'ts', 'react', 'nextjs'] as const) {
        assert.ok(gamePool(game, track).length > 0, `${game} / ${track}`);
      }
    }
  });
});
