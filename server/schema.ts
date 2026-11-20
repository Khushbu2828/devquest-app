import { z } from 'zod';

import type { Question, TrackId } from '../src/types/content';

/**
 * The JSON shape Claude must return (enforced with structured outputs). It
 * mirrors the app's `Question` union, minus fields the server fills in (id,
 * track, unit, source, status). Optional fields are nullable because
 * structured outputs require every property to be present.
 */
const base = {
  topic: z.string().describe('One of the unit topics, exactly as listed.'),
  difficulty: z.number().int().describe('1 (easy) to 5 (hard).'),
  prompt: z.string().describe('The question. Wrap code identifiers in `backticks`.'),
  explanation: z.string().describe('Why the answer is right, in 1-3 short sentences.'),
  hints: z.array(z.string()).describe('One or two hints that nudge without giving the answer away.'),
  tags: z.array(z.string()),
};

const language = z.enum(['js', 'ts', 'jsx', 'tsx']);

const generatedQuestion = z.discriminatedUnion('type', [
  z.object({
    ...base,
    type: z.literal('mcq'),
    options: z.array(z.string()),
    answer: z.number().int().describe('Index of the correct option.'),
    code: z.string().nullable().describe('Optional code shown with the prompt.'),
    language: language.nullable(),
  }),
  z.object({
    ...base,
    type: z.literal('multi'),
    options: z.array(z.string()),
    answers: z.array(z.number().int()).describe('Indexes of every correct option.'),
  }),
  z.object({ ...base, type: z.literal('true_false'), answer: z.boolean() }),
  z.object({
    ...base,
    type: z.literal('output'),
    code: z.string().describe('Runnable code whose console.log output is the answer.'),
    language: z.enum(['js', 'ts']),
    options: z.array(z.string()),
    answer: z.number().int().describe('Index of the option that equals the exact output.'),
  }),
  z.object({
    ...base,
    type: z.literal('fill_blank'),
    code: z.string().describe('Code containing exactly one ___ placeholder.'),
    language,
    answer: z.string(),
    accept: z.array(z.string()).describe('Other accepted spellings; may be empty.'),
  }),
  z.object({
    ...base,
    type: z.literal('order'),
    lines: z.array(z.string()).describe('Lines in the CORRECT order; the app shuffles them. No duplicate lines.'),
    language,
  }),
  z.object({
    ...base,
    type: z.literal('match'),
    pairs: z.array(z.object({ left: z.string(), right: z.string() })),
  }),
  z.object({
    ...base,
    type: z.literal('bug_find'),
    code: z.string(),
    language,
    bugLine: z.number().int().describe('1-based line number of the single buggy line.'),
  }),
]);

export const generatedQuiz = z.object({ questions: z.array(generatedQuestion) });

export type GeneratedQuestion = z.infer<typeof generatedQuestion>;

/** Fills in the server-owned fields and drops nulls so the result is a normal app `Question`. */
export function toQuestion(g: GeneratedQuestion, track: TrackId, unitId: string, id: string): Question {
  const common = { id, track, unitId, source: 'ai' as const, status: 'approved' as const };
  const difficulty = Math.min(5, Math.max(1, Math.round(g.difficulty))) as Question['difficulty'];
  if (g.type === 'mcq') {
    const { code, language: lang, ...rest } = g;
    return { ...rest, ...common, difficulty, ...(code ? { code, language: lang ?? 'js' } : {}) };
  }
  if (g.type === 'fill_blank') {
    const { accept, ...rest } = g;
    return { ...rest, ...common, difficulty, ...(accept.length ? { accept } : {}) };
  }
  return { ...g, ...common, difficulty } as Question;
}
