import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/colors';

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

  return (
    <View style={{ flex: 1, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={Colors.teal} />
    </View>
  );
}
