import { useEffect } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';
import { syncNow, useAccount } from '@/lib/sync';
import { useProgress } from '@/store/progress';

const DEBOUNCE_MS = 8000;

/**
 * Keeps the Supabase session in `useAccount` and syncs progress when the
 * learner signs in, returns to the app, or earns something new (debounced).
 * Renders nothing; does nothing when sync isn't configured.
 */
export function SyncManager() {
  useEffect(() => {
    if (!supabase) return;
    let debounce: ReturnType<typeof setTimeout> | undefined;

    supabase.auth.getSession().then(({ data }) => {
      useAccount.setState({ session: data.session });
      if (data.session) syncNow();
    });
    const { data: auth } = supabase.auth.onAuthStateChange((event, session) => {
      useAccount.setState({ session });
      if (event === 'SIGNED_IN') syncNow();
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncNow();
    });
    const unsubscribe = useProgress.subscribe((state, prev) => {
      if (state.attempts === prev.attempts && state.rewards === prev.rewards && state.profile === prev.profile) return;
      clearTimeout(debounce);
      debounce = setTimeout(() => syncNow(), DEBOUNCE_MS);
    });

    return () => {
      clearTimeout(debounce);
      auth.subscription.unsubscribe();
      appState.remove();
      unsubscribe();
    };
  }, []);
  return null;
}
