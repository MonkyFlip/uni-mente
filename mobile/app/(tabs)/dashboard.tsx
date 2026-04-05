import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client';
import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Calendar, CheckCircle, Users, Clock,
  Search, ClipboardList, ShieldCheck,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import {
  GET_PSICOLOGOS_SLIM, GET_ESTUDIANTES_SLIM,
  GET_MIS_CITAS, GET_MI_AGENDA,
} from '../../graphql/operations';
import { StatCard, PageHeader } from '../../components/UI';
import { useTheme } from '../../contexts/ThemeContext';
import { MenuButton } from '../../components/Drawer';

const TIPS = [
  'Recuerda que buscar ayuda es un acto de valentía.',
  'La salud mental es tan importante como la física.',
  'Un paso a la vez. Estamos aquí para apoyarte.',
];

export default function Dashboard() {
  const { user }   = useAuth();
  const router     = useRouter();
  const { colors } = useTheme();
  const s          = makeStyles(colors);
  const tip        = TIPS[new Date().getDay() % TIPS.length];

  // Psicólogos disponibles (para el contador del estudiante)
  const { data: dataPsi, refetch: rPsi } = useQuery(GET_PSICOLOGOS_SLIM, {
    skip: user?.rol !== 'estudiante',
  });

  // Mis citas — JWT-resolved, sin parámetros
  const { data: dataCitas, refetch: rCitas } = useQuery(GET_MIS_CITAS, {
    skip: user?.rol !== 'estudiante',
    fetchPolicy: 'network-only',
  });

  // Mi agenda — JWT-resolved, sin parámetros
  const { data: dataAgenda, refetch: rAgenda } = useQuery(GET_MI_AGENDA, {
    skip: user?.rol !== 'psicologo',
    fetchPolicy: 'network-only',
  });

  useFocusEffect(useCallback(() => {
    rPsi?.(); rCitas?.(); rAgenda?.();
  }, []));

  const citas  = dataCitas?.misCitas   ?? [];
  const agenda = dataAgenda?.miAgenda  ?? [];
  const hoy    = new Date().toISOString().split('T')[0];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>

        {/* Header */}
        <View style={s.topRow}>
          <View>
            <Text style={s.greeting}>Hola, {user?.nombre?.split(' ')[0]}</Text>
            <Text style={s.rolText}>
              {user?.rol === 'administrador' ? 'Administrador'
               : user?.rol === 'psicologo'   ? 'Psicólogo'
               : 'Estudiante'}
            </Text>
          </View>
          <MenuButton />
        </View>

        {/* Tip */}
        <View style={s.tipCard}>
          <ShieldCheck size={16} color={colors.teal} />
          <Text style={s.tipText}>{tip}</Text>
        </View>

        {/* ── ESTUDIANTE ── */}
        {user?.rol === 'estudiante' && (
          <>
            <Text style={s.sectionTitle}>Tu resumen</Text>
            <View style={s.statsRow}>
              <StatCard
                icon={<Calendar size={20} color={colors.teal} />}
                label="Pendientes"
                value={citas.filter((c: any) => c.estado === 'PENDIENTE').length}
              />
              <StatCard
                icon={<CheckCircle size={20} color={colors.teal} />}
                label="Completadas"
                value={citas.filter((c: any) => c.estado === 'ASISTIDA').length}
              />
              <StatCard
                icon={<Users size={20} color={colors.teal} />}
                label="Disponibles"
                value={dataPsi?.psicologos?.length ?? '—'}
              />
            </View>
            <Text style={s.sectionTitle}>Acciones rápidas</Text>
            <ActionCard colors={colors}
              icon={<Search size={20} color={colors.teal} />}
              title="Buscar psicólogo"
              desc="Explora los profesionales disponibles"
              onPress={() => router.push('/(tabs)/psicologos')}
            />
            <ActionCard colors={colors}
              icon={<ClipboardList size={20} color={colors.teal} />}
              title="Ver mis citas"
              desc="Consulta y gestiona tus citas"
              onPress={() => router.push('/(tabs)/mis-citas')}
            />
          </>
        )}

        {/* ── PSICÓLOGO ── */}
        {user?.rol === 'psicologo' && (
          <>
            <Text style={s.sectionTitle}>Tu resumen</Text>
            <View style={s.statsRow}>
              <StatCard
                icon={<Calendar size={20} color={colors.teal} />}
                label="Citas hoy"
                value={agenda.filter((c: any) => c.fecha?.startsWith(hoy)).length}
              />
              <StatCard
                icon={<Clock size={20} color={colors.teal} />}
                label="Pendientes"
                value={agenda.filter((c: any) => c.estado === 'PENDIENTE').length}
              />
              <StatCard
                icon={<Users size={20} color={colors.teal} />}
                label="Pacientes"
                value={new Set(agenda.map((c: any) => c.estudiante?.id_estudiante)).size}
              />
            </View>
            <Text style={s.sectionTitle}>Acciones rápidas</Text>
            <ActionCard colors={colors}
              icon={<Calendar size={20} color={colors.teal} />}
              title="Ver mi agenda"
              desc="Revisa todas tus citas programadas"
              onPress={() => router.push('/(tabs)/agenda')}
            />
            <ActionCard colors={colors}
              icon={<Clock size={20} color={colors.teal} />}
              title="Gestionar horarios"
              desc="Define tu disponibilidad"
              onPress={() => router.push('/(tabs)/horarios')}
            />
          </>
        )}

        {/* ── ADMINISTRADOR ── */}
        {user?.rol === 'administrador' && (
          <>
            <Text style={s.sectionTitle}>Acciones rápidas</Text>
            <ActionCard colors={colors}
              icon={<Users size={20} color={colors.teal} />}
              title="Gestionar psicólogos"
              desc="Registra y administra el equipo"
              onPress={() => router.push('/(admin)/psicologos')}
            />
            <ActionCard colors={colors}
              icon={<ClipboardList size={20} color={colors.teal} />}
              title="Respaldos"
              desc="Crea y gestiona backups del sistema"
              onPress={() => router.push('/(admin)/backup')}
            />
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function ActionCard({ icon, title, desc, onPress, colors }: any) {
  return (
    <TouchableOpacity
      style={[{
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: colors.navyCard, borderRadius: 13,
        borderWidth: 1, borderColor: colors.border, padding: 16,
      }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={{
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: colors.tealGlow, alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.white }}>{title}</Text>
        <Text style={{ fontSize: 12, color: colors.creamDim, marginTop: 2 }}>{desc}</Text>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.navy },
  scroll:       { padding: 20, gap: 16, paddingBottom: 40 },
  topRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting:     { fontSize: 26, fontWeight: '800', color: colors.white },
  rolText:      { fontSize: 12, color: colors.creamDim },
  tipCard:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10,
                  backgroundColor: colors.tealGlow, borderRadius: 12,
                  padding: 14, borderWidth: 1, borderColor: colors.teal + '33' },
  tipText:      { flex: 1, fontSize: 13, color: colors.cream, lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.white },
  statsRow:     { flexDirection: 'row', gap: 10 },
});