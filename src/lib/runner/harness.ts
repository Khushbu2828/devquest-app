import type { CodeTest } from '@/types/content';

/**
 * Shared test harness. This exact source runs inside whatever sandbox executes
 * learner code: Node's `vm` in the seed verifier today, the sandboxed WebView
 * in Phase 3. Keeping it as plain ES2020 source (not imported code) means the
 * assertion library lives in the same realm as the learner's values, so
 * `instanceof` and deep equality behave the same everywhere.
 */
export const EXPECT_PRELUDE = String.raw`
var __stable = function (value) {
  return JSON.stringify(value, function (_key, v) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.keys(v).sort().reduce(function (acc, k) { acc[k] = v[k]; return acc; }, {});
    }
    if (v === undefined) return '__undefined__';
    return v;
  });
};
var __show = function (v) {
  try { return typeof v === 'string' ? JSON.stringify(v) : (__stable(v) || String(v)); }
  catch (e) { return String(v); }
};
var expect = function (actual) {
  var fail = function (msg) { throw new Error(msg); };
  var matchers = {
    toBe: function (expected) {
      if (!Object.is(actual, expected)) fail('Expected ' + __show(expected) + ' but got ' + __show(actual));
    },
    toEqual: function (expected) {
      if (__stable(actual) !== __stable(expected)) fail('Expected ' + __show(expected) + ' but got ' + __show(actual));
    },
    toBeTruthy: function () { if (!actual) fail('Expected a truthy value but got ' + __show(actual)); },
    toBeFalsy: function () { if (actual) fail('Expected a falsy value but got ' + __show(actual)); },
    toContain: function (item) {
      if (!actual || typeof actual.includes !== 'function' || !actual.includes(item)) {
        fail('Expected ' + __show(actual) + ' to contain ' + __show(item));
      }
    },
    toBeGreaterThan: function (n) { if (!(actual > n)) fail('Expected ' + __show(actual) + ' to be greater than ' + n); },
    toBeInstanceOf: function (C) { if (!(actual instanceof C)) fail('Expected an instance of ' + (C && C.name)); },
    toThrow: function (message) {
      if (typeof actual !== 'function') fail('toThrow() needs a function, e.g. expect(() => fn()).toThrow()');
      var threw = false, error;
      try { actual(); } catch (e) { threw = true; error = e; }
      if (!threw) fail('Expected the function to throw');
      if (message && !(error && String(error.message).includes(message))) {
        fail('Expected error message to include ' + __show(message) + ' but got ' + __show(error && error.message));
      }
    },
  };
  var not = {};
  Object.keys(matchers).forEach(function (name) {
    not[name] = function () {
      var args = arguments, passed = true;
      try { matchers[name].apply(null, args); } catch (e) { passed = false; }
      if (passed) fail('Expected not.' + name + ' to fail');
    };
  });
  matchers.not = not;
  return matchers;
};
`;

/**
 * Builds one program: prelude, learner code, then each test wrapped in an
 * async function stored on `globalThis.__tests`. The host calls each in turn,
 * so one failing test never stops the others.
 */
export function buildTestProgram(userCode: string, tests: CodeTest[]): string {
  const wrapped = tests
    .map((t) => `  async () => {\n${t.code}\n  },`)
    .join('\n');
  return `${userCode}\n;\nglobalThis.__tests = [\n${wrapped}\n];\n`;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

/** How console.log arguments are turned into one output line, matching what output questions expect. */
export function formatLogLine(args: unknown[], inspect: (v: unknown) => string): string {
  return args.map((a) => (typeof a === 'string' ? a : inspect(a))).join(' ');
}
