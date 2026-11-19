import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore } from 'react';

import { Colors } from '@/constants/theme';
import { useResolvedScheme } from '@/hooks/use-theme';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const subscribeToHydration = (onChange: () => void) => {
  const unsubs = [
    useProgress.persist.onFinishHydration(onChange),
    useSettings.persist.onFinishHydration(onChange),
  ];
  return () => unsubs.forEach((u) => u());
};
const storesHydrated = () => useProgress.persist.hasHydrated() && useSettings.persist.hasHydrated();

/** Waits until persisted stores are loaded so screens never flash default state. */
function useStoresHydrated() {
  return useSyncExternalStore(subscribeToHydration, storesHydrated, () => false);
}

export default function RootLayout() {
  const hydrated = useStoresHydrated();
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync();
  }, [hydrated]);

  if (!hydrated) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navTheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="track/[trackId]" options={{ title: '' }} />
          <Stack.Screen name="unit/[unitId]" options={{ title: '' }} />
          <Stack.Screen name="lesson/[lessonId]" options={{ title: 'Lesson' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
