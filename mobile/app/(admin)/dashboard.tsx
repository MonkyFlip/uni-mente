import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client';
import { Users, Database, ShieldCheck, TrendingUp, BarChart2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { MenuButton } from '../../components/Drawer';
import { GET_PSICOLOGOS_SLIM, GET_ESTUDIANTES_SLIM } from '../../graphql/operations';
import { StatCard } from '../../components/UI';

export default function AdminDashboard() {
  const { user }   = useAuth();
  const { colors } = useTheme();
  const router     = useRouter();

  const { data: dataPsi, loading: lPsi } = useQuery(GET_PSICOLOGOS_SLIM);
  const { data: dataEst, loading: lEst } = useQuery(GET_ESTUDIANTES_SLIM);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>

        {/* Header con menú */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 26, fontWeight: '800', color: colors.white }}>
              Hola, {user?.nombre?.split(' ')[0]}
            </Text>
            <Text style={{ fontSize: 12, color: colors.creamDim }}>Administrador</Text>
          </View>
          <MenuButton />
        </View>

        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.white }}>
          Métricas del sistema
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StatCard icon={<Users size={20} color={colors.teal} />}
            label="Psicólogos"
            value={lPsi ? '...' : (dataPsi?.psicologos?.length ?? '—')} />
          <StatCard icon={<Users size={20} color={colors.teal} />}
            label="Estudiantes"
            value={lEst ? '...' : (dataEst?.estudiantes?.length ?? '—')} />
        </View>

        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.white }}>
          Administración
        </Text>

        {[
          { icon: <Users size={20} color={colors.teal} />, title: 'Psicólogos',
            desc: 'Gestiona el equipo profesional', href: '/(admin)/psicologos' },
          { icon: <BarChart2 size={20} color={colors.teal} />, title: 'Estadísticas',
            desc: 'Métricas y análisis del sistema', href: '/(admin)/estadisticas' },
          { icon: <Database size={20} color={colors.teal} />, title: 'Respaldos',
            desc: 'Gestiona los backups de la BD', href: '/(admin)/backup' },
          { icon: <ShieldCheck size={20} color={colors.teal} />, title: 'Seguridad MFA',
            desc: 'Configura autenticación de dos factores', href: '/(admin)/mfa' },
        ].map(({ icon, title, desc, href }) => (
          <TouchableOpacity key={href}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14,
              backgroundColor: colors.navyCard, borderRadius: 13,
              borderWidth: 1, borderColor: colors.border, padding: 16 }}
            onPress={() => router.push(href as any)}
            activeOpacity={0.75}
          >
            <View style={{ width: 44, height: 44, borderRadius: 12,
              backgroundColor: colors.tealGlow, alignItems: 'center', justifyContent: 'center' }}>
              {icon}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.white }}>{title}</Text>
              <Text style={{ fontSize: 12, color: colors.creamDim, marginTop: 2 }}>{desc}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}