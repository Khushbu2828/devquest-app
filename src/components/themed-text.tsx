import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'subtitle' | 'heading' | 'small' | 'smallBold' | 'label' | 'code';
  color?: ThemeColor;
};

/** Text that follows the theme. Sizes scale with the system font size setting. */
export function ThemedText({ style, type = 'default', color, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  return <Text style={[{ color: theme[color ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  default: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  subtitle: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  code: { fontFamily: Fonts.mono, fontSize: 14, lineHeight: 20 },
});
