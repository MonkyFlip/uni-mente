import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { CalendarX, Clock, Stethoscope, XCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { GET_MIS_CITAS, CAMBIAR_ESTADO_CITA } from '../../graphql/operations';
import { PageHeader, Badge, Button, EmptyState, Spinner, Modal, Pagination, usePagination } from '../../components/UI';
import { useTheme } from '../../contexts/ThemeContext';
import { MenuButton } from '../../components/Drawer';

const ESTADO_BADGE: Record<string, any> = {
  PENDIENTE: 'yellow', ASISTIDA: 'green', CANCELADA: 'red',
};
const LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente', ASISTIDA: 'Asistida', CANCELADA: 'Cancelada',
};
const FILTROS = ['TODOS', 'PENDIENTE', 'ASISTIDA', 'CANCELADA'] as const;

export default function MisCitas() {
  const { colors } = useTheme();
  const [filtro,       setFiltro]       = useState<string>('TODOS');
  const [cancelTarget, setCancelTarget] = useState<any>(null);

  // JWT-resolved — sin variables de id_estudiante
  const { data, loading, refetch } = useQuery(GET_MIS_CITAS, {
    fetchPolicy: 'cache-and-network',
  });

  useFocusEffect(useCallback(() => { refetch(); }, []));

  const [cancelar, { loading: cancelando }] = useMutation(CAMBIAR_ESTADO_CITA, {
    onCompleted: () => { setCancelTarget(null); refetch(); },
  });

  const todas: any[] = [...(data?.misCitas ?? [])].sort(
    (a, b) => new Date(a?.fecha ?? '').getTime() - new Date(b?.fecha ?? '').getTime()
  );
  const filtrada = filtro === 'TODOS' ? todas : todas.filter(c => c.estado === filtro);
  const { page, setPage, slice: lista, total, totalPages } = usePagination(filtrada, 10);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>

        {/* Header con menú */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <PageHeader
            title="Mis Citas"
            subtitle={`${todas.length} cita${todas.length !== 1 ? 's' : ''} en total`}
          />
          <MenuButton />
        </View>

        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {FILTROS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filtroBtn,
                { borderColor: filtro === f ? colors.teal : colors.border,
                  backgroundColor: filtro === f ? colors.tealGlow : colors.navyCard },
                { marginRight: 8 }]}
              onPress={() => { setFiltro(f); setPage(1); }}
            >
              <Text style={{ fontSize: 13, fontWeight: filtro === f ? '700' : '500',
                color: filtro === f ? colors.teal : colors.creamDim }}>
                {f === 'TODOS' ? 'Todos' : LABEL[f]}
                {f !== 'TODOS' && ` (${todas.filter(c => c.estado === f).length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading && <Spinner />}
        {!loading && todas.length === 0 && (
          <EmptyState icon={<CalendarX size={28} color={colors.creamDim} />}
            title="Sin citas"
            description="Ve a la sección Psicólogos para agendar tu primera cita." />
        )}
        {!loading && filtrada.length === 0 && todas.length > 0 && (
          <EmptyState icon={<CalendarX size={28} color={colors.creamDim} />}
            title="Sin resultados"
            description="Ninguna cita coincide con el filtro." />
        )}

        {lista.filter(Boolean).map((cita: any) => (
          <View key={cita?.id_cita} style={[styles.citaCard,
            { backgroundColor: colors.navyCard, borderColor: colors.border }]}>
            <View style={styles.citaFecha}>
              <Text style={[styles.citaDia, { color: colors.cream }]}>
                {new Date((cita?.fecha ?? '') + 'T12:00:00').toLocaleDateString('es-MX',
                  { day: '2-digit', month: 'short' })}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Clock size={10} color={colors.creamDim} />
                <Text style={[styles.citaHora, { color: colors.creamDim }]}>
                  {cita?.hora_inicio?.slice(0, 5)}
                </Text>
              </View>
            </View>
            <View style={styles.citaInfo}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.white }}>
                {cita?.psicologo?.usuario?.nombre}
              </Text>
              {cita?.psicologo?.especialidad && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Stethoscope size={11} color={colors.teal} />
                  <Text style={{ fontSize: 12, color: colors.creamDim }}>
                    {cita?.psicologo?.especialidad}
                  </Text>
                </View>
              )}
              {cita?.motivo && (
                <Text style={{ fontSize: 12, color: colors.creamDim, fontStyle: 'italic' }}>
                  "{cita?.motivo}"
                </Text>
              )}
              <Badge label={LABEL[cita?.estado] ?? cita?.estado}
                variant={ESTADO_BADGE[cita?.estado] ?? 'gray'} />
            </View>
            {cita?.estado === 'PENDIENTE' && (
              <Button variant="danger" size="sm"
                icon={<XCircle size={13} color={colors.white} />}
                onPress={() => setCancelTarget(cita)}>
                Cancelar
              </Button>
            )}
          </View>
        ))}
      </ScrollView>

      <Pagination total={total} page={page} totalPages={totalPages} pageSize={10} onPage={setPage} />

      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancelar cita">
        <Text style={{ fontSize: 14, color: colors.creamDim, lineHeight: 22, marginBottom: 16 }}>
          Confirmar cancelación de la cita del{' '}
          <Text style={{ color: colors.cream, fontWeight: '600' }}>
            {cancelTarget && new Date(cancelTarget?.fecha + 'T12:00:00')
              .toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>{' '}
          con <Text style={{ color: colors.cream, fontWeight: '600' }}>
            {cancelTarget?.psicologo?.usuario?.nombre}
          </Text>?
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button variant="secondary" onPress={() => setCancelTarget(null)} style={{ flex: 1 }}>
            Mantener
          </Button>
          <Button variant="danger" loading={cancelando}
            icon={<XCircle size={14} color={colors.white} />}
            onPress={() => cancelar({
              variables: { id_cita: cancelTarget?.id_cita, input: { estado: 'CANCELADA' } }
            })}
            style={{ flex: 1 }}>
            Sí, cancelar
          </Button>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  filtroBtn:  { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  citaCard:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12,
                borderRadius: 12, borderWidth: 1, padding: 14 },
  citaFecha:  { alignItems: 'center', gap: 4, minWidth: 44 },
  citaDia:    { fontSize: 14, fontWeight: '700' },
  citaHora:   { fontSize: 11 },
  citaInfo:   { flex: 1, gap: 5 },
});