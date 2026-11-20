import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { LevelBadge, PressableCard, Row, Screen } from '@/components/ui';
import { Radius, Spacing, TrackColors } from '@/constants/theme';
import { getTrackContent, unitsForTrack } from '@/content';
import { useTheme } from '@/hooks/use-theme';
import { checkpointRewardId, masteredIds, unitMastery } from '@/lib/progress';
import { useProgress } from '@/store/progress';

/** Track map: units laid out as a vertical path, each node showing completion. */
export default function TrackScreen() {
  const { trackId } = useLocalSearchParams<{ trackId: string }>();
  const theme = useTheme();
  const attempts = useProgress((s) => s.attempts);
  const rewards = useProgress((s) => s.rewards);
  const mastered = useMemo(() => masteredIds(attempts), [attempts]);
  const content = getTrackContent(trackId);

  if (!content) {
    return (
      <Screen edges={[]}>
        <ThemedText>Track not found.</ThemedText>
      </Screen>
    );
  }

  const color = TrackColors[content.track.id];
  const units = unitsForTrack(content.track.id);
  const projectDone = content.project.checkpoints.filter((c) => rewards.some((r) => r.id === checkpointRewardId(content.project, c.id))).length;

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: content.track.title }} />
      <ThemedText color="textSecondary">{content.track.tagline}</ThemedText>

      <View>
        {units.map((unit, i) => {
          const { done, total } = unitMastery(unit.id, mastered);
          const finished = total > 0 && done === total;
          return (
            <View key={unit.id} style={styles.nodeRow}>
              <View style={styles.rail}>
                <View
                  style={[
                    styles.node,
                    { borderColor: color, backgroundColor: finished ? color : theme.surface },
                  ]}>
                  <ThemedText type="smallBold" style={{ color: finished ? '#fff' : theme.text }}>
                    {finished ? '✓' : i + 1}
                  </ThemedText>
                </View>
                {i < units.length - 1 && <View style={[styles.line, { backgroundColor: theme.border }]} />}
              </View>
              <PressableCard
                style={styles.card}
                accessibilityLabel={`Unit ${i + 1}: ${unit.title}. ${unit.level}. ${done} of ${total} questions mastered${finished ? ', complete' : ''}.`}
                onPress={() => router.push({ pathname: '/unit/[unitId]', params: { unitId: unit.id } })}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <LevelBadge level={unit.level} />
                  <ThemedText type="small" color="textSecondary">
                    {done}/{total}
                  </ThemedText>
                </Row>
                <ThemedText type="heading">{unit.title}</ThemedText>
                <RichText type="small" color="textSecondary">
                  {unit.summary}
                </RichText>
              </PressableCard>
            </View>
          );
        })}
      </View>

      <PressableCard
        accent={color}
        accessibilityLabel={`Build project: ${content.project.title}. ${projectDone} of ${content.project.checkpoints.length} steps done.`}
        onPress={() => router.push({ pathname: '/project/[id]', params: { id: content.project.id } })}>
        <Row style={{ justifyContent: 'space-between' }}>
          <ThemedText type="label" color="textSecondary">
            🛠 Build project
          </ThemedText>
          <ThemedText type="small" color="textSecondary">
            {projectDone}/{content.project.checkpoints.length} steps
          </ThemedText>
        </Row>
        <ThemedText type="heading">{content.project.title}</ThemedText>
        <ThemedText type="small" color="textSecondary">
          {content.project.description}
        </ThemedText>
      </PressableCard>
    </Screen>
  );
}

const NODE = 36;

const styles = StyleSheet.create({
  nodeRow: { flexDirection: 'row', gap: Spacing.three },
  rail: { width: NODE, alignItems: 'center' },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: Radius.pill,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { width: 3, flex: 1, marginVertical: Spacing.one },
  card: { flex: 1, marginBottom: Spacing.three },
});
