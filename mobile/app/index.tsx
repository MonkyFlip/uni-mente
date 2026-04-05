/**
 * app/index.tsx — Entry point con loading guard
 *
 * El error "useAuth must be inside AuthProvider" ocurre porque
 * index.tsx se monta antes que los providers estén listos.
 * El loading guard evita el render prematuro.
 */
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/(auth)/login');
    } else if (user.rol === 'administrador') {
      router.replace('/(admin)/dashboard');
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, loading]);

  // Mientras carga AsyncStorage no renderiza nada
  return (
    <View style={{ flex: 1, backgroundColor: '#0d1117',
      alignItems: 'center', justifyContent: 'center' }}>
      {loading && <ActivityIndicator color="#1A7A6E" size="large" />}
    </View>
  );
}