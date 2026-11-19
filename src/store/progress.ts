import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/lib/storage';
import type { Attempt, LearnerProfile, TopicStats } from '@/types/progress';

interface ProgressState {
  profile: LearnerProfile | null;
  completedLessons: Record<string, string>;
  attempts: Attempt[];
  completeOnboarding: (profile: LearnerProfile) => void;
  completeLesson: (lessonId: string) => void;
  recordAttempt: (attempt: Attempt) => void;
  resetProgress: () => void;
}

const MAX_STORED_ATTEMPTS = 2000;

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      profile: null,
      completedLessons: {},
      attempts: [],
      completeOnboarding: (profile) => set({ profile }),
      completeLesson: (lessonId) =>
        set((s) =>
          s.completedLessons[lessonId]
            ? s
            : { completedLessons: { ...s.completedLessons, [lessonId]: new Date().toISOString() } },
        ),
      recordAttempt: (attempt) =>
        set((s) => ({ attempts: [...s.attempts, attempt].slice(-MAX_STORED_ATTEMPTS) })),
      resetProgress: () => set({ profile: null, completedLessons: {}, attempts: [] }),
    }),
    { name: 'devquest.progress', storage: persistStorage, version: 1 },
  ),
);

/** Accuracy per topic, used for adaptive question selection and the profile screen. */
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
