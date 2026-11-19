import type { Level } from '@/types/content';
import type { LearningGoal } from '@/types/progress';

export const goalLabels: Record<LearningGoal, string> = {
  job_ready: 'Get job-ready',
  level_up: 'Level up at work',
  interview_prep: 'Prepare for interviews',
  curious: 'Just curious',
};

export const levelLabels: Record<Level, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const levels: Level[] = ['beginner', 'intermediate', 'advanced'];
