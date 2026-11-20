import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { SandboxFrame } from '@/components/code/sandbox-frame';
import { HOST_TIMEOUT_MS, buildSandboxPage, type RunResult } from '@/lib/runner/sandbox-page';
import type { CodeLanguage, CodeTest } from '@/types/content';

interface Job {
  id: number;
  html: string;
  resolve: (r: RunResult) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Runs learner code in a fresh sandbox page per run. Render `sandbox`
 * somewhere in the screen (it is invisible). If the code never finishes, for
 * example an infinite loop, the page is thrown away after HOST_TIMEOUT_MS.
 */
export function useCodeRunner(): {
  run: (source: string, language: CodeLanguage, tests?: CodeTest[]) => Promise<RunResult>;
  running: boolean;
  sandbox: ReactNode;
} {
  const jobRef = useRef<Job | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const nextId = useRef(1);

  const finish = useCallback((id: number, result: RunResult) => {
    const current = jobRef.current;
    if (!current || current.id !== id) return;
    clearTimeout(current.timer);
    jobRef.current = null;
    setJob(null);
    current.resolve(result);
  }, []);

  const run = useCallback(
    (source: string, language: CodeLanguage, tests: CodeTest[] = []) =>
      new Promise<RunResult>((resolve) => {
        // A new run replaces one still in progress.
        if (jobRef.current) finish(jobRef.current.id, { logs: [], results: [], error: 'Cancelled' });
        const id = nextId.current++;
        const timer = setTimeout(
          () =>
            finish(id, {
              logs: [],
              results: tests.map((t) => ({ name: t.name, passed: false, error: 'Timed out' })),
              error: 'Your code took too long to finish. Is there an infinite loop?',
            }),
          HOST_TIMEOUT_MS,
        );
        const next = { id, html: buildSandboxPage(source, language, tests), resolve, timer };
        jobRef.current = next;
        setJob(next);
      }),
    [finish],
  );

  // Settle any pending run if the screen closes mid-run.
  useEffect(
    () => () => {
      const current = jobRef.current;
      if (current) {
        clearTimeout(current.timer);
        jobRef.current = null;
        current.resolve({ logs: [], results: [], error: 'Cancelled' });
      }
    },
    [],
  );

  const sandbox = job ? (
    <SandboxFrame
      key={job.id}
      html={job.html}
      onMessage={(data) => {
        try {
          finish(job.id, JSON.parse(data) as RunResult);
        } catch {
          finish(job.id, { logs: [], results: [], error: 'The sandbox sent an unreadable result.' });
        }
      }}
    />
  ) : null;

  return { run, running: job !== null, sandbox };
}
