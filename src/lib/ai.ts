import { topicStats } from '@/lib/stats';
import type { Question, QuestionType, Unit } from '@/types/content';
import type { Attempt } from '@/types/progress';

/**
 * Client for the DevQuest AI question server (`npm run server`). The app never
 * talks to the AI provider directly, so no API key ships in the app.
 *
 * Set EXPO_PUBLIC_AI_SERVER_URL (see .env.example). On a phone, use your
 * computer's LAN address, e.g. http://192.168.1.20:8787, not localhost.
 */
export const AI_SERVER_URL = process.env.EXPO_PUBLIC_AI_SERVER_URL?.replace(/\/$/, '') || null;

export const aiEnabled = AI_SERVER_URL !== null;

export interface AiQuiz {
  questions: Question[];
  /** Shown to the learner when fewer AI questions came back than asked for. */
  notice?: string;
}

const TYPES = new Set<QuestionType>(['mcq', 'multi', 'true_false', 'output', 'fill_blank', 'order', 'match', 'bug_find']);

/** Light shape check: the server already validated content; this guards against a wrong or stale server. */
function looksLikeQuestion(q: unknown, unitId: string): q is Question {
  const v = q as Partial<Question> | null;
  return (
    !!v &&
    typeof v.id === 'string' &&
    typeof v.prompt === 'string' &&
    typeof v.topic === 'string' &&
    v.unitId === unitId &&
    TYPES.has(v.type as QuestionType) &&
    Array.isArray(v.hints)
  );
}

/** Topics in this unit the learner gets right less than 80% of the time. */
export function weakTopicsFor(unit: Unit, attempts: Attempt[]): string[] {
  const stats = topicStats(attempts);
  return unit.topics.filter((t) => {
    const s = stats[`${unit.track}:${t}`];
    return s && s.attempts > 0 && s.correct / s.attempts < 0.8;
  });
}

export async function fetchAiQuiz(unit: Unit, attempts: Attempt[], count: number, signal?: AbortSignal): Promise<AiQuiz> {
  if (!AI_SERVER_URL) throw new Error('AI server is not configured');
  // AI questions this learner has already answered, so the server sends new ones.
  const seen = [...new Set(attempts.filter((a) => a.questionId.startsWith('ai-')).map((a) => a.questionId))];
  const res = await fetch(`${AI_SERVER_URL}/api/quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      unitId: unit.id,
      count,
      weakTopics: weakTopicsFor(unit, attempts),
      excludeIds: seen.slice(-1000),
    }),
    signal,
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const body = (await res.json()) as { questions?: unknown[]; notice?: string };
  const questions = (body.questions ?? []).filter((q) => looksLikeQuestion(q, unit.id));
  return { questions, notice: body.notice };
}

async function post<T>(path: string, body: unknown, timeoutMs = 20_000): Promise<T> {
  if (!AI_SERVER_URL) throw new Error('The DevQuest server is not configured');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${AI_SERVER_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await res.json()) as T & { error?: string };
    if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/** Strict TypeScript errors for learner code, from the server. Null when the server can't be reached. */
export async function serverTypecheck(code: string, language: 'ts' | 'tsx'): Promise<string[] | null> {
  try {
    return (await post<{ errors: string[] }>('/api/typecheck', { code, language })).errors;
  } catch {
    return null;
  }
}

export { post as postToServer };

export type ReportReason = 'wrong_answer' | 'unclear' | 'typo' | 'other';

/** Sends a learner's report about a question. Returns false if it couldn't be sent. */
export async function reportQuestion(question: Question, reason: ReportReason, note: string): Promise<boolean> {
  try {
    await post('/api/report', {
      questionId: question.id,
      reason,
      note,
      snapshot: { prompt: question.prompt, type: question.type, track: question.track, unitId: question.unitId },
    });
    return true;
  } catch {
    return false;
  }
}

export interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** AI hint for an exercise, debug challenge or project step (by id). Throws with a readable message. */
export async function aiHint(taskId: string, code: string, failures: string[]): Promise<string> {
  return (await post<{ text: string }>('/api/hint', { taskId, code, failures }, 60_000)).text;
}

/** AI code review for code that passes the tests. */
export async function aiReview(taskId: string, code: string): Promise<string> {
  return (await post<{ text: string }>('/api/review', { taskId, code }, 60_000)).text;
}

export async function aiTutor(
  messages: TutorMessage[],
  context: { unitId?: string; topic?: string; question?: string },
): Promise<string> {
  return (await post<{ text: string }>('/api/tutor', { messages, context }, 60_000)).text;
}
