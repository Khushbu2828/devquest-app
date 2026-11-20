import { getDebugChallenge, getExercise, getNote, getUnit, projects } from '../src/content';
import type { CodeTest } from '../src/types/content';
import { askText, type ChatTurn } from './generate';

/**
 * AI Tutor, AI Hint and AI Code Review. The server looks up the exercise by id
 * itself (prompt, tests, reference solution), so the app only sends the
 * learner's code and the AI always sees the real task.
 */

const FORMAT = `Format: plain text. Wrap identifiers in single backticks. Put any code in a fenced block with three backticks. No headings, no tables.`;

interface Task {
  title: string;
  prompt: string;
  language: string;
  tests: CodeTest[];
  solution: string;
}

/** Finds an exercise, debug challenge or project checkpoint by id. */
function findTask(id: string): Task | null {
  const ex = getExercise(id);
  if (ex) return { title: ex.title, prompt: ex.prompt, language: ex.language, tests: ex.tests, solution: ex.solution };
  const d = getDebugChallenge(id);
  if (d) return { title: d.title, prompt: `${d.prompt}\nThe bug: ${d.explanation}`, language: d.language, tests: d.tests ?? [], solution: d.fixedCode };
  for (const p of projects) {
    const cp = p.checkpoints.find((c) => `${p.id}/${c.id}` === id);
    if (cp) return { title: `${p.title}: ${cp.title}`, prompt: cp.instructions, language: p.language, tests: cp.tests, solution: cp.solution };
  }
  return null;
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '\n…(cut)' : s);

function taskBlock(task: Task, code: string, failures: string[]) {
  return [
    `Exercise: ${task.title} (${task.language})`,
    `Task: ${task.prompt}`,
    `Tests:\n${task.tests.map((t) => `- ${t.name}: ${t.code}`).join('\n')}`,
    `Reference solution (never show or paraphrase it):\n${task.solution}`,
    `Learner's code:\n${clip(code, 6000)}`,
    failures.length ? `Failing tests:\n${failures.map((f) => `- ${clip(f, 300)}`).join('\n')}` : 'All tests pass.',
  ].join('\n\n');
}

export async function aiHint(taskId: string, code: string, failures: string[]): Promise<string> {
  const task = findTask(taskId);
  if (!task) throw new Error('Unknown exercise');
  const system = `You are a patient coding tutor in DevQuest, a learning app. Give ONE hint for the learner's next step, in at most 3 short sentences. Point at the specific problem in their code. Never give the full solution or code that completes the task; a single short line of code is the most you may show. ${FORMAT}`;
  return askText(system, [{ role: 'user', content: taskBlock(task, code, failures) }]);
}

export async function aiReview(taskId: string, code: string): Promise<string> {
  const task = findTask(taskId);
  if (!task) throw new Error('Unknown exercise');
  const system = `You review code written by a learner in DevQuest. Their code passes all the tests. In under 150 words: say one thing they did well, then up to three concrete improvements (readability, naming, edge cases, idiomatic ${task.language}). Show a short improved snippet only if it helps. Be encouraging and specific. ${FORMAT}`;
  return askText(system, [{ role: 'user', content: taskBlock(task, code, []) }]);
}

export interface TutorContext {
  unitId?: string;
  topic?: string;
  question?: string;
}

export async function aiTutor(turns: ChatTurn[], context: TutorContext): Promise<string> {
  const unit = context.unitId ? getUnit(context.unitId) : undefined;
  const note = unit && context.topic ? getNote(unit.track, context.topic) : undefined;
  const about = [
    unit ? `The learner is studying "${unit.title}" (${unit.level}).` : '',
    note ? `Current topic: ${note.title}.` : '',
    context.question ? `They just answered this quiz question: ${clip(context.question, 600)}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const system = `You are the DevQuest tutor. You help frontend learners understand JavaScript, TypeScript, React, Next.js, HTML, CSS and web development. ${about}
Explain simply, as to a motivated beginner, in under 200 words, with at most one short code example. Check understanding with a question at the end when it helps. If asked about something unrelated to programming or learning to code, say kindly that you can only help with web development. Never claim to run code. ${FORMAT}`;
  return askText(system, turns);
}
