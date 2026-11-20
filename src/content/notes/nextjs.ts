import { code, notesFor } from '@/content/helpers';

/** One short note per Next.js topic, shown after a wrong quiz answer. */
export const nextjsNotes = notesFor('nextjs', [
  {
    topic: 'app-router',
    title: 'Folders are routes',
    blocks: [
      {
        kind: 'text',
        text: 'In the App Router every folder in `app/` is a URL segment, and a `page.tsx` file makes it a page. Folders in parentheses are route groups: they organize files but stay out of the URL.',
      },
      {
        kind: 'code',
        language: 'tsx',
        code: code`
          // app/page.tsx                    → /
          // app/dashboard/page.tsx          → /dashboard
          // app/(marketing)/pricing/page.tsx → /pricing

          export default function Page() {
            return <h1>Dashboard</h1>;
          }
        `,
      },
      {
        kind: 'text',
        text: 'Special files: `layout.tsx` (shared wrapper), `loading.tsx` (shown while loading), `error.tsx` (error boundary), `not-found.tsx` (404), `route.ts` (API endpoint).',
      },
    ],
  },
  {
    topic: 'layouts',
    title: 'Layouts',
    blocks: [
      {
        kind: 'text',
        text: 'A `layout.tsx` wraps every page below it and receives them as `children`. It stays mounted while you move between those pages, so its state is kept.',
      },
      {
        kind: 'code',
        language: 'tsx',
        code: code`
          // app/dashboard/layout.tsx
          export default function DashboardLayout({
            children,
          }: {
            children: React.ReactNode;
          }) {
            return (
              <section>
                <nav>Sidebar</nav>
                {children}
              </section>
            );
          }
        `,
      },
    ],
  },
  {
    topic: 'dynamic-routes',
    title: 'Dynamic routes and params',
    blocks: [
      {
        kind: 'text',
        text: 'Square brackets make a dynamic segment: `app/blog/[slug]/page.tsx` matches `/blog/anything`. The page receives `params` and `searchParams` as props; in current Next.js both are Promises.',
      },
      {
        kind: 'code',
        language: 'tsx',
        code: code`
          export default async function Post({
            params,
          }: {
            params: Promise<{ slug: string }>;
          }) {
            const { slug } = await params;
            return <h1>{slug}</h1>;
          }
          // [...slug] catches several segments: /docs/a/b → ['a', 'b']
        `,
      },
    ],
  },
  {
    topic: 'server-components',
    title: 'Server Components',
    blocks: [
      {
        kind: 'text',
        text: 'Components in `app/` run on the server by default. They can be `async`, read databases and secrets, and send no JavaScript to the browser. They cannot use state, effects or event handlers.',
      },
      {
        kind: 'code',
        language: 'tsx',
        code: code`
          export default async function Products() {
            const res = await fetch('https://api.example.com/products');
            const products: { id: number; name: string }[] = await res.json();
            return (
              <ul>
                {products.map((p) => <li key={p.id}>{p.name}</li>)}
              </ul>
            );
          }
        `,
      },
      { kind: 'tip', text: 'Need a click handler? Move just that piece into a small Client Component and keep the data fetching on the server.' },
    ],
  },
  {
    topic: 'client-components',
    title: 'Client Components and "use client"',
    blocks: [
      {
        kind: 'text',
        text: 'Put `"use client"` as the very first line to make a file a Client Component. You need one for state, effects, event handlers and browser APIs like `window`.',
      },
      {
        kind: 'code',
        language: 'tsx',
        code: code`
          'use client';

          import { useState } from 'react';

          export function LikeButton() {
            const [likes, setLikes] = useState(0);
            return <button onClick={() => setLikes(likes + 1)}>{likes}</button>;
          }
        `,
      },
      {
        kind: 'tip',
        text: 'Props passed from a Server to a Client Component must be serializable data. Plain functions cannot cross; Server Actions can.',
      },
    ],
  },
  {
    topic: 'hydration',
    title: 'Hydration mismatches',
    blocks: [
      {
        kind: 'text',
        text: 'The server sends HTML, then React "hydrates" it in the browser and expects the first render to produce the same HTML. If it differs, you get a hydration error.',
      },
      {
        kind: 'code',
        language: 'tsx',
        code: code`
          'use client';
          import { useEffect, useState } from 'react';

          export function Clock() {
            // ✗ <p>{new Date().toLocaleTimeString()}</p> differs on server and client
            const [time, setTime] = useState<string | null>(null);
            useEffect(() => setTime(new Date().toLocaleTimeString()), []);
            return <p>{time ?? '--:--'}</p>;
          }
        `,
      },
      { kind: 'tip', text: 'Common causes: dates, `Math.random()`, `window` checks and locale formatting during render.' },
    ],
  },
  {
    topic: 'data-fetching',
    title: 'Fetching data on the server',
    blocks: [
      {
        kind: 'text',
        text: 'A Server Component can simply `await` its data. There is no `useEffect` and no loading state in the component; `loading.tsx` or `<Suspense>` shows something while it waits.',
      },
      {
        kind: 'code',
        language: 'tsx',
        code: code`
          async function getUser(id: string) {
            const res = await fetch('https://api.example.com/users/' + id);
            if (!res.ok) throw new Error('Failed to load user');
            return res.json();
          }

          export default async function Page() {
            const user = await getUser('1');
            return <h1>{user.name}</h1>;
          }
        `,
      },
    ],
  },
  {
    topic: 'caching',
    title: 'Revalidation',
    blocks: [
      {
        kind: 'text',
        text: 'A static page can be refreshed in the background. `export const revalidate = 60` serves the cached page and rebuilds it at most once every 60 seconds (Incremental Static Regeneration).',
      },
      {
        kind: 'code',
        language: 'tsx',
        code: code`
          export const revalidate = 60; // seconds

          // Per request instead:
          // fetch(url, { next: { revalidate: 60 } });

          // After a change, refresh on demand:
          // revalidatePath('/blog');
        `,
      },
    ],
  },
  {
    topic: 'rendering',
    title: 'Static and dynamic rendering',
    blocks: [
      {
        kind: 'text',
        text: 'Pages are built ahead of time (static) when they can be. Reading request data such as `cookies()`, `headers()` or `searchParams`, or making uncached fetches, makes the page render per request (dynamic).',
      },
      {
        kind: 'code',
        language: 'tsx',
        code: code`
          // app/blog/[slug]/page.tsx
          export async function generateStaticParams() {
            return [{ slug: 'hello' }, { slug: 'world' }]; // built at build time
          }

          // Force a mode when you need to:
          // export const dynamic = 'force-static';
          // export const dynamic = 'force-dynamic';
        `,
      },
    ],
  },
  {
    topic: 'server-actions',
    title: 'Server Actions',
    blocks: [
      {
        kind: 'text',
        text: 'A Server Action is an async function marked `"use server"` that runs on the server when called. Pass it to `<form action>` and the form works even before JavaScript loads.',
      },
      {
        kind: 'code',
        language: 'tsx',
        code: code`
          export default function Page() {
            async function subscribe(formData: FormData) {
              'use server';
              const email = formData.get('email');
              // save email to the database...
            }
            return (
              <form action={subscribe}>
                <input name="email" />
                <button>Subscribe</button>
              </form>
            );
          }
        `,
      },
      { kind: 'tip', text: 'Treat every Server Action like a public API: validate input and check the user is allowed.' },
    ],
  },
  {
    topic: 'route-handlers',
    title: 'Route handlers',
    blocks: [
      {
        kind: 'text',
        text: 'API endpoints live in `route.ts` files and export functions named after HTTP methods. A folder can have a `route.ts` or a `page.tsx`, not both.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: code`
          // app/api/users/route.ts → GET /api/users
          export async function GET() {
            return Response.json([{ id: 1, name: 'Lin' }]);
          }

          export async function POST(request: Request) {
            const body = await request.json();
            return Response.json(body, { status: 201 });
          }
        `,
      },
      { kind: 'tip', text: 'Always return a `Response`. A handler that returns nothing makes the request fail.' },
    ],
  },
  {
    topic: 'middleware',
    title: 'Middleware',
    blocks: [
      {
        kind: 'text',
        text: 'Middleware runs before a request reaches a page or route. It suits auth redirects, locale detection and headers. Use `matcher` to limit which paths it runs on, and keep it fast.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: code`
          import { NextResponse, type NextRequest } from 'next/server';

          export function middleware(request: NextRequest) {
            if (!request.cookies.has('session')) {
              return NextResponse.redirect(new URL('/login', request.url));
            }
            return NextResponse.next();
          }

          export const config = { matcher: ['/dashboard/:path*'] };
        `,
      },
    ],
  },
  {
    topic: 'deployment',
    title: 'Safe URLs and environment variables',
    blocks: [
      {
        kind: 'text',
        text: 'Encode user input before putting it in a URL, so characters like `#`, `&` and spaces arrive intact. Keep secrets in environment variables; only variables prefixed `NEXT_PUBLIC_` reach the browser.',
      },
      {
        kind: 'code',
        language: 'ts',
        code: code`
          const slug = 'c# & you';
          const href = '/tags/' + encodeURIComponent(slug);
          // "/tags/c%23%20%26%20you"

          // .env.local
          // DATABASE_URL=...           server only
          // NEXT_PUBLIC_SITE_NAME=...  also in the browser
        `,
      },
    ],
  },
]);
