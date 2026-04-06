import { useAuth } from '../../auth/AuthContext';
import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Layout } from '../../components/Layout';
import { PageHeader, Badge, Button, EmptyState, Spinner, Alert, Modal, Field, Pagination, usePagination } from '../../components/UI';
import { GET_MI_AGENDA, GET_PSICOLOGOS, GET_AGENDA_PSICOLOGO, CAMBIAR_ESTADO_CITA, REGISTRAR_SESION } from '../../graphql/operations';
import styles from './Agenda.module.css';

const ESTADO_BADGE: Record<string, 'yellow' | 'green' | 'red'> = {
  PENDIENTE: 'yellow', ASISTIDA: 'green', CANCELADA: 'red',
};

export default function Agenda() {
  const { user } = useAuth();

  const { data: miData, loading: l1, refetch } = useQuery(GET_MI_AGENDA, {
    fetchPolicy: 'cache-and-network',
  });

  const { data: allPsics } = useQuery(GET_PSICOLOGOS, {
    skip: !!(user?.id_perfil),
  });

  const idPsicologo: number = useMemo(() => {
    if (user?.id_perfil) return user.id_perfil;
    const found = (allPsics?.psicologos ?? []).find((p: any) => p.usuario.correo === user?.correo);
    return found?.id_psicologo ?? 0;
  }, [user?.id_perfil, user?.correo, allPsics]);

  const { data: explicitData, loading: l2, error } = useQuery(GET_AGENDA_PSICOLOGO, {
    variables: { id_psicologo: idPsicologo },
    skip: !idPsicologo || !!miData,
  });

  const loading = l1 || l2;
  const data = miData ? { agendaPsicologo: miData.miAgenda } : explicitData;

  const [filtro, setFiltro] = useState<'todos' | 'PENDIENTE' | 'ASISTIDA' | 'CANCELADA'>('todos');
  const [selectedCita, setSelectedCita] = useState<any>(null);
  const [sesionForm, setSesionForm] = useState({ notas: '', recomendaciones: '', numero_sesion: 1 });

  const [cambiarEstado] = useMutation(CAMBIAR_ESTADO_CITA, { onCompleted: () => refetch() });
  const [registrarSesion, { loading: guardando, error: errorSesion }] = useMutation(REGISTRAR_SESION, {
    onCompleted: () => { setSelectedCita(null); refetch(); },
  });

  const allCitas: any[] = (data?.agendaPsicologo ?? [])
    .slice()
    .sort((a: any, b: any) => {
      const aPend = a.estado === 'PENDIENTE';
      const bPend = b.estado === 'PENDIENTE';
      if (aPend !== bPend) return aPend ? -1 : 1;
      return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
    });

  const handleRegistrarSesion = (e: React.FormEvent) => {
    e.preventDefault();
    registrarSesion({ variables: { input: { id_cita: selectedCita.id_cita, ...sesionForm } } });
  };

  const FILTROS = [
    { key: 'todos',     label: 'Todos'     },
    { key: 'PENDIENTE', label: 'Pendientes' },
    { key: 'ASISTIDA',  label: 'Asistidas'  },
    { key: 'CANCELADA', label: 'Canceladas' },
  ] as const;

  const filteredCitas = filtro === 'todos'
    ? allCitas
    : allCitas.filter((c: any) => c.estado === filtro);

  const { page, setPage, slice, total, pageSize } = usePagination(filteredCitas, 10);

  return (
    <Layout>
      <PageHeader title="Mi Agenda" subtitle="Gestiona tus citas y registra sesiones" />

      {loading && <div style={{ textAlign: 'center', padding: 60 }}><Spinner size={36} /></div>}
      {error && <Alert message={error.message} />}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTROS.map(({ key, label }) => {
          const count = key === 'todos'
            ? allCitas.length
            : allCitas.filter(c => c.estado === key).length;
          return (
            <button key={key} onClick={() => { setFiltro(key); setPage(1); }}
              style={{
                padding: '7px 16px', borderRadius: 20, cursor: 'pointer',
                transition: 'all 0.15s', fontSize: 13, fontWeight: 600,
                border: `1px solid ${filtro === key ? 'var(--teal)' : 'var(--border)'}`,
                background: filtro === key ? 'var(--teal-glow)' : 'transparent',
                color: filtro === key ? 'var(--teal)' : 'var(--cream-dim)',
              }}>
              {label}
              <span style={{ marginLeft: 5, opacity: .7, fontSize: 11 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {!loading && filteredCitas.length === 0 && (
        <EmptyState
          icon="calendar-x"
          title="Sin citas"
          description={filtro === 'todos' ? 'No tienes citas aún.' : `Sin citas con estado "${filtro.toLowerCase()}".`}
        />
      )}

      <div className={styles.list}>
        {slice.map((cita: any) => (
          <CitaRow key={cita.id_cita} cita={cita}
            onAsistida={cita.estado === 'PENDIENTE'
              ? () => cambiarEstado({ variables: { id_cita: cita.id_cita, input: { estado: 'ASISTIDA' } } })
              : undefined}
            onCancelar={cita.estado === 'PENDIENTE'
              ? () => cambiarEstado({ variables: { id_cita: cita.id_cita, input: { estado: 'CANCELADA' } } })
              : undefined}
            onSesion={cita.estado === 'PENDIENTE'
              ? () => { setSelectedCita(cita); setSesionForm({ notas: '', recomendaciones: '', numero_sesion: 1 }); }
              : undefined}
          />
        ))}
      </div>

      <Pagination total={total} page={page} pageSize={pageSize} onChange={setPage} />

      <Modal open={!!selectedCita} onClose={() => setSelectedCita(null)} title="Registrar sesión clínica">
        {errorSesion && <Alert message={errorSesion.message} />}
        <form onSubmit={handleRegistrarSesion} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
          <Button type="submit" loading={guardando} size="lg" style={{ width: '100%' }}>
            Guardar sesión
          </Button>
        </form>
      </Modal>
    </Layout>
  );
}

function CitaRow({ cita, onAsistida, onCancelar, onSesion }: any) {
  const isPendiente = cita.estado === 'PENDIENTE';
  return (
    <div className={styles.citaCard}>
      <div className={styles.citaFecha}>
        <span className={styles.citaDia}>
          {new Date(cita.fecha + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
        </span>
        <span className={styles.citaHora}>{cita.hora_inicio?.slice(0, 5)}</span>
      </div>

      <div className={styles.citaBody}>
        <div className={styles.citaInfo}>
          <div className={styles.citaNombre}>{cita.estudiante?.usuario?.nombre}</div>
          <div className={styles.citaMeta}>{cita.estudiante?.carrera} · {cita.estudiante?.matricula}</div>
          {cita.motivo && <div className={styles.citaMotivo}>"{cita.motivo}"</div>}
        </div>

        <div className={styles.citaFooter}>
          <Badge label={cita.estado} variant={ESTADO_BADGE[cita.estado] ?? 'gray'} />
          {isPendiente && (
            <div className={styles.citaActions}>
              <Button variant="primary"   size="sm" onClick={onSesion}>  + Sesión  </Button>
              <Button variant="secondary" size="sm" onClick={onAsistida}> Asistida  </Button>
              <Button variant="danger"    size="sm" onClick={onCancelar}> Cancelar  </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}