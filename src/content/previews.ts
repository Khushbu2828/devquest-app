/**
 * Live previews for build projects. Each preview is a script appended to the
 * learner's own code and run in the sandbox, so what they see is produced by
 * the functions they wrote. Scripts check `typeof fn === 'function'` so a
 * preview works from the first checkpoint on.
 */

export interface FormField {
  name: string;
  label: string;
  initial: string;
  secure?: boolean;
}

export type Preview =
  /** A small form; the script logs lines to show as the result. */
  | { kind: 'form'; title: string; fields: FormField[]; script: (values: Record<string, string>) => string }
  /** A todo list driven by the learner's reducer; renders their view as HTML. */
  | { kind: 'todo'; title: string }
  /** A fake browser for the mini App Router. */
  | { kind: 'router'; title: string; files: string[] };

const lit = (s: string) => JSON.stringify(s);

export const previews: Record<string, Preview> = {
  'js-proj-tip': {
    kind: 'form',
    title: 'Try your tip calculator',
    fields: [
      { name: 'bill', label: 'Bill', initial: '84.50' },
      { name: 'percent', label: 'Tip %', initial: '18' },
      { name: 'people', label: 'People', initial: '3' },
    ],
    script: (v) => `
const __bill = Number(${lit(v.bill)}), __pct = Number(${lit(v.percent)}), __people = Number(${lit(v.people)});
const __show = (label, fn) => { try { console.log(label + ': ' + fn()); } catch (e) { console.log(label + ' → error: ' + e.message); } };
if (typeof calculateTip === 'function') __show('Tip', () => calculateTip(__bill, __pct));
if (typeof splitBill === 'function') __show('Each person pays', () => splitBill(__bill, __pct, __people));
`,
  },
  'ts-proj-form': {
    kind: 'form',
    title: 'Try your validator on a sign-up form',
    fields: [
      { name: 'username', label: 'Username', initial: 'ada' },
      { name: 'password', label: 'Password', initial: 'short', secure: true },
    ],
    script: (v) => `
const __values = { username: ${lit(v.username)}, password: ${lit(v.password)} };
if (typeof validate === 'function') {
  const __rule = (min: number) => (typeof all === 'function' ? all(required, minLength(min)) : minLength(min));
  const __errors = validate(__values, { username: __rule(3), password: __rule(8) });
  const __keys = Object.keys(__errors);
  console.log(__keys.length ? '✗ ' + __keys.map((k) => k + ': ' + (__errors as Record<string, string>)[k]).join('  ·  ') : '✓ Form is valid');
} else if (typeof required === 'function') {
  console.log('username: ' + (required(__values.username) ?? 'ok'));
  if (typeof minLength === 'function') console.log('password (min 8): ' + (minLength(8)(__values.password) ?? 'ok'));
}
`,
  },
  'react-proj-todo': { kind: 'todo', title: 'Your todo app' },
  'next-proj-router': {
    kind: 'router',
    title: 'Your router in a browser',
    files: [
      'app/page.tsx',
      'app/about/page.tsx',
      'app/(marketing)/pricing/page.tsx',
      'app/blog/page.tsx',
      'app/blog/new/page.tsx',
      'app/blog/[slug]/page.tsx',
      'app/blog/layout.tsx',
      'app/docs/[...slug]/page.tsx',
    ],
  },
};

/** Script for the todo preview: replays the learner's actions through their reducer. */
export function todoScript(actions: unknown[]): string {
  return `
let __state = [];
const __actions = ${JSON.stringify(actions)};
if (typeof todosReducer === 'function') {
  for (const a of __actions) __state = todosReducer(__state, a);
}
console.log(JSON.stringify(__state));
if (typeof TodoView === 'function') console.log(render(<TodoView todos={__state} />));
`;
}

/** Script for the router preview: route table from fileToRoute, then the page resolveRoute picks. */
export function routerScript(files: string[], url: string): string {
  return `
const __files = ${JSON.stringify(files)};
const __out: Record<string, unknown> = {};
if (typeof fileToRoute === 'function') __out.routes = __files.map((f) => [f, fileToRoute(f)]);
if (typeof resolveRoute === 'function') __out.resolved = resolveRoute(${JSON.stringify(url)}, __files);
else if (typeof matchRoute === 'function' && typeof fileToRoute === 'function') {
  for (const f of __files) {
    const r = fileToRoute(f);
    const params = r ? matchRoute(r, ${JSON.stringify(url)}) : null;
    if (params) { __out.resolved = { file: f, params, note: 'first match (no resolveRoute yet)' }; break; }
  }
}
console.log(JSON.stringify(__out));
`;
}
