import { createHash } from 'node:crypto';

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { ApiError as GeminiApiError, GoogleGenAI } from '@google/genai';
import { z } from 'zod';

import { getTrackContent, questionsForUnit } from '../src/content';
import type { Question, Unit } from '../src/types/content';
import { checkQuestion } from './checks/question';
import { generatedQuiz, toQuestion, type GeneratedQuestion } from './schema';

/**
 * Which AI writes the questions. Gemini is used when GEMINI_API_KEY is set
 * (a Google AI Studio key), otherwise Claude. DEVQUEST_AI_PROVIDER overrides.
 */
export const PROVIDER: 'gemini' | 'anthropic' =
  process.env.DEVQUEST_AI_PROVIDER === 'anthropic' || process.env.DEVQUEST_AI_PROVIDER === 'gemini'
    ? process.env.DEVQUEST_AI_PROVIDER
    : process.env.GEMINI_API_KEY
      ? 'gemini'
      : 'anthropic';

export const MODEL = process.env.DEVQUEST_MODEL ?? (PROVIDER === 'gemini' ? 'gemini-3.8-flash' : 'claude-opus-5-5');

const GEMINI_TIMEOUT_MS = Number(process.env.DEVQUEST_GEMINI_TIMEOUT_MS ?? 45_000);

/** Gemini models tried in order when the main one is overloaded (503) or rate-limited (429). */
const GEMINI_FALLBACK_MODELS = (process.env.DEVQUEST_GEMINI_FALLBACKS ?? 'gemini-3.5-flash-lite')
  .split(',')
  .map((m) => m.trim())
  .filter((m) => m && m !== MODEL);

// Clients are created on first use, so the server can start (and serve the bank) without credentials.
let anthropic: Anthropic | null = null;
let gemini: GoogleGenAI | null = null;

type GeneratedQuiz = z.infer<typeof generatedQuiz>;

async function askClaude(system: string, user: string): Promise<GeneratedQuiz> {
  anthropic ??= new Anthropic();
  const response = await anthropic.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // If a safety classifier declines, the API retries on Anthropic's recommended fallback model.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: betaZodOutputFormat(generatedQuiz) },
    system,
    messages: [{ role: 'user', content: user }],
  });
  if (response.stop_reason === 'refusal') throw new Error('The model declined to write questions for this unit.');
  if (response.stop_reason === 'max_tokens') throw new Error('The response was cut off before it finished.');
  if (!response.parsed_output) throw new Error('The response did not match the question format.');
  return response.parsed_output;
}

type GeminiRequest = Parameters<GoogleGenAI['models']['generateContent']>[0];

/**
 * Calls Gemini with the main model, moving on to the fallback models when one
 * is overloaded (503), rate-limited (429) or doesn't reply within the time limit.
 */
async function callGemini(contents: GeminiRequest['contents'], config: NonNullable<GeminiRequest['config']>) {
  if (!process.env.GEMINI_API_KEY) throw new Error('The server has no GEMINI_API_KEY configured.');
  gemini ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = [MODEL, ...GEMINI_FALLBACK_MODELS];
  for (let i = 0; ; i++) {
    try {
      const response = await gemini.models.generateContent({
        model: models[i],
        contents,
        config: { ...config, abortSignal: AbortSignal.timeout(GEMINI_TIMEOUT_MS), httpOptions: { timeout: GEMINI_TIMEOUT_MS } },
      });
      if (i > 0) console.log(`[gemini] ${models[0]} was unavailable; used ${models[i]}`);
      return response;
    } catch (e) {
      const timedOut = e instanceof Error && (e.name === 'AbortError' || e.name === 'TimeoutError' || /abort|timed? ?out/i.test(e.message));
      const retryable = timedOut || (e instanceof GeminiApiError && (e.status === 503 || e.status === 429));
      if (timedOut) console.log(`[gemini] ${models[i]} did not reply in ${GEMINI_TIMEOUT_MS / 1000}s`);
      if (!retryable || i >= models.length - 1) throw e;
    }
  }
}

async function askGemini(system: string, user: string): Promise<GeneratedQuiz> {
  const response = await callGemini(user, {
    systemInstruction: system,
    responseMimeType: 'application/json',
    responseJsonSchema: z.toJSONSchema(generatedQuiz),
  });
  const text = response.text;
  if (!text) throw new Error('The model returned no questions.');
  // Gemini is asked for this schema, but validate anyway before trusting it.
  const result = generatedQuiz.safeParse(JSON.parse(text));
  if (!result.success) throw new Error('The response did not match the question format.');
  return result.data;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** Free-text answer from whichever provider is configured (tutor, hints, code review). */
export async function askText(system: string, turns: ChatTurn[]): Promise<string> {
  if (PROVIDER === 'gemini') {
    const response = await callGemini(
      turns.map((t) => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.content }] })),
      { systemInstruction: system },
    );
    const text = response.text?.trim();
    if (!text) throw new Error('The AI returned an empty answer.');
    return text;
  }
  anthropic ??= new Anthropic();
  const response = await anthropic.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system,
    messages: turns.map((t) => ({ role: t.role, content: t.content })),
  });
  if (response.stop_reason === 'refusal') throw new Error('The AI declined to answer that.');
  const text = response.content
    .flatMap((b) => (b.type === 'text' ? [b.text] : []))
    .join('')
    .trim();
  if (!text) throw new Error('The AI returned an empty answer.');
  return text;
}

const SYSTEM = `You write quiz questions for DevQuest, a mobile app that teaches frontend developers JavaScript, TypeScript, React and Next.js.

Every question must be technically correct, have exactly one defensible answer, and test understanding rather than trivia. Learners read on a phone, so keep prompts short and code snippets under 12 lines.

Rules for each question type:
- mcq / multi: 3-5 options. Wrong options should be mistakes a real learner makes, not jokes.
- true_false: a single clear statement; avoid "always"/"never" traps unless they are the point.
- output: plain runnable code (no imports, no DOM, no network, no randomness or dates). The answer option must equal, character for character, what the code prints: each console.log call is one line, its arguments joined by a single space. Log only strings, numbers and booleans; for arrays use .join(',') and for objects JSON.stringify. For ts, keep the code free of type errors.
- fill_blank: exactly one ___ in the code; the answer is a short token such as a method name or keyword.
- order: 3-7 lines in the correct order, no two lines identical (indent closing braces differently if needed).
- match: 3-5 pairs with distinct right-hand values.
- bug_find: code with exactly one buggy line; bugLine is 1-based.
- React questions use function components and hooks. Next.js questions use the App Router.

Every question's topic must be one of the unit topics given. Vary the question types. Do not repeat or lightly reword the existing questions you are shown.`;

export interface GenerateRequest {
  unit: Unit;
  count: number;
  /** Topics the learner gets wrong most; weight new questions toward these. */
  weakTopics: string[];
  /** Prompts already in the bank for this unit, so Claude avoids repeats. */
  existingPrompts: string[];
}

export interface GenerateResult {
  accepted: Question[];
  rejected: { prompt: string; problems: string[] }[];
}

/** A stable id from the content, so the same question never lands in the bank twice. */
function questionId(q: Pick<Question, 'prompt' | 'code'>) {
  return 'ai-' + createHash('sha256').update(`${q.prompt}\n${q.code ?? ''}`).digest('hex').slice(0, 12);
}

function stripForExample(q: Question) {
  const { id: _id, track: _track, unitId: _unit, source: _source, status: _status, ...rest } = q;
  return rest;
}

export async function generateQuestions(req: GenerateRequest): Promise<GenerateResult> {
  const { unit, count, weakTopics, existingPrompts } = req;
  const track = getTrackContent(unit.track)!.track;
  const examples = questionsForUnit(unit.id).slice(0, 3).map(stripForExample);

  const userMessage = [
    `Track: ${track.title}`,
    `Unit: ${unit.title} (${unit.level})`,
    `Unit summary: ${unit.summary}`,
    `Unit topics: ${unit.topics.join(', ')}`,
    weakTopics.length ? `The learner struggles with: ${weakTopics.join(', ')}. Put most questions on these topics.` : '',
    '',
    'Examples of the style and JSON shape we use:',
    JSON.stringify(examples, null, 2),
    '',
    'Existing questions to avoid repeating:',
    existingPrompts.map((p) => `- ${p}`).join('\n') || '- (none)',
    '',
    `Write ${count} new questions for this unit.`,
  ]
    .filter((line) => line !== '')
    .join('\n');

  const parsed = PROVIDER === 'gemini' ? await askGemini(SYSTEM, userMessage) : await askClaude(SYSTEM, userMessage);

  return acceptGenerated(parsed.questions, unit);
}

/** Converts Claude's output to app questions and keeps only those that pass every check. */
export async function acceptGenerated(generated: GeneratedQuestion[], unit: Unit): Promise<GenerateResult> {
  const accepted: Question[] = [];
  const rejected: GenerateResult['rejected'] = [];
  const seen = new Set<string>();
  for (const g of generated) {
    const question = toQuestion(g, unit.track, unit.id, questionId(g as Pick<Question, 'prompt' | 'code'>));
    if (seen.has(question.id)) continue;
    seen.add(question.id);
    // Same checks as the hand-written seed content: wrong or broken questions never reach a learner.
    const problems = await checkQuestion(question, unit);
    if (problems.length) rejected.push({ prompt: question.prompt, problems });
    else accepted.push(question);
  }
  return { accepted, rejected };
}
