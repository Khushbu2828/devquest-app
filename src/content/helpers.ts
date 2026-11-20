import type { Question, TopicNote, TrackId } from '@/types/content';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** A seed question as authored: track, source and status are filled in by `seedQuestions`. */
export type SeedQuestion = DistributiveOmit<Question, 'track' | 'source' | 'status'>;

export function notesFor(track: TrackId, list: Omit<TopicNote, 'track'>[]): TopicNote[] {
  return list.map((n) => ({ ...n, track }));
}

export function seedQuestions(track: TrackId, list: SeedQuestion[]): Question[] {
  return list.map((q) => ({ ...q, track, source: 'seed', status: 'approved' }) as Question);
}

/**
 * Strips the shared leading indentation so code can be written indented in
 * source files. Indentation is measured on the template text only, so an
 * interpolated multi-line snippet (placed at the start of a line) is inserted
 * as-is without throwing off the dedent.
 */
export function code(strings: TemplateStringsArray, ...values: unknown[]): string {
  const marker = (i: number) => `\u0000${i}\u0000`;
  const template = strings.reduce((acc, s, i) => acc + s + (i < values.length ? marker(i) : ''), '');
  const lines = template.replace(/^\n/, '').replace(/\n\s*$/, '').split('\n');
  const indent = Math.min(
    ...lines.filter((l) => l.trim().length > 0).map((l) => l.match(/^ */)![0].length),
  );
  const dedented = lines.map((l) => l.slice(indent)).join('\n');
  return dedented.replace(/\u0000(\d+)\u0000/g, (_, i: string) => String(values[Number(i)]));
}
