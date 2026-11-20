import { EXPECT_PRELUDE, buildTestProgram, type TestResult } from '@/lib/runner/harness';
import { MINI_REACT } from '@/lib/runner/mini-react';
import { compileForSandbox } from '@/lib/runner/compile';
import type { CodeLanguage, CodeTest } from '@/types/content';

export interface RunResult {
  /** console.log lines, one per call. */
  logs: string[];
  /** One per test; empty when the code was only run. */
  results: TestResult[];
  /** Compile error, an uncaught exception, or a timeout. */
  error?: string;
}

/** Per-test time limit inside the sandbox. The host also kills the whole page after HOST_TIMEOUT_MS. */
const TEST_TIMEOUT_MS = 1500;
export const HOST_TIMEOUT_MS = 6000;

/**
 * Runner script for the sandbox page. It runs the program once on load, then
 * each test, and posts { logs, results, error } back to the app. Works in a
 * React Native WebView (ReactNativeWebView.postMessage) and in a browser
 * iframe (parent.postMessage).
 */
const RUNNER = String.raw`
(function () {
  var logs = [];
  var fmt = function (v) {
    if (typeof v === 'string') return v;
    try { return v === undefined ? 'undefined' : typeof v === 'function' ? '[Function]' : JSON.stringify(v); } catch (e) { return String(v); }
  };
  var push = function () { logs.push(Array.prototype.map.call(arguments, fmt).join(' ')); };
  console.log = push; console.info = push; console.warn = push; console.error = push;

  var post = function (data) {
    var text = JSON.stringify(data);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(text);
    else window.parent.postMessage(text, '*');
  };
  var errorText = function (e) { return (e && e.name && e.name !== 'Error' ? e.name + ': ' : '') + (e && e.message ? e.message : String(e)); };

  var job = window.__job;
  if (job.compileError) return post({ logs: [], results: [], error: job.compileError });

  var modules = { react: React, 'react/jsx-runtime': React };
  var req = function (id) {
    if (modules[id]) return modules[id];
    throw new Error('Module "' + id + '" is not available here');
  };
  var module = { exports: {} };
  try {
    new Function('require', 'module', 'exports', job.code)(req, module, module.exports);
  } catch (e) {
    var names = job.testNames.map(function (n) { return { name: n, passed: false, error: 'Program error: ' + errorText(e) }; });
    return post({ logs: logs, results: names, error: errorText(e) });
  }

  var tests = window.__tests || [];
  var results = [];
  var i = 0;
  var next = function () {
    if (i >= job.testNames.length) {
      // Let pending timers and promises log before reporting.
      return setTimeout(function () { post({ logs: logs, results: results }); }, 30);
    }
    var name = job.testNames[i], fn = tests[i];
    i++;
    var done = false;
    var finish = function (passed, error) {
      if (done) return;
      done = true;
      results.push(passed ? { name: name, passed: true } : { name: name, passed: false, error: error });
      next();
    };
    var timer = setTimeout(function () { finish(false, 'Timed out'); }, ${TEST_TIMEOUT_MS});
    try {
      Promise.resolve(fn()).then(
        function () { clearTimeout(timer); finish(true); },
        function (e) { clearTimeout(timer); finish(false, errorText(e)); }
      );
    } catch (e) { clearTimeout(timer); finish(false, errorText(e)); }
  };
  next();
})();
`;

/** JSON that is safe to embed inside a <script> tag. */
const json = (v: unknown) =>
  JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

/**
 * Builds the complete sandbox page for one run. A fresh page per run means no
 * state leaks between runs, and an infinite loop is ended by discarding it.
 * The CSP blocks all network access from learner code.
 */
export function buildSandboxPage(source: string, language: CodeLanguage, tests: CodeTest[] = []): string {
  let code = '';
  let compileError: string | undefined;
  try {
    code = compileForSandbox(buildTestProgram(source, tests), language);
  } catch (e) {
    compileError = `Syntax error: ${e instanceof Error ? e.message : String(e)}`;
  }
  const job = { code, compileError, testNames: tests.map((t) => t.name) };
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'">
</head><body><script>
${EXPECT_PRELUDE}
${MINI_REACT}
window.__job = ${json(job)};
${RUNNER}
</script></body></html>`;
}
