import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { Question, QuestionStatus } from '../src/types/content';

/**
 * The bank of AI questions and the learner reports about any question, saved
 * as JSON files. Swap these for database tables (e.g. Supabase) when the app
 * has real users; the functions below stay the same.
 */
const DATA_DIR = path.join(__dirname, 'data');
const BANK_FILE = process.env.DEVQUEST_BANK_FILE ?? path.join(DATA_DIR, 'ai-questions.json');
const REPORTS_FILE = process.env.DEVQUEST_REPORTS_FILE ?? path.join(DATA_DIR, 'reports.json');

/** Open reports that take an AI question out of rotation until someone reviews it. */
export const REPORTS_TO_HIDE = Number(process.env.DEVQUEST_REPORTS_TO_HIDE ?? 2);

export type ReportReason = 'wrong_answer' | 'unclear' | 'typo' | 'other';

export interface Report {
  id: string;
  questionId: string;
  reason: ReportReason;
  note: string;
  at: string;
  /** For built-in questions, a copy of what the learner saw. */
  snapshot?: Pick<Question, 'prompt' | 'type' | 'track' | 'unitId'>;
  resolved: boolean;
}

function load<T>(file: string): T[] {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T[];
  } catch {
    return [];
  }
}

function save(file: string, data: unknown) {
  mkdirSync(path.dirname(file), { recursive: true });
  // Write then rename, so a crash mid-write never leaves a half-written file.
  writeFileSync(file + '.tmp', JSON.stringify(data, null, 2));
  renameSync(file + '.tmp', file);
}

let bank: Question[] = load<Question>(BANK_FILE);
let reports: Report[] = load<Report>(REPORTS_FILE);

// ------------------------------------------------------------------ bank

export function bankForUnit(unitId: string): Question[] {
  return bank.filter((q) => q.unitId === unitId && q.status === 'approved');
}

export function bankQuestion(id: string): Question | undefined {
  return bank.find((q) => q.id === id);
}

/** Every bank question in a given status, newest first. */
export function bankByStatus(status: QuestionStatus): Question[] {
  return bank.filter((q) => q.status === status).reverse();
}

/** Adds questions, skipping any id already stored. Returns the ones actually added. */
export function addToBank(questions: Question[]): Question[] {
  const ids = new Set(bank.map((q) => q.id));
  const fresh = questions.filter((q) => !ids.has(q.id));
  if (fresh.length) {
    bank = [...bank, ...fresh];
    save(BANK_FILE, bank);
  }
  return fresh;
}

export function setStatus(id: string, status: QuestionStatus): boolean {
  const q = bank.find((x) => x.id === id);
  if (!q) return false;
  bank = bank.map((x) => (x.id === id ? ({ ...x, status } as Question) : x));
  save(BANK_FILE, bank);
  return true;
}

export function bankSize() {
  return bank.length;
}

// ------------------------------------------------------------------ reports

export function addReport(report: Omit<Report, 'id' | 'at' | 'resolved'>): Report {
  const full: Report = { ...report, id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, at: new Date().toISOString(), resolved: false };
  reports = [...reports, full];
  save(REPORTS_FILE, reports);
  // Enough reports on an AI question takes it out of rotation until reviewed.
  const open = reports.filter((r) => r.questionId === report.questionId && !r.resolved).length;
  const q = bank.find((x) => x.id === report.questionId);
  if (q && q.status === 'approved' && open >= REPORTS_TO_HIDE) setStatus(q.id, 'pending');
  return full;
}

export function openReports(): Report[] {
  return reports.filter((r) => !r.resolved).reverse();
}

export function resolveReports(questionId: string) {
  reports = reports.map((r) => (r.questionId === questionId ? { ...r, resolved: true } : r));
  save(REPORTS_FILE, reports);
}
