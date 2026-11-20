import { router } from 'expo-router';
import { Alert, Platform, Switch } from 'react-native';

import { CodeBlock } from '@/components/code-block';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, Row, Screen, Section } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { signOut } from '@/lib/sync';
import { useProgress } from '@/store/progress';
import { useSettings, type ThemePreference } from '@/store/settings';

const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const settings = useSettings();
  const resetProgress = useProgress((s) => s.resetProgress);

  const confirmReset = () => {
    const doReset = async () => {
      // Sign out first, or the next sync would download the erased progress again.
      await signOut();
      resetProgress();
      router.replace('/onboarding');
    };
    if (Platform.OS === 'web') {
      // Alert with buttons is not supported on web.
      if (globalThis.confirm?.('Erase all progress on this device? This cannot be undone. If you use sync, you will be signed out and your cloud copy is kept.')) doReset();
      return;
    }
    Alert.alert('Erase all progress on this device?', 'This cannot be undone. If you use sync, you will be signed out and your cloud copy is kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase', style: 'destructive', onPress: doReset },
    ]);
  };

  return (
    <Screen edges={[]}>
      <Section title="Appearance">
        <Row style={{ flexWrap: 'wrap' }} accessibilityRole="radiogroup" accessibilityLabel="Theme">
          {themeOptions.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              selected={settings.theme === o.value}
              onPress={() => settings.setTheme(o.value)}
            />
          ))}
        </Row>
      </Section>

      <Section title="Code font size">
        <Row>
          <Button
            title="A−"
            variant="secondary"
            accessibilityHint="Makes code text smaller"
            onPress={() => settings.setEditorFontSize(settings.editorFontSize - 1)}
          />
          <ThemedText type="heading" accessibilityLiveRegion="polite">
            {settings.editorFontSize}px
          </ThemedText>
          <Button
            title="A+"
            variant="secondary"
            accessibilityHint="Makes code text larger"
            onPress={() => settings.setEditorFontSize(settings.editorFontSize + 1)}
          />
        </Row>
        <CodeBlock code={"const greeting = 'Hello, DevQuest!';\nconsole.log(greeting);"} />
      </Section>

      <Section title="Notifications">
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <ThemedText style={{ flex: 1 }}>Daily reminder to keep your streak</ThemedText>
            <Switch
              accessibilityLabel="Daily reminder"
              value={settings.notificationsEnabled}
              onValueChange={settings.setNotificationsEnabled}
              trackColor={{ true: theme.primary, false: theme.border }}
            />
          </Row>
        </Card>
      </Section>

      <Section title="Data">
        <Button title="Erase all progress" variant="danger" onPress={confirmReset} />
      </Section>
    </Screen>
  );
}
