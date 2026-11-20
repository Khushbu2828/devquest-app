import { projects, tracks } from '@/content';
import { bestScore } from '@/lib/games';
import { checkpointRewardId, masteredIds, trackMastery } from '@/lib/progress';
import { PERFECT_QUIZ_BONUS, QUIZ_COMPLETE_BONUS } from '@/lib/quiz';
import { computeStats, dayKey } from '@/lib/stats';
import type { Attempt, Reward } from '@/types/progress';

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  xp: number;
  unlocked: (s: AchievementInput) => boolean;
}

export interface AchievementInput {
  attempts: Attempt[];
  rewards: Reward[];
}

/** Longest run of consecutive active days ever. */
export function longestStreak(attempts: Attempt[], rewards: Reward[]): number {
  const days = Object.keys(computeStats(attempts, rewards).activity).sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of days) {
    const [y, m, d] = key.split('-').map(Number);
    const day = new Date(y, m - 1, d);
    if (prev) {
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      run = dayKey(next) === key ? run + 1 : 1;
    } else run = 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

const has = (rewards: Reward[], kind: Reward['kind']) => rewards.some((r) => r.kind === kind);
const xpOf = (s: AchievementInput) => computeStats(s.attempts, s.rewards).xp - s.rewards.filter((r) => r.kind === 'achievement').reduce((n, r) => n + r.xp, 0);

export const achievements: Achievement[] = [
  { id: 'first-answer', icon: '👣', title: 'First steps', description: 'Answer your first question.', xp: 5, unlocked: (s) => s.attempts.length > 0 },
  {
    id: 'perfect-quiz',
    icon: '💯',
    title: 'Flawless',
    description: 'Finish a quiz without a single mistake.',
    xp: 15,
    unlocked: (s) => s.rewards.some((r) => r.kind === 'quiz' && r.xp >= QUIZ_COMPLETE_BONUS + PERFECT_QUIZ_BONUS),
  },
  { id: 'streak-3', icon: '🔥', title: 'Warming up', description: 'Practice 3 days in a row.', xp: 15, unlocked: (s) => longestStreak(s.attempts, s.rewards) >= 3 },
  { id: 'streak-7', icon: '🌋', title: 'On fire', description: 'Practice 7 days in a row.', xp: 40, unlocked: (s) => longestStreak(s.attempts, s.rewards) >= 7 },
  { id: 'xp-100', icon: '⭐', title: 'Rising star', description: 'Earn 100 XP.', xp: 10, unlocked: (s) => xpOf(s) >= 100 },
  { id: 'xp-500', icon: '🌟', title: 'Shining', description: 'Earn 500 XP.', xp: 25, unlocked: (s) => xpOf(s) >= 500 },
  { id: 'xp-1500', icon: '✨', title: 'Supernova', description: 'Earn 1,500 XP.', xp: 50, unlocked: (s) => xpOf(s) >= 1500 },
  { id: 'first-exercise', icon: '⌨️', title: 'Hello, world', description: 'Solve a coding exercise.', xp: 10, unlocked: (s) => has(s.rewards, 'exercise') },
  { id: 'first-debug', icon: '🐞', title: 'Bug squasher', description: 'Fix a debugging challenge.', xp: 10, unlocked: (s) => has(s.rewards, 'debug') },
  {
    id: 'first-project',
    icon: '🛠',
    title: 'Builder',
    description: 'Finish every step of a build project.',
    xp: 40,
    unlocked: (s) => projects.some((p) => p.checkpoints.every((c) => s.rewards.some((r) => r.id === checkpointRewardId(p, c.id)))),
  },
  {
    id: 'gamer',
    icon: '🎮',
    title: 'Speed reader',
    description: 'Score 200 points in a mini-game.',
    xp: 15,
    unlocked: (s) => bestScore(s.rewards, 'bug-hunter') >= 200 || bestScore(s.rewards, 'output-rush') >= 200,
  },
  ...tracks.map((t) => ({
    id: `master-${t.id}`,
    icon: '🎓',
    title: `${t.title} master`,
    description: `Master every ${t.title} quiz question.`,
    xp: 50,
    unlocked: (s: AchievementInput) => trackMastery(t.id, masteredIds(s.attempts)).fraction === 1,
  })),
];

export const achievementRewardId = (id: string) => `achievement-${id}`;

/** Achievements whose condition is met but which haven't been awarded yet. */
export function newlyUnlocked(s: AchievementInput): Achievement[] {
  const awarded = new Set(s.rewards.filter((r) => r.kind === 'achievement').map((r) => r.id));
  return achievements.filter((a) => !awarded.has(achievementRewardId(a.id)) && a.unlocked(s));
}
