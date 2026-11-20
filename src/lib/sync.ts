import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import { computeStats, weekStart, xpSince } from '@/lib/stats';
import { useProgress } from '@/store/progress';
import type { Attempt, LearnerProfile, Reward } from '@/types/progress';

/**
 * Progress sync with Supabase. Progress is two append-only event lists, so a
 * sync is: download the server's lists, merge them into the local ones
 * (union by id), upload the merged result. Running it from two devices in any
 * order converges without losing XP.
 */

type SyncStatus = 'idle' | 'syncing' | 'error';

interface AccountState {
  session: Session | null;
  status: SyncStatus;
  lastSyncedAt: string | null;
  error: string | null;
}

export const useAccount = create<AccountState>(() => ({
  session: null,
  status: 'idle',
  lastSyncedAt: null,
  error: null,
}));

const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export { weekStart, xpSince };

let running: Promise<void> | null = null;

export function syncNow(): Promise<void> {
  // One sync at a time; callers during a sync share it.
  running ??= doSync().finally(() => {
    running = null;
  });
  return running;
}

async function doSync() {
  const session = useAccount.getState().session;
  if (!supabase || !session) return;
  const userId = session.user.id;
  useAccount.setState({ status: 'syncing', error: null });
  try {
    const { data: remote, error: readError } = await supabase
      .from('progress')
      .select('profile, attempts, rewards')
      .eq('user_id', userId)
      .maybeSingle();
    if (readError) throw readError;

    const store = useProgress.getState();
    if (remote) {
      store.mergeEvents(asArray<Attempt>(remote.attempts), asArray<Reward>(remote.rewards));
      if (!store.profile && remote.profile) store.completeOnboarding(remote.profile as LearnerProfile);
    }

    const { profile, attempts, rewards } = useProgress.getState();
    const { error: writeError } = await supabase.from('progress').upsert({
      user_id: userId,
      profile,
      attempts,
      rewards,
      updated_at: new Date().toISOString(),
    });
    if (writeError) throw writeError;

    const week = weekStart();
    const { xp } = computeStats(attempts, rewards);
    const { error: boardError } = await supabase.from('leaderboard').upsert({
      user_id: userId,
      display_name: (profile?.displayName || 'Learner').slice(0, 40),
      week_start: week,
      weekly_xp: xpSince(attempts, rewards, week),
      total_xp: xp,
      updated_at: new Date().toISOString(),
    });
    if (boardError) throw boardError;

    useAccount.setState({ status: 'idle', lastSyncedAt: new Date().toISOString() });
  } catch (e) {
    const message = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e);
    useAccount.setState({ status: 'error', error: message });
  }
}

export async function signIn(email: string, password: string): Promise<string | null> {
  if (!supabase) return 'Sync is not set up in this build.';
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return error?.message ?? null;
}

/** Returns an error message, or null. `needsConfirmation` is true when Supabase emailed a confirmation link. */
export async function signUp(email: string, password: string): Promise<{ error: string | null; needsConfirmation: boolean }> {
  if (!supabase) return { error: 'Sync is not set up in this build.', needsConfirmation: false };
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  return { error: error?.message ?? null, needsConfirmation: !error && !data.session };
}

export async function signOut() {
  await supabase?.auth.signOut();
  // Progress stays on this device; it's only no longer synced.
  useAccount.setState({ session: null, status: 'idle', lastSyncedAt: null, error: null });
}

export interface LeaderboardRow {
  user_id: string;
  display_name: string;
  weekly_xp: number;
}

export async function fetchLeaderboard(): Promise<LeaderboardRow[] | null> {
  if (!supabase || !useAccount.getState().session) return null;
  const { data, error } = await supabase
    .from('leaderboard')
    .select('user_id, display_name, weekly_xp')
    .eq('week_start', weekStart())
    .order('weekly_xp', { ascending: false })
    .limit(20);
  return error ? null : (data as LeaderboardRow[]);
}
