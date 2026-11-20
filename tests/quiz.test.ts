import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { allQuestions } from '../src/content';
import { displayOrder, emptyAnswer, isComplete, isCorrect, pickQuestions, xpForAnswer } from '../src/lib/quiz';
import type { Question } from '../src/types/content';
import type { Attempt } from '../src/types/progress';

const q = (type: Question['type']) => allQuestions().find((x) => x.type === type)!;
const attempt = (questionId: string, correct: boolean, answeredAt: string): Attempt => ({
  questionId,
  track: 'js',
  topic: 't',
  correct,
  answeredAt,
  msToAnswer: 1000,
  usedHint: false,
  xp: correct ? 10 : 0,
});

describe('grading', () => {
  test('fill in the blank ignores surrounding space and a trailing semicolon', () => {
    const fb = q('fill_blank');
    assert.ok(fb.type === 'fill_blank');
    assert.equal(isCorrect(fb, { type: 'fill_blank', text: `  ${fb.answer};  ` }), true);
    assert.equal(isCorrect(fb, { type: 'fill_blank', text: fb.answer.toUpperCase() + 'X' }), false);
  });

  test('multi select needs exactly the right set, in any order', () => {
    const m = q('multi');
    assert.ok(m.type === 'multi');
    assert.equal(isCorrect(m, { type: 'multi', choices: [...m.answers].reverse() }), true);
    assert.equal(isCorrect(m, { type: 'multi', choices: m.answers.slice(1) }), false);
  });

  test('an empty answer is never complete', () => {
    for (const type of ['mcq', 'multi', 'true_false', 'output', 'fill_blank', 'order', 'match', 'bug_find'] as const) {
      const question = q(type);
      assert.equal(isComplete(question, emptyAnswer(question)), false, type);
    }
  });

  test('order and match questions are always shown shuffled', () => {
    for (const question of allQuestions().filter((x) => x.type === 'order' || x.type === 'match')) {
      const order = displayOrder(question);
      assert.notDeepEqual(order, [...order].sort((a, b) => a - b), question.id);
    }
  });
});

describe('question selection', () => {
  test('unseen first, then last answered wrong, then right', () => {
    const pool = allQuestions().slice(0, 3);
    const attempts = [attempt(pool[0].id, true, '2026-01-01T00:00:00Z'), attempt(pool[1].id, false, '2026-01-02T00:00:00Z')];
    const picked = pickQuestions(pool, attempts, 3).map((x) => x.id);
    assert.deepEqual(picked, [pool[2].id, pool[1].id, pool[0].id]);
  });

  test('a hint halves XP; a wrong answer earns none', () => {
    const question = q('mcq');
    const full = xpForAnswer(question, true, false);
    assert.equal(xpForAnswer(question, true, true), Math.ceil(full / 2));
    assert.equal(xpForAnswer(question, false, false), 0);
  });
});
