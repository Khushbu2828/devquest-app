import { View } from 'react-native';

import { CodeBlock } from '@/components/code-block';
import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { NoteBlock } from '@/types/content';

/** Renders a topic note's blocks: text, code and tips. */
export function NoteView({ blocks }: { blocks: NoteBlock[] }) {
  const theme = useTheme();
  return (
    <View style={{ gap: Spacing.three }}>
      {blocks.map((block, i) => {
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
    </View>
  );
}
