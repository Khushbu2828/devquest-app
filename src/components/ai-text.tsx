import { View } from 'react-native';

import { CodeBlock } from '@/components/code-block';
import { RichText } from '@/components/rich-text';
import { Spacing } from '@/constants/theme';

/**
 * Renders AI answers: paragraphs with `inline code`, and fenced ``` code
 * blocks as CodeBlocks. Markdown emphasis markers are stripped rather than
 * shown as literal asterisks.
 */
export function AiText({ text }: { text: string }) {
  const parts = text.split(/```[a-zA-Z]*\n?/);
  return (
    <View style={{ gap: Spacing.two }}>
      {parts.map((part, i) => {
        const trimmed = part.replace(/\n+$/, '');
        if (!trimmed.trim()) return null;
        // Odd segments sit between ``` fences.
        if (i % 2 === 1) return <CodeBlock key={i} code={trimmed} />;
        return trimmed
          .split(/\n{2,}/)
          .map((p, j) => (
            <RichText key={`${i}-${j}`}>{p.replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|\s)\*(\S.*?)\*/g, '$1$2').trim()}</RichText>
          ));
      })}
    </View>
  );
}
