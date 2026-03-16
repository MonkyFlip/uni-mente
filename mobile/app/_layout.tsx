import { Stack } from 'expo-router';
import { ApolloProvider } from '@apollo/client';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';
import { client } from '../graphql/client';

export default function RootLayout() {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar style="light" backgroundColor="#0d1117" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(admin)" />
          </Stack>
        </SafeAreaProvider>
      </AuthProvider>
    </ApolloProvider>
  );
}