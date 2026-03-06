import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { CalendarCheck, UserCheck, XCircle, PenLine, Search, AlertTriangle } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader, Badge, Button, EmptyState, Spinner, Alert, Modal, Field } from '../../components/UI';
import { GET_AGENDA_PSICOLOGO, CAMBIAR_ESTADO_CITA, REGISTRAR_SESION } from '../../graphql/operations';
import { useAuth } from '../../auth/AuthContext';
import styles from './Agenda.module.css';

const ESTADO_BADGE: Record<string, 'yellow' | 'green' | 'red'> = {
  PENDIENTE: 'yellow', ASISTIDA: 'green', CANCELADA: 'red',
};
const LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente', ASISTIDA: 'Asistida', CANCELADA: 'Cancelada',
};

export default function Agenda() {
  const { user } = useAuth();
  const idPsicologo = user?.id_perfil ?? 0;

  const { data, loading, error, refetch } = useQuery(GET_AGENDA_PSICOLOGO, {
    variables: { id_psicologo: idPsicologo },
    skip: !idPsicologo,
    fetchPolicy: 'network-only',
  });

  const [selectedCita,    setSelectedCita]    = useState<any>(null);
  const [confirmCancelar, setConfirmCancelar] = useState<any>(null);
  const [confirmAsistida, setConfirmAsistida] = useState<any>(null);
  const [sesionForm, setSesionForm] = useState({ notas: '', recomendaciones: '', numero_sesion: 1 });
  const [search, setSearch] = useState('');

  const [cambiarEstado, { loading: cambiando }] = useMutation(CAMBIAR_ESTADO_CITA, {
    onCompleted: () => { setConfirmCancelar(null); setConfirmAsistida(null); refetch(); },
  });
  const [registrarSesion, { loading: guardando, error: errorSesion }] = useMutation(REGISTRAR_SESION, {
    onCompleted: () => { setSelectedCita(null); refetch(); },
  });

  const citas: any[] = data?.agendaPsicologo ?? [];

  const filtradas = citas.filter((c: any) =>
    c.estudiante?.usuario?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    c.motivo?.toLowerCase().includes(search.toLowerCase())
  );

  const pendientes = filtradas.filter((c: any) => c.estado === 'PENDIENTE');
  const historial  = filtradas.filter((c: any) => c.estado !== 'PENDIENTE');

  return (
    <Layout>
      <PageHeader title="Mi Agenda" subtitle="Gestiona tus citas y registra sesiones" />

      {!idPsicologo && <Alert message="No se encontró tu perfil. Vuelve a iniciar sesión." />}
      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size={36} /></div>}
      {error && <Alert message={error.message} />}

      {citas.length > 0 && (
        <div className={styles.searchBar}>
          <Search size={15} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder="Buscar por paciente o motivo..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {pendientes.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Próximas citas <span className={styles.count}>{pendientes.length}</span>
          </h3>
          <div className={`${styles.list} stagger`}>
            {pendientes.map((cita: any) => (
              <CitaRow key={cita.id_cita} cita={cita}
                onSesion={() => { setSelectedCita(cita); setSesionForm({ notas: '', recomendaciones: '', numero_sesion: 1 }); }}
                onAsistida={() => setConfirmAsistida(cita)}
                onCancelar={() => setConfirmCancelar(cita)}
              />
            ))}
          </div>
        </section>
      )}

      {historial.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Historial</h3>
          <div className={`${styles.list} stagger`}>
            {historial.map((cita: any) => <CitaRow key={cita.id_cita} cita={cita} />)}
          </div>
        </section>
      )}

      {!loading && idPsicologo && citas.length === 0 && (
        <EmptyState icon={<CalendarCheck size={28} />} title="Sin citas registradas"
          description="Las citas aparecerán aquí cuando los estudiantes las agenden." />
      )}

      {/* Modal: confirmar asistida */}
      <Modal open={!!confirmAsistida} onClose={() => setConfirmAsistida(null)} title="Confirmar asistencia">
        <p style={{ color: 'var(--cream-dim)', fontSize: 14, lineHeight: 1.6 }}>
          ¿Confirmas que <strong style={{ color: 'var(--cream)' }}>{confirmAsistida?.estudiante?.usuario?.nombre}</strong>{' '}
          asistió el <strong style={{ color: 'var(--cream)' }}>
            {confirmAsistida && new Date(confirmAsistida.fecha + 'T12:00:00').toLocaleDateString('es-MX', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </strong>?
          <span style={{ fontSize: 12, opacity: 0.7, marginTop: 6, display: 'block' }}>
            Para agregar notas clínicas, usa el botón "Sesión".
          </span>
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="secondary" onClick={() => setConfirmAsistida(null)}>Cancelar</Button>
          <Button variant="primary" loading={cambiando} icon={<UserCheck size={14} />}
            onClick={() => cambiarEstado({ variables: { id_cita: confirmAsistida.id_cita, input: { estado: 'ASISTIDA' } } })}>
            Confirmar asistencia
          </Button>
        </div>
      </Modal>

      {/* Modal: confirmar cancelar */}
      <Modal open={!!confirmCancelar} onClose={() => setConfirmCancelar(null)} title="Cancelar cita">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
          <AlertTriangle size={18} style={{ color: '#f87171', flexShrink: 0, marginTop: 2 }} />
          <p style={{ color: 'var(--cream-dim)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            ¿Cancelar la cita de <strong style={{ color: 'var(--cream)' }}>{confirmCancelar?.estudiante?.usuario?.nombre}</strong>{' '}
            del <strong style={{ color: 'var(--cream)' }}>
              {confirmCancelar && new Date(confirmCancelar.fecha + 'T12:00:00').toLocaleDateString('es-MX', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </strong>? Esta acción no se puede deshacer.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => setConfirmCancelar(null)}>Mantener cita</Button>
          <Button variant="danger" loading={cambiando} icon={<XCircle size={14} />}
            onClick={() => cambiarEstado({ variables: { id_cita: confirmCancelar.id_cita, input: { estado: 'CANCELADA' } } })}>
            Sí, cancelar
          </Button>
        </div>
      </Modal>

      {/* Modal: registrar sesión */}
      <Modal open={!!selectedCita} onClose={() => setSelectedCita(null)} title="Registrar sesión clínica">
        {errorSesion && <Alert message={errorSesion.message} />}
        <div className={styles.sesionInfo}>
          <strong>{selectedCita?.estudiante?.usuario?.nombre}</strong>
          <span>
            {selectedCita?.fecha && new Date(selectedCita.fecha + 'T12:00:00').toLocaleDateString('es-MX', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}{' '}· {selectedCita?.hora_inicio?.slice(0, 5)}
          </span>
        </div>
        <form onSubmit={e => {
          e.preventDefault();
          registrarSesion({ variables: { input: {
            id_cita: selectedCita.id_cita,
            numero_sesion: sesionForm.numero_sesion,
            notas: sesionForm.notas || undefined,
            recomendaciones: sesionForm.recomendaciones || undefined,
          }}});
        }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Número de sesión">
            <input type="number" min={1} value={sesionForm.numero_sesion}
              onChange={e => setSesionForm(f => ({ ...f, numero_sesion: +e.target.value }))} required />
          </Field>
          <Field label="Notas clínicas">
            <textarea placeholder="Observaciones de la sesión..." value={sesionForm.notas}
              onChange={e => setSesionForm(f => ({ ...f, notas: e.target.value }))}
              rows={4} style={{ resize: 'vertical' }} />
          </Field>
          <Field label="Recomendaciones">
            <textarea placeholder="Indicaciones para el paciente..." value={sesionForm.recomendaciones}
              onChange={e => setSesionForm(f => ({ ...f, recomendaciones: e.target.value }))}
              rows={3} style={{ resize: 'vertical' }} />
          </Field>
          <Button type="submit" loading={guardando} size="lg" style={{ width: '100%' }} icon={<PenLine size={16} />}>
            Guardar sesión
          </Button>
        </form>
      </Modal>
    </Layout>
  );
}

function CitaRow({ cita, onAsistida, onCancelar, onSesion }: any) {
  const fecha = new Date(cita.fecha + 'T12:00:00');
  return (
    <div className={styles.citaCard}>
      <div className={styles.citaFecha}>
        <span className={styles.citaDia}>{fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</span>
        <span className={styles.citaHora}>{cita.hora_inicio?.slice(0, 5)}</span>
      </div>
      <div className={styles.citaInfo}>
        <div className={styles.citaNombre}>{cita.estudiante?.usuario?.nombre}</div>
        {(cita.estudiante?.carrera || cita.estudiante?.matricula) && (
          <div className={styles.citaMeta}>
            {[cita.estudiante?.carrera, cita.estudiante?.matricula].filter(Boolean).join(' · ')}
          </div>
        )}
        {cita.motivo && <div className={styles.citaMotivo}>"{cita.motivo}"</div>}
      </div>
      <div className={styles.citaActions}>
        <Badge label={LABEL[cita.estado] ?? cita.estado} variant={ESTADO_BADGE[cita.estado] ?? 'gray'} />
        {cita.estado === 'PENDIENTE' && (
          <>
            <Button variant="primary"   size="sm" icon={<PenLine size={13} />}   onClick={onSesion}>Sesión</Button>
            <Button variant="secondary" size="sm" icon={<UserCheck size={13} />} onClick={onAsistida}>Asistida</Button>
            <Button variant="danger"    size="sm" icon={<XCircle size={13} />}   onClick={onCancelar}>Cancelar</Button>
          </>
        )}
      </div>
    </div>
  );
}
