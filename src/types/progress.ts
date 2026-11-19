import type { Level, TrackId } from '@/types/content';

export type LearningGoal = 'job_ready' | 'level_up' | 'interview_prep' | 'curious';

export interface LearnerProfile {
  displayName: string;
  goal: LearningGoal;
  /** Self-assessed starting level per track (placement quiz refines this in Phase 2). */
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
}

export interface TopicStats {
  attempts: number;
  correct: number;
}
