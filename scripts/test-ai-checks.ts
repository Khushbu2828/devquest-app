/**
 * Offline test of the AI question pipeline: `npm run test:ai-checks`
 *
 * Feeds questions shaped exactly like Claude's structured output through the
 * same conversion and checks the server uses, without calling the API. Good
 * questions must be accepted; each broken one must be rejected for its reason.
 */
import { acceptGenerated } from '../server/generate';
import { generatedQuiz, type GeneratedQuestion } from '../server/schema';
import { getUnit } from '../src/content';

const base = { difficulty: 2, explanation: 'Because.', hints: ['Think about it.'], tags: [] as string[] };

const good: GeneratedQuestion[] = [
  { ...base, type: 'output', topic: 'coercion', prompt: 'What does this log?', code: "console.log('3' * '4');", language: 'js', options: ['12', '34', 'NaN'], answer: 0 },
  { ...base, type: 'mcq', topic: 'types', prompt: 'What does `typeof []` return?', options: ['"array"', '"object"', '"list"'], answer: 1, code: null, language: null },
  { ...base, type: 'true_false', topic: 'variables', prompt: '`const` arrays can still be pushed to.', answer: true },
  { ...base, type: 'fill_blank', topic: 'equality', prompt: 'Use strict equality.', code: 'if (a ___ b) {}', language: 'js', answer: '===', accept: [] },
  { ...base, type: 'bug_find', topic: 'equality', prompt: 'Tap the buggy line.', code: 'function isZero(n) {\n  if (n = 0) return true;\n  return false;\n}', language: 'js', bugLine: 2 },
];

const bad: { q: GeneratedQuestion; reason: RegExp }[] = [
  { reason: /code logs/, q: { ...base, type: 'output', topic: 'coercion', prompt: 'What does this log? (wrong answer marked)', code: "console.log('5' + 1);", language: 'js', options: ['6', '51', 'NaN'], answer: 0 } },
  { reason: /out of range/, q: { ...base, type: 'mcq', topic: 'types', prompt: 'Answer index too big', options: ['a', 'b', 'c'], answer: 7, code: null, language: null } },
  { reason: /not listed on unit/, q: { ...base, type: 'true_false', topic: 'closures', prompt: 'Topic from another unit', answer: true } },
  { reason: /exactly one ___/, q: { ...base, type: 'fill_blank', topic: 'variables', prompt: 'No blank', code: 'let x = 1;', language: 'js', answer: 'let', accept: [] } },
  { reason: /bugLine/, q: { ...base, type: 'bug_find', topic: 'equality', prompt: 'Bug line past the end', code: 'a == b;', language: 'js', bugLine: 5 } },
  { reason: /does not parse/, q: { ...base, type: 'mcq', topic: 'types', prompt: 'Broken code', options: ['a', 'b', 'c'], answer: 0, code: 'const = ;', language: 'js' } },
];

async function main() {
  const unit = getUnit('js-basics')!;
  // The fixtures must also be valid against the schema Claude is held to.
  generatedQuiz.parse({ questions: [...good, ...bad.map((b) => b.q)] });

  const failures: string[] = [];
  const ok = await acceptGenerated(good, unit);
  if (ok.accepted.length !== good.length) {
    failures.push(`expected ${good.length} accepted, got ${ok.accepted.length}: ${JSON.stringify(ok.rejected)}`);
  }
  for (const q of ok.accepted) {
    if (q.source !== 'ai' || !q.id.startsWith('ai-') || q.unitId !== unit.id) failures.push(`bad metadata on ${q.id}`);
  }

  for (const { q, reason } of bad) {
    const r = await acceptGenerated([q], unit);
    const problems = r.rejected[0]?.problems.join('; ') ?? '';
    if (r.accepted.length || !reason.test(problems)) {
      failures.push(`"${q.prompt}" should be rejected for ${reason} but got: ${problems || 'accepted'}`);
    }
  }

  const dupes = await acceptGenerated([good[0], good[0]], unit);
  if (dupes.accepted.length !== 1) failures.push('duplicate questions in one response were not collapsed');

  if (failures.length) {
    console.error(failures.map((f) => `✗ ${f}`).join('\n'));
    process.exit(1);
  }
  console.log(`✓ ${good.length} good questions accepted, ${bad.length} broken ones rejected for the right reason.`);
}

main();
