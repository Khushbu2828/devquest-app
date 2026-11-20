/**
 * Runs and type-checks learner-facing code snippets in Node. Used by the seed
 * verifier and by the AI question server, so both apply exactly the same checks.
 * Node only: never import this from the app.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import util from 'node:util';
import vm from 'node:vm';

import ts from 'typescript';

import { EXPECT_PRELUDE, buildTestProgram, formatLogLine, type TestResult } from '../../src/lib/runner/harness';
import type { CodeLanguage, CodeTest } from '../../src/types/content';

const ROOT = path.resolve(__dirname, '..', '..');
const requireFromRoot = createRequire(path.join(ROOT, 'package.json'));
const ALLOWED_MODULES = new Set(['react', 'react/jsx-runtime', 'react-dom/server']);

// ------------------------------------------------------------------ sandbox

export function transpile(source: string, language: CodeLanguage): string {
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

export function createSandbox(logs: string[]) {
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

export async function runForOutput(source: string, language: CodeLanguage): Promise<string> {
  const logs: string[] = [];
  const context = createSandbox(logs);
  vm.runInContext(transpile(source, language), context, { timeout: 1000 });
  await settle();
  return logs.join('\n');
}

export async function runTests(source: string, language: CodeLanguage, tests: CodeTest[]): Promise<TestResult[]> {
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

export function typeErrors(source: string, language: CodeLanguage): string[] {
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

export function syntaxErrors(source: string, language: CodeLanguage): string[] {
  const out = ts.transpileModule(source, {
    reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, allowJs: true },
    fileName: `snippet.${language === 'js' ? 'jsx' : language}`,
  });
  return (out.diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
}

// ------------------------------------------------------------------ the app's pipeline

/**
 * Runs tests exactly the way the phone does: sucrase instead of the TypeScript
 * compiler, and the mini React instead of react-dom/server. The verifier
 * compares this with `runTests` so the two can never silently disagree.
 */
export async function runTestsLikeApp(source: string, language: CodeLanguage, tests: CodeTest[]): Promise<TestResult[]> {
  const { compileForSandbox } = await import('../../src/lib/runner/compile');
  const { MINI_REACT } = await import('../../src/lib/runner/mini-react');
  const context = vm.createContext({ console: { log: () => {}, error: () => {}, warn: () => {} }, setTimeout, clearTimeout, Response, Request, Headers, URL, structuredClone });
  vm.runInContext(EXPECT_PRELUDE + MINI_REACT, context);
  let compiled: string;
  try {
    compiled = compileForSandbox(buildTestProgram(source, tests), language);
  } catch (e) {
    return tests.map((t) => ({ name: t.name, passed: false, error: `Syntax error: ${(e as Error).message}` }));
  }
  const ctx = context as unknown as { React: unknown; __tests: (() => Promise<void>)[] };
  const req = (id: string) => {
    if (id === 'react' || id === 'react/jsx-runtime') return ctx.React;
    throw new Error(`Module "${id}" is not available here`);
  };
  try {
    const fn = vm.runInContext(`(function (require, module, exports) {\n${compiled}\n})`, context, { timeout: 1000 });
    const mod = { exports: {} };
    fn(req, mod, mod.exports);
  } catch (e) {
    return tests.map((t) => ({ name: t.name, passed: false, error: `Program error: ${(e as Error).message}` }));
  }
  const results: TestResult[] = [];
  for (let i = 0; i < tests.length; i++) {
    try {
      await Promise.race([ctx.__tests[i](), new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out')), 1000))]);
      results.push({ name: tests[i].name, passed: true });
    } catch (e) {
      results.push({ name: tests[i].name, passed: false, error: (e as Error).message });
    }
  }
  return results;
}

/** Runs a program the way the phone does and returns what it logged (used to check project previews). */
export async function runLikeAppForLogs(source: string, language: CodeLanguage): Promise<{ logs: string[]; error?: string }> {
  const { compileForSandbox } = await import('../../src/lib/runner/compile');
  const { MINI_REACT } = await import('../../src/lib/runner/mini-react');
  const logs: string[] = [];
  const fmt = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v));
  const context = vm.createContext({ console: { log: (...a: unknown[]) => logs.push(a.map(fmt).join(' ')) }, setTimeout, clearTimeout, URL, structuredClone });
  vm.runInContext(MINI_REACT, context);
  const ctx = context as unknown as { React: unknown };
  try {
    const compiled = compileForSandbox(source, language);
    const fn = vm.runInContext(`(function (require, module, exports) {\n${compiled}\n})`, context, { timeout: 1000 });
    fn((id: string) => (id === 'react' ? ctx.React : undefined), { exports: {} }, {});
    return { logs };
  } catch (e) {
    return { logs, error: (e as Error).message };
  }
}
