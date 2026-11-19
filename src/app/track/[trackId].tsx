import { Stack, router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { LevelBadge, PressableCard, Row, Screen } from '@/components/ui';
import { Radius, Spacing, TrackColors } from '@/constants/theme';
import { getTrackContent, lessonsForUnit, unitsForTrack } from '@/content';
import { useTheme } from '@/hooks/use-theme';
import { useProgress } from '@/store/progress';

/** Track map: units laid out as a vertical path, each node showing completion. */
export default function TrackScreen() {
  const { trackId } = useLocalSearchParams<{ trackId: string }>();
  const theme = useTheme();
  const completed = useProgress((s) => s.completedLessons);
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

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: content.track.title }} />
      <ThemedText color="textSecondary">{content.track.tagline}</ThemedText>

      <View>
        {units.map((unit, i) => {
          const lessons = lessonsForUnit(unit.id);
          const done = lessons.filter((l) => completed[l.id]).length;
          const finished = lessons.length > 0 && done === lessons.length;
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
                accessibilityLabel={`Unit ${i + 1}: ${unit.title}. ${unit.level}. ${done} of ${lessons.length} lessons done${finished ? ', complete' : ''}.`}
                onPress={() => router.push({ pathname: '/unit/[unitId]', params: { unitId: unit.id } })}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <LevelBadge level={unit.level} />
                  <ThemedText type="small" color="textSecondary">
                    {done}/{lessons.length}
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
