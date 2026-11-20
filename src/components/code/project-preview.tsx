import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { HtmlPreview } from '@/components/code/html-preview';
import { Console } from '@/components/code/run-output';
import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Row } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { previews, routerScript, todoScript, type Preview } from '@/content/previews';
import { useCodeRunner } from '@/hooks/use-code-runner';
import { useTheme } from '@/hooks/use-theme';
import type { CodeLanguage } from '@/types/content';

/**
 * Live preview of a build project, powered by the learner's own code.
 * `code` is their current code for the step they're on.
 */
export function ProjectPreview({ projectId, code, language }: { projectId: string; code: string; language: CodeLanguage }) {
  const preview = previews[projectId];
  if (!preview) return null;
  return (
    <Card>
      <ThemedText type="label" color="primary">
        ▶ Live preview
      </ThemedText>
      <ThemedText type="heading">{preview.title}</ThemedText>
      {preview.kind === 'form' && <FormPreview preview={preview} code={code} language={language} />}
      {preview.kind === 'todo' && <TodoPreview code={code} language={language} />}
      {preview.kind === 'router' && <RouterPreview files={preview.files} code={code} language={language} />}
    </Card>
  );
}

function useRun(code: string, language: CodeLanguage) {
  const { run, running, sandbox } = useCodeRunner();
  const [logs, setLogs] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const exec = async (script: string) => {
    const r = await run(`${code}\n;\n${script}`, language);
    if (r.error === 'Cancelled') return null;
    setError(r.error ?? null);
    setLogs(r.logs);
    return r;
  };
  return { exec, running, sandbox, logs, error };
}

function Input({ value, onChange, label, secure }: { value: string; onChange: (v: string) => void; label: string; secure?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 90, gap: Spacing.half }}>
      <ThemedText type="small" color="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChange}
        accessibilityLabel={label}
        secureTextEntry={secure}
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
      />
    </View>
  );
}

function FormPreview({ preview, code, language }: { preview: Extract<Preview, { kind: 'form' }>; code: string; language: CodeLanguage }) {
  const [values, setValues] = useState(() => Object.fromEntries(preview.fields.map((f) => [f.name, f.initial])));
  const { exec, running, sandbox, logs, error } = useRun(code, language);
  return (
    <View style={{ gap: Spacing.two }}>
      {sandbox}
      <Row style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {preview.fields.map((f) => (
          <Input key={f.name} label={f.label} secure={f.secure} value={values[f.name]} onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))} />
        ))}
      </Row>
      <Button title={running ? 'Running…' : 'Run with my code'} disabled={running} onPress={() => exec(preview.script(values))} />
      {error && <Console lines={[error]} title="Error" tone="error" />}
      {logs && !error && <Console lines={logs.length ? logs : ['(nothing yet: finish this step first)']} title="Result" />}
    </View>
  );
}

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

function TodoPreview({ code, language }: { code: string; language: CodeLanguage }) {
  const theme = useTheme();
  const [actions, setActions] = useState<unknown[]>([
    { type: 'add', text: 'Learn hooks' },
    { type: 'add', text: 'Build a todo app' },
  ]);
  const [text, setText] = useState('');
  const { exec, running, sandbox, logs, error } = useRun(code, language);
  const [todos, setTodos] = useState<Todo[] | null>(null);
  const [html, setHtml] = useState<string | null>(null);

  const apply = async (next: unknown[]) => {
    setActions(next);
    const r = await exec(todoScript(next));
    if (!r) return;
    try {
      setTodos(JSON.parse(r.logs[0] ?? '[]') as Todo[]);
    } catch {
      setTodos(null);
    }
    setHtml(r.logs[1] ?? null);
  };

  return (
    <View style={{ gap: Spacing.two }}>
      {sandbox}
      <RichText type="small" color="textSecondary">
        {'Every button below sends an action through your `todosReducer`; the page is drawn by your `TodoView`.'}
      </RichText>
      <Row>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="New todo"
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="New todo text"
          style={[styles.input, { flex: 1, color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
        />
        <Button
          title="Add"
          disabled={!text.trim() || running}
          onPress={() => {
            apply([...actions, { type: 'add', text: text.trim() }]);
            setText('');
          }}
        />
      </Row>
      {!todos && <Button title={running ? 'Running…' : 'Run with my code'} disabled={running} onPress={() => apply(actions)} />}
      {error && <Console lines={[error]} title="Error" tone="error" />}
      {todos && (
        <View style={{ gap: Spacing.one }}>
          {todos.map((t) => (
            <Row key={t.id} style={{ justifyContent: 'space-between' }}>
              <ThemedText style={{ flex: 1, textDecorationLine: t.done ? 'line-through' : 'none' }}>
                #{t.id} {t.text}
              </ThemedText>
              <Button title={t.done ? 'Undo' : 'Done'} variant="secondary" onPress={() => apply([...actions, { type: 'toggle', id: t.id }])} />
              <Button title="✕" variant="secondary" onPress={() => apply([...actions, { type: 'remove', id: t.id }])} />
            </Row>
          ))}
        </View>
      )}
      {html ? <HtmlPreview html={html} /> : todos ? <RichText type="small" color="textSecondary">{'Write `TodoView` (step 3) to see the page.'}</RichText> : null}
      {logs && !todos && !error && <Console lines={logs} title="Output" />}
    </View>
  );
}

function RouterPreview({ files, code, language }: { files: string[]; code: string; language: CodeLanguage }) {
  const theme = useTheme();
  const [url, setUrl] = useState('/blog/hello');
  const { exec, running, sandbox, error } = useRun(code, language);
  const [out, setOut] = useState<{ routes?: [string, string | null][]; resolved?: { file: string; params: unknown; note?: string } | null } | null>(null);

  const go = async (target: string) => {
    const r = await exec(routerScript(files, target.startsWith('/') ? target : `/${target}`));
    if (!r) return;
    try {
      setOut(JSON.parse(r.logs[r.logs.length - 1] ?? '{}'));
    } catch {
      setOut(null);
    }
  };

  return (
    <View style={{ gap: Spacing.two }}>
      {sandbox}
      <View style={[styles.browser, { borderColor: theme.border }]}>
        <Row style={[styles.addressBar, { backgroundColor: theme.surfaceAlt }]}>
          <ThemedText type="code" color="textSecondary">
            myapp.dev
          </ThemedText>
          <TextInput
            value={url}
            onChangeText={setUrl}
            onSubmitEditing={() => go(url)}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="URL path"
            style={[styles.url, { color: theme.text, fontFamily: Fonts.mono }]}
          />
          <Button title={running ? '…' : 'Go'} disabled={running} onPress={() => go(url)} />
        </Row>
        <View style={{ padding: Spacing.three, gap: Spacing.one }}>
          {error ? (
            <ThemedText color="danger">{error}</ThemedText>
          ) : !out ? (
            <ThemedText color="textSecondary">Press Go to route this URL with your code.</ThemedText>
          ) : out.resolved ? (
            <>
              <ThemedText type="heading" color="success">
                200 · {out.resolved.file}
              </ThemedText>
              <ThemedText type="code">params = {JSON.stringify(out.resolved.params)}</ThemedText>
              {out.resolved.note && (
                <ThemedText type="small" color="textSecondary">
                  {out.resolved.note}
                </ThemedText>
              )}
            </>
          ) : 'resolved' in out ? (
            <ThemedText type="heading" color="danger">
              404 · This page could not be found
            </ThemedText>
          ) : (
            <RichText color="textSecondary">{'Write `matchRoute` (step 2) to route URLs.'}</RichText>
          )}
        </View>
      </View>
      <Row style={{ flexWrap: 'wrap' }}>
        {['/', '/about', '/pricing', '/blog/new', '/blog/hello', '/docs/a/b', '/nope'].map((u) => (
          <Button key={u} title={u} variant="secondary" onPress={() => { setUrl(u); go(u); }} />
        ))}
      </Row>
      {out?.routes && (
        <Console lines={out.routes.map(([f, r]) => `${f.padEnd(34)} → ${r ?? 'null'}`)} title="Your fileToRoute" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 44, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.three, fontSize: 16 },
  browser: { borderWidth: 1, borderRadius: Radius.md, overflow: 'hidden' },
  addressBar: { padding: Spacing.two, gap: Spacing.two },
  url: { flex: 1, minHeight: 40, fontSize: 15 },
});
