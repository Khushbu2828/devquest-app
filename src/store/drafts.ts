import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/lib/storage';

/** Unfinished code per exercise, debug challenge or project step, so leaving a screen never loses work. */
interface DraftsState {
  drafts: Record<string, string>;
  setDraft: (id: string, code: string) => void;
  clearDraft: (id: string) => void;
}

export const useDrafts = create<DraftsState>()(
  persist(
    (set) => ({
      drafts: {},
      setDraft: (id, code) => set((s) => ({ drafts: { ...s.drafts, [id]: code } })),
      clearDraft: (id) =>
        set((s) => {
          const { [id]: _removed, ...rest } = s.drafts;
          return { drafts: rest };
        }),
    }),
    { name: 'devquest.drafts', storage: persistStorage, version: 1 },
  ),
);
