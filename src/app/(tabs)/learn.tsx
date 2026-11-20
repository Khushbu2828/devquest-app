import { router } from 'expo-router';
import { useMemo } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ProgressBar, PressableCard, Screen } from '@/components/ui';
import { TrackColors } from '@/constants/theme';
import { tracks, unitsForTrack } from '@/content';
import { masteredIds, trackMastery } from '@/lib/progress';
import { useProgress } from '@/store/progress';

export default function LearnScreen() {
  const attempts = useProgress((s) => s.attempts);
  const mastered = useMemo(() => masteredIds(attempts), [attempts]);

  return (
    <Screen>
      <ThemedText type="title" accessibilityRole="header">
        Learn
      </ThemedText>
      <ThemedText color="textSecondary">
        Four tracks, from your first variable to a full-stack Next.js app. They build on each other in order.
      </ThemedText>

      {tracks.map((t, i) => {
        const p = trackMastery(t.id, mastered);
        const units = unitsForTrack(t.id);
        return (
          <PressableCard
            key={t.id}
            accent={TrackColors[t.id]}
            accessibilityLabel={`Track ${i + 1}: ${t.title}. ${units.length} units. ${p.done} of ${p.total} questions mastered.`}
            onPress={() => router.push({ pathname: '/track/[trackId]', params: { trackId: t.id } })}>
            <ThemedText type="label" color="textSecondary">
              Track {i + 1} · {units.length} units
            </ThemedText>
            <ThemedText type="subtitle">{t.title}</ThemedText>
            <ThemedText color="textSecondary">{t.tagline}</ThemedText>
            <ProgressBar value={p.fraction} color={TrackColors[t.id]} label={`${t.title} progress`} />
          </PressableCard>
        );
      })}
    </Screen>
  );
}
