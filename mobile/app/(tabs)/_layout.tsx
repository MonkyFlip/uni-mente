import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { LayoutDashboard, Users, Calendar, Clock } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/colors';

export default function TabsLayout() {
  const { user } = useAuth();
  const router   = useRouter();

  useEffect(() => {
    if (!user) router.replace('/(auth)/login');
    else if (user.rol === 'administrador') router.replace('/(admin)/dashboard');
  }, [user]);

  const isStudent = user?.rol === 'estudiante';

  return (
    <Tabs
      screenOptions={{
        headerShown:             false,
        tabBarStyle:             { backgroundColor: Colors.navyCard, borderTopColor: Colors.border },
        tabBarActiveTintColor:   Colors.teal,
        tabBarInactiveTintColor: Colors.creamDim,
        tabBarLabelStyle:        { fontSize: 11, fontWeight: '600' },
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
        name="mis-citas"
        options={isStudent ? {
          title: 'Mis Citas',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        } : { href: null }}
      />
      <Tabs.Screen
        name="agenda"
        options={!isStudent ? {
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        } : { href: null }}
      />
      <Tabs.Screen
        name="horarios"
        options={!isStudent ? {
          title: 'Horarios',
          tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
        } : { href: null }}
      />
    </Tabs>
  );
}