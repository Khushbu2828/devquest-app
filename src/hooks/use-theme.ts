import { Colors, type ThemeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettings } from '@/store/settings';

/** Resolves the user's theme preference (system / light / dark) to a scheme. */
export function useResolvedScheme(): 'light' | 'dark' {
  const system = useColorScheme();
  const preference = useSettings((s) => s.theme);
  if (preference === 'system') return system === 'dark' ? 'dark' : 'light';
  return preference;
}

export function useTheme(): ThemeColors {
  return Colors[useResolvedScheme()];
}
