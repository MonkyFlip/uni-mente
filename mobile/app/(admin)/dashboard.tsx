import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client';
import { Users, Database, ShieldCheck, LogOut, UserPlus, Calendar } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { GET_PSICOLOGOS_SLIM, GET_ESTUDIANTES_SLIM } from '../../graphql/operations';
import { StatCard } from '../../components/UI';
import { Colors } from '../../constants/colors';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const { data: dataPsi, loading: lPsi } = useQuery(GET_PSICOLOGOS_SLIM);
  const { data: dataEst, loading: lEst } = useQuery(GET_ESTUDIANTES_SLIM);

  const handleLogout = async () => { await logout(); router.replace('/(auth)/login'); };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.greeting}>Hola, {user?.nombre?.split(' ')[0]}</Text>
            <Text style={styles.rolText}>Administrador</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <LogOut size={20} color={Colors.creamDim} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Metricas del sistema</Text>
        <View style={styles.statsRow}>
          <StatCard icon={<Users size={20} color={Colors.teal} />}
            label="Psicologos" value={lPsi ? '...' : (dataPsi?.psicologos?.length ?? '—')} />
          <StatCard icon={<Users size={20} color={Colors.teal} />}
            label="Estudiantes" value={lEst ? '...' : (dataEst?.estudiantes?.length ?? '—')} />
        </View>

        <Text style={styles.sectionTitle}>Administracion</Text>

        <ActionCard
          icon={<Users size={20} color={Colors.teal} />}
          title="Ver psicologos"
          desc="Gestiona el equipo profesional"
          onPress={() => router.push('/(admin)/psicologos')}
        />
        <ActionCard
          icon={<UserPlus size={20} color={Colors.teal} />}
          title="Registrar psicologo"
          desc="Agrega un nuevo profesional"
          onPress={() => router.push('/(admin)/psicologos')}
        />
        <ActionCard
          icon={<Database size={20} color={Colors.teal} />}
          title="Respaldos"
          desc="Gestiona los backups de la BD"
          onPress={() => router.push('/(admin)/backup')}
        />
        <ActionCard
          icon={<ShieldCheck size={20} color={Colors.teal} />}
          title="Seguridad MFA"
          desc="Configura autenticacion de dos factores"
          onPress={() => router.push('/(admin)/mfa')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionCard({ icon, title, desc, onPress }: any) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.actionIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDesc}>{desc}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: Colors.navy },
  scroll:       { padding: 20, gap: 16, paddingBottom: 40 },
  topRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting:     { fontSize: 26, fontWeight: '800', color: Colors.white },
  rolText:      { fontSize: 12, color: Colors.creamDim },
  logoutBtn:    { padding: 8, borderRadius: 10, backgroundColor: Colors.navyCard },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.white },
  statsRow:     { flexDirection: 'row', gap: 10 },
  actionCard:   {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.navyCard, borderRadius: 13,
    borderWidth: 1, borderColor: Colors.border, padding: 16,
  },
  actionIcon:   { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.tealGlow, alignItems: 'center', justifyContent: 'center' },
  actionTitle:  { fontSize: 15, fontWeight: '600', color: Colors.white },
  actionDesc:   { fontSize: 12, color: Colors.creamDim, marginTop: 2 },
});
