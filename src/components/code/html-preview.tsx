import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Radius } from '@/constants/theme';
import { previewDocument } from '@/components/code/preview-document';

/** Shows HTML produced by the learner's components. Scripts are disabled: it's a static render. */
export function HtmlPreview({ html, height = 220 }: { html: string; height?: number }) {
  return (
    <View style={[styles.frame, { height }]}>
      <WebView
        source={{ html: previewDocument(html) }}
        originWhitelist={['about:blank']}
        javaScriptEnabled={false}
        onShouldStartLoadWithRequest={(req) => req.url === 'about:blank'}
        accessibilityLabel="Preview of your component"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: '#DDE1EB' },
});
