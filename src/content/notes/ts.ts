import { code, notesFor } from '@/content/helpers';

/** One short note per TypeScript topic, shown after a wrong quiz answer. */
export const tsNotes = notesFor('ts', [
  {
    topic: 'annotations',
    title: 'Type annotations',
    blocks: [
      {
        kind: 'text',
        text: 'Annotations describe what a value may hold. They exist only at compile time: TypeScript erases them, so nothing is checked when the code runs.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: code`
          let count: number = 0;
          const tags: string[] = ['a', 'b'];        // array, any length
          const ids: Array<number> = [1, 2];        // same thing
          const point: [number, number] = [3, 4];   // tuple: exactly two

          function greet(name: string): string {
            return 'Hi ' + name;
          }
        `,
      },
      { kind: 'tip', text: 'Data from APIs or forms is not checked by types. Validate it at runtime, for example with a schema library.' },
    ],
  },
  {
    topic: 'inference',
    title: 'Type inference and literal types',
    blocks: [
      {
        kind: 'text',
        text: 'TypeScript works out most types for you. A `const` keeps the exact literal type; a `let` widens it, because it could change later.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: code`
          const status = 'idle';   // type "idle"
          let mode = 'idle';       // type string

          const sizes = ['sm', 'md'] as const;
          // readonly ["sm", "md"]

          const total = [1, 2].reduce((s, n) => s + n, 0); // number
        `,
      },
      { kind: 'tip', text: 'Annotate function parameters and public return types; let inference handle local variables.' },
    ],
  },
  {
    topic: 'unions',
    title: 'Union types and ?? versus ||',
    blocks: [
      {
        kind: 'text',
        text: 'A union `A | B` means "one of these". Optional values are often `T | undefined`, and you pick a fallback with `??`.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: code`
          type Id = string | number;
          type Status = 'idle' | 'loading' | 'done';

          const saved: number | undefined = 0;
          saved || 10;  // 10: || replaces any falsy value, even 0
          saved ?? 10;  // 0:  ?? replaces only null or undefined
        `,
      },
    ],
  },
  {
    topic: 'special-types',
    title: 'any, unknown, never and void',
    blocks: [
      {
        kind: 'text',
        text: '`any` switches checking off. `unknown` also accepts anything, but makes you check the type before using it. `void` means a function returns nothing useful; `never` means a value can never exist.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: code`
          function parse(input: unknown) {
            if (typeof input === 'string') {
              return input.toUpperCase(); // safe: narrowed to string
            }
            return null;
          }

          function fail(message: string): never {
            throw new Error(message);
          }
        `,
      },
      { kind: 'tip', text: 'Prefer `unknown` over `any` for values you have not checked yet.' },
    ],
  },
  {
    topic: 'interfaces',
    title: 'Interfaces and type aliases',
    blocks: [
      {
        kind: 'text',
        text: 'Both describe object shapes. Interfaces can be extended and, if declared twice, merge into one. Type aliases can also name unions and other types, but cannot be redeclared.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: code`
          interface User {
            id: number;
            name: string;
          }
          interface Admin extends User {
            permissions: string[];
          }
          type Role = 'admin' | 'editor'; // only a type alias can do this
        `,
      },
    ],
  },
  {
    topic: 'optional',
    title: 'Optional properties',
    blocks: [
      {
        kind: 'text',
        text: 'A `?` makes a property optional, so its type includes `undefined`. With `strict` on, you must handle that case before using it.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: code`
          interface User {
            name: string;
            age?: number; // number | undefined
          }

          function describe(user: User) {
            // user.age.toFixed(0)  → error: possibly undefined
            return user.age?.toFixed(0) ?? 'unknown';
          }
        `,
      },
    ],
  },
  {
    topic: 'classes',
    title: 'Classes and parameter properties',
    blocks: [
      {
        kind: 'text',
        text: 'Writing `public`, `private` or `readonly` before a constructor parameter declares and assigns the field in one step. `private` is a compile-time rule only; use `#field` for true runtime privacy.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: code`
          class Point {
            constructor(public x: number, private y: number) {}
            sum() {
              return this.x + this.y;
            }
          }
          const p = new Point(1, 2);
          p.x;     // 1
          // p.y   → error, but the value is still stored
        `,
      },
    ],
  },
  {
    topic: 'enums',
    title: 'Enums',
    blocks: [
      {
        kind: 'text',
        text: 'Numeric enums count up from 0 and also map numbers back to names. Many teams prefer a union of string literals, which needs no runtime code.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: code`
          enum Direction { Up, Down, Left }
          Direction.Left;  // 2
          Direction[1];    // "Down"  (reverse mapping)

          type Dir = 'up' | 'down' | 'left'; // the common alternative
        `,
      },
    ],
  },
  {
    topic: 'generics',
    title: 'Generics',
    blocks: [
      {
        kind: 'text',
        text: 'A generic is a type parameter, like a function argument for types. It connects the input type to the output type so nothing is lost.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: code`
          function identity<T>(value: T): T {
            return value;
          }
          identity('hi'); // string
          identity(42);   // number

          function first<T>(items: T[]): T | undefined {
            return items[0];
          }
        `,
      },
      { kind: 'tip', text: 'If you reach for `any` to make a function reusable, a generic is usually the right tool.' },
    ],
  },
  {
    topic: 'constraints',
    title: 'Generic constraints',
    blocks: [
      {
        kind: 'text',
        text: '`T extends X` limits a generic to types that have the shape of `X`, so you can safely use those properties inside.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: code`
          function len<T extends { length: number }>(x: T) {
            return x.length;
          }
          len('hello');      // ok
          len([1, 2, 3]);    // ok
          len({ length: 2 }); // ok
          // len(42)         → error: number has no length
        `,
      },
    ],
  },
  {
    topic: 'keyof',
    title: 'keyof and indexed access',
    blocks: [
      {
        kind: 'text',
        text: '`keyof T` is a union of the property names of `T`. `T[K]` looks up the type of one property. Together they type functions that work with keys.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: code`
          interface User { id: number; name: string }
          type UserKey = keyof User;   // "id" | "name"
          type Name = User['name'];    // string

          function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {
            return obj[key];
          }
        `,
      },
    ],
  },
  {
    topic: 'narrowing',
    title: 'Narrowing with type guards',
    blocks: [
      {
        kind: 'text',
        text: 'Inside an `if`, checks like `typeof`, `instanceof` and `in` narrow a union to one member. `as` is not a check: it only tells the compiler to trust you.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: code`
          function format(x: string | number) {
            if (typeof x === 'string') {
              return x.trim();      // x: string
            }
            return x.toFixed(2);    // x: number
          }

          function isError(e: unknown): e is Error {
            return e instanceof Error;  // a custom type guard
          }
        `,
      },
    ],
  },
  {
    topic: 'discriminated-unions',
    title: 'Discriminated unions',
    blocks: [
      {
        kind: 'text',
        text: 'Give every variant a shared literal field such as `kind`. Switching on it narrows to one variant per case, and a `never` check in `default` catches cases you forgot.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: code`
          type Shape =
            | { kind: 'circle'; r: number }
            | { kind: 'square'; side: number };

          function area(s: Shape) {
            switch (s.kind) {
              case 'circle': return Math.PI * s.r ** 2;
              case 'square': return s.side ** 2;
              default: {
                const unreachable: never = s;
                return unreachable;
              }
            }
          }
        `,
      },
    ],
  },
  {
    topic: 'utility-types',
    title: 'Utility types',
    blocks: [
      {
        kind: 'text',
        text: 'Built-in utility types derive new types from existing ones, so you do not repeat yourself.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: code`
          interface User { id: number; name: string; email: string }

          type Update = Partial<User>;            // every field optional
          type Preview = Pick<User, 'id' | 'name'>;
          type NoEmail = Omit<User, 'email'>;
          type Locked = Readonly<User>;
          type ById = Record<number, User>;
        `,
      },
    ],
  },
  {
    topic: 'config',
    title: 'tsconfig and strict mode',
    blocks: [
      {
        kind: 'text',
        text: '`"strict": true` turns on the checks that catch the most bugs. The most important is `strictNullChecks`: `null` and `undefined` are no longer allowed everywhere.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: code`
          // tsconfig.json → { "compilerOptions": { "strict": true } }

          function findUser(id: number): { name: string } | undefined {
            return id === 1 ? { name: 'Lin' } : undefined;
          }
          const user = findUser(2);
          // user.name  → error: user is possibly undefined
          const name = user?.name ?? 'guest';
        `,
      },
      { kind: 'tip', text: 'Turn on `strict` at the start of a project. Adding it later means fixing hundreds of errors at once.' },
    ],
  },
]);
