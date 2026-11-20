import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/lib/storage';
import { MAX_STORED_ATTEMPTS, computeStats, mergeAttempts, mergeRewards } from '@/lib/stats';
import type { Attempt, LearnerProfile, Reward, Stats } from '@/types/progress';

/**
 * Learner progress, stored as two append-only event lists: answers
 * (`attempts`) and other XP (`rewards`). Totals such as XP and daily activity
 * are computed from them, so merging progress from two devices is a union of
 * events and can never double-count.
 */
interface ProgressState {
  profile: LearnerProfile | null;
  attempts: Attempt[];
  rewards: Reward[];
  completeOnboarding: (profile: LearnerProfile) => void;
  updateProfile: (changes: Partial<LearnerProfile>) => void;
  recordAttempt: (attempt: Attempt) => void;
  /** Adds a reward unless one with the same id already exists. Returns true if added. */
  addReward: (reward: Omit<Reward, 'at'> & { at?: string }) => boolean;
  /** Merges events from another device (sync). */
  mergeEvents: (attempts: Attempt[], rewards: Reward[]) => void;
  resetProgress: () => void;
}

export { attemptKey, computeStats, dayKey, mergeAttempts, mergeRewards, topicStats } from '@/lib/stats';

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      profile: null,
      attempts: [],
      rewards: [],
      completeOnboarding: (profile) => set({ profile }),
      updateProfile: (changes) => set((s) => (s.profile ? { profile: { ...s.profile, ...changes } } : s)),
      recordAttempt: (attempt) => set((s) => ({ attempts: [...s.attempts, attempt].slice(-MAX_STORED_ATTEMPTS) })),
      addReward: (reward) => {
        if (get().rewards.some((r) => r.id === reward.id)) return false;
        set((s) => ({ rewards: [...s.rewards, { ...reward, at: reward.at ?? new Date().toISOString() }] }));
        return true;
      },
      mergeEvents: (attempts, rewards) =>
        set((s) => ({ attempts: mergeAttempts(s.attempts, attempts), rewards: mergeRewards(s.rewards, rewards) })),
      resetProgress: () => set({ profile: null, attempts: [], rewards: [] }),
    }),
    {
      name: 'devquest.progress',
      storage: persistStorage,
      version: 3,
      partialize: (s) => ({ profile: s.profile, attempts: s.attempts, rewards: s.rewards }),
      migrate: (persisted, version) => {
        const old = (persisted ?? {}) as {
          profile?: LearnerProfile | null;
          attempts?: Attempt[];
          rewards?: Reward[];
          xp?: number;
        };
        let attempts = old.attempts ?? [];
        // v1 tracked lessons and had no XP on attempts.
        if (version < 2) attempts = attempts.map((a) => ({ ...a, usedHint: a.usedHint ?? false, xp: a.xp ?? 0 }));
        let rewards = old.rewards ?? [];
        // v2 kept a running XP total; keep any XP not explained by answers as one legacy reward.
        if (version < 3) {
          const fromAnswers = attempts.reduce((sum, a) => sum + (a.xp ?? 0), 0);
          const extra = (old.xp ?? 0) - fromAnswers;
          if (extra > 0) rewards = [{ id: 'legacy-xp', kind: 'legacy', xp: extra, at: new Date().toISOString() }];
        }
        return { profile: old.profile ?? null, attempts, rewards } as unknown as ProgressState;
      },
    },
  ),
);

export function useStats(): Stats {
  const attempts = useProgress((s) => s.attempts);
  const rewards = useProgress((s) => s.rewards);
  return useMemo(() => computeStats(attempts, rewards), [attempts, rewards]);
}
