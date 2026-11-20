import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import vm from 'node:vm';

import * as RealReact from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { runTestsLikeApp } from '../server/checks/sandbox';
import { compileForSandbox, syntaxError } from '../src/lib/runner/compile';
import { buildSandboxPage } from '../src/lib/runner/sandbox-page';
import { MINI_REACT } from '../src/lib/runner/mini-react';

/** The mini React used in the phone's sandbox, loaded in its own realm like on device. */
function loadMini() {
  const context = vm.createContext({});
  vm.runInContext(MINI_REACT, context);
  return (context as unknown as { React: typeof RealReact & { renderToStaticMarkup: (e: unknown) => string } }).React;
}

type R = Pick<typeof RealReact, 'createElement' | 'Fragment' | 'useState' | 'useMemo' | 'createContext' | 'useContext'>;

/** Builds the same tree with either React, so the two renders can be compared. */
function trees(R: R) {
  const Ctx = R.createContext('light');
  function Themed() {
    return R.createElement('span', { className: R.useContext(Ctx) }, 'themed');
  }
  function Counter({ start }: { start: number }) {
    const [n] = R.useState(start * 2);
    const label = R.useMemo(() => `n=${n}`, [n]);
    return R.createElement('p', null, label, ' ', n);
  }
  return [
    R.createElement('div', { className: 'card', id: 'x', 'data-id': 7, 'aria-hidden': false }, 'hi'),
    R.createElement('p', { style: { fontSize: 12, marginTop: 0, lineHeight: 1.5, color: 'red' } }, 'styled'),
    R.createElement('input', { type: 'checkbox', disabled: true, readOnly: false, value: 'a', onChange: () => {} }),
    R.createElement('abbr', { title: 'An "image" & <tag>' }, 'abbr'),
    R.createElement('p', null, `Tom & Jerry's <b>show</b> "quoted"`),
    R.createElement('ul', null, [1, 2, 3].map((i) => R.createElement('li', { key: i, className: i === 2 ? 'done' : undefined }, 'item ', i))),
    R.createElement(R.Fragment, null, R.createElement('b', null, 'a'), null, false, 0, R.createElement('i', null, 'b')),
    R.createElement(Counter, { start: 2 }),
    R.createElement(Ctx.Provider, { value: 'dark' }, R.createElement(Themed)),
    R.createElement(Themed),
    R.createElement('label', { htmlFor: 'name' }, 'Name'),
    R.createElement('section', null, R.createElement('br'), R.createElement('hr')),
  ];
}

describe('mini React (phone sandbox) matches react-dom/server', () => {
  const mini = loadMini();
  const real = trees(RealReact);
  const ours = trees(mini as unknown as R);
  real.forEach((tree, i) => {
    test(`tree ${i + 1}`, () => {
      assert.equal(mini.renderToStaticMarkup(ours[i]), renderToStaticMarkup(tree));
    });
  });

  test('setting state during render throws like React', () => {
    function Loop() {
      const [n, setN] = mini.useState(0);
      setN(n + 1);
      return mini.createElement('p', null, n);
    }
    assert.throws(() => mini.renderToStaticMarkup(mini.createElement(Loop)), /Too many re-renders/);
  });
});

describe('compiling learner code', () => {
  test('TypeScript types and JSX are compiled away', () => {
    const out = compileForSandbox('const n: number = 1;\nconst el = <p>{n}</p>;', 'tsx');
    assert.doesNotMatch(out, /: number/);
    assert.match(out, /React\.createElement/);
  });

  test('syntax errors are reported, not thrown', () => {
    assert.equal(syntaxError('const x = 1;', 'js'), null);
    assert.ok(syntaxError('const = ;', 'js'));
  });

  test('the sandbox page escapes code that contains </script>', () => {
    const page = buildSandboxPage('const s = "</script><script>alert(1)</script>";', 'js');
    assert.equal(page.match(/<\/script>/g)?.length, 1);
  });

  test('learner tests run like on the phone', async () => {
    const results = await runTestsLikeApp('function add(a: number, b: number) { return a + b; }', 'ts', [
      { name: 'adds', code: 'expect(add(1, 2)).toBe(3);' },
      { name: 'wrong', code: 'expect(add(1, 2)).toBe(4);' },
    ]);
    assert.deepEqual(results.map((r) => r.passed), [true, false]);
    assert.match(results[1].error ?? '', /Expected 4 but got 3/);
  });
});
