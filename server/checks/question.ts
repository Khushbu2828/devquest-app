/**
 * Checks one quiz question before a learner can see it: structure, that the quiz
 * grader accepts the marked answer (and rejects a wrong one), and that code in
 * "what does this log?" questions really logs the marked answer.
 */
import { isCorrect, type Answer } from '../../src/lib/quiz';
import type { Question, Unit } from '../../src/types/content';
import { runForOutput, syntaxErrors } from './sandbox';

const lineCount = (s: string) => s.split('\n').length;

/** The stored answer, and one wrong answer, in the shape the quiz screen produces. */
export function answersFor(q: Question): { right: Answer; wrong: Answer } {
  const n = (k: number) => Array.from({ length: k }, (_, i) => i);
  switch (q.type) {
    case 'mcq':
    case 'output':
      return { right: { type: q.type, choice: q.answer }, wrong: { type: q.type, choice: (q.answer + 1) % q.options.length } };
    case 'multi':
      return { right: { type: 'multi', choices: [...q.answers].reverse() }, wrong: { type: 'multi', choices: q.answers.slice(1) } };
    case 'true_false':
      return { right: { type: 'true_false', value: q.answer }, wrong: { type: 'true_false', value: !q.answer } };
    case 'fill_blank':
      return { right: { type: 'fill_blank', text: `  ${q.answer} ` }, wrong: { type: 'fill_blank', text: q.answer + 'x' } };
    case 'order':
      return { right: { type: 'order', placed: n(q.lines.length) }, wrong: { type: 'order', placed: n(q.lines.length).reverse() } };
    case 'match': {
      const links = Object.fromEntries(n(q.pairs.length).map((i) => [i, i]));
      const swapped = { ...links, 0: 1, 1: 0 };
      return { right: { type: 'match', links }, wrong: { type: 'match', links: swapped } };
    }
    case 'bug_find':
      return { right: { type: 'bug_find', line: q.bugLine }, wrong: { type: 'bug_find', line: q.bugLine === 1 ? 2 : 1 } };
  }
}

export async function checkQuestion(q: Question, unit: Unit | undefined): Promise<string[]> {
  const problems: string[] = [];
  const fail = (_where: string, msg: string) => problems.push(msg);
  const { right, wrong } = answersFor(q);
  if (!isCorrect(q, right)) fail(q.id, 'the quiz grader rejects the stored answer');
  if (isCorrect(q, wrong)) fail(q.id, 'the quiz grader accepts a wrong answer');

  const where = q.id;
  if (!unit) fail(where, `unknown unit "${q.unitId}"`);
  else if (!unit.topics.includes(q.topic)) fail(where, `topic "${q.topic}" is not listed on unit ${unit.id}`);
  if (!q.explanation.trim()) fail(where, 'missing explanation');
  if (q.hints.length === 0) fail(where, 'needs at least one hint');

  switch (q.type) {
    case 'mcq':
    case 'output': {
      if (q.answer < 0 || q.answer >= q.options.length) fail(where, 'answer index out of range');
      if (new Set(q.options).size !== q.options.length) fail(where, 'duplicate options');
      if (q.options.length < 3) fail(where, 'needs at least 3 options');
      if (q.type === 'output') {
        try {
          const actual = await runForOutput(q.code, q.language);
          if (actual !== q.options[q.answer]) {
            fail(where, `marked answer ${JSON.stringify(q.options[q.answer])} but code logs ${JSON.stringify(actual)}`);
          }
        } catch (e) {
          fail(where, `code threw: ${(e as Error).message}`);
        }
      }
      break;
    }
    case 'multi':
      if (q.answers.length === 0) fail(where, 'no correct answers');
      if (q.answers.some((a) => a < 0 || a >= q.options.length)) fail(where, 'answer index out of range');
      break;
    case 'fill_blank':
      if (q.code.split('___').length !== 2) fail(where, 'code must contain exactly one ___');
      break;
    case 'order':
      if (q.lines.length < 3) fail(where, 'needs at least 3 lines');
      if (new Set(q.lines).size !== q.lines.length) fail(where, 'duplicate lines make the order ambiguous');
      break;
    case 'match':
      if (q.pairs.length < 3) fail(where, 'needs at least 3 pairs');
      if (new Set(q.pairs.map((p) => p.right)).size !== q.pairs.length) fail(where, 'duplicate right-hand values');
      break;
    case 'bug_find':
      if (q.bugLine < 1 || q.bugLine > lineCount(q.code)) fail(where, 'bugLine is outside the code');
      break;
    case 'true_false':
      break;
  }

  // Code shown to the learner must at least parse (fill-in-the-blank code has a ___ hole).
  if (q.code && q.type !== 'fill_blank') {
    const errs = syntaxErrors(q.code, q.language ?? 'js');
    if (errs.length) problems.push(`code does not parse: ${errs[0]}`);
  }
  return problems;
}
