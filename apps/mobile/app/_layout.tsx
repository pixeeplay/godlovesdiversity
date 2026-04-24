import 'react-native-gesture-handler';
import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: '#0a0314' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '900' },
        contentStyle: { backgroundColor: '#0a0314' }
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="photo/[id]" options={{ title: 'Photo', presentation: 'modal' }} />
        <Stack.Screen name="login" options={{ title: 'Connexion admin', presentation: 'modal' }} />
        <Stack.Screen name="chat" options={{ title: 'Demandez à GLD', presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
