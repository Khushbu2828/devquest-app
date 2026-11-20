import type { Attempt } from '@/types/progress';

/**
 * Spaced repetition. Each question's next review date depends on how many
 * times in a row the learner has answered it right: a miss brings it back
 * tomorrow, and every right answer roughly doubles the gap.
 */
export const INTERVAL_DAYS = [1, 3, 7, 16, 35];
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReviewItem {
  questionId: string;
  /** Right answers in a row, counting back from the latest. */
  streak: number;
  dueAt: number;
}

export function schedule(attempts: Attempt[]): ReviewItem[] {
  const byQuestion = new Map<string, Attempt[]>();
  for (const a of attempts) {
    const list = byQuestion.get(a.questionId);
    if (list) list.push(a);
    else byQuestion.set(a.questionId, [a]);
  }
  const items: ReviewItem[] = [];
  for (const [questionId, list] of byQuestion) {
    list.sort((x, y) => x.answeredAt.localeCompare(y.answeredAt));
    let streak = 0;
    for (let i = list.length - 1; i >= 0 && list[i].correct; i--) streak++;
    const last = new Date(list[list.length - 1].answeredAt).getTime();
    const days = INTERVAL_DAYS[Math.min(streak, INTERVAL_DAYS.length - 1)];
    items.push({ questionId, streak, dueAt: last + days * DAY_MS });
  }
  return items;
}

/** Questions due for review now, most overdue first. `known` filters to questions the app can show. */
export function dueForReview(attempts: Attempt[], known: (id: string) => boolean, now = Date.now()): string[] {
  return schedule(attempts)
    .filter((i) => i.dueAt <= now && known(i.questionId))
    .sort((a, b) => a.dueAt - b.dueAt)
    .map((i) => i.questionId);
}
