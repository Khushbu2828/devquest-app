import { View } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * Invisible WebView that runs one sandbox page and reports its message.
 * Learner code runs in the WebView's own JS engine, never in the app's.
 */
export function SandboxFrame({ html, onMessage }: { html: string; onMessage: (data: string) => void }) {
  return (
    <View style={{ width: 1, height: 1, opacity: 0, position: 'absolute' }} pointerEvents="none">
      <WebView
        source={{ html }}
        originWhitelist={['about:blank']}
        javaScriptEnabled
        domStorageEnabled={false}
        // The page has no links; block any navigation the code might attempt.
        onShouldStartLoadWithRequest={(req) => req.url === 'about:blank'}
        onMessage={(e) => onMessage(e.nativeEvent.data)}
      />
    </View>
  );
}
