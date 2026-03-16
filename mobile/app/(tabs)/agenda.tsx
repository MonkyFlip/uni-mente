import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { CalendarCheck, UserCheck, XCircle, PenLine, Search, AlertTriangle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { GET_AGENDA_PSICOLOGO, CAMBIAR_ESTADO_CITA, REGISTRAR_SESION } from '../../graphql/operations';
import { PageHeader, Badge, Button, EmptyState, Spinner, Modal, Field, Input, Alert, SectionHeader, Pagination, usePagination } from '../../components/UI';
import { Colors } from '../../constants/colors';

const ESTADO_BADGE: Record<string, any> = { PENDIENTE: 'yellow', ASISTIDA: 'green', CANCELADA: 'red' };
const LABEL: Record<string, string>      = { PENDIENTE: 'Pendiente', ASISTIDA: 'Asistida', CANCELADA: 'Cancelada' };

export default function Agenda() {
  const { user } = useAuth();
  const idPsi    = user?.id_perfil ?? 0;
  const [search, setSearch]             = useState('');
  const [confirmAsistida, setConfirmA]  = useState<any>(null);
  const [confirmCancelar, setConfirmC]  = useState<any>(null);
  const [sesionCita, setSesionCita]     = useState<any>(null);
  const [sesionForm, setSesionForm]     = useState({ notas: '', recomendaciones: '', numero_sesion: 1 });

  const { data, loading, refetch } = useQuery(GET_AGENDA_PSICOLOGO, {
    variables: { id_psicologo: idPsi },
    skip: !idPsi,
    fetchPolicy: 'cache-and-network',
  });

  useFocusEffect(useCallback(() => { refetch(); }, []));

  const [cambiar, { loading: cambiando }] = useMutation(CAMBIAR_ESTADO_CITA, {
    onCompleted: () => { setConfirmA(null); setConfirmC(null); refetch(); },
  });

  const [registrarSesion, { loading: guardando, error: errSesion }] = useMutation(REGISTRAR_SESION, {
    onCompleted: () => { setSesionCita(null); refetch(); },
  });

  const citas     = data?.agendaPsicologo ?? [];
  const filtradas = citas.filter((c: any) =>
    c.estudiante?.usuario?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    (c.motivo ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const pendientes = [...filtradas.filter((c: any) => c.estado === 'PENDIENTE')].sort(
    (a, b) => new Date(a?.fecha ?? '').getTime() - new Date(b?.fecha ?? '').getTime()
  );
  const historial = [...filtradas.filter((c: any) => c.estado !== 'PENDIENTE')].sort(
    (a, b) => new Date(b?.fecha ?? '').getTime() - new Date(a?.fecha ?? '').getTime()
  );

  const pgPend = usePagination(pendientes, 8);
  const pgHist = usePagination(historial,  10);

  const fmtFecha = (f: string) => new Date(f + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <PageHeader title="Mi Agenda" subtitle={`${citas.length} citas en total`} />

        {citas.length > 0 && (
          <View style={styles.searchBar}>
            <Search size={16} color={Colors.creamDim} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por paciente o motivo..."
              placeholderTextColor={Colors.creamDim}
              value={search} onChangeText={v => { setSearch(v); pgPend.setPage(1); pgHist.setPage(1); }}
            />
          </View>
        )}

        {loading && <Spinner />}

        {pendientes.length > 0 && (
          <>
            <SectionHeader title="Proximas citas" count={pendientes.length} />
            {pgPend.slice.filter(Boolean).map((cita: any) => (
              <CitaCard key={cita?.id_cita} cita={cita}
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
            {pgHist.slice.filter(Boolean).map((cita: any) => <CitaCard key={cita?.id_cita} cita={cita} />)}
            <Pagination total={pgHist.total} page={pgHist.page} totalPages={pgHist.totalPages} pageSize={10} onPage={pgHist.setPage} />
          </>
        )}

        {!loading && citas.length === 0 && (
          <EmptyState icon={<CalendarCheck size={28} color={Colors.creamDim} />}
            title="Sin citas" description="Las citas apareceran aqui cuando los estudiantes las agenden." />
        )}
      </ScrollView>

      {/* Modal confirmar asistida */}
      <Modal open={!!confirmAsistida} onClose={() => setConfirmA(null)} title="Confirmar asistencia">
        <Text style={styles.modalText}>
          Confirmar que <Text style={{ color: Colors.cream, fontWeight: '700' }}>{confirmAsistida?.estudiante?.usuario?.nombre}</Text>{' '}
          asistio el <Text style={{ color: Colors.cream, fontWeight: '700' }}>{confirmAsistida && fmtFecha(confirmAsistida.fecha)}</Text>?
        </Text>
        <View style={styles.row}>
          <Button variant="secondary" onPress={() => setConfirmA(null)} style={{ flex: 1 }}>Cancelar</Button>
          <Button loading={cambiando} icon={<UserCheck size={14} color={Colors.white} />}
            onPress={() => cambiar({ variables: { id_cita: confirmAsistida?.id_cita, input: { estado: 'ASISTIDA' } } })}
            style={{ flex: 1 }}>
            Confirmar
          </Button>
        </View>
      </Modal>

      {/* Modal confirmar cancelar */}
      <Modal open={!!confirmCancelar} onClose={() => setConfirmC(null)} title="Cancelar cita">
        <View style={styles.warningRow}>
          <AlertTriangle size={16} color={Colors.danger} />
          <Text style={[styles.modalText, { flex: 1 }]}>
            Cancelar la cita de <Text style={{ color: Colors.cream, fontWeight: '700' }}>{confirmCancelar?.estudiante?.usuario?.nombre}</Text>.
            Esta accion no se puede deshacer.
          </Text>
        </View>
        <View style={styles.row}>
          <Button variant="secondary" onPress={() => setConfirmC(null)} style={{ flex: 1 }}>Mantener</Button>
          <Button variant="danger" loading={cambiando} icon={<XCircle size={14} color={Colors.white} />}
            onPress={() => cambiar({ variables: { id_cita: confirmCancelar?.id_cita, input: { estado: 'CANCELADA' } } })}
            style={{ flex: 1 }}>
            Si, cancelar
          </Button>
        </View>
      </Modal>

      {/* Modal sesion */}
      <Modal open={!!sesionCita} onClose={() => setSesionCita(null)} title="Registrar sesion clinica">
        {errSesion && <Alert message={errSesion.message} />}
        <View style={{ gap: 14 }}>
          <View style={styles.sesionInfo}>
            <Text style={styles.sesionNombre}>{sesionCita?.estudiante?.usuario?.nombre}</Text>
            <Text style={styles.sesionFecha}>{sesionCita && fmtFecha(sesionCita.fecha)} — {sesionCita?.hora_inicio?.slice(0,5)}</Text>
          </View>
          <Field label="Numero de sesion">
            <Input keyboardType="number-pad" value={String(sesionForm.numero_sesion)}
              onChangeText={v => setSesionForm(f => ({ ...f, numero_sesion: parseInt(v) || 1 }))} />
          </Field>
          <Field label="Notas clinicas">
            <Input placeholder="Observaciones..." value={sesionForm.notas}
              onChangeText={v => setSesionForm(f => ({ ...f, notas: v }))}
              multiline numberOfLines={4} style={{ minHeight: 80, textAlignVertical: 'top' }} />
          </Field>
          <Field label="Recomendaciones">
            <Input placeholder="Indicaciones para el paciente..." value={sesionForm.recomendaciones}
              onChangeText={v => setSesionForm(f => ({ ...f, recomendaciones: v }))}
              multiline numberOfLines={3} style={{ minHeight: 60, textAlignVertical: 'top' }} />
          </Field>
          <Button loading={guardando} icon={<PenLine size={16} color={Colors.white} />} size="lg"
            onPress={() => registrarSesion({ variables: { input: {
              id_cita: sesionCita?.id_cita,
              numero_sesion: sesionForm.numero_sesion,
              ...(sesionForm.notas.trim() ? { notas: sesionForm.notas } : {}),
              ...(sesionForm.recomendaciones.trim() ? { recomendaciones: sesionForm.recomendaciones } : {}),
            }}})}>
            Guardar sesion
          </Button>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function CitaCard({ cita, onSesion, onAsistida, onCancelar }: any) {
  const fecha = new Date((cita?.fecha ?? '') + 'T12:00:00');
  return (
    <View style={styles.citaCard}>
      <View style={styles.citaFecha}>
        <Text style={styles.citaDia}>{fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</Text>
        <Text style={styles.citaHora}>{cita?.hora_inicio?.slice(0,5)}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.citaNombre}>{cita?.estudiante?.usuario?.nombre}</Text>
        {cita?.estudiante?.carrera && <Text style={styles.citaMeta}>{cita.estudiante.carrera}</Text>}
        {cita?.motivo && <Text style={styles.citaMotivo}>"{cita?.motivo}"</Text>}
        <View style={{ alignSelf: 'flex-start' }}>
          <Badge label={LABEL[cita?.estado] ?? cita?.estado} variant={LABEL[cita?.estado] ? (ESTADO_BADGE[cita?.estado] as any) : 'gray'} />
        </View>
        {cita?.estado === 'PENDIENTE' && (
          <View style={styles.actions}>
            <Button size="sm" icon={<PenLine size={13} color={Colors.white} />} onPress={onSesion} style={styles.actionBtn}>Sesion</Button>
            <Button variant="secondary" size="sm" icon={<UserCheck size={13} color={Colors.white} />} onPress={onAsistida} style={styles.actionBtn}>Asistida</Button>
            <Button variant="danger" size="sm" icon={<XCircle size={13} color={Colors.white} />} onPress={onCancelar} style={styles.actionBtnDanger}>Cancelar</Button>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.navy },
  scroll:      { padding: 20, gap: 12, paddingBottom: 40 },
  searchBar:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.navyCard, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.white },
  citaCard:    { flexDirection: 'row', gap: 12, backgroundColor: Colors.navyCard, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 14, alignItems: 'flex-start' },
  citaFecha:   { alignItems: 'center', minWidth: 44, gap: 4 },
  citaDia:     { fontSize: 14, fontWeight: '700', color: Colors.cream },
  citaHora:    { fontSize: 11, color: Colors.creamDim },
  citaNombre:  { fontSize: 14, fontWeight: '600', color: Colors.white },
  citaMeta:    { fontSize: 11, color: Colors.creamDim },
  citaMotivo:  { fontSize: 12, color: Colors.creamDim, fontStyle: 'italic' },
  actions:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  actionBtn:      { flex: 1, minWidth: 80 },
  actionBtnDanger:{ flex: 1, minWidth: 80 },
  modalText:   { fontSize: 14, color: Colors.creamDim, lineHeight: 22, marginBottom: 16 },
  warningRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  row:         { flexDirection: 'row', gap: 10, marginTop: 8 },
  sesionInfo:  { backgroundColor: Colors.navy, borderRadius: 10, padding: 12, gap: 4 },
  sesionNombre:{ fontSize: 15, fontWeight: '700', color: Colors.white },
  sesionFecha: { fontSize: 13, color: Colors.creamDim },
});