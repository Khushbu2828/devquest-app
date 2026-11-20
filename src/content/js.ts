import { code, seedQuestions } from '@/content/helpers';
import { jsNotes } from '@/content/notes/js';
import type { TrackContent } from '@/types/content';

const tipStep1 = code`
  function calculateTip(bill, percent) {
    return Math.round(bill * percent) / 100;
  }
`;

const tipStep2 = code`
  ${tipStep1}

  function splitBill(bill, percent, people) {
    const total = bill + calculateTip(bill, percent);
    return Math.round((total / people) * 100) / 100;
  }
`;

const tipStep3 = code`
  function assertPositive(value, name) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new Error(name + ' must be a positive number');
    }
  }

  function calculateTip(bill, percent) {
    assertPositive(bill, 'bill');
    return Math.round(bill * percent) / 100;
  }

  function splitBill(bill, percent, people) {
    assertPositive(people, 'people');
    const total = bill + calculateTip(bill, percent);
    return Math.round((total / people) * 100) / 100;
  }
`;

export const jsContent: TrackContent = {
  track: {
    id: 'js',
    title: 'JavaScript',
    tagline: 'The language of the web, from variables to the event loop.',
    order: 1,
  },

  units: [
    {
      id: 'js-basics',
      track: 'js',
      level: 'beginner',
      order: 1,
      title: 'Values & Types',
      summary: 'Variables, primitive types, coercion and equality.',
      topics: ['variables', 'types', 'coercion', 'equality'],
    },
    {
      id: 'js-functions',
      track: 'js',
      level: 'beginner',
      order: 2,
      title: 'Functions & Scope',
      summary: 'Declaring functions, block scope, closures and `this`.',
      topics: ['functions', 'scope', 'closures', 'this'],
    },
    {
      id: 'js-modern',
      track: 'js',
      level: 'intermediate',
      order: 3,
      title: 'Modern JS & Arrays',
      summary: 'Destructuring, spread, and the array methods you use every day.',
      topics: ['destructuring', 'spread', 'array-methods'],
    },
    {
      id: 'js-async',
      track: 'js',
      level: 'advanced',
      order: 4,
      title: 'Async & the Event Loop',
      summary: 'Promises, async/await and how JavaScript schedules work.',
      topics: ['promises', 'async-await', 'event-loop'],
    },
  ],

  notes: jsNotes,

  questions: seedQuestions('js', [
    {
      id: 'js-q01',
      unitId: 'js-basics',
      topic: 'types',
      difficulty: 1,
      type: 'mcq',
      prompt: 'What does `typeof null` return?',
      options: ['"null"', '"object"', '"undefined"', '"number"'],
      answer: 1,
      explanation: 'A long-standing quirk from the first version of JavaScript: `typeof null` is "object". Check for null with `value === null`.',
      hints: ['It is a famous bug that was never fixed for compatibility.'],
      tags: ['typeof', 'null'],
    },
    {
      id: 'js-q02',
      unitId: 'js-basics',
      topic: 'types',
      difficulty: 2,
      type: 'output',
      language: 'js',
      prompt: 'What does this log?',
      code: 'console.log(0.1 + 0.2 === 0.3);',
      options: ['true', 'false', 'undefined', 'TypeError'],
      answer: 1,
      explanation: 'Numbers are binary floating point, so 0.1 + 0.2 is 0.30000000000000004. Compare with a tolerance such as `Math.abs(a - b) < Number.EPSILON`.',
      hints: ['Think about how decimals are stored in binary.'],
      tags: ['floating-point'],
    },
    {
      id: 'js-q03',
      unitId: 'js-basics',
      topic: 'variables',
      difficulty: 1,
      type: 'true_false',
      prompt: 'Variables declared with `let` are scoped to the nearest `{ }` block.',
      answer: true,
      explanation: '`let` and `const` are block-scoped. `var` is function-scoped, which is a common source of bugs.',
      hints: ['Compare `let` with `var`.'],
      tags: ['let', 'scope'],
    },
    {
      id: 'js-q04',
      unitId: 'js-basics',
      topic: 'coercion',
      difficulty: 2,
      type: 'output',
      language: 'js',
      prompt: 'What does this log?',
      code: "console.log('5' - 2, '5' + 2);",
      options: ['3 7', '3 52', '52 52', 'NaN 52'],
      answer: 1,
      explanation: '`-` only works on numbers, so "5" is converted to 5. `+` with a string concatenates, giving "52".',
      hints: ['`+` has two jobs; `-` has only one.'],
      tags: ['coercion', 'operators'],
    },
    {
      id: 'js-q05',
      unitId: 'js-modern',
      topic: 'array-methods',
      difficulty: 1,
      type: 'fill_blank',
      prompt: 'Fill in the method that creates a new array with every number doubled.',
      language: 'js',
      code: 'const doubled = [1, 2, 3].___((n) => n * 2);',
      answer: 'map',
      explanation: '`map` calls the function for each element and collects the results into a new array.',
      hints: ['It transforms each item one-to-one.'],
      tags: ['map'],
    },
    {
      id: 'js-q06',
      unitId: 'js-basics',
      topic: 'coercion',
      difficulty: 2,
      type: 'multi',
      prompt: 'Which of these values are falsy?',
      options: ['0', '""', '"0"', 'null', '[]', 'NaN'],
      answers: [0, 1, 3, 5],
      explanation: 'The falsy values are false, 0, -0, 0n, "", null, undefined and NaN. The string "0" and an empty array are both truthy.',
      hints: ['Only primitives can be falsy, and not every primitive is.'],
      tags: ['truthy', 'falsy'],
    },
    {
      id: 'js-q07',
      unitId: 'js-basics',
      topic: 'equality',
      difficulty: 2,
      type: 'bug_find',
      prompt: 'This function says everyone is an adult. Tap the buggy line.',
      language: 'js',
      code: code`
        function isAdult(age) {
          if (age = 18) {
            return true;
          }
          return age > 18;
        }
      `,
      bugLine: 2,
      explanation: '`age = 18` assigns 18 (truthy) instead of comparing. Use `age >= 18` for the whole check.',
      hints: ['Look for a single `=` where a comparison was intended.'],
      tags: ['assignment', 'comparison'],
    },
    {
      id: 'js-q08',
      unitId: 'js-functions',
      topic: 'closures',
      difficulty: 3,
      type: 'output',
      language: 'js',
      prompt: 'What does this log?',
      code: code`
        function counter() {
          let c = 0;
          return () => ++c;
        }
        const a = counter();
        a();
        console.log(a());
        const b = counter();
        console.log(b());
      `,
      options: ['2\n1', '2\n3', '1\n1', '1\n2'],
      answer: 0,
      explanation: 'Each call to `counter()` creates a new `c`. `a` has been called twice (2), while `b` has its own fresh counter (1).',
      hints: ['How many separate `c` variables exist?'],
      tags: ['closures'],
    },
    {
      id: 'js-q09',
      unitId: 'js-functions',
      topic: 'scope',
      difficulty: 3,
      type: 'output',
      language: 'js',
      prompt: 'What does this log?',
      code: code`
        for (var i = 0; i < 3; i++) {
          setTimeout(() => console.log(i), 0);
        }
      `,
      options: ['0\n1\n2', '3\n3\n3', '2\n2\n2', 'undefined\nundefined\nundefined'],
      answer: 1,
      explanation: '`var` creates one shared `i`. By the time the timers run, the loop has finished and `i` is 3. Using `let` gives each iteration its own binding and logs 0, 1, 2.',
      hints: ['How many `i` variables does `var` create in this loop?'],
      tags: ['var', 'closures', 'setTimeout'],
    },
    {
      id: 'js-q10',
      unitId: 'js-functions',
      topic: 'scope',
      difficulty: 2,
      type: 'mcq',
      prompt: 'What happens if you read a `let` variable before its declaration line runs?',
      options: [
        'You get `undefined`',
        'A ReferenceError is thrown',
        'You get `null`',
        'The declaration is moved up and the value is used',
      ],
      answer: 1,
      explanation: '`let` and `const` are hoisted but stay in the "temporal dead zone" until their declaration runs, so reading them early throws a ReferenceError. `var` would give `undefined`.',
      hints: ['Search for "temporal dead zone".'],
      tags: ['hoisting', 'tdz'],
    },
    {
      id: 'js-q11',
      unitId: 'js-async',
      topic: 'async-await',
      difficulty: 2,
      type: 'order',
      prompt: 'Put these lines in order to build a working async function.',
      language: 'js',
      lines: [
        'async function loadUser(id) {',
        "  const res = await fetch('/api/users/' + id);",
        '  const user = await res.json();',
        '  return user;',
        '}',
      ],
      explanation: 'Fetch first, then parse the body (which is also async), then return the parsed value.',
      hints: ['You need the response before you can read its JSON.'],
      tags: ['fetch', 'await'],
    },
    {
      id: 'js-q12',
      unitId: 'js-modern',
      topic: 'array-methods',
      difficulty: 2,
      type: 'match',
      prompt: 'Match each array method to what it returns.',
      pairs: [
        { left: 'map', right: 'A new array of transformed items' },
        { left: 'filter', right: 'A new array of items that passed a test' },
        { left: 'find', right: 'The first matching item, or undefined' },
        { left: 'reduce', right: 'A single accumulated value' },
      ],
      explanation: 'These four cover most everyday data transformations.',
      hints: ['`find` stops at the first match.'],
      tags: ['map', 'filter', 'find', 'reduce'],
    },
    {
      id: 'js-q13',
      unitId: 'js-async',
      topic: 'event-loop',
      difficulty: 4,
      type: 'output',
      language: 'js',
      prompt: 'What does this log?',
      code: code`
        console.log('A');
        setTimeout(() => console.log('B'), 0);
        Promise.resolve().then(() => console.log('C'));
        console.log('D');
      `,
      options: ['A\nB\nC\nD', 'A\nD\nB\nC', 'A\nD\nC\nB', 'A\nC\nD\nB'],
      answer: 2,
      explanation: 'Synchronous code runs first (A, D). Then the microtask queue (promise callback C) drains before the next macrotask (timer B).',
      hints: ['Promises are microtasks; timers are macrotasks.'],
      tags: ['event-loop', 'microtasks'],
    },
    {
      id: 'js-q14',
      unitId: 'js-modern',
      topic: 'destructuring',
      difficulty: 3,
      type: 'output',
      language: 'js',
      prompt: 'What does this log?',
      code: code`
        const { a, b = 5, ...rest } = { a: 1, c: 3, d: 4 };
        console.log(a, b, Object.keys(rest).length);
      `,
      options: ['1 5 2', '1 undefined 2', '1 5 3', '1 3 1'],
      answer: 0,
      explanation: '`a` is 1, `b` is missing so it takes the default 5, and `rest` collects the remaining keys `c` and `d`.',
      hints: ['Defaults only apply when the property is `undefined`.'],
      tags: ['destructuring', 'rest'],
    },
    {
      id: 'js-q15',
      unitId: 'js-modern',
      topic: 'spread',
      difficulty: 2,
      type: 'output',
      language: 'js',
      prompt: 'What does this log?',
      code: code`
        const arr = [1, 2];
        const copy = [...arr, 3];
        arr.push(9);
        console.log(copy.length, arr.length);
      `,
      options: ['3 3', '4 3', '3 2', '4 4'],
      answer: 0,
      explanation: 'Spread creates a new array when `copy` is made, so later changes to `arr` do not affect it. Both end up with 3 items.',
      hints: ['Is `copy` linked to `arr` after it is created?'],
      tags: ['spread', 'immutability'],
    },
    {
      id: 'js-q16',
      unitId: 'js-basics',
      topic: 'equality',
      difficulty: 2,
      type: 'output',
      language: 'js',
      prompt: 'What does this log?',
      code: 'console.log(null == undefined, null === undefined);',
      options: ['true true', 'false false', 'true false', 'false true'],
      answer: 2,
      explanation: 'Loose equality treats null and undefined as equal to each other (and nothing else). Strict equality also compares types, which differ.',
      hints: ['`==` has special rules for null and undefined.'],
      tags: ['equality'],
    },
    {
      id: 'js-q17',
      unitId: 'js-functions',
      topic: 'this',
      difficulty: 2,
      type: 'true_false',
      prompt: 'Arrow functions get their own `this` based on how they are called.',
      answer: false,
      explanation: 'Arrow functions capture `this` from the surrounding scope. That is why they are handy for callbacks, and why they make poor object methods.',
      hints: ['Think about why arrow functions are used inside `setTimeout` callbacks.'],
      tags: ['this', 'arrow-functions'],
    },
    {
      id: 'js-q18',
      unitId: 'js-async',
      topic: 'async-await',
      difficulty: 3,
      type: 'bug_find',
      prompt: 'This throws "res.json is not a function". Tap the buggy line.',
      language: 'js',
      code: code`
        async function getTotal() {
          const res = fetch('/api/cart');
          const data = await res.json();
          return data.total;
        }
      `,
      bugLine: 2,
      explanation: 'Without `await`, `res` is a Promise, not a Response, so it has no `.json()` method. Write `const res = await fetch(...)`.',
      hints: ['What does `fetch` return?'],
      tags: ['await', 'fetch'],
    },
    {
      id: 'js-q19',
      unitId: 'js-async',
      topic: 'promises',
      difficulty: 3,
      type: 'mcq',
      prompt: 'When does `Promise.all([p1, p2, p3])` reject?',
      options: [
        'Only if every promise rejects',
        'As soon as any one of the promises rejects',
        'Never: it waits and returns every result',
        'Only if the last promise rejects',
      ],
      answer: 1,
      explanation: '`Promise.all` fails fast on the first rejection. Use `Promise.allSettled` to wait for every result whether it succeeds or fails.',
      hints: ['Compare with `Promise.allSettled`.'],
      tags: ['promise-all'],
    },
    {
      id: 'js-q20',
      unitId: 'js-modern',
      topic: 'array-methods',
      difficulty: 3,
      type: 'output',
      language: 'js',
      prompt: 'What does this log?',
      code: "console.log([3, 1, 10].sort().join(','));",
      options: ['1,3,10', '10,3,1', '1,10,3', '3,1,10'],
      answer: 2,
      explanation: 'Without a compare function, `sort` converts items to strings and sorts them alphabetically, so "10" comes before "3". Use `.sort((a, b) => a - b)` for numbers.',
      hints: ['What does `sort` compare by default?'],
      tags: ['sort'],
    },
  ]),

  exercises: [
    {
      id: 'js-ex01',
      track: 'js',
      unitId: 'js-modern',
      title: 'Sum the even numbers',
      prompt: 'Write `sumEven(nums)` that returns the sum of all even numbers in the array. Return 0 for an empty array.',
      kind: 'write_function',
      language: 'js',
      starterCode: code`
        function sumEven(nums) {
          // your code here
        }
      `,
      solution: code`
        function sumEven(nums) {
          return nums.filter((n) => n % 2 === 0).reduce((sum, n) => sum + n, 0);
        }
      `,
      tests: [
        { name: 'sums evens', code: 'expect(sumEven([1, 2, 3, 4])).toBe(6);' },
        { name: 'empty array', code: 'expect(sumEven([])).toBe(0);' },
        { name: 'no evens', code: 'expect(sumEven([1, 3, 5])).toBe(0);' },
        { name: 'negatives', code: 'expect(sumEven([-2, 4, 7])).toBe(2);' },
      ],
      hints: [
        'Two steps: keep the even numbers, then add them up.',
        'Use `filter` with `n % 2 === 0`, then `reduce` with a starting value of 0.',
        'return nums.filter((n) => n % 2 === 0).reduce((sum, n) => ___, 0);',
      ],
      xp: 20,
    },
    {
      id: 'js-ex02',
      track: 'js',
      unitId: 'js-functions',
      title: 'Private counter',
      prompt: 'Write `makeCounter(start = 0)` that returns an object with `increment()`, `decrement()` and `value()`. The count must not be reachable from outside.',
      kind: 'write_function',
      language: 'js',
      starterCode: code`
        function makeCounter(start = 0) {
          // return { increment, decrement, value }
        }
      `,
      solution: code`
        function makeCounter(start = 0) {
          let count = start;
          return {
            increment: () => ++count,
            decrement: () => --count,
            value: () => count,
          };
        }
      `,
      tests: [
        { name: 'starts at 0', code: 'expect(makeCounter().value()).toBe(0);' },
        {
          name: 'increments and decrements',
          code: 'const c = makeCounter(5); c.increment(); c.increment(); c.decrement(); expect(c.value()).toBe(6);',
        },
        {
          name: 'counters are independent',
          code: 'const a = makeCounter(); const b = makeCounter(); a.increment(); expect(b.value()).toBe(0);',
        },
        {
          name: 'count is private',
          code: "expect(Object.keys(makeCounter()).sort()).toEqual(['decrement', 'increment', 'value']);",
        },
      ],
      hints: [
        'Store the count in a variable inside `makeCounter`, not on the returned object.',
        'Return an object whose three functions all read or change that variable: a closure.',
        'let count = start;\nreturn { increment: () => ++count, decrement: ___, value: ___ };',
      ],
      xp: 25,
    },
    {
      id: 'js-ex03',
      track: 'js',
      unitId: 'js-modern',
      title: 'Group by',
      prompt: 'Write `groupBy(items, keyFn)` that returns an object mapping each key to the array of items that produced it, keeping the original order.',
      kind: 'write_function',
      language: 'js',
      starterCode: code`
        function groupBy(items, keyFn) {
          // your code here
        }
      `,
      solution: code`
        function groupBy(items, keyFn) {
          return items.reduce((groups, item) => {
            const key = keyFn(item);
            (groups[key] ??= []).push(item);
            return groups;
          }, {});
        }
      `,
      tests: [
        {
          name: 'groups by length',
          code: "expect(groupBy(['a', 'bb', 'cc', 'd'], (s) => s.length)).toEqual({ 1: ['a', 'd'], 2: ['bb', 'cc'] });",
        },
        { name: 'empty input', code: 'expect(groupBy([], (x) => x)).toEqual({});' },
        {
          name: 'groups objects',
          code: "const people = [{ n: 'A', t: 'x' }, { n: 'B', t: 'y' }, { n: 'C', t: 'x' }]; expect(groupBy(people, (p) => p.t).x.map((p) => p.n)).toEqual(['A', 'C']);",
        },
      ],
      hints: [
        'Walk the array once and build up an object as you go.',
        'Use `reduce` starting from `{}`. For each item, compute its key and push it onto that key\'s array, creating the array if needed.',
        'const key = keyFn(item);\n(groups[key] ??= []).push(item);\nreturn groups;',
      ],
      xp: 30,
    },
  ],

  debugChallenges: [
    {
      id: 'js-dbg01',
      track: 'js',
      unitId: 'js-basics',
      title: 'The sum is NaN',
      prompt: '`sum([1, 2, 3])` should return 6 but returns NaN. Find and fix the bug.',
      language: 'js',
      buggyCode: code`
        function sum(arr) {
          let total = 0;
          for (let i = 0; i <= arr.length; i++) {
            total += arr[i];
          }
          return total;
        }
      `,
      fixedCode: code`
        function sum(arr) {
          let total = 0;
          for (let i = 0; i < arr.length; i++) {
            total += arr[i];
          }
          return total;
        }
      `,
      bugLines: [3],
      category: 'logic',
      tests: [
        { name: 'sums three numbers', code: 'expect(sum([1, 2, 3])).toBe(6);' },
        { name: 'empty array', code: 'expect(sum([])).toBe(0);' },
      ],
      explanation: 'An off-by-one error: `i <= arr.length` reads one past the end, and `total + undefined` is NaN. Use `i < arr.length`.',
      xp: 15,
    },
    {
      id: 'js-dbg02',
      track: 'js',
      unitId: 'js-async',
      title: 'The total is always 0',
      prompt: '`totalPrice` should add up prices fetched asynchronously, but it always returns 0. Fix it.',
      language: 'js',
      buggyCode: code`
        async function totalPrice(ids, getPrice) {
          let total = 0;
          ids.forEach(async (id) => {
            total += await getPrice(id);
          });
          return total;
        }
      `,
      fixedCode: code`
        async function totalPrice(ids, getPrice) {
          let total = 0;
          for (const id of ids) {
            total += await getPrice(id);
          }
          return total;
        }
      `,
      bugLines: [3],
      category: 'async',
      tests: [
        {
          name: 'adds async prices',
          code: 'const t = await totalPrice([1, 2, 3], async (id) => id * 10); expect(t).toBe(60);',
        },
      ],
      explanation: '`forEach` does not wait for async callbacks, so the function returns before any price arrives. Use `for...of` with `await`, or `Promise.all` to fetch in parallel.',
      xp: 25,
    },
    {
      id: 'js-dbg03',
      track: 'js',
      unitId: 'js-functions',
      title: 'Cannot read properties of undefined',
      prompt: 'Calling `cart.count()` crashes. Read the error, then fix the method.',
      language: 'js',
      buggyCode: code`
        const cart = {
          items: ['apple', 'pear'],
          count: () => this.items.length,
        };
      `,
      fixedCode: code`
        const cart = {
          items: ['apple', 'pear'],
          count() {
            return this.items.length;
          },
        };
      `,
      bugLines: [3],
      category: 'logic',
      errorOutput: code`
        TypeError: Cannot read properties of undefined (reading 'length')
            at Object.count (cart.js:3:27)
            at main (app.js:12:18)
      `,
      tests: [{ name: 'counts items', code: 'expect(cart.count()).toBe(2);' }],
      explanation: 'Arrow functions do not get their own `this`, so `this.items` is not the cart. Use method shorthand (`count() { ... }`) so `this` is the object the method is called on.',
      xp: 20,
    },
  ],

  project: {
    id: 'js-proj-tip',
    track: 'js',
    title: 'Tip calculator',
    description: 'Build the logic behind a bill-splitting app, one function at a time.',
    language: 'js',
    xp: 60,
    checkpoints: [
      {
        id: 'tip-1',
        title: 'Calculate the tip',
        instructions: 'Write `calculateTip(bill, percent)` that returns the tip rounded to 2 decimal places. `calculateTip(50, 18)` is 9.',
        starterCode: code`
          function calculateTip(bill, percent) {
            // your code here
          }
        `,
        solution: tipStep1,
        tests: [
          { name: '18% of 50', code: 'expect(calculateTip(50, 18)).toBe(9);' },
          { name: 'rounds to cents', code: 'expect(calculateTip(33.33, 15)).toBe(5);' },
          { name: 'zero percent', code: 'expect(calculateTip(20, 0)).toBe(0);' },
        ],
      },
      {
        id: 'tip-2',
        title: 'Split the bill',
        instructions: 'Add `splitBill(bill, percent, people)` that returns what each person pays (bill plus tip), rounded to 2 decimals.',
        starterCode: code`
          ${tipStep1}

          function splitBill(bill, percent, people) {
            // your code here
          }
        `,
        solution: tipStep2,
        tests: [
          { name: 'two people', code: 'expect(splitBill(100, 20, 2)).toBe(60);' },
          { name: 'three people', code: 'expect(splitBill(100, 0, 3)).toBe(33.33);' },
        ],
      },
      {
        id: 'tip-3',
        title: 'Reject bad input',
        instructions: 'Throw an Error when the bill or the number of people is not a positive number.',
        starterCode: tipStep2,
        solution: tipStep3,
        tests: [
          { name: 'negative bill', code: 'expect(() => calculateTip(-5, 10)).toThrow();' },
          { name: 'zero people', code: 'expect(() => splitBill(50, 10, 0)).toThrow();' },
          { name: 'non-number', code: "expect(() => calculateTip('50', 10)).toThrow();" },
          { name: 'still works', code: 'expect(splitBill(100, 20, 2)).toBe(60);' },
        ],
      },
    ],
  },
};
