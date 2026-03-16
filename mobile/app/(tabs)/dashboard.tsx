import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client';
import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Calendar, CheckCircle, Users, Clock,
  Search, ClipboardList, LogOut, ShieldCheck,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import {
  GET_PSICOLOGOS_SLIM, GET_ESTUDIANTES_SLIM,
  GET_CITAS_ESTUDIANTE, GET_AGENDA_PSICOLOGO,
} from '../../graphql/operations';
import { StatCard, PageHeader } from '../../components/UI';
import { Colors } from '../../constants/colors';

const TIPS = [
  'Recuerda que buscar ayuda es un acto de valentia.',
  'La salud mental es tan importante como la fisica.',
  'Un paso a la vez. Estamos aqui para apoyarte.',
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const tip    = TIPS[new Date().getDay() % TIPS.length];

  const { data: dataPsi, loading: lPsi, refetch: rPsi } = useQuery(GET_PSICOLOGOS_SLIM, { skip: user?.rol === 'psicologo' });
  const { data: dataEst, loading: lEst, refetch: rEst } = useQuery(GET_ESTUDIANTES_SLIM, { skip: user?.rol !== 'administrador' });
  const { data: dataCitas, refetch: rCitas } = useQuery(GET_CITAS_ESTUDIANTE, {
    variables: { id_estudiante: user?.id_perfil ?? 0 },
    skip: user?.rol !== 'estudiante' || !user?.id_perfil,
    fetchPolicy: 'network-only',
  });
  const { data: dataAgenda, refetch: rAgenda } = useQuery(GET_AGENDA_PSICOLOGO, {
    variables: { id_psicologo: user?.id_perfil ?? 0 },
    skip: user?.rol !== 'psicologo' || !user?.id_perfil,
    fetchPolicy: 'network-only',
  });

  useFocusEffect(useCallback(() => {
    rPsi?.(); rEst?.(); rCitas?.(); rAgenda?.();
  }, []));

  const citas   = dataCitas?.citasEstudiante ?? [];
  const agenda  = dataAgenda?.agendaPsicologo ?? [];
  const hoy     = new Date().toISOString().split('T')[0];

  const handleLogout = async () => { await logout(); router.replace('/(auth)/login'); };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.greeting}>Hola, {user?.nombre?.split(' ')[0]}</Text>
            <Text style={styles.rolText}>{user?.rol}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <LogOut size={20} color={Colors.creamDim} />
          </TouchableOpacity>
        </View>

        {/* Tip */}
        <View style={styles.tipCard}>
          <ShieldCheck size={16} color={Colors.teal} />
          <Text style={styles.tipText}>{tip}</Text>
        </View>

        {/* Stats */}
        {user?.rol === 'estudiante' && (
          <>
            <Text style={styles.sectionTitle}>Tu resumen</Text>
            <View style={styles.statsRow}>
              <StatCard icon={<Calendar size={20} color={Colors.teal} />}
                label="Pendientes" value={citas.filter((c: any) => c.estado === 'PENDIENTE').length} />
              <StatCard icon={<CheckCircle size={20} color={Colors.teal} />}
                label="Completadas" value={citas.filter((c: any) => c.estado === 'ASISTIDA').length} />
              <StatCard icon={<Users size={20} color={Colors.teal} />}
                label="Disponibles" value={lPsi ? '...' : (dataPsi?.psicologos?.length ?? '—')} />
            </View>
            <Text style={styles.sectionTitle}>Acciones rapidas</Text>
            <ActionCard icon={<Search size={20} color={Colors.teal} />}
              title="Buscar psicologo" desc="Explora los profesionales disponibles"
              onPress={() => router.push('/(tabs)/psicologos')} />
            <ActionCard icon={<ClipboardList size={20} color={Colors.teal} />}
              title="Ver mis citas" desc="Consulta y gestiona tus citas"
              onPress={() => router.push('/(tabs)/mis-citas')} />
          </>
        )}

        {user?.rol === 'psicologo' && (
          <>
            <Text style={styles.sectionTitle}>Tu resumen</Text>
            <View style={styles.statsRow}>
              <StatCard icon={<Calendar size={20} color={Colors.teal} />}
                label="Citas hoy" value={agenda.filter((c: any) => c.fecha === hoy).length} />
              <StatCard icon={<Clock size={20} color={Colors.teal} />}
                label="Pendientes" value={agenda.filter((c: any) => c.estado === 'PENDIENTE').length} />
              <StatCard icon={<Users size={20} color={Colors.teal} />}
                label="Pacientes" value={new Set(agenda.map((c: any) => c.estudiante?.id_estudiante)).size} />
            </View>
            <Text style={styles.sectionTitle}>Acciones rapidas</Text>
            <ActionCard icon={<Calendar size={20} color={Colors.teal} />}
              title="Ver mi agenda" desc="Revisa todas tus citas programadas"
              onPress={() => router.push('/(tabs)/agenda')} />
            <ActionCard icon={<Clock size={20} color={Colors.teal} />}
              title="Gestionar horarios" desc="Define tu disponibilidad"
              onPress={() => router.push('/(tabs)/horarios')} />
          </>
        )}
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
  rolText:      { fontSize: 12, color: Colors.creamDim, textTransform: 'capitalize' },
  logoutBtn:    { padding: 8, borderRadius: 10, backgroundColor: Colors.navyCard },
  tipCard:      {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: Colors.tealGlow, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: Colors.teal + '33',
  },
  tipText:      { flex: 1, fontSize: 13, color: Colors.cream, lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.white },
  statsRow:     { flexDirection: 'row', gap: 10 },
  actionCard:   {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.navyCard, borderRadius: 13,
    borderWidth: 1, borderColor: Colors.border, padding: 16,
  },
  actionIcon:   {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.tealGlow, alignItems: 'center', justifyContent: 'center',
  },
  actionTitle:  { fontSize: 15, fontWeight: '600', color: Colors.white },
  actionDesc:   { fontSize: 12, color: Colors.creamDim, marginTop: 2 },
});