/**
 * DevQuest AI question server: `npm run server`
 *
 *   GET  /health          → { ok, provider, model, bankSize }
 *   POST /api/quiz        { unitId, count?, weakTopics?, excludeIds? }
 *                         → { questions, fromBank, generated, rejected, notice? }
 *   POST /api/typecheck   { code, language } → { errors }
 *   POST /api/report      { questionId, reason, note?, snapshot? } → { ok }
 *   POST /api/hint        { taskId, code, failures? } → { text }
 *   POST /api/review      { taskId, code } → { text }
 *   POST /api/tutor       { messages, context? } → { text }
 *   GET  /admin           review queue (needs DEVQUEST_ADMIN_TOKEN)
 *
 * Serves AI-written questions for a unit. Questions already in the bank are
 * reused first; new ones are generated only when the learner has seen them all.
 * Every generated question passes the same checks as the seed content before
 * it is saved or sent. The Anthropic API key stays on this server.
 */
import Anthropic from '@anthropic-ai/sdk';
import { ApiError as GeminiApiError } from '@google/genai';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { getUnit } from '../src/content';
import { shuffle } from '../src/lib/quiz';
import type { Question } from '../src/types/content';
import { MODEL, PROVIDER, generateQuestions } from './generate';
import { typeErrors } from './checks/sandbox';
import { handleAdmin } from './admin';
import { aiHint, aiReview, aiTutor } from './assist';
import type { ChatTurn } from './generate';
import { addReport, addToBank, bankForUnit, bankSize, type ReportReason } from './store';

const PORT = Number(process.env.PORT ?? 8787);
const ALLOWED_ORIGIN = process.env.DEVQUEST_ALLOWED_ORIGIN ?? '*';
/** Generation calls allowed per client IP per hour; protects the API bill. */
const GENERATIONS_PER_HOUR = Number(process.env.DEVQUEST_GENERATIONS_PER_HOUR ?? 20);
const MAX_COUNT = 8;
/** With DEVQUEST_REVIEW_NEW=true, new AI questions wait in the review queue before learners see them. */
const REVIEW_NEW = process.env.DEVQUEST_REVIEW_NEW === 'true';

// ------------------------------------------------------------------ helpers

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 64 * 1024) throw new Error('Request body too large');
    chunks.push(chunk as Buffer);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

const strings = (v: unknown, max: number) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, max) : [];

const recent = new Map<string, number[]>();
/** Simple per-IP hourly limit, keyed by action. */
function allow(action: string, ip: string, perHour: number) {
  const key = `${action}:${ip}`;
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const times = (recent.get(key) ?? []).filter((t) => t > hourAgo);
  if (times.length >= perHour) return false;
  recent.set(key, [...times, Date.now()]);
  return true;
}

/** One generation per unit at a time; concurrent requests share the result. */
const inFlight = new Map<string, ReturnType<typeof generateQuestions>>();

function describeError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return 'The server has no valid Anthropic API key.';
  if (e instanceof Anthropic.RateLimitError) return 'The AI is busy right now. Try again in a minute.';
  if (e instanceof Anthropic.APIError) return `The AI request failed (${e.status ?? 'network'}).`;
  if (e instanceof Error && (e.name === 'AbortError' || e.name === 'TimeoutError')) return 'The AI took too long to reply. Try again in a minute.';
  if (e instanceof GeminiApiError) {
    if (e.status === 400 && /api key/i.test(e.message)) return 'The server has no valid Gemini API key.';
    if (e.status === 401 || e.status === 403) return 'The server has no valid Gemini API key.';
    if (e.status === 429) return 'The AI is busy or out of quota right now. Try again later.';
    return `The AI request failed (${e.status}).`;
  }
  if (e instanceof Error && /api key|credentials|auth/i.test(e.message)) return 'The server has no Anthropic API key configured.';
  return e instanceof Error ? e.message : 'Unknown error';
}

// ------------------------------------------------------------------ routes

async function quiz(req: IncomingMessage, res: ServerResponse) {
  const body = (await readJson(req)) as Record<string, unknown>;
  const unit = typeof body.unitId === 'string' ? getUnit(body.unitId) : undefined;
  if (!unit) return send(res, 400, { error: 'Unknown unitId' });

  const count = Math.min(MAX_COUNT, Math.max(1, Number(body.count) || 5));
  const weakTopics = strings(body.weakTopics, 10).filter((t) => unit.topics.includes(t));
  const exclude = new Set(strings(body.excludeIds, 1000));

  const unseen = shuffle(bankForUnit(unit.id).filter((q) => !exclude.has(q.id)));
  // Prefer unseen questions on the learner's weak topics.
  unseen.sort((a, b) => Number(weakTopics.includes(b.topic)) - Number(weakTopics.includes(a.topic)));
  if (unseen.length >= count) {
    return send(res, 200, { questions: unseen.slice(0, count), fromBank: count, generated: 0, rejected: 0 });
  }

  const ip = req.socket.remoteAddress ?? 'unknown';
  if (!allow('generate', ip, GENERATIONS_PER_HOUR)) {
    return send(res, 200, {
      questions: unseen,
      fromBank: unseen.length,
      generated: 0,
      rejected: 0,
      notice: 'You have reached the hourly limit for new AI questions.',
    });
  }

  let pending = inFlight.get(unit.id);
  if (!pending) {
    pending = generateQuestions({
      unit,
      // Ask for a couple extra: some may fail the checks.
      count: Math.min(MAX_COUNT, count - unseen.length + 2),
      weakTopics,
      existingPrompts: bankForUnit(unit.id).map((q) => q.prompt),
    }).finally(() => inFlight.delete(unit.id));
    inFlight.set(unit.id, pending);
  }

  try {
    const started = Date.now();
    const { accepted, rejected } = await pending;
    addToBank(REVIEW_NEW ? accepted.map((q) => ({ ...q, status: 'pending' as const })) : accepted);
    console.log(
      `[quiz] ${unit.id}: ${accepted.length} accepted, ${rejected.length} rejected in ${Date.now() - started} ms`,
    );
    for (const r of rejected) console.log(`  ✗ ${r.prompt}\n    ${r.problems.join('\n    ')}`);
    const fresh: Question[] = REVIEW_NEW ? [] : accepted.filter((q) => !exclude.has(q.id));
    const questions = [...unseen, ...fresh].slice(0, count);
    send(res, 200, {
      questions,
      fromBank: Math.min(unseen.length, count),
      generated: fresh.length,
      rejected: rejected.length,
    });
  } catch (e) {
    console.error(`[quiz] ${unit.id}: generation failed`, e);
    send(res, 200, { questions: unseen, fromBank: unseen.length, generated: 0, rejected: 0, notice: describeError(e) });
  }
}

/** Type-checks learner TypeScript under `strict` (the app can only strip types, not check them). */
async function typecheck(req: IncomingMessage, res: ServerResponse) {
  const body = (await readJson(req)) as Record<string, unknown>;
  const code = typeof body.code === 'string' ? body.code : '';
  const language = body.language === 'tsx' ? 'tsx' : 'ts';
  if (!code || code.length > 20_000) return send(res, 400, { error: 'Send `code` (up to 20,000 characters)' });
  send(res, 200, { errors: typeErrors(code, language).slice(0, 20) });
}

const REASONS: ReportReason[] = ['wrong_answer', 'unclear', 'typo', 'other'];

/** A learner flags a question. Two open reports take an AI question out of rotation until reviewed. */
async function report(req: IncomingMessage, res: ServerResponse) {
  if (!allow('report', req.socket.remoteAddress ?? 'unknown', 30)) return send(res, 429, { error: 'Too many reports. Try later.' });
  const body = (await readJson(req)) as Record<string, unknown>;
  const reason = REASONS.find((r) => r === body.reason);
  if (typeof body.questionId !== 'string' || !reason) return send(res, 400, { error: 'Send questionId and a valid reason' });
  const snap = body.snapshot as Record<string, unknown> | undefined;
  addReport({
    questionId: body.questionId.slice(0, 80),
    reason,
    note: typeof body.note === 'string' ? body.note.slice(0, 500) : '',
    snapshot:
      snap && typeof snap.prompt === 'string'
        ? {
            prompt: String(snap.prompt).slice(0, 1000),
            type: String(snap.type) as Question['type'],
            track: String(snap.track) as Question['track'],
            unitId: String(snap.unitId).slice(0, 80),
          }
        : undefined,
  });
  send(res, 200, { ok: true });
}

/** Hints, reviews and tutor chat share one hourly allowance per device to cap API cost. */
const ASSIST_PER_HOUR = Number(process.env.DEVQUEST_ASSISTS_PER_HOUR ?? 60);

async function assist(req: IncomingMessage, res: ServerResponse, kind: 'hint' | 'review' | 'tutor') {
  if (!allow('assist', req.socket.remoteAddress ?? 'unknown', ASSIST_PER_HOUR)) {
    return send(res, 429, { error: 'You have used the AI helper a lot this hour. Try again later.' });
  }
  const body = (await readJson(req)) as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
  try {
    let text: string;
    if (kind === 'tutor') {
      const turns: ChatTurn[] = (Array.isArray(body.messages) ? body.messages : [])
        .slice(-12)
        .map((m: { role?: string; content?: unknown }) => ({ role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const), content: str(m.content, 2000) }))
        .filter((m) => m.content.trim());
      if (!turns.length || turns[turns.length - 1].role !== 'user') return send(res, 400, { error: "Send messages ending with the learner's question" });
      const ctx = (body.context ?? {}) as Record<string, unknown>;
      text = await aiTutor(turns, { unitId: str(ctx.unitId, 80), topic: str(ctx.topic, 80), question: str(ctx.question, 1000) });
    } else {
      const taskId = str(body.taskId, 120);
      const code = str(body.code, 12_000);
      if (!taskId || !code) return send(res, 400, { error: 'Send taskId and code' });
      const failures = (Array.isArray(body.failures) ? body.failures : []).slice(0, 10).map((f) => str(f, 400));
      text = kind === 'hint' ? await aiHint(taskId, code, failures) : await aiReview(taskId, code);
    }
    send(res, 200, { text });
  } catch (e) {
    console.error(`[${kind}] failed`, e instanceof Error ? e.message : e);
    send(res, 502, { error: e instanceof Error && e.message === 'Unknown exercise' ? e.message : describeError(e) });
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, null);
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/health') {
      return send(res, 200, { ok: true, provider: PROVIDER, model: MODEL, bankSize: bankSize() });
    }
    if (req.method === 'POST' && url.pathname === '/api/quiz') return await quiz(req, res);
    if (req.method === 'POST' && url.pathname === '/api/typecheck') return await typecheck(req, res);
    if (req.method === 'POST' && url.pathname === '/api/report') return await report(req, res);
    if (req.method === 'POST' && url.pathname === '/api/hint') return await assist(req, res, 'hint');
    if (req.method === 'POST' && url.pathname === '/api/review') return await assist(req, res, 'review');
    if (req.method === 'POST' && url.pathname === '/api/tutor') return await assist(req, res, 'tutor');
    if (await handleAdmin(req, res, url.pathname, send, readJson)) return;
    send(res, 404, { error: 'Not found' });
  } catch (e) {
    send(res, 400, { error: e instanceof Error ? e.message : 'Bad request' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`DevQuest AI server on http://localhost:${PORT} (${PROVIDER}, model ${MODEL}, ${bankSize()} questions in the bank)`);
});
