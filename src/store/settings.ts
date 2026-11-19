import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/lib/storage';

export type ThemePreference = 'system' | 'light' | 'dark';

interface SettingsState {
  theme: ThemePreference;
  editorFontSize: number;
  notificationsEnabled: boolean;
  setTheme: (theme: ThemePreference) => void;
  setEditorFontSize: (size: number) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      editorFontSize: 14,
      notificationsEnabled: true,
      setTheme: (theme) => set({ theme }),
      setEditorFontSize: (size) => set({ editorFontSize: Math.min(22, Math.max(10, size)) }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
    }),
    { name: 'devquest.settings', storage: persistStorage, version: 1 },
  ),
);
