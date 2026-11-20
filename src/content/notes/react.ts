import { code, notesFor } from '@/content/helpers';

/** One short note per React topic, shown after a wrong quiz answer. */
export const reactNotes = notesFor('react', [
  {
    topic: 'jsx',
    title: 'JSX basics',
    blocks: [
      {
        kind: 'text',
        text: 'JSX looks like HTML but is JavaScript. Use `className` instead of `class`, put any expression in `{ }`, and return a single parent (a fragment `<>…</>` works).',
      },
      {
        kind: 'code',
        language: 'jsx',
        code: code`
          function Badge({ count }) {
            return (
              <>
                <span className="badge">{count}</span>
                {count > 9 && <span>9+</span>}
              </>
            );
          }
        `,
      },
      { kind: 'tip', text: '`{count && <X />}` renders `0` when count is 0. Use `{count > 0 && <X />}` instead.' },
    ],
  },
  {
    topic: 'components',
    title: 'Components are functions',
    blocks: [
      {
        kind: 'text',
        text: 'A component is a function that returns JSX. Its name must start with a capital letter: lowercase tags are treated as plain HTML elements.',
      },
      {
        kind: 'code',
        language: 'jsx',
        code: code`
          function ProfileCard({ name }) {
            return <div className="card">{name}</div>;
          }

          <ProfileCard name="Lin" />  // your component
          // <profileCard />          → an unknown HTML tag
        `,
      },
    ],
  },
  {
    topic: 'props',
    title: 'Props are read-only',
    blocks: [
      {
        kind: 'text',
        text: 'Props are inputs from the parent. Never change them. To change something, keep your own state or call a callback the parent passed in.',
      },
      {
        kind: 'code',
        language: 'jsx',
        code: code`
          function Counter({ value, onChange }) {
            // value++            → never mutate props
            return <button onClick={() => onChange(value + 1)}>{value}</button>;
          }
        `,
      },
    ],
  },
  {
    topic: 'state',
    title: 'useState and re-renders',
    blocks: [
      {
        kind: 'text',
        text: '`useState` gives a value and a setter. Calling the setter schedules a re-render; the value does not change until then. Inside one handler, `count` stays the same.',
      },
      {
        kind: 'code',
        language: 'jsx',
        code: code`
          const [count, setCount] = useState(0);

          function addThree() {
            setCount(count + 1); // 0 + 1
            setCount(count + 1); // still 0 + 1
            // → 1, not 3

            setCount((c) => c + 1); // updater form uses the latest value
          }
        `,
      },
      {
        kind: 'tip',
        text: 'A component re-renders when its state changes, its parent re-renders, or a context it reads changes. Changing a ref never re-renders.',
      },
    ],
  },
  {
    topic: 'events',
    title: 'Events and controlled inputs',
    blocks: [
      {
        kind: 'text',
        text: 'Pass a function to event props like `onClick` and `onChange`. In a controlled input, state is the source of truth: `value` comes from state and `onChange` updates it.',
      },
      {
        kind: 'code',
        language: 'jsx',
        code: code`
          function Search() {
            const [text, setText] = useState('');
            return (
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            );
          }
        `,
      },
      { kind: 'tip', text: 'Write `onClick={save}` or `onClick={() => save(id)}`, not `onClick={save()}`, which runs during render.' },
    ],
  },
  {
    topic: 'lists',
    title: 'Rendering lists with keys',
    blocks: [
      {
        kind: 'text',
        text: 'Render lists with `map`. Each item needs a stable, unique `key` so React can match items between renders.',
      },
      {
        kind: 'code',
        language: 'jsx',
        code: code`
          function TodoList({ todos }) {
            return (
              <ul>
                {todos.map((todo) => (
                  <li key={todo.id}>{todo.text}</li>
                ))}
              </ul>
            );
          }
        `,
      },
      { kind: 'tip', text: 'Avoid the array index as a key when items can be added, removed or reordered.' },
    ],
  },
  {
    topic: 'immutability',
    title: 'Update state immutably',
    blocks: [
      {
        kind: 'text',
        text: 'React compares old and new state with `Object.is`. If you change an object in place and pass the same object back, React sees no change and skips the render. Make a new copy instead.',
      },
      {
        kind: 'code',
        language: 'jsx',
        code: code`
          // ✗ mutates: same array, no re-render
          items.push(newItem);
          setItems(items);

          // ✓ new array
          setItems([...items, newItem]);

          // ✓ nested objects need their own copy
          setUser({ ...user, prefs: { ...user.prefs, dark: true } });
        `,
      },
    ],
  },
  {
    topic: 'effects',
    title: 'useEffect and its dependencies',
    blocks: [
      {
        kind: 'text',
        text: '`useEffect` runs after render to sync with things outside React. The dependency array controls when it runs again.',
      },
      {
        kind: 'code',
        language: 'jsx',
        code: code`
          useEffect(() => { /* every render */ });
          useEffect(() => { /* once, after mount */ }, []);
          useEffect(() => { /* when userId changes */ }, [userId]);

          useEffect(() => {
            const id = setInterval(tick, 1000);
            return () => clearInterval(id); // cleanup
          }, []);
        `,
      },
      {
        kind: 'tip',
        text: 'An effect with no array that sets state will loop forever: set state → render → effect → set state.',
      },
    ],
  },
  {
    topic: 'refs',
    title: 'useRef',
    blocks: [
      {
        kind: 'text',
        text: '`useRef` gives you a box (`ref.current`) that survives re-renders. Changing it does not trigger a render, so it suits timer IDs and DOM elements.',
      },
      {
        kind: 'code',
        language: 'jsx',
        code: code`
          function Stopwatch() {
            const timer = useRef(null);
            const start = () => {
              timer.current = setInterval(() => {}, 1000);
            };
            const stop = () => clearInterval(timer.current);
            return <button onClick={stop}>Stop</button>;
          }
        `,
      },
      {
        kind: 'tip',
        text: 'Quick map: `useState` for values on screen, `useRef` for values that should not re-render, `useEffect` for side effects, `useMemo` for cached calculations.',
      },
    ],
  },
  {
    topic: 'rules-of-hooks',
    title: 'The rules of hooks',
    blocks: [
      {
        kind: 'text',
        text: 'React tracks hooks by the order they are called. Call them at the top level of a component or custom hook, never inside `if`, loops or nested functions.',
      },
      {
        kind: 'code',
        language: 'jsx',
        code: code`
          function Profile({ user }) {
            // ✗ if (user) { const [x, setX] = useState(0); }
            const [tab, setTab] = useState('posts'); // ✓ always called
            if (!user) return null;                  // return after hooks
            return <h1>{user.name}</h1>;
          }
        `,
      },
    ],
  },
  {
    topic: 'custom-hooks',
    title: 'Custom hooks',
    blocks: [
      {
        kind: 'text',
        text: 'A custom hook is a function whose name starts with `use` and that calls other hooks. It shares logic, not state: every component that calls it gets its own copy.',
      },
      {
        kind: 'code',
        language: 'jsx',
        code: code`
          function useToggle(initial = false) {
            const [on, setOn] = useState(initial);
            const toggle = () => setOn((v) => !v);
            return [on, toggle];
          }

          const [open, toggleOpen] = useToggle();
        `,
      },
    ],
  },
  {
    topic: 'context',
    title: 'Context',
    blocks: [
      {
        kind: 'text',
        text: 'Context passes a value to any component below a Provider without threading props through every level. `useContext` reads the nearest Provider above.',
      },
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

          function Toolbar() {
            const theme = useContext(ThemeContext); // "dark"
            return <div className={theme} />;
          }
        `,
      },
    ],
  },
  {
    topic: 'performance',
    title: 'memo, useMemo and useCallback',
    blocks: [
      {
        kind: 'text',
        text: '`memo(Component)` skips a re-render when every prop is the same (`Object.is`). `useMemo` caches a calculated value; `useCallback` caches a function, so props stay the same between renders.',
      },
      {
        kind: 'code',
        language: 'jsx',
        code: code`
          const Row = memo(function Row({ item, onSelect }) {
            return <li onClick={() => onSelect(item.id)}>{item.name}</li>;
          });

          const sorted = useMemo(() => sortItems(items), [items]);
          const onSelect = useCallback((id) => setSelected(id), []);
        `,
      },
      { kind: 'tip', text: 'Measure before optimizing. Most components are fast enough without any memoization.' },
    ],
  },
  {
    topic: 'patterns',
    title: 'Lifting state up',
    blocks: [
      {
        kind: 'text',
        text: 'When two siblings need the same state, move it to their closest shared parent. The parent passes the value and an updater down to each child.',
      },
      {
        kind: 'code',
        language: 'jsx',
        code: code`
          function Filters() {
            const [query, setQuery] = useState('');
            return (
              <>
                <SearchBox value={query} onChange={setQuery} />
                <Results query={query} />
              </>
            );
          }
        `,
      },
      { kind: 'tip', text: 'Reach for context only when props would need to pass through many levels.' },
    ],
  },
]);
