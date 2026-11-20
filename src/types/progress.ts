import type { Level, TrackId } from '@/types/content';

export type LearningGoal = 'job_ready' | 'level_up' | 'interview_prep' | 'curious';

export interface LearnerProfile {
  displayName: string;
  goal: LearningGoal;
  /** Self-assessed starting level per track; decides which unit "Up next" starts from. */
  selfAssessment: Record<TrackId, Level>;
  dailyGoalMinutes: 5 | 10 | 15 | 20;
  createdAt: string;
}

/** One answer to one question. Persisted for stats and spaced repetition. */
export interface Attempt {
  questionId: string;
  track: TrackId;
  topic: string;
  correct: boolean;
  answeredAt: string;
  msToAnswer: number;
  usedHint: boolean;
  xp: number;
}

/** What the learner did on one local calendar day (key: YYYY-MM-DD). */
export interface DayActivity {
  xp: number;
  answered: number;
}

export interface TopicStats {
  attempts: number;
  correct: number;
}

export type RewardKind = 'quiz' | 'exercise' | 'debug' | 'checkpoint' | 'project' | 'game' | 'achievement' | 'legacy';

/**
 * XP earned outside a single answer. `id` makes it idempotent: completing the
 * same exercise twice, or syncing the same reward from two devices, counts once.
 */
export interface Reward {
  id: string;
  kind: RewardKind;
  xp: number;
  at: string;
  /** What it was for, e.g. an exercise id or a game score. */
  ref?: string;
  score?: number;
}

export interface Stats {
  xp: number;
  activity: Record<string, DayActivity>;
}
