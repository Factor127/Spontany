import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PrefsProvider } from '../src/prefs/PrefsContext';

const isWeb = Platform.OS === 'web';

// On web, pin the app to a centered phone-sized frame so it reads as the mobile
// app it actually is — desktop browsers would otherwise stretch it full-width.
// On a real device this is a passthrough (flex: 1, true full screen).
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PrefsProvider>
        <View style={styles.page}>
          <View style={styles.frame}>
            <Stack screenOptions={{ headerShown: false }} />
          </View>
        </View>
        <StatusBar style="auto" />
      </PrefsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  page: isWeb
    ? { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#15140F', padding: 16 }
    : { flex: 1 },
  frame: isWeb
    ? {
        width: '100%',
        maxWidth: 412,
        height: '100%',
        maxHeight: 900,
        overflow: 'hidden',
        borderRadius: 28,
        borderWidth: 1,
        borderColor: '#2E2D29',
      }
    : { flex: 1 },
});
