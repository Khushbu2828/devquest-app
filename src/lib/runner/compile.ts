import { transform, type Transform } from 'sucrase';

import { SUCRASE_JSX_OPTIONS } from '@/lib/runner/mini-react';
import type { CodeLanguage } from '@/types/content';

/**
 * Turns learner code (JS, TS, JSX or TSX) into plain JavaScript for the
 * sandbox. Types are stripped, not checked; `import` becomes `require`, which
 * the sandbox answers with the mini React for 'react'. The seed verifier uses
 * this same function, so content that passes there passes in the app.
 */
export function compileForSandbox(source: string, language: CodeLanguage): string {
  const transforms: Transform[] = ['imports'];
  if (language === 'ts' || language === 'tsx') transforms.unshift('typescript');
  if (language === 'jsx' || language === 'tsx') transforms.unshift('jsx');
  return transform(source, {
    transforms,
    production: true,
    disableESTransforms: true,
    ...SUCRASE_JSX_OPTIONS,
  }).code;
}

/** Returns a readable syntax error message, or null if the code compiles. */
export function syntaxError(source: string, language: CodeLanguage): string | null {
  try {
    compileForSandbox(source, language);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
