import { code, seedQuestions } from '@/content/helpers';
import type { TrackContent } from '@/types/content';

const formStep1 = code`
  type Rule<T> = (value: T) => string | null;

  const required: Rule<string> = (value) => (value.trim() === '' ? 'Required' : null);

  function minLength(min: number): Rule<string> {
    return (value) => (value.length < min ? 'Must be at least ' + min + ' characters' : null);
  }
`;

const formStep2 = code`
  ${formStep1}

  type Schema<T> = { [K in keyof T]: Rule<T[K]> };
  type Errors<T> = Partial<Record<keyof T, string>>;

  function validate<T>(values: T, schema: Schema<T>): Errors<T> {
    const errors: Errors<T> = {};
    for (const key in schema) {
      const message = schema[key](values[key]);
      if (message) errors[key] = message;
    }
    return errors;
  }
`;

const formStep3 = code`
  ${formStep2}

  function all<T>(...rules: Rule<T>[]): Rule<T> {
    return (value) => {
      for (const rule of rules) {
        const message = rule(value);
        if (message) return message;
      }
      return null;
    };
  }
`;

export const tsContent: TrackContent = {
  track: {
    id: 'ts',
    title: 'TypeScript',
    tagline: 'Catch bugs before they run, with types that scale.',
    order: 2,
  },

  units: [
    {
      id: 'ts-basics',
      track: 'ts',
      level: 'beginner',
      order: 1,
      title: 'Type Basics',
      summary: 'Annotations, inference, unions and the special types.',
      topics: ['annotations', 'inference', 'unions', 'special-types'],
    },
    {
      id: 'ts-objects',
      track: 'ts',
      level: 'beginner',
      order: 2,
      title: 'Objects & Interfaces',
      summary: 'Describing object shapes, optional properties, classes and enums.',
      topics: ['interfaces', 'optional', 'classes', 'enums'],
    },
    {
      id: 'ts-generics',
      track: 'ts',
      level: 'intermediate',
      order: 3,
      title: 'Generics',
      summary: 'Reusable functions and types that keep their type information.',
      topics: ['generics', 'constraints', 'keyof'],
    },
    {
      id: 'ts-advanced',
      track: 'ts',
      level: 'advanced',
      order: 4,
      title: 'Narrowing & Utility Types',
      summary: 'Type guards, discriminated unions, utility types and tsconfig.',
      topics: ['narrowing', 'discriminated-unions', 'utility-types', 'config'],
    },
  ],

  lessons: [
    {
      id: 'ts-basics-l1',
      unitId: 'ts-basics',
      order: 1,
      title: 'Annotations and inference',
      minutes: 5,
      blocks: [
        {
          kind: 'text',
          text: 'TypeScript infers most types for you. Add annotations where inference cannot help: function parameters, and values you want to constrain.',
        },
        {
          kind: 'code',
          language: 'ts',
          code: code`
            let count = 0;                 // inferred: number
            const mode = 'dark';           // inferred: "dark" (a literal type)

            function greet(name: string): string {
              return 'Hi ' + name;
            }

            let id: string | number = 42;  // a union type
            id = 'abc';
          `,
        },
        {
          kind: 'tip',
          text: 'Prefer `unknown` over `any` for values you have not checked yet. `unknown` forces you to narrow before using it.',
        },
      ],
    },
    {
      id: 'ts-objects-l1',
      unitId: 'ts-objects',
      order: 1,
      title: 'Describing object shapes',
      minutes: 6,
      blocks: [
        {
          kind: 'code',
          language: 'ts',
          code: code`
            interface User {
              id: number;
              name: string;
              email?: string;            // optional: string | undefined
              readonly createdAt: Date;  // cannot be reassigned
            }

            type Point = { x: number; y: number };
          `,
        },
        {
          kind: 'text',
          text: 'Interfaces and type aliases are mostly interchangeable for objects. Interfaces can be extended and merged; type aliases can also name unions, tuples and other types.',
        },
      ],
    },
    {
      id: 'ts-generics-l1',
      unitId: 'ts-generics',
      order: 1,
      title: 'Generics keep types connected',
      minutes: 7,
      blocks: [
        {
          kind: 'text',
          text: 'A generic is a type parameter. It lets a function work with many types while still telling the caller exactly which type comes back.',
        },
        {
          kind: 'code',
          language: 'ts',
          code: code`
            function first<T>(items: T[]): T | undefined {
              return items[0];
            }
            const n = first([1, 2, 3]);    // number | undefined

            function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
              return obj[key];
            }
            getProp({ name: 'Ada' }, 'name'); // string
          `,
        },
      ],
    },
    {
      id: 'ts-advanced-l1',
      unitId: 'ts-advanced',
      order: 1,
      title: 'Narrowing and discriminated unions',
      minutes: 8,
      blocks: [
        {
          kind: 'code',
          language: 'ts',
          code: code`
            type Result =
              | { status: 'ok'; data: string[] }
              | { status: 'error'; message: string };

            function render(r: Result): string {
              switch (r.status) {
                case 'ok':
                  return r.data.join(', ');   // r is the 'ok' variant here
                case 'error':
                  return 'Error: ' + r.message;
              }
            }
          `,
        },
        {
          kind: 'text',
          text: 'Utility types transform existing types: `Partial<T>`, `Required<T>`, `Pick<T, K>`, `Omit<T, K>`, `Record<K, V>` and `Readonly<T>`.',
        },
      ],
    },
  ],

  questions: seedQuestions('ts', [
    {
      id: 'ts-q01',
      unitId: 'ts-basics',
      topic: 'inference',
      difficulty: 2,
      type: 'mcq',
      prompt: "What type does TypeScript infer for `const status = 'idle'`?",
      options: ['string', '"idle"', 'any', 'unknown'],
      answer: 1,
      explanation: 'A `const` can never change, so TypeScript infers the literal type "idle". With `let` it would widen to `string`.',
      hints: ['Could the value ever be anything other than "idle"?'],
      tags: ['literal-types', 'const'],
    },
    {
      id: 'ts-q02',
      unitId: 'ts-basics',
      topic: 'annotations',
      difficulty: 1,
      type: 'true_false',
      prompt: 'TypeScript types are checked again at runtime when the code runs.',
      answer: false,
      explanation: 'Types are erased when TypeScript compiles to JavaScript. Validate untrusted data (API responses, form input) at runtime yourself, for example with a schema library.',
      hints: ['What does the browser actually run?'],
      tags: ['type-erasure'],
    },
    {
      id: 'ts-q03',
      unitId: 'ts-basics',
      topic: 'special-types',
      difficulty: 2,
      type: 'mcq',
      prompt: 'Which type accepts any value but forces you to narrow it before using it?',
      options: ['any', 'unknown', 'never', 'object'],
      answer: 1,
      explanation: '`unknown` is the safe counterpart to `any`: you can assign anything to it, but you must check its type before calling methods on it.',
      hints: ['One of these turns type checking off entirely.'],
      tags: ['unknown', 'any'],
    },
    {
      id: 'ts-q04',
      unitId: 'ts-generics',
      topic: 'generics',
      difficulty: 1,
      type: 'fill_blank',
      prompt: 'Complete the return type so `identity` returns exactly what it receives.',
      language: 'ts',
      code: 'function identity<T>(value: T): ___ {\n  return value;\n}',
      answer: 'T',
      explanation: 'Returning the type parameter `T` tells callers they get back the same type they passed in.',
      hints: ['Reuse the type parameter.'],
      tags: ['generics'],
    },
    {
      id: 'ts-q05',
      unitId: 'ts-basics',
      topic: 'annotations',
      difficulty: 2,
      type: 'multi',
      prompt: 'Which of these describe an array of numbers of any length?',
      options: ['number[]', 'Array<number>', '[number]', 'readonly number[]'],
      answers: [0, 1, 3],
      explanation: '`[number]` is a tuple with exactly one element. The others are arrays of numbers; `readonly number[]` also forbids mutation.',
      hints: ['Square brackets around a type mean something different from brackets after it.'],
      tags: ['arrays', 'tuples'],
    },
    {
      id: 'ts-q06',
      unitId: 'ts-objects',
      topic: 'enums',
      difficulty: 3,
      type: 'output',
      language: 'ts',
      prompt: 'What does this log?',
      code: code`
        enum Direction {
          Up,
          Down,
          Left,
        }
        console.log(Direction.Left, Direction[1]);
      `,
      options: ['2 Down', 'Left Down', '3 Up', '2 undefined'],
      answer: 0,
      explanation: 'Numeric enums start at 0, so Left is 2. They also create a reverse mapping from number to name, so `Direction[1]` is "Down".',
      hints: ['Enums are one of the few TypeScript features that produce runtime code.'],
      tags: ['enums'],
    },
    {
      id: 'ts-q07',
      unitId: 'ts-objects',
      topic: 'optional',
      difficulty: 2,
      type: 'bug_find',
      prompt: 'With `strict` on, one line fails to compile. Tap it.',
      language: 'ts',
      code: code`
        interface User {
          name: string;
          age?: number;
        }

        function describe(user: User) {
          return user.name + ' is ' + user.age.toFixed(0);
        }
      `,
      bugLine: 7,
      explanation: '`age` is optional, so its type is `number | undefined` and calling `.toFixed` on it is an error. Check it first, or use `user.age?.toFixed(0) ?? "unknown"`.',
      hints: ['What is the type of an optional property?'],
      tags: ['optional', 'strictNullChecks'],
    },
    {
      id: 'ts-q08',
      unitId: 'ts-advanced',
      topic: 'utility-types',
      difficulty: 2,
      type: 'mcq',
      prompt: 'What does `Partial<User>` produce?',
      options: [
        'A type with only the first property of User',
        'A copy of User with every property optional',
        'A copy of User with every property readonly',
        'A union of User\'s property names',
      ],
      answer: 1,
      explanation: '`Partial<T>` marks every property optional, which is handy for update payloads like `updateUser(id, changes: Partial<User>)`.',
      hints: ['Think about a PATCH request body.'],
      tags: ['partial'],
    },
    {
      id: 'ts-q09',
      unitId: 'ts-advanced',
      topic: 'utility-types',
      difficulty: 3,
      type: 'match',
      prompt: 'Match each utility type to what it does.',
      pairs: [
        { left: 'Pick<T, K>', right: 'Keeps only the listed properties' },
        { left: 'Omit<T, K>', right: 'Removes the listed properties' },
        { left: 'Record<K, V>', right: 'An object type with keys K and values V' },
        { left: 'Readonly<T>', right: 'Makes every property non-writable' },
      ],
      explanation: 'Utility types let you derive new types from existing ones instead of repeating yourself.',
      hints: ['`Pick` and `Omit` are opposites.'],
      tags: ['pick', 'omit', 'record', 'readonly'],
    },
    {
      id: 'ts-q10',
      unitId: 'ts-advanced',
      topic: 'narrowing',
      difficulty: 2,
      type: 'mcq',
      prompt: 'Inside which `if` does TypeScript know that `x: string | number` is a string?',
      options: [
        "if (typeof x === 'string')",
        'if (x instanceof String)',
        'if (x)',
        "if (x !== 'number')",
      ],
      answer: 0,
      explanation: '`typeof` checks are type guards. `instanceof String` checks for String objects (rare), and a truthiness check does not distinguish the two types.',
      hints: ['Which check works on primitives?'],
      tags: ['typeof', 'type-guards'],
    },
    {
      id: 'ts-q11',
      unitId: 'ts-objects',
      topic: 'interfaces',
      difficulty: 3,
      type: 'true_false',
      prompt: 'Declaring the same `interface` name twice merges both declarations into one type.',
      answer: true,
      explanation: 'This is declaration merging. It is how libraries let you extend global types (like `Window`). Type aliases cannot be merged; redeclaring one is an error.',
      hints: ['How do libraries add properties to `Window`?'],
      tags: ['declaration-merging'],
    },
    {
      id: 'ts-q12',
      unitId: 'ts-generics',
      topic: 'constraints',
      difficulty: 3,
      type: 'mcq',
      prompt: 'Given `function len<T extends { length: number }>(x: T) { return x.length; }`, which call is a type error?',
      options: ["len('hello')", 'len([1, 2, 3])', 'len({ length: 4 })', 'len(42)'],
      answer: 3,
      explanation: 'The constraint requires a `length: number` property. Strings, arrays and that object literal all have one; numbers do not.',
      hints: ['Which argument has no `length`?'],
      tags: ['extends', 'constraints'],
    },
    {
      id: 'ts-q13',
      unitId: 'ts-advanced',
      topic: 'discriminated-unions',
      difficulty: 3,
      type: 'order',
      prompt: 'Order these lines into a type-safe `area` function.',
      language: 'ts',
      lines: [
        "type Shape = { kind: 'circle'; r: number } | { kind: 'square'; side: number };",
        'function area(s: Shape): number {',
        '  switch (s.kind) {',
        "    case 'circle': return Math.PI * s.r ** 2;",
        "    case 'square': return s.side ** 2;",
        '  }',
        '}',
      ],
      explanation: 'Switching on the shared `kind` field narrows `s` to one variant in each case, so `s.r` and `s.side` are safe.',
      hints: ['The type has to exist before the function that uses it.'],
      tags: ['switch', 'narrowing'],
    },
    {
      id: 'ts-q14',
      unitId: 'ts-advanced',
      topic: 'discriminated-unions',
      difficulty: 4,
      type: 'mcq',
      prompt: 'Why assign the value to a `never` variable in the `default` branch of a switch over a union?',
      options: [
        'It makes the switch run faster',
        'It turns off type checking in that branch',
        'The compiler errors if a new union member is added and not handled',
        'It is required for the code to compile',
      ],
      answer: 2,
      explanation: 'If every case is handled, the value in `default` has type `never`. Add a new variant without a case and it is no longer `never`, so the assignment fails to compile: an exhaustiveness check.',
      hints: ['What type is left after every case has been handled?'],
      tags: ['never', 'exhaustiveness'],
    },
    {
      id: 'ts-q15',
      unitId: 'ts-objects',
      topic: 'classes',
      difficulty: 3,
      type: 'output',
      language: 'ts',
      prompt: 'What does this log?',
      code: code`
        class Point {
          constructor(public x: number, private y: number) {}
          sum() {
            return this.x + this.y;
          }
        }
        const p = new Point(2, 3);
        console.log(p.x, p.sum());
      `,
      options: ['2 5', '2 undefined', 'undefined 5', '2 23'],
      answer: 0,
      explanation: 'Parameter properties (`public x`, `private y`) declare and assign fields in one step. `private` is a compile-time rule; the value is still stored.',
      hints: ['`public x: number` in a constructor does more than declare a parameter.'],
      tags: ['parameter-properties', 'classes'],
    },
    {
      id: 'ts-q16',
      unitId: 'ts-generics',
      topic: 'keyof',
      difficulty: 2,
      type: 'fill_blank',
      prompt: 'Complete the type so `UserKey` is `"id" | "name"`.',
      language: 'ts',
      code: 'interface User { id: number; name: string }\ntype UserKey = ___ User;',
      answer: 'keyof',
      explanation: '`keyof T` produces a union of the property names of `T`.',
      hints: ['It is an operator that works on types, not values.'],
      tags: ['keyof'],
    },
    {
      id: 'ts-q17',
      unitId: 'ts-advanced',
      topic: 'config',
      difficulty: 2,
      type: 'mcq',
      prompt: 'Which tsconfig option stops `null` and `undefined` from being assignable to every type?',
      options: ['noImplicitAny', 'strictNullChecks', 'noUnusedLocals', 'isolatedModules'],
      answer: 1,
      explanation: '`strictNullChecks` (part of `strict`) makes `null` and `undefined` their own types, which catches a whole class of "cannot read property of undefined" bugs.',
      hints: ['The answer has "null" in the name.'],
      tags: ['tsconfig', 'strict'],
    },
    {
      id: 'ts-q18',
      unitId: 'ts-basics',
      topic: 'inference',
      difficulty: 3,
      type: 'mcq',
      prompt: "What does `as const` do in `const sizes = ['sm', 'md'] as const`?",
      options: [
        'Makes the variable impossible to reassign',
        "Infers `readonly ['sm', 'md']` instead of `string[]`",
        'Converts the array to an enum',
        'Freezes the array at runtime',
      ],
      answer: 1,
      explanation: '`as const` keeps the narrowest literal types and makes them readonly. It changes types only; use `Object.freeze` for runtime immutability.',
      hints: ['It affects inference, not runtime behaviour.'],
      tags: ['as-const', 'literal-types'],
    },
    {
      id: 'ts-q19',
      unitId: 'ts-basics',
      topic: 'unions',
      difficulty: 3,
      type: 'output',
      language: 'ts',
      prompt: 'What does this log?',
      code: code`
        const config: { retries?: number } = { retries: 0 };
        console.log(config.retries || 3, config.retries ?? 3);
      `,
      options: ['3 0', '0 0', '3 3', '0 3'],
      answer: 0,
      explanation: '`||` falls back for any falsy value, including 0. `??` only falls back for `null` or `undefined`, so it keeps the 0.',
      hints: ['Is 0 falsy? Is 0 nullish?'],
      tags: ['nullish-coalescing'],
    },
    {
      id: 'ts-q20',
      unitId: 'ts-advanced',
      topic: 'narrowing',
      difficulty: 3,
      type: 'multi',
      prompt: 'Which of these narrow a union type inside an `if`?',
      options: ["typeof x === 'string'", 'x instanceof Date', "'id' in x", 'x as string'],
      answers: [0, 1, 2],
      explanation: '`typeof`, `instanceof` and `in` are all type guards. `as` is a type assertion: it tells the compiler to trust you and checks nothing.',
      hints: ['One of these only changes what the compiler believes.'],
      tags: ['type-guards', 'assertions'],
    },
  ]),

  exercises: [
    {
      id: 'ts-ex01',
      track: 'ts',
      unitId: 'ts-basics',
      title: 'Type the price formatter',
      prompt: 'This JavaScript works, but under `strict` its parameters are implicitly `any`. Add types: `amount` is a number, `currency` is one of "USD", "EUR" or "INR", and it returns a string.',
      kind: 'add_types',
      language: 'ts',
      starterCode: code`
        function formatPrice(amount, currency) {
          const symbols = { USD: '$', EUR: '€', INR: '₹' };
          return symbols[currency] + amount.toFixed(2);
        }
      `,
      solution: code`
        type Currency = 'USD' | 'EUR' | 'INR';

        function formatPrice(amount: number, currency: Currency): string {
          const symbols: Record<Currency, string> = { USD: '$', EUR: '€', INR: '₹' };
          return symbols[currency] + amount.toFixed(2);
        }
      `,
      tests: [
        { name: 'dollars', code: "expect(formatPrice(5, 'USD')).toBe('$5.00');" },
        { name: 'rupees', code: "expect(formatPrice(99.5, 'INR')).toBe('₹99.50');" },
      ],
      hints: [
        'Start with a union type for the three currency codes.',
        'Annotate both parameters and the return type. Type `symbols` with `Record<Currency, string>` so indexing it is allowed.',
        "type Currency = 'USD' | 'EUR' | 'INR';\nfunction formatPrice(amount: number, currency: Currency): string { ... }",
      ],
      xp: 20,
    },
    {
      id: 'ts-ex02',
      track: 'ts',
      unitId: 'ts-generics',
      title: 'Generic pluck',
      prompt: 'Write `pluck(items, key)` that returns the value of `key` from every item. It must be generic: `pluck(users, "name")` should return `string[]`, and an unknown key should be a type error.',
      kind: 'write_function',
      language: 'ts',
      starterCode: code`
        function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
          // your code here
          return [];
        }
      `,
      solution: code`
        function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
          return items.map((item) => item[key]);
        }
      `,
      tests: [
        {
          name: 'plucks names',
          code: "expect(pluck([{ name: 'Ada', age: 36 }, { name: 'Lin', age: 29 }], 'name')).toEqual(['Ada', 'Lin']);",
        },
        { name: 'plucks numbers', code: "expect(pluck([{ n: 1 }, { n: 2 }], 'n')).toEqual([1, 2]);" },
        { name: 'empty list', code: "expect(pluck([] as { a: number }[], 'a')).toEqual([]);" },
      ],
      hints: [
        'The signature is done for you. You only need the body.',
        'Transform every item into one of its properties with `map`.',
        'return items.map((item) => item[___]);',
      ],
      xp: 25,
    },
    {
      id: 'ts-ex03',
      track: 'ts',
      unitId: 'ts-advanced',
      title: 'Exhaustive shapes',
      prompt: 'Implement `area(shape)` for every variant of `Shape`. Add a `never` check in `default` so that adding a new shape later causes a compile error.',
      kind: 'write_function',
      language: 'ts',
      starterCode: code`
        type Shape =
          | { kind: 'circle'; radius: number }
          | { kind: 'rect'; width: number; height: number }
          | { kind: 'triangle'; base: number; height: number };

        function area(shape: Shape): number {
          // your code here
          return 0;
        }
      `,
      solution: code`
        type Shape =
          | { kind: 'circle'; radius: number }
          | { kind: 'rect'; width: number; height: number }
          | { kind: 'triangle'; base: number; height: number };

        function area(shape: Shape): number {
          switch (shape.kind) {
            case 'circle':
              return Math.PI * shape.radius ** 2;
            case 'rect':
              return shape.width * shape.height;
            case 'triangle':
              return (shape.base * shape.height) / 2;
            default: {
              const unhandled: never = shape;
              throw new Error('Unknown shape: ' + JSON.stringify(unhandled));
            }
          }
        }
      `,
      tests: [
        { name: 'rect', code: "expect(area({ kind: 'rect', width: 3, height: 4 })).toBe(12);" },
        { name: 'triangle', code: "expect(area({ kind: 'triangle', base: 10, height: 3 })).toBe(15);" },
        {
          name: 'circle',
          code: "expect(Math.round(area({ kind: 'circle', radius: 1 }) * 100)).toBe(314);",
        },
      ],
      hints: [
        'Switch on the field every variant shares.',
        'Each `case` narrows `shape`, so you can read `radius`, `width` or `base` safely inside it.',
        "default: {\n  const unhandled: never = shape;\n  throw new Error('Unknown shape');\n}",
      ],
      xp: 30,
    },
  ],

  debugChallenges: [
    {
      id: 'ts-dbg01',
      track: 'ts',
      unitId: 'ts-objects',
      title: 'Optional property crash',
      prompt: 'Users without a nickname crash the greeting. Fix it so they are greeted by name.',
      language: 'ts',
      buggyCode: code`
        interface User {
          name: string;
          nickname?: string;
        }

        function greeting(user: User): string {
          return 'Hey ' + (user.nickname as string).toUpperCase();
        }
      `,
      fixedCode: code`
        interface User {
          name: string;
          nickname?: string;
        }

        function greeting(user: User): string {
          return 'Hey ' + (user.nickname ?? user.name).toUpperCase();
        }
      `,
      bugLines: [7],
      category: 'type',
      errorOutput: "TypeError: Cannot read properties of undefined (reading 'toUpperCase')",
      tests: [
        { name: 'uses nickname', code: "expect(greeting({ name: 'Ada', nickname: 'ace' })).toBe('Hey ACE');" },
        { name: 'falls back to name', code: "expect(greeting({ name: 'Lin' })).toBe('Hey LIN');" },
      ],
      explanation: 'The `as string` assertion silenced the compiler, but the value can still be undefined at runtime. Remove the assertion and handle the missing case with `??`.',
      xp: 15,
    },
    {
      id: 'ts-dbg02',
      track: 'ts',
      unitId: 'ts-advanced',
      title: 'typeof null strikes again',
      prompt: '`count(null)` should return 0, but it crashes. Fix the narrowing.',
      language: 'ts',
      buggyCode: code`
        function count(value: string[] | string | null): number {
          if (typeof value === 'object') {
            return (value as string[]).length;
          }
          return value ? 1 : 0;
        }
      `,
      fixedCode: code`
        function count(value: string[] | string | null): number {
          if (Array.isArray(value)) {
            return value.length;
          }
          return value ? 1 : 0;
        }
      `,
      bugLines: [2, 3],
      category: 'type',
      tests: [
        { name: 'array', code: "expect(count(['a', 'b'])).toBe(2);" },
        { name: 'string', code: "expect(count('a')).toBe(1);" },
        { name: 'null', code: 'expect(count(null)).toBe(0);' },
      ],
      explanation: '`typeof null` is "object", so null slipped into the array branch, and the `as` cast hid the warning. `Array.isArray` is a precise type guard.',
      xp: 20,
    },
    {
      id: 'ts-dbg03',
      track: 'ts',
      unitId: 'ts-basics',
      title: 'Numbers that are secretly strings',
      prompt: '`parseNumbers("1,2,3")` should give numbers that add up to 6. The sum comes out as "0123". Fix it.',
      language: 'ts',
      buggyCode: code`
        function parseNumbers(input: string): number[] {
          return input.split(',') as unknown as number[];
        }

        function total(input: string): number {
          return parseNumbers(input).reduce((sum, n) => sum + n, 0);
        }
      `,
      fixedCode: code`
        function parseNumbers(input: string): number[] {
          return input.split(',').map(Number);
        }

        function total(input: string): number {
          return parseNumbers(input).reduce((sum, n) => sum + n, 0);
        }
      `,
      bugLines: [2],
      category: 'type',
      tests: [
        { name: 'adds up', code: "expect(total('1,2,3')).toBe(6);" },
        { name: 'real numbers', code: "expect(typeof parseNumbers('4')[0]).toBe('number');" },
      ],
      explanation: 'A double assertion (`as unknown as`) lets you claim anything. The values were still strings, so `+` concatenated. Convert them for real with `.map(Number)`.',
      xp: 20,
    },
  ],

  project: {
    id: 'ts-proj-form',
    track: 'ts',
    title: 'Typed form validator',
    description: 'Build a small, fully typed validation library like the ones behind real sign-up forms.',
    language: 'ts',
    xp: 70,
    checkpoints: [
      {
        id: 'form-1',
        title: 'Rules',
        instructions: 'A `Rule<T>` returns an error message or null. Implement `required` (empty or whitespace is an error) and `minLength(min)`.',
        starterCode: code`
          type Rule<T> = (value: T) => string | null;

          const required: Rule<string> = (value) => null;

          function minLength(min: number): Rule<string> {
            return (value) => null;
          }
        `,
        solution: formStep1,
        tests: [
          { name: 'required: empty', code: "expect(required('  ')).toBe('Required');" },
          { name: 'required: ok', code: "expect(required('Ada')).toBe(null);" },
          { name: 'minLength: short', code: "expect(minLength(8)('abc')).toBe('Must be at least 8 characters');" },
          { name: 'minLength: ok', code: "expect(minLength(3)('abcd')).toBe(null);" },
        ],
      },
      {
        id: 'form-2',
        title: 'Validate a whole form',
        instructions: 'Implement `validate(values, schema)`. It runs each field\'s rule and returns an object with an error message for each failing field.',
        starterCode: code`
          ${formStep1}

          type Schema<T> = { [K in keyof T]: Rule<T[K]> };
          type Errors<T> = Partial<Record<keyof T, string>>;

          function validate<T>(values: T, schema: Schema<T>): Errors<T> {
            // your code here
            return {};
          }
        `,
        solution: formStep2,
        tests: [
          {
            name: 'reports failing fields',
            code: "expect(validate({ name: '', password: 'abc' }, { name: required, password: minLength(8) })).toEqual({ name: 'Required', password: 'Must be at least 8 characters' });",
          },
          {
            name: 'valid form has no errors',
            code: "expect(validate({ name: 'Ada' }, { name: required })).toEqual({});",
          },
        ],
      },
      {
        id: 'form-3',
        title: 'Combine rules',
        instructions: 'Add `all(...rules)` that runs rules in order and returns the first error, so one field can have several rules.',
        starterCode: code`
          ${formStep2}

          function all<T>(...rules: Rule<T>[]): Rule<T> {
            return (value) => null;
          }
        `,
        solution: formStep3,
        tests: [
          { name: 'first error wins', code: "expect(all(required, minLength(8))('')).toBe('Required');" },
          { name: 'second rule', code: "expect(all(required, minLength(8))('abc')).toBe('Must be at least 8 characters');" },
          { name: 'passes', code: "expect(all(required, minLength(3))('abcd')).toBe(null);" },
        ],
      },
    ],
  },
};
