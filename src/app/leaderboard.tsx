import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Row, Screen } from '@/components/ui';
import { syncConfigured } from '@/lib/supabase';
import { fetchLeaderboard, syncNow, useAccount, weekStart, xpSince, type LeaderboardRow } from '@/lib/sync';
import { useProgress } from '@/store/progress';

/** Weekly XP leaderboard (Monday to Sunday). Needs sync; otherwise shows your own week. */
export default function LeaderboardScreen() {
  const session = useAccount((s) => s.session);
  const attempts = useProgress((s) => s.attempts);
  const rewards = useProgress((s) => s.rewards);
  const myWeek = xpSince(attempts, rewards, weekStart());
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      await syncNow();
      const data = await fetchLeaderboard();
      if (!cancelled) {
        setRows(data);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: 'Leaderboard' }} />
      <Card>
        <ThemedText type="label" color="textSecondary">
          Your XP this week
        </ThemedText>
        <ThemedText type="title">{myWeek}</ThemedText>
        <ThemedText type="small" color="textSecondary">
          Weeks run Monday to Sunday.
        </ThemedText>
      </Card>

      {!syncConfigured || !session ? (
        <Card>
          <ThemedText type="heading">Join the weekly leaderboard</ThemedText>
          <ThemedText color="textSecondary">
            {syncConfigured
              ? 'Sign in to compare your weekly XP with other learners. Only your display name and XP are shown.'
              : 'The leaderboard needs sync, which is not set up in this build.'}
          </ThemedText>
          {syncConfigured && <Button title="Sign in" onPress={() => router.push('/account')} />}
        </Card>
      ) : loading ? (
        <ActivityIndicator />
      ) : !rows ? (
        <ThemedText color="danger">Couldn&apos;t load the leaderboard. Try again later.</ThemedText>
      ) : (
        <Card>
          {rows.length === 0 && <ThemedText color="textSecondary">No one has earned XP this week yet. Be the first!</ThemedText>}
          {rows.map((r, i) => {
            const me = r.user_id === session.user.id;
            return (
              <Row key={r.user_id} style={{ justifyContent: 'space-between' }} accessible accessibilityLabel={`Rank ${i + 1}, ${r.display_name}${me ? ' (you)' : ''}, ${r.weekly_xp} XP`}>
                <ThemedText type={me ? 'smallBold' : 'default'} style={{ flex: 1 }}>
                  {i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}.`} {r.display_name}
                  {me ? ' (you)' : ''}
                </ThemedText>
                <ThemedText type="smallBold">{r.weekly_xp} XP</ThemedText>
              </Row>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}
