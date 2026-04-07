/**
 * app/(admin)/_layout.tsx
 * Oculta la barra inferior — la navegación está en el Drawer lateral.
 */
import { Tabs } from 'expo-router';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="dashboard"    />
      <Tabs.Screen name="psicologos"   />
      <Tabs.Screen name="backup"       />
      <Tabs.Screen name="mfa"          />
      <Tabs.Screen name="estadisticas" />
    </Tabs>
  );
}