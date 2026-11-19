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
 * The same checks will gate AI-generated questions in Phase 6.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import util from 'node:util';
import vm from 'node:vm';

import ts from 'typescript';

import { allContent } from '../src/content';
import { EXPECT_PRELUDE, buildTestProgram, formatLogLine, type TestResult } from '../src/lib/runner/harness';
import type { CodeLanguage, CodeTest, Question, TrackContent } from '../src/types/content';

const ROOT = path.resolve(__dirname, '..');
const requireFromRoot = createRequire(path.join(ROOT, 'package.json'));
const ALLOWED_MODULES = new Set(['react', 'react/jsx-runtime', 'react-dom/server']);

const errors: string[] = [];
const fail = (where: string, msg: string) => errors.push(`${where}: ${msg}`);

// ------------------------------------------------------------------ sandbox

function transpile(source: string, language: CodeLanguage): string {
  if (language === 'js') return source;
  return ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: `snippet.${language}`,
  }).outputText;
}

function createSandbox(logs: string[]) {
  const reactServer = requireFromRoot('react-dom/server') as typeof import('react-dom/server');
  const context = vm.createContext({
    console: {
      log: (...args: unknown[]) => logs.push(formatLogLine(args, (v) => util.inspect(v))),
      error: () => {},
      warn: () => {},
    },
    setTimeout,
    clearTimeout,
    Response,
    Request,
    Headers,
    URL,
    structuredClone,
    exports: {},
    module: { exports: {} },
    require: (id: string) => {
      if (!ALLOWED_MODULES.has(id)) throw new Error(`Module "${id}" is not available in the sandbox`);
      return requireFromRoot(id);
    },
    render: (element: unknown) => reactServer.renderToStaticMarkup(element as never),
  });
  return context;
}

const settle = () => new Promise((r) => setTimeout(r, 30));

async function runForOutput(source: string, language: CodeLanguage): Promise<string> {
  const logs: string[] = [];
  const context = createSandbox(logs);
  vm.runInContext(transpile(source, language), context, { timeout: 1000 });
  await settle();
  return logs.join('\n');
}

async function runTests(source: string, language: CodeLanguage, tests: CodeTest[]): Promise<TestResult[]> {
  const context = createSandbox([]);
  vm.runInContext(EXPECT_PRELUDE, context);
  try {
    vm.runInContext(transpile(buildTestProgram(source, tests), language), context, { timeout: 1000 });
  } catch (e) {
    return tests.map((t) => ({ name: t.name, passed: false, error: `Program error: ${(e as Error).message}` }));
  }
  const fns = (context as { __tests: (() => Promise<void>)[] }).__tests;
  const results: TestResult[] = [];
  for (let i = 0; i < tests.length; i++) {
    try {
      await Promise.race([
        fns[i](),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out')), 1000)),
      ]);
      results.push({ name: tests[i].name, passed: true });
    } catch (e) {
      results.push({ name: tests[i].name, passed: false, error: (e as Error).message });
    }
  }
  return results;
}

// ------------------------------------------------------------------ type-check

function typeErrors(source: string, language: CodeLanguage): string[] {
  if (language !== 'ts' && language !== 'tsx') return [];
  const fileName = path.join(ROOT, `__verify__.${language}`);
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    types: [],
    skipLibCheck: true,
    // Snippets are standalone scripts; treat them as modules so names don't clash with lib globals.
    moduleDetection: ts.ModuleDetectionKind.Force,
  };
  const host = ts.createCompilerHost(options);
  const original = { getSourceFile: host.getSourceFile, fileExists: host.fileExists, readFile: host.readFile };
  host.getSourceFile = (name, lang, ...rest) =>
    path.resolve(name) === fileName
      ? ts.createSourceFile(name, source, lang)
      : original.getSourceFile(name, lang, ...rest);
  host.fileExists = (name) => path.resolve(name) === fileName || original.fileExists(name);
  host.readFile = (name) => (path.resolve(name) === fileName ? source : original.readFile(name));
  const program = ts.createProgram([fileName], options, host);
  return ts
    .getPreEmitDiagnostics(program)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
}

function syntaxErrors(source: string, language: CodeLanguage): string[] {
  const out = ts.transpileModule(source, {
    reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, allowJs: true },
    fileName: `snippet.${language === 'js' ? 'jsx' : language}`,
  });
  return (out.diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
}

// ------------------------------------------------------------------ checks

const lineCount = (s: string) => s.split('\n').length;

async function checkQuestion(q: Question, content: TrackContent) {
  const where = q.id;
  const unit = content.units.find((u) => u.id === q.unitId);
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
}

async function expectPassAll(where: string, source: string, language: CodeLanguage, tests: CodeTest[]) {
  for (const r of await runTests(source, language, tests)) {
    if (!r.passed) fail(where, `test "${r.name}" should pass but failed: ${r.error}`);
  }
}

async function expectSomeFail(where: string, source: string, language: CodeLanguage, tests: CodeTest[]) {
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

  for (const l of content.lessons) {
    if (!unitIds.has(l.unitId)) fail(l.id, `unknown unit "${l.unitId}"`);
    for (const b of l.blocks) {
      if (b.kind === 'code') {
        const errs = syntaxErrors(b.code, b.language);
        if (errs.length) fail(l.id, `syntax error in code block: ${errs[0]}`);
      }
    }
  }
  for (const u of content.units) {
    if (!content.lessons.some((l) => l.unitId === u.id)) fail(u.id, 'unit has no lessons');
  }

  for (const q of content.questions) {
    if (q.track !== t) fail(q.id, 'track mismatch');
    await checkQuestion(q, content);
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

async function main() {
  const ids = allContent.flatMap((c) => [
    ...c.units.map((x) => x.id),
    ...c.lessons.map((x) => x.id),
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

  for (const content of allContent) await checkTrack(content);

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
