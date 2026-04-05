/**
 * app/_layout.tsx — Root layout con todos los providers
 *
 * Orden: Apollo → Theme → SafeArea → Auth → Drawer → Tour → Slot
 */
import { ApolloProvider } from '@apollo/client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Slot } from 'expo-router';
import { client } from '../graphql/client';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { TourProvider } from '../contexts/TourContext';
import { DrawerProvider } from '../components/Drawer';
import { Tour } from '../components/Tour';

function AppCore() {
  const { user } = useAuth();
  return (
    <TourProvider rol={user?.rol ?? null}>
      <DrawerProvider>
        <Tour />
        <Slot />
      </DrawerProvider>
    </TourProvider>
  );
}

export default function RootLayout() {
  return (
    <ApolloProvider client={client}>
      <ThemeProvider>
        <SafeAreaProvider>
          <AuthProvider>
            <AppCore />
          </AuthProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </ApolloProvider>
  );
}