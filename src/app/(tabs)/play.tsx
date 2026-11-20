import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { PressableCard, Row, Screen } from '@/components/ui';
import { bestScore, games } from '@/lib/games';
import { useProgress } from '@/store/progress';

export default function PlayScreen() {
  const rewards = useProgress((s) => s.rewards);
  return (
    <Screen>
      <ThemedText type="title" accessibilityRole="header">
        Play
      </ThemedText>
      <ThemedText color="textSecondary">Quick 60-second games to sharpen your eye for code.</ThemedText>
      {games.map((g) => {
        const best = bestScore(rewards, g.id);
        return (
          <PressableCard
            key={g.id}
            accessibilityLabel={`${g.title}. ${g.tagline} Best score ${best}.`}
            onPress={() => router.push({ pathname: '/game/[id]', params: { id: g.id } })}>
            <Row style={{ justifyContent: 'space-between' }}>
              <ThemedText type="subtitle">
                {g.icon} {g.title}
              </ThemedText>
              <ThemedText type="small" color="textSecondary">
                Best {best}
              </ThemedText>
            </Row>
            <ThemedText color="textSecondary">{g.tagline}</ThemedText>
          </PressableCard>
        );
      })}
    </Screen>
  );
}
