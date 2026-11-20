import { questionsForUnit, tracks, unitsForTrack } from '@/content';
import { lastAttempts } from '@/lib/quiz';
import { dayKey } from '@/lib/stats';
import type { BuildProject, Level, TrackId, Unit } from '@/types/content';
import type { Attempt, DayActivity, LearnerProfile } from '@/types/progress';

/**
 * Progress is measured by questions, not lessons: a question counts as
 * mastered when the learner's most recent answer to it was right.
 */
export function masteredIds(attempts: Attempt[]): Set<string> {
  const ids = new Set<string>();
  for (const [id, a] of lastAttempts(attempts)) if (a.correct) ids.add(id);
  return ids;
}

export interface Mastery {
  done: number;
  total: number;
  fraction: number;
}

function mastery(questionIds: string[], mastered: Set<string>): Mastery {
  const done = questionIds.filter((id) => mastered.has(id)).length;
  const total = questionIds.length;
  return { done, total, fraction: total ? done / total : 0 };
}

export function unitMastery(unitId: string, mastered: Set<string>): Mastery {
  return mastery(questionsForUnit(unitId).map((q) => q.id), mastered);
}

export function trackMastery(track: TrackId, mastered: Set<string>): Mastery {
  const ids = unitsForTrack(track).flatMap((u) => questionsForUnit(u.id).map((q) => q.id));
  return mastery(ids, mastered);
}

const levelRank: Record<Level, number> = { beginner: 0, intermediate: 1, advanced: 2 };

/**
 * The unit to suggest next: walk tracks in order and pick the first unit that
 * still has unmastered questions, starting at the learner's self-assessed level
 * (earlier units are only suggested once everything later is done).
 */
export function nextUnit(profile: LearnerProfile | null, mastered: Set<string>): Unit | null {
  for (const t of tracks) {
    const units = unitsForTrack(t.id).filter((u) => unitMastery(u.id, mastered).fraction < 1);
    if (units.length === 0) continue;
    const start = profile ? levelRank[profile.selfAssessment[t.id]] : 0;
    return units.find((u) => levelRank[u.level] >= start) ?? units[0];
  }
  return null;
}

/** Consecutive days with activity, ending today (or yesterday, if today has none yet). */
export function currentStreak(activity: Record<string, DayActivity>, now = new Date()): number {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!activity[dayKey(day)]) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (activity[dayKey(day)]) {
    streak += 1;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

/** Daily goal in XP: roughly 10 XP per minute of practice. */
export function dailyGoalXp(profile: LearnerProfile | null): number {
  return (profile?.dailyGoalMinutes ?? 10) * 10;
}

export const checkpointRewardId = (p: BuildProject, checkpointId: string) => `checkpoint-${p.id}/${checkpointId}`;
