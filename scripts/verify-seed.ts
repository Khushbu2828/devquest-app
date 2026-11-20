/**
 * Seed content verifier: `npm run verify:seed`
 *
 * Checks every hand-written question, exercise, debug challenge and project:
 *  - structure (ids unique, units exist, answer indexes in range, line numbers valid)
 *  - "what's the output?" questions: runs the code and compares with the marked answer
 *  - exercises & projects: reference solution passes every test, starter code fails one
 *  - debug challenges: fixed code passes, buggy code fails (when tests are provided)
 *  - TypeScript: solutions type-check under `strict`; `add_types` starters must not
 *
 * The per-question checks live in `server/checks/` and also gate AI-generated questions.
 */
import { checkQuestion } from '../server/checks/question';
import { runLikeAppForLogs, runTests, runTestsLikeApp, syntaxErrors, typeErrors } from '../server/checks/sandbox';
import { previews, routerScript, todoScript } from '../src/content/previews';
import { allContent } from '../src/content';
import type { CodeLanguage, CodeTest, Question, TrackContent } from '../src/types/content';

const errors: string[] = [];
const fail = (where: string, msg: string) => errors.push(`${where}: ${msg}`);

const lineCount = (s: string) => s.split('\n').length;

async function checkSeedQuestion(q: Question, content: TrackContent) {
  for (const problem of await checkQuestion(q, content.units.find((u) => u.id === q.unitId))) fail(q.id, problem);
}

/** The phone (sucrase + mini React) must give the same pass/fail per test as Node + real React. */
async function expectSameInApp(where: string, source: string, language: CodeLanguage, tests: CodeTest[]) {
  const node = await runTests(source, language, tests);
  const app = await runTestsLikeApp(source, language, tests);
  node.forEach((r, i) => {
    if (r.passed !== app[i]?.passed) {
      fail(where, `test "${r.name}" ${r.passed ? 'passes' : 'fails'} in Node but ${app[i]?.passed ? 'passes' : 'fails'} in the app sandbox${app[i]?.error ? `: ${app[i].error}` : ''}`);
    }
  });
}

async function expectPassAll(where: string, source: string, language: CodeLanguage, tests: CodeTest[]) {
  await expectSameInApp(where, source, language, tests);
  for (const r of await runTests(source, language, tests)) {
    if (!r.passed) fail(where, `test "${r.name}" should pass but failed: ${r.error}`);
  }
}

async function expectSomeFail(where: string, source: string, language: CodeLanguage, tests: CodeTest[]) {
  await expectSameInApp(where, source, language, tests);
  const results = await runTests(source, language, tests);
  if (results.every((r) => r.passed)) fail(where, 'every test passes before the learner changes anything');
}

function expectTypeChecks(where: string, source: string, language: CodeLanguage) {
  const errs = typeErrors(source, language);
  if (errs.length) fail(where, `type errors:\n    ${errs.join('\n    ')}`);
}

async function checkTrack(content: TrackContent) {
  const t = content.track.id;
  const unitIds = new Set(content.units.map((u) => u.id));

  if (content.questions.length < 20) fail(t, `only ${content.questions.length} questions (need 20)`);
  if (content.exercises.length < 3) fail(t, 'needs 3 coding exercises');
  if (content.debugChallenges.length < 3) fail(t, 'needs 3 debug challenges');
  if (new Set(content.questions.map((q) => q.type)).size < 5) fail(t, 'questions should use at least 5 types');

  const noteTopics = new Set<string>();
  for (const n of content.notes) {
    if (n.track !== t) fail(n.topic, 'note track mismatch');
    if (noteTopics.has(n.topic)) fail(`${t}:${n.topic}`, 'two notes for the same topic');
    noteTopics.add(n.topic);
    if (!content.units.some((u) => u.topics.includes(n.topic))) fail(`${t}:${n.topic}`, 'note for a topic no unit covers');
    for (const b of n.blocks) {
      if (b.kind === 'code') {
        const errs = syntaxErrors(b.code, b.language);
        if (errs.length) fail(`${t}:${n.topic} note`, `syntax error in code block: ${errs[0]}`);
      }
    }
  }
  // Every topic a learner can get wrong needs a "Learn this" note.
  for (const u of content.units) {
    for (const topic of u.topics) if (!noteTopics.has(topic)) fail(u.id, `no note for topic "${topic}"`);
  }

  for (const q of content.questions) {
    if (q.track !== t) fail(q.id, 'track mismatch');
    await checkSeedQuestion(q, content);
  }

  for (const ex of content.exercises) {
    if (!unitIds.has(ex.unitId)) fail(ex.id, `unknown unit "${ex.unitId}"`);
    await expectPassAll(`${ex.id} solution`, ex.solution, ex.language, ex.tests);
    expectTypeChecks(`${ex.id} solution`, ex.solution, ex.language);
    if (ex.kind === 'add_types') {
      // The starter runs fine; what's missing is types, so it must fail type-checking instead.
      if (typeErrors(ex.starterCode, ex.language).length === 0) {
        fail(ex.id, 'add_types starter already type-checks, so there is nothing to fix');
      }
    } else {
      await expectSomeFail(`${ex.id} starter`, ex.starterCode, ex.language, ex.tests);
    }
  }

  for (const d of content.debugChallenges) {
    if (!unitIds.has(d.unitId)) fail(d.id, `unknown unit "${d.unitId}"`);
    if (d.bugLines.some((n) => n < 1 || n > lineCount(d.buggyCode))) fail(d.id, 'bugLines outside the code');
    if (d.buggyCode === d.fixedCode) fail(d.id, 'buggy and fixed code are identical');
    expectTypeChecks(`${d.id} fixed`, d.fixedCode, d.language);
    if (d.tests?.length) {
      await expectPassAll(`${d.id} fixed`, d.fixedCode, d.language, d.tests);
      await expectSomeFail(`${d.id} buggy`, d.buggyCode, d.language, d.tests);
    } else if (!d.errorOutput) {
      fail(d.id, 'needs tests or an errorOutput so the bug is observable');
    }
  }

  const p = content.project;
  if (p.checkpoints.length < 2) fail(p.id, 'needs at least 2 checkpoints');
  for (const cp of p.checkpoints) {
    const where = `${p.id}/${cp.id}`;
    await expectPassAll(`${where} solution`, cp.solution, p.language, cp.tests);
    await expectSomeFail(`${where} starter`, cp.starterCode, p.language, cp.tests);
    expectTypeChecks(`${where} solution`, cp.solution, p.language);
  }
}

/** Each project's live preview must work with the model solution, and fail gracefully on the first starter. */
async function checkPreview(content: TrackContent) {
  const p = content.project;
  const preview = previews[p.id];
  if (!preview) return fail(p.id, 'project has no live preview');
  const final = p.checkpoints[p.checkpoints.length - 1].solution;
  const starter = p.checkpoints[0].starterCode;
  const run = (code: string, script: string) => runLikeAppForLogs(`${code}\n;\n${script}`, p.language);

  let script: string;
  let expectOk: (logs: string[]) => string | null;
  if (preview.kind === 'form') {
    script = preview.script(Object.fromEntries(preview.fields.map((f) => [f.name, f.initial])));
    expectOk = (logs) => (logs.length && !logs.some((l) => /error/i.test(l)) ? null : `form preview logged ${JSON.stringify(logs)}`);
  } else if (preview.kind === 'todo') {
    script = todoScript([{ type: 'add', text: 'a' }, { type: 'add', text: 'b' }, { type: 'toggle', id: 1 }]);
    expectOk = (logs) => {
      const todos = JSON.parse(logs[0] ?? '[]');
      return todos.length === 2 && todos[0].done && (logs[1] ?? '').startsWith('<section>') ? null : `todo preview logged ${JSON.stringify(logs)}`;
    };
  } else {
    script = routerScript(preview.files, '/blog/hello');
    expectOk = (logs) => {
      const out = JSON.parse(logs[logs.length - 1] ?? '{}');
      return out.resolved?.file === 'app/blog/[slug]/page.tsx' ? null : `router preview logged ${JSON.stringify(logs)}`;
    };
  }
  const good = await run(final, script);
  if (good.error) fail(`${p.id} preview`, `threw with the model solution: ${good.error}`);
  else {
    const problem = expectOk(good.logs);
    if (problem) fail(`${p.id} preview`, problem);
  }
  const early = await run(starter, script);
  if (early.error) fail(`${p.id} preview`, `threw with the first starter code: ${early.error}`);
}

async function main() {
  const ids = allContent.flatMap((c) => [
    ...c.units.map((x) => x.id),
    ...c.questions.map((x) => x.id),
    ...c.exercises.map((x) => x.id),
    ...c.debugChallenges.map((x) => x.id),
    c.project.id,
  ]);
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) fail(id, 'duplicate id');
    seen.add(id);
  }

  for (const content of allContent) {
    await checkTrack(content);
    await checkPreview(content);
  }

  const totals = allContent.map(
    (c) =>
      `${c.track.id}: ${c.questions.length} questions, ${c.exercises.length} exercises, ` +
      `${c.debugChallenges.length} debug, ${c.project.checkpoints.length}-step project`,
  );
  console.log(totals.join('\n'));
  if (errors.length) {
    console.error(`\n${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }
  console.log('\nAll seed content verified.');
}

main();
