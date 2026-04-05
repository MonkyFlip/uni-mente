/**
 * app/(tabs)/_layout.tsx
 * Solo oculta la barra inferior — Expo Router maneja las rutas automáticamente
 * por los archivos en esta carpeta. NO declarar Tabs.Screen manualmente.
 */
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    />
  );
}