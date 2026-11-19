import { Stack, router, useLocalSearchParams } from 'expo-router';

import { CodeBlock } from '@/components/code-block';
import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Screen } from '@/components/ui';
import { getLesson } from '@/content';
import { useTheme } from '@/hooks/use-theme';
import { useProgress } from '@/store/progress';

export default function LessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const theme = useTheme();
  const completeLesson = useProgress((s) => s.completeLesson);
  const done = useProgress((s) => !!s.completedLessons[lessonId]);
  const lesson = getLesson(lessonId);

  if (!lesson) {
    return (
      <Screen edges={[]}>
        <ThemedText>Lesson not found.</ThemedText>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: `${lesson.minutes} min lesson` }} />
      <ThemedText type="subtitle" accessibilityRole="header">
        {lesson.title}
      </ThemedText>

      {lesson.blocks.map((block, i) => {
        switch (block.kind) {
          case 'text':
            return <RichText key={i}>{block.text}</RichText>;
          case 'code':
            return <CodeBlock key={i} code={block.code} caption={block.caption} />;
          case 'tip':
            return (
              <Card key={i} style={{ backgroundColor: theme.warningBg, borderColor: theme.warning }}>
                <ThemedText type="label" style={{ color: theme.warning }}>
                  💡 Tip
                </ThemedText>
                <RichText>{block.text}</RichText>
              </Card>
            );
        }
      })}

      <Button
        title={done ? 'Completed ✓ Back to unit' : 'Mark as complete'}
        variant={done ? 'secondary' : 'primary'}
        onPress={() => {
          completeLesson(lesson.id);
          router.back();
        }}
      />
    </Screen>
  );
}
