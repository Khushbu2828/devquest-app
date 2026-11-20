import type { Attempt, DayActivity, Reward, Stats, TopicStats } from '@/types/progress';

/**
 * Pure functions over the progress event lists. No React Native imports, so
 * they run in unit tests and on the server as well as in the app.
 */

export const MAX_STORED_ATTEMPTS = 5000;

/** Local calendar day, so a streak follows the learner's own midnight. */
export function dayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const attemptKey = (a: Attempt) => `${a.questionId}@${a.answeredAt}`;

/** Union of two attempt lists (by question + time), oldest first. */
export function mergeAttempts(a: Attempt[], b: Attempt[]): Attempt[] {
  const seen = new Set(a.map(attemptKey));
  const merged = [...a, ...b.filter((x) => !seen.has(attemptKey(x)))];
  return merged.sort((x, y) => x.answeredAt.localeCompare(y.answeredAt)).slice(-MAX_STORED_ATTEMPTS);
}

/** Union of two reward lists (by id), oldest first. */
export function mergeRewards(a: Reward[], b: Reward[]): Reward[] {
  const seen = new Set(a.map((r) => r.id));
  return [...a, ...b.filter((r) => !seen.has(r.id))].sort((x, y) => x.at.localeCompare(y.at));
}

/** XP total and per-day activity, derived from the event lists. */
export function computeStats(attempts: Attempt[], rewards: Reward[]): Stats {
  const activity: Record<string, DayActivity> = {};
  const day = (iso: string) => (activity[dayKey(new Date(iso))] ??= { xp: 0, answered: 0 });
  let xp = 0;
  for (const a of attempts) {
    xp += a.xp;
    const d = day(a.answeredAt);
    d.xp += a.xp;
    d.answered += 1;
  }
  for (const r of rewards) {
    xp += r.xp;
    day(r.at).xp += r.xp;
  }
  return { xp, activity };
}

/** Accuracy per topic, keyed `track:topic`. */
export function topicStats(attempts: Attempt[]): Record<string, TopicStats> {
  const stats: Record<string, TopicStats> = {};
  for (const a of attempts) {
    const key = `${a.track}:${a.topic}`;
    const s = (stats[key] ??= { attempts: 0, correct: 0 });
    s.attempts += 1;
    if (a.correct) s.correct += 1;
  }
  return stats;
}

/** Monday of the current week (local time), as YYYY-MM-DD. */
export function weekStart(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dayKey(d);
}

/** XP earned on or after a YYYY-MM-DD date (local days). */
export function xpSince(attempts: Attempt[], rewards: Reward[], since: string): number {
  const { activity } = computeStats(attempts, rewards);
  return Object.entries(activity).reduce((sum, [day, a]) => (day >= since ? sum + a.xp : sum), 0);
}
