import { Tabs } from 'expo-router';
import { LayoutDashboard, Users, Database, ShieldCheck } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown:             false,
        tabBarStyle:             { backgroundColor: Colors.navyCard, borderTopColor: Colors.border },
        tabBarActiveTintColor:  Colors.teal,
        tabBarInactiveTintColor: Colors.creamDim,
        tabBarLabelStyle:        { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="psicologos"
        options={{
          title: 'Psicologos',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="backup"
        options={{
          title: 'Respaldos',
          tabBarIcon: ({ color, size }) => <Database size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mfa"
        options={{
          title: 'Seguridad',
          tabBarIcon: ({ color, size }) => <ShieldCheck size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
