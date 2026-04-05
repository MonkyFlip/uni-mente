import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { CalendarCheck, UserCheck, XCircle, PenLine, Search, AlertTriangle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { GET_MI_AGENDA, CAMBIAR_ESTADO_CITA, REGISTRAR_SESION } from '../../graphql/operations';
import { PageHeader, Badge, Button, EmptyState, Spinner, Modal, Field, Input, Alert, SectionHeader, Pagination, usePagination } from '../../components/UI';
import { useTheme } from '../../contexts/ThemeContext';
import { MenuButton } from '../../components/Drawer';

const ESTADO_BADGE: Record<string, any> = { PENDIENTE: 'yellow', ASISTIDA: 'green', CANCELADA: 'red' };
const LABEL: Record<string, string>      = { PENDIENTE: 'Pendiente', ASISTIDA: 'Asistida', CANCELADA: 'Cancelada' };

export default function Agenda() {
  const { colors } = useTheme();
  const [search, setSearch]            = useState('');
  const [confirmAsistida, setConfirmA] = useState<any>(null);
  const [confirmCancelar, setConfirmC] = useState<any>(null);
  const [sesionCita, setSesionCita]    = useState<any>(null);
  const [sesionForm, setSesionForm]    = useState({ notas: '', recomendaciones: '', numero_sesion: 1 });

  // JWT-resolved — sin variables de id_psicologo
  const { data, loading, refetch } = useQuery(GET_MI_AGENDA, {
    fetchPolicy: 'cache-and-network',
  });

  useFocusEffect(useCallback(() => { refetch(); }, []));

  const [cambiar, { loading: cambiando }] = useMutation(CAMBIAR_ESTADO_CITA, {
    onCompleted: () => { setConfirmA(null); setConfirmC(null); refetch(); },
  });

  const [registrarSesion, { loading: guardando, error: errSesion }] = useMutation(REGISTRAR_SESION, {
    onCompleted: () => { setSesionCita(null); refetch(); },
  });

  const citas     = data?.miAgenda ?? [];
  const filtradas = citas.filter((c: any) =>
    c.estudiante?.usuario?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    (c.motivo ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const pendientes = [...filtradas.filter((c: any) => c.estado === 'PENDIENTE')]
    .sort((a, b) => new Date(a?.fecha ?? '').getTime() - new Date(b?.fecha ?? '').getTime());
  const historial = [...filtradas.filter((c: any) => c.estado !== 'PENDIENTE')]
    .sort((a, b) => new Date(b?.fecha ?? '').getTime() - new Date(a?.fecha ?? '').getTime());

  const pgPend = usePagination(pendientes, 8);
  const pgHist = usePagination(historial,  10);

  const fmtFecha = (f: string) => new Date(f + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>

        {/* Header con menú */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <PageHeader title="Mi Agenda" subtitle={`${citas.length} citas en total`} />
          <MenuButton />
        </View>

        {citas.length > 0 && (
          <View style={[styles.searchBar, { backgroundColor: colors.navyCard, borderColor: colors.border }]}>
            <Search size={16} color={colors.creamDim} />
            <TextInput
              style={[styles.searchInput, { color: colors.white }]}
              placeholder="Buscar por paciente o motivo..."
              placeholderTextColor={colors.creamDim}
              value={search}
              onChangeText={v => { setSearch(v); pgPend.setPage(1); pgHist.setPage(1); }}
            />
          </View>
        )}

        {loading && <Spinner />}

        {pendientes.length > 0 && (
          <>
            <SectionHeader title="Próximas citas" count={pendientes.length} />
            {pgPend.slice.filter(Boolean).map((cita: any) => (
              <CitaCard key={cita?.id_cita} cita={cita} colors={colors}
                onSesion={() => setSesionCita(cita)}
                onAsistida={() => setConfirmA(cita)}
                onCancelar={() => setConfirmC(cita)}
              />
            ))}
            <Pagination total={pgPend.total} page={pgPend.page} totalPages={pgPend.totalPages} pageSize={8} onPage={pgPend.setPage} />
          </>
        )}

        {historial.length > 0 && (
          <>
            <SectionHeader title="Historial" count={historial.length} />
            {pgHist.slice.filter(Boolean).map((cita: any) => (
              <CitaCard key={cita?.id_cita} cita={cita} colors={colors} />
            ))}
            <Pagination total={pgHist.total} page={pgHist.page} totalPages={pgHist.totalPages} pageSize={10} onPage={pgHist.setPage} />
          </>
        )}

        {!loading && citas.length === 0 && (
          <EmptyState icon={<CalendarCheck size={28} color={colors.creamDim} />}
            title="Sin citas"
            description="Las citas aparecerán aquí cuando los estudiantes las agenden." />
        )}
      </ScrollView>

      <Modal open={!!confirmAsistida} onClose={() => setConfirmA(null)} title="Confirmar asistencia">
        <Text style={[styles.modalText, { color: colors.creamDim }]}>
          Confirmar que{' '}
          <Text style={{ color: colors.cream, fontWeight: '700' }}>
            {confirmAsistida?.estudiante?.usuario?.nombre}
          </Text>{' '}
          asistió el{' '}
          <Text style={{ color: colors.cream, fontWeight: '700' }}>
            {confirmAsistida && fmtFecha(confirmAsistida.fecha)}
          </Text>?
        </Text>
        <View style={styles.row}>
          <Button variant="secondary" onPress={() => setConfirmA(null)} style={{ flex: 1 }}>Cancelar</Button>
          <Button loading={cambiando} icon={<UserCheck size={14} color={colors.white} />}
            onPress={() => cambiar({ variables: { id_cita: confirmAsistida?.id_cita, input: { estado: 'ASISTIDA' } } })}
            style={{ flex: 1 }}>
            Confirmar
          </Button>
        </View>
      </Modal>

      <Modal open={!!confirmCancelar} onClose={() => setConfirmC(null)} title="Cancelar cita">
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
          <AlertTriangle size={16} color={colors.danger} />
          <Text style={[styles.modalText, { color: colors.creamDim, flex: 1 }]}>
            Cancelar la cita de{' '}
            <Text style={{ color: colors.cream, fontWeight: '700' }}>
              {confirmCancelar?.estudiante?.usuario?.nombre}
            </Text>.
          </Text>
        </View>
        <View style={styles.row}>
          <Button variant="secondary" onPress={() => setConfirmC(null)} style={{ flex: 1 }}>Mantener</Button>
          <Button variant="danger" loading={cambiando} icon={<XCircle size={14} color={colors.white} />}
            onPress={() => cambiar({ variables: { id_cita: confirmCancelar?.id_cita, input: { estado: 'CANCELADA' } } })}
            style={{ flex: 1 }}>
            Sí, cancelar
          </Button>
        </View>
      </Modal>

      <Modal open={!!sesionCita} onClose={() => setSesionCita(null)} title="Registrar sesión clínica">
        {errSesion && <Alert message={errSesion.message} />}
        <View style={{ gap: 14 }}>
          <View style={[styles.sesionInfo, { backgroundColor: colors.navy }]}>
            <Text style={[styles.sesionNombre, { color: colors.white }]}>{sesionCita?.estudiante?.usuario?.nombre}</Text>
            <Text style={{ fontSize: 13, color: colors.creamDim }}>
              {sesionCita && fmtFecha(sesionCita.fecha)} — {sesionCita?.hora_inicio?.slice(0, 5)}
            </Text>
          </View>
          <Field label="Número de sesión">
            <Input keyboardType="number-pad" value={String(sesionForm.numero_sesion)}
              onChangeText={v => setSesionForm(f => ({ ...f, numero_sesion: parseInt(v) || 1 }))} />
          </Field>
          <Field label="Notas clínicas">
            <Input placeholder="Observaciones..." value={sesionForm.notas}
              onChangeText={v => setSesionForm(f => ({ ...f, notas: v }))}
              multiline numberOfLines={4} style={{ minHeight: 80, textAlignVertical: 'top' }} />
          </Field>
          <Field label="Recomendaciones">
            <Input placeholder="Indicaciones para el paciente..." value={sesionForm.recomendaciones}
              onChangeText={v => setSesionForm(f => ({ ...f, recomendaciones: v }))}
              multiline numberOfLines={3} style={{ minHeight: 60, textAlignVertical: 'top' }} />
          </Field>
          <Button loading={guardando} icon={<PenLine size={16} color={colors.white} />} size="lg"
            onPress={() => registrarSesion({ variables: { input: {
              id_cita: sesionCita?.id_cita,
              numero_sesion: sesionForm.numero_sesion,
              ...(sesionForm.notas.trim() ? { notas: sesionForm.notas } : {}),
              ...(sesionForm.recomendaciones.trim() ? { recomendaciones: sesionForm.recomendaciones } : {}),
            }}})}>
            Guardar sesión
          </Button>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function CitaCard({ cita, onSesion, onAsistida, onCancelar, colors }: any) {
  const fecha = new Date((cita?.fecha ?? '') + 'T12:00:00');
  return (
    <View style={[styles.citaCard, { backgroundColor: colors.navyCard, borderColor: colors.border }]}>
      <View style={styles.citaFecha}>
        <Text style={[styles.citaDia, { color: colors.cream }]}>
          {fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
        </Text>
        <Text style={{ fontSize: 11, color: colors.creamDim }}>{cita?.hora_inicio?.slice(0, 5)}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.white }}>
          {cita?.estudiante?.usuario?.nombre}
        </Text>
        {cita?.estudiante?.carrera && (
          <Text style={{ fontSize: 11, color: colors.creamDim }}>{cita.estudiante.carrera}</Text>
        )}
        {cita?.motivo && (
          <Text style={{ fontSize: 12, color: colors.creamDim, fontStyle: 'italic' }}>"{cita?.motivo}"</Text>
        )}
        <View style={{ alignSelf: 'flex-start' }}>
          <Badge label={LABEL[cita?.estado] ?? cita?.estado}
            variant={ESTADO_BADGE[cita?.estado] ?? 'gray'} />
        </View>
        {cita?.estado === 'PENDIENTE' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            <Button size="sm" icon={<PenLine size={13} color={colors.white} />}
              onPress={onSesion} style={{ flex: 1, minWidth: 80 }}>Sesión</Button>
            <Button variant="secondary" size="sm" icon={<UserCheck size={13} color={colors.white} />}
              onPress={onAsistida} style={{ flex: 1, minWidth: 80 }}>Asistida</Button>
            <Button variant="danger" size="sm" icon={<XCircle size={13} color={colors.white} />}
              onPress={onCancelar} style={{ flex: 1, minWidth: 80 }}>Cancelar</Button>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  citaCard:    { flexDirection: 'row', gap: 12, borderRadius: 12, borderWidth: 1, padding: 14, alignItems: 'flex-start' },
  citaFecha:   { alignItems: 'center', minWidth: 44, gap: 4 },
  citaDia:     { fontSize: 14, fontWeight: '700' },
  modalText:   { fontSize: 14, lineHeight: 22, marginBottom: 16 },
  row:         { flexDirection: 'row', gap: 10, marginTop: 8 },
  sesionInfo:  { borderRadius: 10, padding: 12, gap: 4 },
  sesionNombre:{ fontSize: 15, fontWeight: '700' },
});