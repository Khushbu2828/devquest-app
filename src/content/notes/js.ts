import { code, notesFor } from '@/content/helpers';

/** One short note per JavaScript topic, shown after a wrong quiz answer. */
export const jsNotes = notesFor('js', [
  {
    topic: 'variables',
    title: 'let, const and var',
    blocks: [
      {
        kind: 'text',
        text: 'Use `const` by default and `let` when a variable must be reassigned. `const` stops reassignment, not mutation: a `const` array can still be pushed to.',
      },
      {
        kind: 'code',
        language: 'js',
        code: code`
          const name = 'Ada';
          let score = 0;
          score += 10;        // fine: let can be reassigned

          const list = [1];
          list.push(2);       // fine: the array changes, the binding does not
        `,
      },
      { kind: 'tip', text: 'Avoid `var`. It is function-scoped, so it leaks out of `if` and `for` blocks.' },
    ],
  },
  {
    topic: 'types',
    title: 'The seven primitives',
    blocks: [
      {
        kind: 'text',
        text: 'The primitives are string, number, bigint, boolean, undefined, null and symbol. Everything else (arrays, functions, dates) is an object.',
      },
      {
        kind: 'code',
        language: 'js',
        code: code`
          typeof 'hi';        // "string"
          typeof 42;          // "number"
          typeof undefined;   // "undefined"
          typeof null;        // "object"  (a historic bug)
          typeof [];          // "object"
          0.1 + 0.2;          // 0.30000000000000004
        `,
      },
      {
        kind: 'tip',
        text: 'Check for null with `value === null` and for arrays with `Array.isArray(value)`. Compare decimals with a tolerance, not `===`.',
      },
    ],
  },
  {
    topic: 'coercion',
    title: 'Type coercion and truthiness',
    blocks: [
      {
        kind: 'text',
        text: 'JavaScript converts types automatically in some operations. `+` joins strings if either side is a string; `-`, `*` and `/` always convert to numbers.',
      },
      {
        kind: 'code',
        language: 'js',
        code: code`
          '5' - 2;     // 3
          '5' + 2;     // "52"
          Boolean(''); // false
          Boolean('0'); // true  (non-empty string)
          Boolean([]);  // true  (every object is truthy)
        `,
      },
      {
        kind: 'text',
        text: 'The falsy values are `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined` and `NaN`. Everything else is truthy.',
      },
    ],
  },
  {
    topic: 'equality',
    title: '=== versus ==, and = in conditions',
    blocks: [
      {
        kind: 'text',
        text: '`===` compares value and type with no conversion. `==` converts types first, which gives surprising results. A single `=` is assignment, not comparison.',
      },
      {
        kind: 'code',
        language: 'js',
        code: code`
          0 == '';        // true   (both become 0)
          0 === '';       // false
          null == undefined;  // true
          null === undefined; // false

          if (age = 18) {}    // assigns 18, always truthy: a bug
          if (age === 18) {}  // compares
        `,
      },
      { kind: 'tip', text: 'Always use `===` and `!==`. Linters can flag `==` and assignments inside `if` for you.' },
    ],
  },
  {
    topic: 'functions',
    title: 'Function declarations and arrows',
    blocks: [
      {
        kind: 'text',
        text: 'Function declarations are hoisted, so you can call them before the line they appear on. Arrow functions are values, available only after their line runs.',
      },
      {
        kind: 'code',
        language: 'js',
        code: code`
          greet('Lin'); // works: declarations are hoisted
          function greet(name) {
            return 'Hi ' + name;
          }

          const double = (n) => n * 2;        // implicit return
          const sum = (a, b = 0) => a + b;    // default parameter
        `,
      },
      { kind: 'tip', text: 'A function without a `return` statement returns `undefined`.' },
    ],
  },
  {
    topic: 'scope',
    title: 'Block scope and function scope',
    blocks: [
      {
        kind: 'text',
        text: '`let` and `const` live inside the nearest `{ }` block. `var` ignores blocks and lives in the whole function, which causes the classic loop bug.',
      },
      {
        kind: 'code',
        language: 'js',
        code: code`
          for (var i = 0; i < 3; i++) {
            setTimeout(() => console.log(i)); // 3, 3, 3: one shared i
          }
          for (let j = 0; j < 3; j++) {
            setTimeout(() => console.log(j)); // 0, 1, 2: a new j each loop
          }
        `,
      },
      {
        kind: 'text',
        text: 'Using a `let` or `const` before its line throws a ReferenceError (the "temporal dead zone"). A `var` used early is just `undefined`.',
      },
    ],
  },
  {
    topic: 'closures',
    title: 'Closures remember where they were made',
    blocks: [
      {
        kind: 'text',
        text: 'A closure is a function that keeps access to the variables around it, even after the outer function has returned. Each call of the outer function makes a fresh set.',
      },
      {
        kind: 'code',
        language: 'js',
        code: code`
          function makeCounter() {
            let count = 0;
            return () => ++count;
          }
          const a = makeCounter();
          const b = makeCounter();
          a(); a();  // 1, 2
          b();       // 1: b has its own count
        `,
      },
      { kind: 'tip', text: 'Closures are how you make private state in JavaScript: nothing outside can reach `count`.' },
    ],
  },
  {
    topic: 'this',
    title: 'What `this` points to',
    blocks: [
      {
        kind: 'text',
        text: 'For a regular function, `this` is decided by how it is called: `obj.method()` sets it to `obj`. Arrow functions have no `this` of their own and use the one from the surrounding code.',
      },
      {
        kind: 'code',
        language: 'js',
        code: code`
          const user = {
            name: 'Lin',
            regular() { return this.name; },
            arrow: () => this?.name,
          };
          user.regular(); // "Lin"
          user.arrow();   // undefined: no own this

          const fn = user.regular;
          fn();           // this is lost when the method is detached
        `,
      },
      { kind: 'tip', text: 'Use arrow functions for callbacks inside methods so they keep the method\'s `this`.' },
    ],
  },
  {
    topic: 'destructuring',
    title: 'Destructuring',
    blocks: [
      {
        kind: 'text',
        text: 'Destructuring pulls values out of objects (by name) and arrays (by position). Defaults apply only when the value is `undefined`.',
      },
      {
        kind: 'code',
        language: 'js',
        code: code`
          const user = { id: 1, name: 'Lin' };
          const { name, role = 'guest' } = user;  // role = "guest"
          const { name: label } = user;           // rename to label

          const [first, , third] = [10, 20, 30];  // 10, 30
          const { a = 5 } = { a: null };          // a = null, not 5
        `,
      },
    ],
  },
  {
    topic: 'spread',
    title: 'Spread and rest',
    blocks: [
      {
        kind: 'text',
        text: '`...` spreads items out when building arrays and objects, and gathers the rest when destructuring or in parameters. Later properties win.',
      },
      {
        kind: 'code',
        language: 'js',
        code: code`
          const base = { theme: 'light', size: 'md' };
          const next = { ...base, theme: 'dark' }; // theme: "dark"

          const nums = [1, 2];
          const more = [...nums, 3];               // [1, 2, 3]

          function total(...values) {              // rest parameter
            return values.reduce((s, v) => s + v, 0);
          }
        `,
      },
      { kind: 'tip', text: 'Spread copies one level deep. Nested objects are still shared with the original.' },
    ],
  },
  {
    topic: 'array-methods',
    title: 'map, filter, reduce and friends',
    blocks: [
      {
        kind: 'text',
        text: '`map` transforms each item, `filter` keeps items that pass a test, and `reduce` folds the array into one value. All three return something new and leave the original array alone.',
      },
      {
        kind: 'code',
        language: 'js',
        code: code`
          const prices = [5, 12, 8];
          prices.map((p) => p * 2);               // [10, 24, 16]
          prices.filter((p) => p > 6);            // [12, 8]
          prices.reduce((sum, p) => sum + p, 0);  // 25
          prices.find((p) => p > 6);              // 12
        `,
      },
      {
        kind: 'tip',
        text: '`sort`, `push`, `splice` and `reverse` change the array in place. Give `reduce` a starting value, or it fails on an empty array.',
      },
    ],
  },
  {
    topic: 'promises',
    title: 'Promises',
    blocks: [
      {
        kind: 'text',
        text: 'A Promise is a value that arrives later. It is pending, then either fulfilled with a value or rejected with an error. `.then` handles success and `.catch` handles failure.',
      },
      {
        kind: 'code',
        language: 'js',
        code: code`
          fetchUser(1)
            .then((user) => user.name)
            .catch((err) => 'unknown')
            .finally(() => console.log('done'));

          // Run in parallel, fail if any one fails:
          Promise.all([fetchUser(1), fetchUser(2)]);
        `,
      },
      { kind: 'tip', text: 'Return the promise from inside `.then`, or the next step will not wait for it.' },
    ],
  },
  {
    topic: 'async-await',
    title: 'async and await',
    blocks: [
      {
        kind: 'text',
        text: 'An `async` function always returns a Promise. `await` pauses only that function until the promise settles, then gives you the value (or throws the error).',
      },
      {
        kind: 'code',
        language: 'js',
        code: code`
          async function loadUser(id) {
            try {
              const res = await fetch('/api/users/' + id);
              if (!res.ok) throw new Error('Request failed');
              return await res.json();
            } catch (err) {
              return null;
            }
          }
        `,
      },
      {
        kind: 'tip',
        text: 'Forgetting `await` gives you a pending Promise instead of the value. Awaiting in a loop runs requests one by one; use `Promise.all` to run them together.',
      },
    ],
  },
  {
    topic: 'event-loop',
    title: 'The event loop',
    blocks: [
      {
        kind: 'text',
        text: 'JavaScript runs one thing at a time. When the current code finishes, it first runs every queued microtask (promise callbacks), then takes the next macrotask (timers, I/O).',
      },
      {
        kind: 'code',
        language: 'js',
        code: code`
          console.log('1: sync');
          setTimeout(() => console.log('4: timer'), 0);
          Promise.resolve().then(() => console.log('3: microtask'));
          console.log('2: sync');
        `,
      },
      { kind: 'tip', text: '`setTimeout(fn, 0)` means "after everything else queued", not "right now".' },
    ],
  },
]);
