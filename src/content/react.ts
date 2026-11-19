import { code, seedQuestions } from '@/content/helpers';
import type { TrackContent } from '@/types/content';

const todoStep1 = code`
  function todosReducer(state, action) {
    switch (action.type) {
      case 'add': {
        const id = state.reduce((max, t) => Math.max(max, t.id), 0) + 1;
        return [...state, { id, text: action.text, done: false }];
      }
      default:
        return state;
    }
  }
`;

const todoStep2 = code`
  function todosReducer(state, action) {
    switch (action.type) {
      case 'add': {
        const id = state.reduce((max, t) => Math.max(max, t.id), 0) + 1;
        return [...state, { id, text: action.text, done: false }];
      }
      case 'toggle':
        return state.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t));
      case 'remove':
        return state.filter((t) => t.id !== action.id);
      default:
        return state;
    }
  }
`;

const todoStep3 = code`
  ${todoStep2}

  function TodoView({ todos }) {
    const left = todos.filter((t) => !t.done).length;
    return (
      <section>
        <ul>
          {todos.map((t) => (
            <li key={t.id} className={t.done ? 'done' : undefined}>
              {t.text}
            </li>
          ))}
        </ul>
        <p>{left} left</p>
      </section>
    );
  }
`;

export const reactContent: TrackContent = {
  track: {
    id: 'react',
    title: 'React',
    tagline: 'Build interfaces from components, state and hooks.',
    order: 3,
  },

  units: [
    {
      id: 'react-jsx',
      track: 'react',
      level: 'beginner',
      order: 1,
      title: 'JSX & Components',
      summary: 'Writing JSX, composing components and passing props.',
      topics: ['jsx', 'components', 'props'],
    },
    {
      id: 'react-state',
      track: 'react',
      level: 'beginner',
      order: 2,
      title: 'State & Lists',
      summary: 'useState, events, rendering lists and immutable updates.',
      topics: ['state', 'events', 'lists', 'immutability'],
    },
    {
      id: 'react-hooks',
      track: 'react',
      level: 'intermediate',
      order: 3,
      title: 'Effects & Hooks',
      summary: 'useEffect, refs, the rules of hooks and custom hooks.',
      topics: ['effects', 'refs', 'rules-of-hooks', 'custom-hooks'],
    },
    {
      id: 'react-advanced',
      track: 'react',
      level: 'advanced',
      order: 4,
      title: 'Context & Performance',
      summary: 'Sharing state, memoization and component patterns.',
      topics: ['context', 'performance', 'patterns'],
    },
  ],

  lessons: [
    {
      id: 'react-jsx-l1',
      unitId: 'react-jsx',
      order: 1,
      title: 'Components are functions',
      minutes: 5,
      blocks: [
        {
          kind: 'text',
          text: 'A component is a function that takes props and returns JSX. Its name must start with a capital letter so React can tell it apart from HTML tags.',
        },
        {
          kind: 'code',
          language: 'jsx',
          code: code`
            function Avatar({ src, name }) {
              return <img className="avatar" src={src} alt={name} />;
            }

            function Profile() {
              return (
                <div>
                  <Avatar src="/ada.png" name="Ada" />
                  <h2>Ada Lovelace</h2>
                </div>
              );
            }
          `,
        },
        {
          kind: 'tip',
          text: 'JSX uses `className` instead of `class`, and curly braces `{ }` to embed any JavaScript expression.',
        },
      ],
    },
    {
      id: 'react-state-l1',
      unitId: 'react-state',
      order: 1,
      title: 'State and immutable updates',
      minutes: 7,
      blocks: [
        {
          kind: 'code',
          language: 'jsx',
          code: code`
            function TodoList() {
              const [todos, setTodos] = useState([]);

              function add(text) {
                // Create a new array; never push into the old one
                setTodos((prev) => [...prev, { id: Date.now(), text }]);
              }

              return (
                <ul>
                  {todos.map((t) => (
                    <li key={t.id}>{t.text}</li>
                  ))}
                </ul>
              );
            }
          `,
        },
        {
          kind: 'text',
          text: 'React decides whether to re-render by comparing the old and new state with `Object.is`. If you mutate the existing array, it looks unchanged and nothing updates.',
        },
      ],
    },
    {
      id: 'react-hooks-l1',
      unitId: 'react-hooks',
      order: 1,
      title: 'Effects synchronize with the outside world',
      minutes: 8,
      blocks: [
        {
          kind: 'code',
          language: 'jsx',
          code: code`
            function ChatRoom({ roomId }) {
              useEffect(() => {
                const connection = connect(roomId);
                return () => connection.close(); // cleanup
              }, [roomId]); // re-run only when roomId changes

              return <h1>Room {roomId}</h1>;
            }
          `,
        },
        {
          kind: 'text',
          text: 'Call hooks at the top level of a component or custom hook, never inside conditions or loops. React relies on the call order being the same on every render.',
        },
      ],
    },
    {
      id: 'react-advanced-l1',
      unitId: 'react-advanced',
      order: 1,
      title: 'Context and memoization',
      minutes: 8,
      blocks: [
        {
          kind: 'code',
          language: 'jsx',
          code: code`
            const ThemeContext = createContext('light');

            function App() {
              return (
                <ThemeContext.Provider value="dark">
                  <Toolbar />
                </ThemeContext.Provider>
              );
            }

            function Button() {
              const theme = useContext(ThemeContext); // "dark"
              return <button className={theme}>Save</button>;
            }
          `,
        },
        {
          kind: 'tip',
          text: 'Reach for `useMemo`, `useCallback` and `memo` after you measure a slow render, not before. They add complexity.',
        },
      ],
    },
  ],

  questions: seedQuestions('react', [
    {
      id: 'react-q01',
      unitId: 'react-jsx',
      topic: 'jsx',
      difficulty: 1,
      type: 'mcq',
      prompt: 'Which attribute sets a CSS class on an element in JSX?',
      options: ['class', 'className', 'cssClass', 'styleClass'],
      answer: 1,
      explanation: '`class` is a reserved word in JavaScript, so JSX uses the DOM property name `className`.',
      hints: ['JSX follows DOM property names.'],
      tags: ['className'],
    },
    {
      id: 'react-q02',
      unitId: 'react-jsx',
      topic: 'components',
      difficulty: 1,
      type: 'true_false',
      prompt: 'A component named `profileCard` (lowercase) will render as your component when used as `<profileCard />`.',
      answer: false,
      explanation: 'Lowercase JSX tags are treated as HTML elements, so React would create an unknown `<profilecard>` element. Component names must start with a capital letter.',
      hints: ['How does React tell `<div>` apart from `<Button>`?'],
      tags: ['naming'],
    },
    {
      id: 'react-q03',
      unitId: 'react-state',
      topic: 'state',
      difficulty: 1,
      type: 'fill_blank',
      prompt: 'Fill in the hook that adds a piece of state to a component.',
      language: 'jsx',
      code: 'const [count, setCount] = ___(0);',
      answer: 'useState',
      accept: ['React.useState'],
      explanation: '`useState` returns the current value and a setter function. The argument is the initial value.',
      hints: ['It returns a pair: value and setter.'],
      tags: ['useState'],
    },
    {
      id: 'react-q04',
      unitId: 'react-state',
      topic: 'immutability',
      difficulty: 3,
      type: 'output',
      language: 'js',
      prompt: 'React compares state with `Object.is`. What does this log, and would React re-render after `setState(next)`?',
      code: code`
        const state = { items: [1] };
        const next = state;
        next.items.push(2);
        console.log(Object.is(state, next), state.items.length);
      `,
      options: ['true 2', 'false 2', 'true 1', 'false 1'],
      answer: 0,
      explanation: '`next` is the same object, so `Object.is` is true and React skips the re-render, even though the data changed. Create a new object instead: `{ ...state, items: [...state.items, 2] }`.',
      hints: ['Does `const next = state` copy anything?'],
      tags: ['Object.is', 'mutation'],
    },
    {
      id: 'react-q05',
      unitId: 'react-hooks',
      topic: 'effects',
      difficulty: 2,
      type: 'mcq',
      prompt: 'When does `useEffect(fn, [])` run `fn`?',
      options: [
        'Before every render',
        'Once, after the component first appears on screen',
        'Every time any state changes',
        'Only when the component is removed',
      ],
      answer: 1,
      explanation: 'An empty dependency array means "no dependencies can change", so the effect runs once after mount. Its cleanup function runs on unmount. (In development, Strict Mode runs it twice to help find bugs.)',
      hints: ['The array lists what should trigger a re-run.'],
      tags: ['useEffect', 'dependencies'],
    },
    {
      id: 'react-q06',
      unitId: 'react-state',
      topic: 'lists',
      difficulty: 2,
      type: 'bug_find',
      prompt: 'React logs a warning for this component. Tap the line that causes it.',
      language: 'jsx',
      code: code`
        function List({ items }) {
          return (
            <ul>
              {items.map((item) => <li>{item.name}</li>)}
            </ul>
          );
        }
      `,
      bugLine: 4,
      explanation: 'Each item in a list needs a stable, unique `key` prop, e.g. `<li key={item.id}>`. Keys let React match items between renders.',
      hints: ['What prop does every list item need?'],
      tags: ['key'],
    },
    {
      id: 'react-q07',
      unitId: 'react-state',
      topic: 'state',
      difficulty: 3,
      type: 'multi',
      prompt: 'Which of these cause a component to re-render?',
      options: [
        'Calling its state setter with a new value',
        'Its parent component re-renders',
        'A context value it reads changes',
        'Assigning a new value to `ref.current`',
      ],
      answers: [0, 1, 2],
      explanation: 'State changes, parent renders and context changes all trigger renders. Refs are deliberately outside the render cycle: changing `ref.current` never re-renders.',
      hints: ['One of these is designed to store values without rendering.'],
      tags: ['rendering'],
    },
    {
      id: 'react-q08',
      unitId: 'react-jsx',
      topic: 'props',
      difficulty: 1,
      type: 'mcq',
      prompt: 'What should a component do with the props it receives?',
      options: [
        'Change them directly when needed',
        'Treat them as read-only',
        'Copy them into state on every render',
        'Pass them back up to the parent',
      ],
      answer: 1,
      explanation: 'Props are owned by the parent. A component should never modify them; to change something, the parent passes a callback or the component keeps its own state.',
      hints: ['Who owns the props?'],
      tags: ['props'],
    },
    {
      id: 'react-q09',
      unitId: 'react-hooks',
      topic: 'refs',
      difficulty: 2,
      type: 'match',
      prompt: 'Match each hook to its job.',
      pairs: [
        { left: 'useState', right: 'Stores a value that triggers a re-render when it changes' },
        { left: 'useEffect', right: 'Syncs with something outside React after render' },
        { left: 'useRef', right: 'Keeps a mutable value or DOM node without re-rendering' },
        { left: 'useMemo', right: 'Caches the result of a calculation between renders' },
      ],
      explanation: 'These four hooks cover most component logic.',
      hints: ['Which hook does not cause re-renders?'],
      tags: ['hooks'],
    },
    {
      id: 'react-q10',
      unitId: 'react-state',
      topic: 'state',
      difficulty: 3,
      type: 'mcq',
      prompt: 'A click handler calls `setCount(count + 1)` three times in a row. `count` was 0. What is it after the re-render?',
      options: ['3', '1', '0', 'It throws an error'],
      answer: 1,
      explanation: '`count` is 0 for the whole handler, so all three calls set it to 1. To increment three times, use the updater form: `setCount((c) => c + 1)`.',
      hints: ['What is the value of `count` inside this one render?'],
      tags: ['batching', 'updater-function'],
    },
    {
      id: 'react-q11',
      unitId: 'react-hooks',
      topic: 'custom-hooks',
      difficulty: 2,
      type: 'order',
      prompt: 'Put these lines in order to build a `useToggle` custom hook.',
      language: 'jsx',
      lines: [
        'function useToggle(initial = false) {',
        '  const [on, setOn] = useState(initial);',
        '  const toggle = () => setOn((v) => !v);',
        '  return [on, toggle];',
        '}',
      ],
      explanation: 'A custom hook is a function whose name starts with `use` and that calls other hooks. It returns whatever its callers need.',
      hints: ['State must exist before `toggle` can update it.'],
      tags: ['custom-hooks'],
    },
    {
      id: 'react-q12',
      unitId: 'react-hooks',
      topic: 'rules-of-hooks',
      difficulty: 2,
      type: 'true_false',
      prompt: 'It is fine to call `useState` inside an `if` block as long as the condition is usually true.',
      answer: false,
      explanation: 'React identifies each hook by its call order. A conditional hook can shift that order between renders and mix up state. Always call hooks at the top level.',
      hints: ['How does React know which state belongs to which `useState` call?'],
      tags: ['rules-of-hooks'],
    },
    {
      id: 'react-q13',
      unitId: 'react-advanced',
      topic: 'performance',
      difficulty: 3,
      type: 'mcq',
      prompt: 'What does `useMemo(() => expensive(items), [items])` do?',
      options: [
        'Runs `expensive` in a background thread',
        'Re-computes the value only when `items` changes',
        'Prevents the component from re-rendering',
        'Saves the value to localStorage',
      ],
      answer: 1,
      explanation: '`useMemo` caches a computed value and recomputes it when a dependency changes. The component still re-renders; it just skips the expensive work.',
      hints: ['"Memo" is short for memoize.'],
      tags: ['useMemo'],
    },
    {
      id: 'react-q14',
      unitId: 'react-advanced',
      topic: 'performance',
      difficulty: 3,
      type: 'mcq',
      prompt: 'When does a component wrapped in `memo()` skip re-rendering?',
      options: [
        'Always, after its first render',
        'When its props are shallowly equal to the previous props',
        'When its own state has not changed',
        'When it is not visible on screen',
      ],
      answer: 1,
      explanation: '`memo` compares each prop with `Object.is`. Passing a new object or inline function every render defeats it, which is why `useCallback` and `useMemo` are often used together with `memo`.',
      hints: ['It looks at props only.'],
      tags: ['memo'],
    },
    {
      id: 'react-q15',
      unitId: 'react-hooks',
      topic: 'effects',
      difficulty: 3,
      type: 'bug_find',
      prompt: 'This component sends requests in an endless loop. Tap the line that causes it.',
      language: 'jsx',
      code: code`
        function Users() {
          const [users, setUsers] = useState([]);
          useEffect(() => {
            fetch('/api/users').then((r) => r.json()).then(setUsers);
          });
          return <UserList users={users} />;
        }
      `,
      bugLine: 5,
      explanation: 'With no dependency array the effect runs after every render. Each fetch sets new state, which renders, which fetches again. Pass `[]` to fetch once.',
      hints: ['How often does an effect with no second argument run?'],
      tags: ['useEffect', 'infinite-loop'],
    },
    {
      id: 'react-q16',
      unitId: 'react-advanced',
      topic: 'context',
      difficulty: 2,
      type: 'fill_blank',
      prompt: 'Read the current theme from context.',
      language: 'jsx',
      code: 'const theme = ___(ThemeContext);',
      answer: 'useContext',
      accept: ['React.useContext', 'use'],
      explanation: '`useContext` returns the value from the nearest matching Provider above the component. React 19 also offers `use(ThemeContext)`.',
      hints: ['The hook name includes the word "Context".'],
      tags: ['useContext'],
    },
    {
      id: 'react-q17',
      unitId: 'react-state',
      topic: 'events',
      difficulty: 2,
      type: 'mcq',
      prompt: 'What makes `<input>` a controlled component?',
      options: [
        'Giving it an `id`',
        'Setting `value` from state and updating that state in `onChange`',
        'Wrapping it in a `<form>`',
        'Reading its value with a ref on submit',
      ],
      answer: 1,
      explanation: 'In a controlled input React state is the single source of truth: `value={text}` plus `onChange={(e) => setText(e.target.value)}`. Reading via a ref is the uncontrolled approach.',
      hints: ['Who owns the current value?'],
      tags: ['forms', 'controlled-input'],
    },
    {
      id: 'react-q18',
      unitId: 'react-state',
      topic: 'immutability',
      difficulty: 4,
      type: 'output',
      language: 'js',
      prompt: 'What does this log?',
      code: code`
        const user = { name: 'Ada', prefs: { dark: false } };
        const next = { ...user, name: 'Lin' };
        next.prefs.dark = true;
        console.log(user.name, user.prefs.dark);
      `,
      options: ['Ada true', 'Ada false', 'Lin true', 'Lin false'],
      answer: 0,
      explanation: 'Spread makes a shallow copy. `name` is copied, but `prefs` still points to the same object, so changing it also changes `user`. Copy nested objects too: `{ ...user, prefs: { ...user.prefs, dark: true } }`.',
      hints: ['How deep does `...` copy?'],
      tags: ['spread', 'shallow-copy'],
    },
    {
      id: 'react-q19',
      unitId: 'react-hooks',
      topic: 'refs',
      difficulty: 2,
      type: 'mcq',
      prompt: 'You need to store a timer ID between renders without causing a re-render. What should you use?',
      options: ['useState', 'useRef', 'A global variable', 'useMemo'],
      answer: 1,
      explanation: '`useRef` gives you a mutable box (`ref.current`) that persists for the life of the component and does not trigger renders.',
      hints: ['The value does not affect what is displayed.'],
      tags: ['useRef'],
    },
    {
      id: 'react-q20',
      unitId: 'react-advanced',
      topic: 'patterns',
      difficulty: 2,
      type: 'mcq',
      prompt: 'Two sibling components need to share the same piece of state. Where should it live?',
      options: [
        'Duplicated in both siblings',
        'In their closest common parent, passed down as props',
        'In a global variable',
        'In whichever sibling renders first',
      ],
      answer: 1,
      explanation: 'This is "lifting state up". The parent owns the state and passes the value and an updater to each child. Use context only when many levels would need the props.',
      hints: ['Data flows down in React.'],
      tags: ['lifting-state'],
    },
  ]),

  exercises: [
    {
      id: 'react-ex01',
      track: 'react',
      unitId: 'react-jsx',
      title: 'Your first component',
      prompt: 'Write a `Greeting` component that renders `<h1>Hello, NAME!</h1>` using its `name` prop.',
      kind: 'write_function',
      language: 'jsx',
      starterCode: code`
        function Greeting({ name }) {
          return null;
        }
      `,
      solution: code`
        function Greeting({ name }) {
          return <h1>Hello, {name}!</h1>;
        }
      `,
      tests: [
        { name: 'greets Ada', code: "expect(render(<Greeting name=\"Ada\" />)).toBe('<h1>Hello, Ada!</h1>');" },
        { name: 'greets Lin', code: "expect(render(<Greeting name=\"Lin\" />)).toBe('<h1>Hello, Lin!</h1>');" },
      ],
      hints: [
        'Return JSX instead of `null`.',
        'Use curly braces to put the `name` prop inside the text.',
        'return <h1>Hello, {___}!</h1>;',
      ],
      xp: 15,
    },
    {
      id: 'react-ex02',
      track: 'react',
      unitId: 'react-state',
      title: 'Render a todo list',
      prompt: 'Render `todos` as a `<ul>` of `<li>` items with keys. Finished todos get `className="done"`. With no todos, render `<p>Nothing to do</p>` instead.',
      kind: 'write_function',
      language: 'jsx',
      starterCode: code`
        function TodoList({ todos }) {
          return <ul></ul>;
        }
      `,
      solution: code`
        function TodoList({ todos }) {
          if (todos.length === 0) return <p>Nothing to do</p>;
          return (
            <ul>
              {todos.map((t) => (
                <li key={t.id} className={t.done ? 'done' : undefined}>
                  {t.text}
                </li>
              ))}
            </ul>
          );
        }
      `,
      tests: [
        { name: 'empty state', code: "expect(render(<TodoList todos={[]} />)).toBe('<p>Nothing to do</p>');" },
        {
          name: 'renders items',
          code: "const todos = [{ id: 1, text: 'Write code', done: false }, { id: 2, text: 'Ship it', done: true }];\nexpect(render(<TodoList todos={todos} />)).toBe('<ul><li>Write code</li><li class=\"done\">Ship it</li></ul>');",
        },
      ],
      hints: [
        'Handle the empty case first with an early return.',
        'Use `todos.map` to turn each todo into an `<li>`, and give each one `key={t.id}`.',
        "<li key={t.id} className={t.done ? 'done' : undefined}>{t.text}</li>",
      ],
      xp: 25,
    },
    {
      id: 'react-ex03',
      track: 'react',
      unitId: 'react-state',
      title: 'Immutable cart reducer',
      prompt: 'Write `cartReducer(state, action)` for `useReducer`. `add` adds an item with `qty: 1`, or increases `qty` if it is already in the cart. `remove` removes it by id. Never mutate the old state: the tests freeze it.',
      kind: 'write_function',
      language: 'jsx',
      starterCode: code`
        function cartReducer(state, action) {
          // state looks like { items: [{ id, name, qty }] }
          return state;
        }
      `,
      solution: code`
        function cartReducer(state, action) {
          switch (action.type) {
            case 'add': {
              const exists = state.items.some((i) => i.id === action.item.id);
              const items = exists
                ? state.items.map((i) => (i.id === action.item.id ? { ...i, qty: i.qty + 1 } : i))
                : [...state.items, { ...action.item, qty: 1 }];
              return { ...state, items };
            }
            case 'remove':
              return { ...state, items: state.items.filter((i) => i.id !== action.id) };
            default:
              return state;
          }
        }
      `,
      tests: [
        {
          name: 'adds a new item',
          code: "const s = Object.freeze({ items: Object.freeze([]) });\nconst next = cartReducer(s, { type: 'add', item: { id: 1, name: 'Tea' } });\nexpect(next.items).toEqual([{ id: 1, name: 'Tea', qty: 1 }]);",
        },
        {
          name: 'increments quantity',
          code: "const s = Object.freeze({ items: Object.freeze([Object.freeze({ id: 1, name: 'Tea', qty: 1 })]) });\nconst next = cartReducer(s, { type: 'add', item: { id: 1, name: 'Tea' } });\nexpect(next.items[0].qty).toBe(2);\nexpect(s.items[0].qty).toBe(1);",
        },
        {
          name: 'removes an item',
          code: "const s = Object.freeze({ items: Object.freeze([{ id: 1, qty: 1 }, { id: 2, qty: 1 }]) });\nexpect(cartReducer(s, { type: 'remove', id: 1 }).items.map((i) => i.id)).toEqual([2]);",
        },
      ],
      hints: [
        'Switch on `action.type` and always return a brand new state object.',
        'For `add`, check with `some` whether the item exists. Use `map` to bump its quantity, or spread to append it.',
        "case 'remove':\n  return { ...state, items: state.items.filter((i) => i.id !== action.id) };",
      ],
      xp: 30,
    },
  ],

  debugChallenges: [
    {
      id: 'react-dbg01',
      track: 'react',
      unitId: 'react-state',
      title: 'The list never updates',
      prompt: 'Adding a todo changes the data, but the screen never updates. Fix the reducer.',
      language: 'jsx',
      buggyCode: code`
        function todosReducer(state, action) {
          if (action.type === 'add') {
            state.items.push({ text: action.text });
            return state;
          }
          return state;
        }
      `,
      fixedCode: code`
        function todosReducer(state, action) {
          if (action.type === 'add') {
            return { ...state, items: [...state.items, { text: action.text }] };
          }
          return state;
        }
      `,
      bugLines: [3, 4],
      category: 'react',
      tests: [
        {
          name: 'returns new state',
          code: "const s = { items: [] };\nconst next = todosReducer(s, { type: 'add', text: 'x' });\nexpect(next).not.toBe(s);\nexpect(next.items.length).toBe(1);",
        },
        {
          name: 'leaves old state alone',
          code: "const s = { items: [] };\ntodosReducer(s, { type: 'add', text: 'x' });\nexpect(s.items.length).toBe(0);",
        },
      ],
      explanation: 'Returning the same (mutated) object makes `Object.is(old, new)` true, so React bails out of the re-render. Return a new object with a new array.',
      xp: 20,
    },
    {
      id: 'react-dbg02',
      track: 'react',
      unitId: 'react-state',
      title: 'Read the warning',
      prompt: 'The console shows this warning when the list renders. Find the line responsible and fix it.',
      language: 'jsx',
      buggyCode: code`
        function Contacts({ people }) {
          return (
            <ul>
              {people.map((person) => (
                <li>{person.name}</li>
              ))}
            </ul>
          );
        }
      `,
      fixedCode: code`
        function Contacts({ people }) {
          return (
            <ul>
              {people.map((person) => (
                <li key={person.id}>{person.name}</li>
              ))}
            </ul>
          );
        }
      `,
      bugLines: [5],
      category: 'react',
      errorOutput: code`
        Warning: Each child in a list should have a unique "key" prop.

        Check the render method of \`Contacts\`.
            at li
            at Contacts (Contacts.jsx:5:9)
      `,
      explanation: 'Keys tell React which list item is which between renders. Use a stable id from the data. Avoid array indexes when items can be reordered or removed.',
      xp: 15,
    },
    {
      id: 'react-dbg03',
      track: 'react',
      unitId: 'react-hooks',
      title: 'Too many re-renders',
      prompt: 'This counter crashes as soon as it renders. Make it start at 0 and count up when the button is clicked.',
      language: 'jsx',
      buggyCode: code`
        import { useState } from 'react';

        function Counter() {
          const [count, setCount] = useState(0);
          setCount(count + 1);
          return <button>Clicked {count} times</button>;
        }
      `,
      fixedCode: code`
        import { useState } from 'react';

        function Counter() {
          const [count, setCount] = useState(0);
          return <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>;
        }
      `,
      bugLines: [5],
      category: 'react',
      errorOutput: 'Error: Too many re-renders. React limits the number of renders to prevent an infinite loop.',
      tests: [
        { name: 'renders without crashing', code: 'expect(() => render(<Counter />)).not.toThrow();' },
        { name: 'starts at 0', code: "expect(render(<Counter />)).toContain('Clicked 0 times');" },
      ],
      explanation: 'Setting state during render schedules another render, which sets state again, forever. State updates belong in event handlers or effects.',
      xp: 20,
    },
  ],

  project: {
    id: 'react-proj-todo',
    track: 'react',
    title: 'Todo app',
    description: 'Build the state logic and view for a todo app, the classic React rite of passage.',
    language: 'jsx',
    xp: 70,
    checkpoints: [
      {
        id: 'todo-1',
        title: 'Add todos',
        instructions: 'Write `todosReducer(state, action)`. State is an array of todos. On `{ type: "add", text }`, append `{ id, text, done: false }` where `id` is one more than the largest id so far.',
        starterCode: code`
          function todosReducer(state, action) {
            return state;
          }
        `,
        solution: todoStep1,
        tests: [
          {
            name: 'adds to empty list',
            code: "expect(todosReducer([], { type: 'add', text: 'Learn hooks' })).toEqual([{ id: 1, text: 'Learn hooks', done: false }]);",
          },
          {
            name: 'next id',
            code: "const s = [{ id: 4, text: 'a', done: true }];\nexpect(todosReducer(s, { type: 'add', text: 'b' })[1].id).toBe(5);",
          },
        ],
      },
      {
        id: 'todo-2',
        title: 'Toggle and remove',
        instructions: 'Handle `{ type: "toggle", id }` (flip `done`) and `{ type: "remove", id }` without mutating the old state.',
        starterCode: todoStep1,
        solution: todoStep2,
        tests: [
          {
            name: 'toggles',
            code: "const s = Object.freeze([Object.freeze({ id: 1, text: 'a', done: false })]);\nexpect(todosReducer(s, { type: 'toggle', id: 1 })[0].done).toBe(true);",
          },
          {
            name: 'removes',
            code: "const s = Object.freeze([{ id: 1, text: 'a', done: false }, { id: 2, text: 'b', done: false }]);\nexpect(todosReducer(s, { type: 'remove', id: 1 }).map((t) => t.id)).toEqual([2]);",
          },
        ],
      },
      {
        id: 'todo-3',
        title: 'The view',
        instructions: 'Write `TodoView({ todos })`: a `<section>` with a `<ul>` of todos (finished ones get `className="done"`) followed by `<p>N left</p>`.',
        starterCode: code`
          ${todoStep2}

          function TodoView({ todos }) {
            return <section></section>;
          }
        `,
        solution: todoStep3,
        tests: [
          {
            name: 'renders todos and count',
            code: "const todos = [{ id: 1, text: 'a', done: true }, { id: 2, text: 'b', done: false }];\nexpect(render(<TodoView todos={todos} />)).toBe('<section><ul><li class=\"done\">a</li><li>b</li></ul><p>1 left</p></section>');",
          },
        ],
      },
    ],
  },
};
