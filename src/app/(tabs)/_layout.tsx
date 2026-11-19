import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useProgress } from '@/store/progress';

type IconName = ComponentProps<typeof Ionicons>['name'];
type TabIconProps = { color: ColorValue; size: number };

function TabIcon({ name, color, size }: TabIconProps & { name: IconName }) {
  return <Ionicons name={name} color={color as string} size={size} />;
}

export default function TabLayout() {
  const theme = useTheme();
  const hasProfile = useProgress((s) => s.profile !== null);

  if (!hasProfile) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: (p: TabIconProps) => <TabIcon name="home" {...p} /> }}
      />
      <Tabs.Screen
        name="learn"
        options={{ title: 'Learn', tabBarIcon: (p: TabIconProps) => <TabIcon name="map" {...p} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: (p: TabIconProps) => <TabIcon name="person-circle" {...p} />,
        }}
      />
    </Tabs>
  );
}
