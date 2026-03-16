import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { CalendarX, Clock, Stethoscope, XCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { GET_CITAS_ESTUDIANTE, CAMBIAR_ESTADO_CITA } from '../../graphql/operations';
import { PageHeader, Badge, Button, EmptyState, Spinner, Modal, Alert, Pagination, usePagination } from '../../components/UI';
import { Colors } from '../../constants/colors';

const ESTADO_BADGE: Record<string, any> = {
  PENDIENTE: 'yellow', ASISTIDA: 'green', CANCELADA: 'red',
};
const LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente', ASISTIDA: 'Asistida', CANCELADA: 'Cancelada',
};

const FILTROS = ['TODOS', 'PENDIENTE', 'ASISTIDA', 'CANCELADA'] as const;

export default function MisCitas() {
  const { user }     = useAuth();
  const idEstudiante = user?.id_perfil ?? 0;
  const [filtro, setFiltro]           = useState<string>('TODOS');
  const [cancelTarget, setCancelTarget] = useState<any>(null);

  const { data, loading, refetch } = useQuery(GET_CITAS_ESTUDIANTE, {
    variables: { id_estudiante: idEstudiante },
    skip: !idEstudiante,
    fetchPolicy: 'cache-and-network',
  });

  useFocusEffect(useCallback(() => { refetch(); }, []));

  const [cancelar, { loading: cancelando }] = useMutation(CAMBIAR_ESTADO_CITA, {
    onCompleted: () => { setCancelTarget(null); refetch(); },
  });

  const todas: any[] = [...(data?.citasEstudiante ?? [])].sort(
    (a, b) => new Date(a?.fecha ?? '').getTime() - new Date(b?.fecha ?? '').getTime()
  );
  const filtrada = filtro === 'TODOS' ? todas : todas.filter(c => c.estado === filtro);
  const { page, setPage, slice: lista, total, totalPages } = usePagination(filtrada, 10);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <PageHeader title="Mis Citas" subtitle={`${todas.length} cita${todas.length !== 1 ? "s" : ""} en total`} />

        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosWrap}>
          {FILTROS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filtroBtn, filtro === f && styles.filtroBtnActive]}
              onPress={() => { setFiltro(f); setPage(1); }}
            >
              <Text style={[styles.filtroText, filtro === f && styles.filtroTextActive]}>
                {f === 'TODOS' ? 'Todos' : LABEL[f]}
                {f !== 'TODOS' && ` (${todas.filter(c => c.estado === f).length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading && <Spinner />}
        {!loading && todas.length === 0 && (
          <EmptyState icon={<CalendarX size={28} color={Colors.creamDim} />}
            title="Sin citas"
            description="Ve a la seccion Psicologos para agendar tu primera cita." />
        )}
        {!loading && filtrada.length === 0 && todas.length > 0 && (
          <EmptyState icon={<CalendarX size={28} color={Colors.creamDim} />}
            title="Sin resultados"
            description="Ninguna cita coincide con el filtro seleccionado." />
        )}

        {lista.filter(Boolean).map((cita: any) => (
          <View key={cita?.id_cita} style={styles.citaCard}>
            <View style={styles.citaFecha}>
              <Text style={styles.citaDia}>
                {new Date((cita?.fecha ?? '') + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Clock size={10} color={Colors.creamDim} />
                <Text style={styles.citaHora}>{cita?.hora_inicio?.slice(0, 5)}</Text>
              </View>
            </View>
            <View style={styles.citaInfo}>
              <Text style={styles.citaNombre}>{cita?.psicologo?.usuario?.nombre}</Text>
              {cita?.psicologo?.especialidad && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Stethoscope size={11} color={Colors.teal} />
                  <Text style={styles.citaEsp}>{cita?.psicologo?.especialidad}</Text>
                </View>
              )}
              {cita?.motivo && <Text style={styles.citaMotivo}>"{cita?.motivo}"</Text>}
              <Badge label={LABEL[cita?.estado] ?? cita?.estado} variant={ESTADO_BADGE[cita?.estado] ?? 'gray'} />
            </View>
            {cita?.estado === 'PENDIENTE' && (
              <Button variant="danger" size="sm"
                icon={<XCircle size={13} color={Colors.white} />}
                onPress={() => setCancelTarget(cita)}
              >
                Cancelar
              </Button>
            )}
          </View>
        ))}
      </ScrollView>

      <Pagination total={total} page={page} totalPages={totalPages} pageSize={10} onPage={setPage} />

      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancelar cita">
        <Text style={styles.modalText}>
          Confirmar cancelacion de la cita del{' '}
          <Text style={{ color: Colors.cream, fontWeight: '600' }}>
            {cancelTarget && new Date(cancelTarget?.fecha + 'T12:00:00').toLocaleDateString('es-MX', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </Text>{' '}
          con <Text style={{ color: Colors.cream, fontWeight: '600' }}>
            {cancelTarget?.psicologo?.usuario?.nombre}
          </Text>?
        </Text>
        <View style={styles.modalActions}>
          <Button variant="secondary" onPress={() => setCancelTarget(null)} style={{ flex: 1 }}>Mantener</Button>
          <Button variant="danger" loading={cancelando}
            icon={<XCircle size={14} color={Colors.white} />}
            onPress={() => cancelar({ variables: { id_cita: cancelTarget?.id_cita, input: { estado: 'CANCELADA' } } })}
            style={{ flex: 1 }}
          >
            Si, cancelar
          </Button>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: Colors.navy },
  scroll:         { padding: 20, gap: 12, paddingBottom: 40 },
  filtrosWrap:    { flexGrow: 0, marginBottom: 4 },
  filtroBtn:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, marginRight: 8, backgroundColor: Colors.navyCard },
  filtroBtnActive:{ borderColor: Colors.teal, backgroundColor: Colors.tealGlow },
  filtroText:     { fontSize: 13, color: Colors.creamDim, fontWeight: '500' },
  filtroTextActive:{ color: Colors.teal, fontWeight: '700' },
  citaCard:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: Colors.navyCard, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 14 },
  citaFecha:      { alignItems: 'center', gap: 4, minWidth: 44 },
  citaDia:        { fontSize: 14, fontWeight: '700', color: Colors.cream },
  citaHora:       { fontSize: 11, color: Colors.creamDim },
  citaInfo:       { flex: 1, gap: 5 },
  citaNombre:     { fontSize: 14, fontWeight: '600', color: Colors.white },
  citaEsp:        { fontSize: 12, color: Colors.creamDim },
  citaMotivo:     { fontSize: 12, color: Colors.creamDim, fontStyle: 'italic' },
  modalText:      { fontSize: 14, color: Colors.creamDim, lineHeight: 22, marginBottom: 16 },
  modalActions:   { flexDirection: 'row', gap: 10 },
});