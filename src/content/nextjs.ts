import { code, seedQuestions } from '@/content/helpers';
import type { TrackContent } from '@/types/content';

const routerStep1 = code`
  function fileToRoute(file: string): string | null {
    const parts = file.split('/');
    if (parts[0] !== 'app' || parts[parts.length - 1] !== 'page.tsx') return null;
    const segments = parts.slice(1, -1).filter((s) => !(s.startsWith('(') && s.endsWith(')')));
    return '/' + segments.join('/');
  }
`;

const routerStep2 = code`
  ${routerStep1}

  type Params = Record<string, string | string[]>;

  function matchRoute(pattern: string, pathname: string): Params | null {
    const pat = pattern.split('/').filter(Boolean);
    const path = pathname.split('/').filter(Boolean);
    const params: Params = {};
    for (let i = 0; i < pat.length; i++) {
      const seg = pat[i];
      if (seg.startsWith('[...') && seg.endsWith(']')) {
        const rest = path.slice(i);
        if (rest.length === 0) return null;
        params[seg.slice(4, -1)] = rest;
        return params;
      }
      if (i >= path.length) return null;
      if (seg.startsWith('[') && seg.endsWith(']')) params[seg.slice(1, -1)] = path[i];
      else if (seg !== path[i]) return null;
    }
    return pat.length === path.length ? params : null;
  }
`;

const routerStep3 = code`
  ${routerStep2}

  function rank(pattern: string): number[] {
    return pattern
      .split('/')
      .filter(Boolean)
      .map((s) => (s.startsWith('[...') ? 2 : s.startsWith('[') ? 1 : 0));
  }

  function compareRank(a: number[], b: number[]): number {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return b.length - a.length;
  }

  function resolveRoute(pathname: string, files: string[]): { file: string; params: Params } | null {
    const routes = files
      .map((file) => ({ file, pattern: fileToRoute(file) }))
      .filter((r): r is { file: string; pattern: string } => r.pattern !== null)
      .sort((a, b) => compareRank(rank(a.pattern), rank(b.pattern)));
    for (const route of routes) {
      const params = matchRoute(route.pattern, pathname);
      if (params) return { file: route.file, params };
    }
    return null;
  }
`;

export const nextjsContent: TrackContent = {
  track: {
    id: 'nextjs',
    title: 'Next.js',
    tagline: 'Full-stack React with the App Router.',
    order: 4,
  },

  units: [
    {
      id: 'next-routing',
      track: 'nextjs',
      level: 'beginner',
      order: 1,
      title: 'App Router Basics',
      summary: 'File-based routing, layouts, special files and dynamic segments.',
      topics: ['app-router', 'layouts', 'dynamic-routes'],
    },
    {
      id: 'next-components',
      track: 'nextjs',
      level: 'intermediate',
      order: 2,
      title: 'Server & Client Components',
      summary: 'Where your code runs, the "use client" boundary and hydration.',
      topics: ['server-components', 'client-components', 'hydration'],
    },
    {
      id: 'next-data',
      track: 'nextjs',
      level: 'intermediate',
      order: 3,
      title: 'Data & Rendering',
      summary: 'Fetching data, caching, static vs dynamic rendering and ISR.',
      topics: ['data-fetching', 'caching', 'rendering'],
    },
    {
      id: 'next-advanced',
      track: 'nextjs',
      level: 'advanced',
      order: 4,
      title: 'Server Actions, APIs & Middleware',
      summary: 'Mutations, route handlers, middleware and shipping to production.',
      topics: ['server-actions', 'route-handlers', 'middleware', 'deployment'],
    },
  ],

  lessons: [
    {
      id: 'next-routing-l1',
      unitId: 'next-routing',
      order: 1,
      title: 'Folders are routes',
      minutes: 6,
      blocks: [
        {
          kind: 'text',
          text: 'In the App Router every folder inside `app/` is a URL segment, and a `page.tsx` file makes that segment publicly reachable.',
        },
        {
          kind: 'code',
          language: 'tsx',
          caption: 'app/blog/[slug]/page.tsx → /blog/hello-world',
          code: code`
            export default async function Post({
              params,
            }: {
              params: Promise<{ slug: string }>;
            }) {
              const { slug } = await params;
              return <h1>Post: {slug}</h1>;
            }
          `,
        },
        {
          kind: 'tip',
          text: 'Folders in parentheses such as `(marketing)` are route groups. They organize files without appearing in the URL.',
        },
      ],
    },
    {
      id: 'next-components-l1',
      unitId: 'next-components',
      order: 1,
      title: 'The "use client" boundary',
      minutes: 7,
      blocks: [
        {
          kind: 'text',
          text: 'Components in `app/` are Server Components by default. They can be async and read data directly, and their code never ships to the browser. Add `"use client"` at the top of a file when you need state, effects, event handlers or browser APIs.',
        },
        {
          kind: 'code',
          language: 'tsx',
          code: code`
            'use client';

            import { useState } from 'react';

            export function LikeButton() {
              const [likes, setLikes] = useState(0);
              return <button onClick={() => setLikes(likes + 1)}>{likes} ♥</button>;
            }
          `,
        },
      ],
    },
    {
      id: 'next-data-l1',
      unitId: 'next-data',
      order: 1,
      title: 'Static, dynamic and revalidated',
      minutes: 8,
      blocks: [
        {
          kind: 'code',
          language: 'tsx',
          code: code`
            // Re-generate this page at most once a minute (ISR)
            export const revalidate = 60;

            export default async function Products() {
              const res = await fetch('https://api.example.com/products');
              const products: { id: string; name: string }[] = await res.json();
              return (
                <ul>
                  {products.map((p) => (
                    <li key={p.id}>{p.name}</li>
                  ))}
                </ul>
              );
            }
          `,
        },
        {
          kind: 'text',
          text: 'A route is rendered statically at build time unless it reads request data (cookies, headers, searchParams) or opts out of caching. Then it renders per request.',
        },
      ],
    },
    {
      id: 'next-advanced-l1',
      unitId: 'next-advanced',
      order: 1,
      title: 'Server Actions and route handlers',
      minutes: 8,
      blocks: [
        {
          kind: 'code',
          language: 'tsx',
          caption: 'A Server Action runs on the server when the form is submitted.',
          code: code`
            export default function NewPost() {
              async function create(formData: FormData) {
                'use server';
                const title = String(formData.get('title'));
                // save to the database here
              }
              return (
                <form action={create}>
                  <input name="title" />
                  <button type="submit">Publish</button>
                </form>
              );
            }
          `,
        },
        {
          kind: 'code',
          language: 'ts',
          caption: 'app/api/health/route.ts: a route handler returns a Response.',
          code: code`
            export async function GET() {
              return Response.json({ ok: true });
            }
          `,
        },
      ],
    },
  ],

  questions: seedQuestions('nextjs', [
    {
      id: 'next-q01',
      unitId: 'next-routing',
      topic: 'app-router',
      difficulty: 1,
      type: 'mcq',
      prompt: 'Which file creates the page at `/dashboard` in the App Router?',
      options: ['pages/dashboard.tsx', 'app/dashboard/page.tsx', 'app/dashboard.tsx', 'app/dashboard/index.tsx'],
      answer: 1,
      explanation: 'Each folder in `app/` is a segment and `page.tsx` makes it a route. `pages/` is the older Pages Router.',
      hints: ['The App Router uses a special file name inside a folder.'],
      tags: ['page.tsx'],
    },
    {
      id: 'next-q02',
      unitId: 'next-components',
      topic: 'server-components',
      difficulty: 1,
      type: 'true_false',
      prompt: 'Components inside `app/` are Server Components unless you opt into the client.',
      answer: true,
      explanation: 'Server is the default. Add `"use client"` to make a file (and everything it imports) a Client Component.',
      hints: ['What directive do you add for interactivity?'],
      tags: ['defaults'],
    },
    {
      id: 'next-q03',
      unitId: 'next-components',
      topic: 'client-components',
      difficulty: 1,
      type: 'fill_blank',
      prompt: 'Complete the directive that turns this file into a Client Component.',
      language: 'tsx',
      code: "'___';\n\nimport { useState } from 'react';",
      answer: 'use client',
      explanation: 'The `"use client"` directive must be the very first statement in the file.',
      hints: ['Two words, lowercase.'],
      tags: ['use-client'],
    },
    {
      id: 'next-q04',
      unitId: 'next-routing',
      topic: 'layouts',
      difficulty: 2,
      type: 'mcq',
      prompt: 'What does a `layout.tsx` file do?',
      options: [
        'Defines CSS for a single page',
        'Wraps the pages below it and keeps its state when navigating between them',
        'Makes the folder a public route',
        'Configures the build',
      ],
      answer: 1,
      explanation: 'Layouts receive `children` and stay mounted while you move between their child routes, which is ideal for navbars and sidebars.',
      hints: ['It receives a `children` prop.'],
      tags: ['layout.tsx'],
    },
    {
      id: 'next-q05',
      unitId: 'next-components',
      topic: 'client-components',
      difficulty: 2,
      type: 'multi',
      prompt: 'Which of these require a Client Component?',
      options: [
        'Using `useState`',
        'Attaching an `onClick` handler',
        'Awaiting a database query',
        'Reading `localStorage`',
      ],
      answers: [0, 1, 3],
      explanation: 'State, event handlers and browser APIs only exist in the browser. Awaiting data is exactly what Server Components are for.',
      hints: ['Which ones need the browser?'],
      tags: ['use-client'],
    },
    {
      id: 'next-q06',
      unitId: 'next-routing',
      topic: 'app-router',
      difficulty: 2,
      type: 'match',
      prompt: 'Match each special file to its job.',
      pairs: [
        { left: 'loading.tsx', right: 'Instant fallback UI while the segment loads' },
        { left: 'error.tsx', right: 'Catches errors thrown while rendering the segment' },
        { left: 'not-found.tsx', right: 'Shown when notFound() is called or no route matches' },
        { left: 'route.ts', right: 'An API endpoint that returns a Response' },
      ],
      explanation: 'Special files let Next.js wire up Suspense, error boundaries and APIs for you.',
      hints: ['`route.ts` has no UI.'],
      tags: ['special-files'],
    },
    {
      id: 'next-q07',
      unitId: 'next-routing',
      topic: 'app-router',
      difficulty: 2,
      type: 'mcq',
      prompt: 'What URL does `app/(marketing)/pricing/page.tsx` serve?',
      options: ['/marketing/pricing', '/(marketing)/pricing', '/pricing', 'It is not a route'],
      answer: 2,
      explanation: 'Parentheses make a route group. It organizes files and can have its own layout, but it is left out of the URL.',
      hints: ['What do the parentheses mean?'],
      tags: ['route-groups'],
    },
    {
      id: 'next-q08',
      unitId: 'next-components',
      topic: 'server-components',
      difficulty: 3,
      type: 'bug_find',
      prompt: 'This Server Component fails to build. Tap the line that causes it.',
      language: 'tsx',
      code: code`
        // app/products/page.tsx
        export default async function Products() {
          const products = await getProducts();
          return (
            <ul>
              {products.map((p) => (
                <li key={p.id} onClick={() => addToCart(p.id)}>{p.name}</li>
              ))}
            </ul>
          );
        }
      `,
      bugLine: 7,
      explanation: 'Event handlers cannot be passed from a Server Component. Move the clickable item into a small Client Component (`"use client"`) and keep the data fetching on the server.',
      hints: ['What can only work in the browser?'],
      tags: ['event-handlers', 'boundaries'],
    },
    {
      id: 'next-q09',
      unitId: 'next-data',
      topic: 'rendering',
      difficulty: 3,
      type: 'mcq',
      prompt: 'What is `generateStaticParams` for in `app/blog/[slug]/page.tsx`?',
      options: [
        'It validates the slug on every request',
        'It lists which slugs to pre-render at build time',
        'It generates SEO metadata',
        'It redirects unknown slugs',
      ],
      answer: 1,
      explanation: 'Returning `[{ slug: "a" }, { slug: "b" }]` tells Next.js to build those pages ahead of time as static HTML.',
      hints: ['The word "static" is a clue.'],
      tags: ['generateStaticParams', 'ssg'],
    },
    {
      id: 'next-q10',
      unitId: 'next-data',
      topic: 'caching',
      difficulty: 3,
      type: 'mcq',
      prompt: 'What does `export const revalidate = 60` do in a page?',
      options: [
        'Reloads the page in the browser every 60 seconds',
        'Serves the cached page and regenerates it in the background at most once every 60 seconds',
        'Times out requests after 60 seconds',
        'Caches the page for 60 days',
      ],
      answer: 1,
      explanation: 'This is Incremental Static Regeneration: visitors get the fast cached version, and Next.js refreshes it after the interval.',
      hints: ['The abbreviation is ISR.'],
      tags: ['isr', 'revalidate'],
    },
    {
      id: 'next-q11',
      unitId: 'next-advanced',
      topic: 'server-actions',
      difficulty: 3,
      type: 'order',
      prompt: 'Order these lines into a page with an inline Server Action.',
      language: 'tsx',
      lines: [
        'export default function NewPost() {',
        '  async function create(formData: FormData) {',
        "    'use server';",
        "    await db.post.create({ data: { title: String(formData.get('title')) } });",
        '  }',
        '  return <form action={create}><input name="title" /></form>;',
        '}',
      ],
      explanation: '`"use server"` goes at the top of the action body. Passing the action to `<form action>` makes the form work even before JavaScript loads.',
      hints: ['The directive is the first line inside the action.'],
      tags: ['use-server', 'forms'],
    },
    {
      id: 'next-q12',
      unitId: 'next-data',
      topic: 'data-fetching',
      difficulty: 2,
      type: 'true_false',
      prompt: 'A Server Component can be an `async` function that awaits data directly.',
      answer: true,
      explanation: 'No `useEffect` or loading state is needed. The data is fetched on the server, and `loading.tsx` or `<Suspense>` handles the wait.',
      hints: ['Where does a Server Component run?'],
      tags: ['async-components'],
    },
    {
      id: 'next-q13',
      unitId: 'next-advanced',
      topic: 'middleware',
      difficulty: 3,
      type: 'mcq',
      prompt: 'When does middleware run?',
      options: [
        'After the page has rendered in the browser',
        'Before a request reaches a matched route, so it can redirect, rewrite or set headers',
        'Only at build time',
        'Only for API routes',
      ],
      answer: 1,
      explanation: 'Middleware intercepts matching requests first, which makes it a good fit for auth redirects, locale detection and headers. Keep it fast, since it runs on every matched request.',
      hints: ['It sits in the middle of the request.'],
      tags: ['middleware'],
    },
    {
      id: 'next-q14',
      unitId: 'next-components',
      topic: 'hydration',
      difficulty: 3,
      type: 'mcq',
      prompt: 'What causes a hydration mismatch error?',
      options: [
        'A slow network connection',
        'The HTML rendered on the server differs from the first render in the browser',
        'Using too many Client Components',
        'Importing CSS in a Server Component',
      ],
      answer: 1,
      explanation: 'Common causes are `Date.now()`, `Math.random()`, `window` checks or locale formatting during render. Compute such values in `useEffect` so the first client render matches the server.',
      hints: ['Hydration attaches React to existing HTML.'],
      tags: ['hydration'],
    },
    {
      id: 'next-q15',
      unitId: 'next-routing',
      topic: 'dynamic-routes',
      difficulty: 2,
      type: 'mcq',
      prompt: 'How does `app/blog/[slug]/page.tsx` read the slug?',
      options: [
        'From `window.location`',
        'From the `params` prop: `const { slug } = await params`',
        'From `process.env.SLUG`',
        'From `useState`',
      ],
      answer: 1,
      explanation: 'Pages receive `params` (and `searchParams`) as props. In current Next.js versions they are Promises, so you await them.',
      hints: ['It is passed in as a prop.'],
      tags: ['params'],
    },
    {
      id: 'next-q16',
      unitId: 'next-routing',
      topic: 'dynamic-routes',
      difficulty: 2,
      type: 'output',
      language: 'js',
      prompt: 'Pages also receive `searchParams`. Using the standard URL API, what does this log?',
      code: code`
        const url = new URL('https://shop.dev/search?q=shoes&page=2');
        console.log(url.pathname, url.searchParams.get('page'));
      `,
      options: ['/search 2', '/search?q=shoes 2', 'search page=2', '/search null'],
      answer: 0,
      explanation: 'The pathname excludes the query string, and `searchParams.get` returns the value as a string.',
      hints: ['Where does the pathname end?'],
      tags: ['searchParams', 'URL'],
    },
    {
      id: 'next-q17',
      unitId: 'next-advanced',
      topic: 'route-handlers',
      difficulty: 2,
      type: 'mcq',
      prompt: 'Where do you put a GET endpoint served at `/api/users`?',
      options: [
        'app/api/users/page.tsx exporting GET',
        'app/api/users/route.ts exporting GET',
        'pages/users/api.ts',
        'middleware.ts',
      ],
      answer: 1,
      explanation: 'Route handlers live in `route.ts` and export functions named after HTTP methods (`GET`, `POST`...). A folder cannot have both `route.ts` and `page.tsx`.',
      hints: ['The file is named after what it handles.'],
      tags: ['route.ts'],
    },
    {
      id: 'next-q18',
      unitId: 'next-data',
      topic: 'rendering',
      difficulty: 4,
      type: 'multi',
      prompt: 'Which of these make a route render dynamically, per request?',
      options: [
        'Calling `cookies()` in the page',
        'Reading `searchParams` in the page',
        "`export const dynamic = 'force-static'`",
        "`fetch(url, { cache: 'no-store' })`",
      ],
      answers: [0, 1, 3],
      explanation: 'Request-specific data (cookies, headers, searchParams) and uncached fetches need a fresh render per request. `force-static` does the opposite.',
      hints: ['Which ones depend on the incoming request or opt out of caching?'],
      tags: ['dynamic-rendering'],
    },
    {
      id: 'next-q19',
      unitId: 'next-advanced',
      topic: 'deployment',
      difficulty: 2,
      type: 'output',
      language: 'js',
      prompt: 'Building links from user input needs encoding. What does this log?',
      code: "console.log('/tags/' + encodeURIComponent('c# & .net'));",
      options: ['/tags/c%23%20%26%20.net', '/tags/c# & .net', '/tags/c%23+%26+.net', '/tags/c%23%20&%20.net'],
      answer: 0,
      explanation: '`encodeURIComponent` escapes characters that have meaning in URLs, such as `#`, `&` and spaces, so the slug arrives intact.',
      hints: ['`#` would otherwise start a URL fragment.'],
      tags: ['encodeURIComponent', 'links'],
    },
    {
      id: 'next-q20',
      unitId: 'next-components',
      topic: 'client-components',
      difficulty: 4,
      type: 'mcq',
      prompt: 'A Server Component renders `<Chart onSelect={(id) => save(id)} />` where `Chart` is a Client Component. What happens?',
      options: [
        'It works normally',
        'An error: functions cannot be passed from the server to the client unless they are Server Actions',
        'The function runs on the server when clicked',
        'The prop is silently dropped',
      ],
      answer: 1,
      explanation: 'Props crossing the server→client boundary must be serializable. Pass data instead, or a Server Action marked with `"use server"`.',
      hints: ['Props have to be sent over the network.'],
      tags: ['serialization', 'boundaries'],
    },
  ]),

  exercises: [
    {
      id: 'next-ex01',
      track: 'nextjs',
      unitId: 'next-routing',
      title: 'Classify route segments',
      prompt: 'Write `segmentType(segment)` that classifies an App Router folder name as "static", "dynamic" (`[id]`), "catchAll" (`[...slug]`), "optionalCatchAll" (`[[...slug]]`) or "group" (`(shop)`).',
      kind: 'write_function',
      language: 'ts',
      starterCode: code`
        type SegmentType = 'static' | 'dynamic' | 'catchAll' | 'optionalCatchAll' | 'group';

        function segmentType(segment: string): SegmentType {
          // your code here
          return 'static';
        }
      `,
      solution: code`
        type SegmentType = 'static' | 'dynamic' | 'catchAll' | 'optionalCatchAll' | 'group';

        function segmentType(segment: string): SegmentType {
          if (segment.startsWith('[[...') && segment.endsWith(']]')) return 'optionalCatchAll';
          if (segment.startsWith('[...') && segment.endsWith(']')) return 'catchAll';
          if (segment.startsWith('[') && segment.endsWith(']')) return 'dynamic';
          if (segment.startsWith('(') && segment.endsWith(')')) return 'group';
          return 'static';
        }
      `,
      tests: [
        { name: 'static', code: "expect(segmentType('blog')).toBe('static');" },
        { name: 'dynamic', code: "expect(segmentType('[id]')).toBe('dynamic');" },
        { name: 'catch-all', code: "expect(segmentType('[...slug]')).toBe('catchAll');" },
        { name: 'optional catch-all', code: "expect(segmentType('[[...slug]]')).toBe('optionalCatchAll');" },
        { name: 'group', code: "expect(segmentType('(shop)')).toBe('group');" },
      ],
      hints: [
        'Check the most specific patterns first.',
        '`[[...slug]]` also starts with `[`, so test for it before `[...slug]`, and that before `[id]`.',
        "if (segment.startsWith('[[...')) return 'optionalCatchAll';\nif (segment.startsWith('[...')) return ___;",
      ],
      xp: 20,
    },
    {
      id: 'next-ex02',
      track: 'nextjs',
      unitId: 'next-routing',
      title: 'Build a link from a route pattern',
      prompt: 'Write `buildHref(pattern, params)` that fills dynamic segments: `buildHref("/blog/[slug]", { slug: "hi there" })` returns "/blog/hi%20there". Throw an Error if a param is missing.',
      kind: 'write_function',
      language: 'ts',
      starterCode: code`
        function buildHref(pattern: string, params: Record<string, string>): string {
          // your code here
          return pattern;
        }
      `,
      solution: code`
        function buildHref(pattern: string, params: Record<string, string>): string {
          return pattern.replace(/\\[([^\\]]+)\\]/g, (_, name: string) => {
            const value = params[name];
            if (value === undefined) throw new Error('Missing param: ' + name);
            return encodeURIComponent(value);
          });
        }
      `,
      tests: [
        { name: 'fills a slug', code: "expect(buildHref('/blog/[slug]', { slug: 'hello' })).toBe('/blog/hello');" },
        { name: 'encodes', code: "expect(buildHref('/blog/[slug]', { slug: 'hi there' })).toBe('/blog/hi%20there');" },
        {
          name: 'several params',
          code: "expect(buildHref('/shop/[category]/[id]', { category: 'shoes', id: '42' })).toBe('/shop/shoes/42');",
        },
        { name: 'missing param', code: "expect(() => buildHref('/blog/[slug]', {})).toThrow('slug');" },
      ],
      hints: [
        'Find every `[name]` in the pattern and replace it.',
        'Use `pattern.replace` with a global regular expression and a replacer function.',
        "pattern.replace(/\\[([^\\]]+)\\]/g, (_, name) => encodeURIComponent(params[name]))",
      ],
      xp: 25,
    },
    {
      id: 'next-ex03',
      track: 'nextjs',
      unitId: 'next-data',
      title: 'When is a page stale?',
      prompt: 'Model ISR: `needsRevalidation(generatedAt, revalidate, now)` returns true when a cached page should be regenerated. Times are in milliseconds; `revalidate` is in seconds, or `false` to cache forever.',
      kind: 'write_function',
      language: 'ts',
      starterCode: code`
        function needsRevalidation(generatedAt: number, revalidate: number | false, now: number): boolean {
          // your code here
          return false;
        }
      `,
      solution: code`
        function needsRevalidation(generatedAt: number, revalidate: number | false, now: number): boolean {
          if (revalidate === false) return false;
          return now - generatedAt >= revalidate * 1000;
        }
      `,
      tests: [
        { name: 'fresh', code: 'expect(needsRevalidation(0, 60, 30_000)).toBe(false);' },
        { name: 'stale', code: 'expect(needsRevalidation(0, 60, 60_000)).toBe(true);' },
        { name: 'cache forever', code: 'expect(needsRevalidation(0, false, 10 ** 12)).toBe(false);' },
        { name: 'revalidate 0', code: 'expect(needsRevalidation(5, 0, 5)).toBe(true);' },
      ],
      hints: [
        'Handle `false` first, then compare elapsed time with the interval.',
        'Convert seconds to milliseconds before comparing with `now - generatedAt`.',
        'if (revalidate === false) return false;\nreturn now - generatedAt >= ___;',
      ],
      xp: 20,
    },
  ],

  debugChallenges: [
    {
      id: 'next-dbg01',
      track: 'nextjs',
      unitId: 'next-components',
      title: 'Hydration failed',
      prompt: 'This clock causes a hydration error on every page load. Read the error and fix the component.',
      language: 'tsx',
      buggyCode: code`
        'use client';

        export default function Clock() {
          return <p>Current time: {new Date().toLocaleTimeString()}</p>;
        }
      `,
      fixedCode: code`
        'use client';

        import { useEffect, useState } from 'react';

        export default function Clock() {
          const [time, setTime] = useState<string | null>(null);
          useEffect(() => {
            setTime(new Date().toLocaleTimeString());
          }, []);
          return <p>Current time: {time ?? '--:--'}</p>;
        }
      `,
      bugLines: [4],
      category: 'hydration',
      errorOutput: code`
        Error: Hydration failed because the server rendered text didn't match the client.

          <Clock>
            <p>
        +     Current time: 10:42:07 AM
        -     Current time: 10:42:05 AM
      `,
      explanation: 'The server and the browser render at different moments, so the time differs. Render a placeholder first and set the real time in `useEffect`, which only runs in the browser after hydration.',
      xp: 25,
    },
    {
      id: 'next-dbg02',
      track: 'nextjs',
      unitId: 'next-components',
      title: 'useState in a Server Component',
      prompt: 'The build fails with the error below. Fix the file with the smallest possible change.',
      language: 'tsx',
      buggyCode: code`
        import { useState } from 'react';

        export default function LikeButton() {
          const [likes, setLikes] = useState(0);
          return <button onClick={() => setLikes(likes + 1)}>{likes} likes</button>;
        }
      `,
      fixedCode: code`
        'use client';

        import { useState } from 'react';

        export default function LikeButton() {
          const [likes, setLikes] = useState(0);
          return <button onClick={() => setLikes(likes + 1)}>{likes} likes</button>;
        }
      `,
      bugLines: [1],
      category: 'nextjs',
      errorOutput: code`
        ./app/components/LikeButton.tsx
        Error: You're importing a component that needs \`useState\`. This React Hook only works
        in a Client Component. To fix, mark the file (or its parent) with the "use client" directive.
      `,
      explanation: 'Files in `app/` are Server Components by default, and they cannot use state or event handlers. Adding `"use client"` as the first line makes this a Client Component.',
      xp: 15,
    },
    {
      id: 'next-dbg03',
      track: 'nextjs',
      unitId: 'next-advanced',
      title: 'The route handler returns nothing useful',
      prompt: 'Requests to `/api/health` fail with the error below. Fix the handler.',
      language: 'ts',
      buggyCode: code`
        export async function GET() {
          const status = { ok: true, uptime: 42 };
          return status;
        }
      `,
      fixedCode: code`
        export async function GET() {
          const status = { ok: true, uptime: 42 };
          return Response.json(status);
        }
      `,
      bugLines: [3],
      category: 'nextjs',
      errorOutput: 'Error: No response is returned from route handler \'/app/api/health/route.ts\'. Ensure you return a `Response` or a `NextResponse` in all branches of your handler.',
      tests: [
        { name: 'returns a Response', code: 'const res = await GET();\nexpect(res instanceof Response).toBe(true);' },
        { name: 'with JSON body', code: 'const res = await GET();\nexpect((await res.json()).ok).toBe(true);' },
      ],
      explanation: 'Route handlers must return a Web `Response`. `Response.json(data)` serializes the body and sets the content type for you.',
      xp: 20,
    },
  ],

  project: {
    id: 'next-proj-router',
    track: 'nextjs',
    title: 'Build a mini App Router',
    description: 'Recreate the core of Next.js routing: map files to routes, match URLs and pick the right page.',
    language: 'ts',
    xp: 80,
    checkpoints: [
      {
        id: 'router-1',
        title: 'Files to routes',
        instructions: 'Write `fileToRoute(file)`: `app/blog/[slug]/page.tsx` → `/blog/[slug]`, `app/page.tsx` → `/`. Drop route groups like `(marketing)`. Return null for anything that is not a `page.tsx` inside `app/`.',
        starterCode: code`
          function fileToRoute(file: string): string | null {
            // your code here
            return null;
          }
        `,
        solution: routerStep1,
        tests: [
          { name: 'root page', code: "expect(fileToRoute('app/page.tsx')).toBe('/');" },
          { name: 'nested', code: "expect(fileToRoute('app/blog/[slug]/page.tsx')).toBe('/blog/[slug]');" },
          { name: 'route group', code: "expect(fileToRoute('app/(marketing)/about/page.tsx')).toBe('/about');" },
          { name: 'not a page', code: "expect(fileToRoute('app/blog/layout.tsx')).toBe(null);" },
        ],
      },
      {
        id: 'router-2',
        title: 'Match a URL',
        instructions: 'Add `matchRoute(pattern, pathname)`. Return the params for a match (`[slug]` → string, `[...slug]` → array of the remaining segments) or null.',
        starterCode: code`
          ${routerStep1}

          type Params = Record<string, string | string[]>;

          function matchRoute(pattern: string, pathname: string): Params | null {
            // your code here
            return null;
          }
        `,
        solution: routerStep2,
        tests: [
          { name: 'static', code: "expect(matchRoute('/about', '/about')).toEqual({});" },
          { name: 'dynamic', code: "expect(matchRoute('/blog/[slug]', '/blog/hello')).toEqual({ slug: 'hello' });" },
          { name: 'catch-all', code: "expect(matchRoute('/docs/[...slug]', '/docs/a/b')).toEqual({ slug: ['a', 'b'] });" },
          { name: 'no match', code: "expect(matchRoute('/blog/[slug]', '/blog/a/b')).toBe(null);" },
        ],
      },
      {
        id: 'router-3',
        title: 'Pick the right page',
        instructions: 'Add `resolveRoute(pathname, files)`. When several routes match, a static segment beats a dynamic one, which beats a catch-all. Return `{ file, params }` or null.',
        starterCode: code`
          ${routerStep2}

          function resolveRoute(pathname: string, files: string[]): { file: string; params: Params } | null {
            // your code here
            return null;
          }
        `,
        solution: routerStep3,
        tests: [
          {
            name: 'static beats dynamic',
            code: "const files = ['app/blog/[slug]/page.tsx', 'app/blog/new/page.tsx'];\nexpect(resolveRoute('/blog/new', files)).toEqual({ file: 'app/blog/new/page.tsx', params: {} });",
          },
          {
            name: 'dynamic match',
            code: "const files = ['app/blog/[slug]/page.tsx', 'app/blog/new/page.tsx'];\nexpect(resolveRoute('/blog/hello', files)).toEqual({ file: 'app/blog/[slug]/page.tsx', params: { slug: 'hello' } });",
          },
          {
            name: 'catch-all',
            code: "const files = ['app/page.tsx', 'app/docs/[...slug]/page.tsx'];\nexpect(resolveRoute('/docs/a/b', files)).toEqual({ file: 'app/docs/[...slug]/page.tsx', params: { slug: ['a', 'b'] } });",
          },
          { name: 'no match', code: "expect(resolveRoute('/nope', ['app/page.tsx'])).toBe(null);" },
        ],
      },
    ],
  },
};
