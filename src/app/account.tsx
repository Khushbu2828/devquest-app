import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Screen, Section } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { syncConfigured } from '@/lib/supabase';
import { signIn, signOut, signUp, syncNow, useAccount } from '@/lib/sync';

export default function AccountScreen() {
  const session = useAccount((s) => s.session);
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: 'Account & sync' }} />
      {!syncConfigured ? <NotConfigured /> : session ? <SignedIn email={session.user.email ?? 'your account'} /> : <SignInForm />}
    </Screen>
  );
}

function NotConfigured() {
  return (
    <Card>
      <ThemedText type="heading">Sync isn&apos;t set up in this build</ThemedText>
      <ThemedText color="textSecondary">
        Your progress is saved on this device. To sync between devices, the app needs a Supabase project (see the
        README section &ldquo;Accounts and sync&rdquo;).
      </ThemedText>
    </Card>
  );
}

function SignedIn({ email }: { email: string }) {
  const { status, lastSyncedAt, error } = useAccount();
  return (
    <>
      <Card>
        <ThemedText type="label" color="textSecondary">
          Signed in as
        </ThemedText>
        <ThemedText type="heading">{email}</ThemedText>
        <ThemedText type="small" color={status === 'error' ? 'danger' : 'textSecondary'} accessibilityLiveRegion="polite">
          {status === 'syncing'
            ? 'Syncing…'
            : status === 'error'
              ? `Sync failed: ${error}`
              : lastSyncedAt
                ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString()}`
                : 'Not synced yet'}
        </ThemedText>
      </Card>
      <Button title={status === 'syncing' ? 'Syncing…' : 'Sync now'} disabled={status === 'syncing'} onPress={() => syncNow()} />
      <Button title="Sign out" variant="secondary" onPress={() => signOut()} />
      <ThemedText type="small" color="textSecondary">
        Signing out keeps your progress on this device. It just stops syncing.
      </ThemedText>
    </>
  );
}

function SignInForm() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'danger' | 'success' } | null>(null);

  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 8;
  const submit = async (mode: 'in' | 'up') => {
    setBusy(true);
    setMessage(null);
    if (mode === 'in') {
      const error = await signIn(email, password);
      if (error) setMessage({ text: error, tone: 'danger' });
    } else {
      const { error, needsConfirmation } = await signUp(email, password);
      if (error) setMessage({ text: error, tone: 'danger' });
      else if (needsConfirmation) setMessage({ text: 'Check your email to confirm your account, then sign in.', tone: 'success' });
    }
    setBusy(false);
  };

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }];
  return (
    <>
      <ThemedText color="textSecondary">
        Sign in to back up your progress and continue on another phone. Your progress on this device is kept and merged.
      </ThemedText>
      <Section title="Email">
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          accessibilityLabel="Email"
          placeholder="you@example.com"
          placeholderTextColor={theme.textSecondary}
          style={inputStyle}
        />
      </Section>
      <Section title="Password">
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          accessibilityLabel="Password, at least 8 characters"
          placeholder="At least 8 characters"
          placeholderTextColor={theme.textSecondary}
          style={inputStyle}
        />
      </Section>
      {message && (
        <ThemedText color={message.tone} accessibilityLiveRegion="polite">
          {message.text}
        </ThemedText>
      )}
      <Button title={busy ? 'Please wait…' : 'Sign in'} disabled={!valid || busy} onPress={() => submit('in')} />
      <Button title="Create account" variant="secondary" disabled={!valid || busy} onPress={() => submit('up')} />
    </>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 48, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.three, fontSize: 16 },
});
