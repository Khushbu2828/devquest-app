import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Renders text with `inline code` spans, as used throughout notes and question copy. */
export function RichText({ children, ...props }: Omit<ThemedTextProps, 'children'> & { children: string }) {
  const theme = useTheme();
  const parts = children.split(/(`[^`]+`)/g);
  return (
    <ThemedText {...props}>
      {parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 1 ? (
          <ThemedText
            key={i}
            style={{ fontFamily: Fonts.mono, backgroundColor: theme.surfaceAlt, color: theme.text }}>
            {part.slice(1, -1)}
          </ThemedText>
        ) : (
          part
        ),
      )}
    </ThemedText>
  );
}
