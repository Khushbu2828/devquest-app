import { useEffect, useRef } from 'react';

/**
 * Web version: a hidden iframe with `sandbox="allow-scripts"` (no same-origin
 * access), so learner code can't touch the app's page, storage or cookies.
 */
export function SandboxFrame({ html, onMessage }: { html: string; onMessage: (data: string) => void }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const handler = useRef(onMessage);
  useEffect(() => {
    handler.current = onMessage;
  });

  useEffect(() => {
    const listen = (e: MessageEvent) => {
      if (e.source === ref.current?.contentWindow && typeof e.data === 'string') handler.current(e.data);
    };
    window.addEventListener('message', listen);
    return () => window.removeEventListener('message', listen);
  }, []);

  return (
    <iframe
      ref={ref}
      title="Code sandbox"
      sandbox="allow-scripts"
      srcDoc={html}
      style={{ width: 1, height: 1, border: 0, position: 'absolute', opacity: 0, pointerEvents: 'none' }}
    />
  );
}
