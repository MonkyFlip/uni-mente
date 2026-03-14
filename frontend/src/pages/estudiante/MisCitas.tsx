import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { CalendarX, Clock, Stethoscope, XCircle, Search } from 'lucide-react';
import { Layout } from '../../components/Layout';
import {
  PageHeader, Badge, Button, EmptyState, Spinner,
  Alert, Modal, Pagination, usePagination,
} from '../../components/UI';
import { GET_CITAS_ESTUDIANTE, CAMBIAR_ESTADO_CITA } from '../../graphql/operations';
import { useAuth } from '../../auth/AuthContext';
import styles from './MisCitas.module.css';

const PAGE_SIZE = 10;

const ESTADO_BADGE: Record<string, 'yellow' | 'green' | 'red'> = {
  PENDIENTE: 'yellow', ASISTIDA: 'green', CANCELADA: 'red',
};
const LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente', ASISTIDA: 'Asistida', CANCELADA: 'Cancelada',
};

export default function MisCitas() {
  const { user } = useAuth();
  const idEstudiante = user?.id_perfil ?? 0;

  const { data, loading, error, refetch } = useQuery(GET_CITAS_ESTUDIANTE, {
    variables: { id_estudiante: idEstudiante },
    skip: !idEstudiante,
    fetchPolicy: 'network-only',
  });

  const [cancelTarget,  setCancelTarget]  = useState<any>(null);
  const [search,        setSearch]        = useState('');
  const [filtroEstado,  setFiltroEstado]  = useState('TODOS');

  const [cancelar, { loading: cancelando }] = useMutation(CAMBIAR_ESTADO_CITA, {
    onCompleted: () => { setCancelTarget(null); refetch(); },
  });

  const todas: any[] = data?.citasEstudiante ?? [];

  // Filtrado
  const filtradas = todas.filter((c) => {
    const matchSearch =
      c.psicologo?.usuario?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      (c.motivo ?? '').toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === 'TODOS' || c.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  // Paginación
  const { page, setPage, slice: pagina, total } = usePagination(filtradas, PAGE_SIZE);

  return (
    <Layout>
      <PageHeader
        title="Mis Citas"
        subtitle={`${todas.length} cita${todas.length !== 1 ? 's' : ''} en total`}
      />

      {!idEstudiante && <Alert message="No se encontró tu perfil. Vuelve a iniciar sesión." />}
      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size={36} /></div>}
      {error   && <Alert message={error.message} />}

      {todas.length > 0 && (
        <div className={styles.filters}>
          <div className={styles.searchBar}>
            <Search size={15} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Buscar por psicólogo o motivo..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className={styles.estadoFilters}>
            {[
              { key: 'TODOS',    label: 'Todos'     },
              { key: 'PENDIENTE', label: 'Pendiente' },
              { key: 'ASISTIDA',  label: 'Asistida'  },
              { key: 'CANCELADA', label: 'Cancelada' },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`${styles.filterBtn} ${filtroEstado === key ? styles.filterActive : ''}`}
                onClick={() => { setFiltroEstado(key); setPage(1); }}
              >
                {label}
                {key !== 'TODOS' && (
                  <span className={styles.filterCount}>
                    {todas.filter(c => c.estado === key).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && idEstudiante && todas.length === 0 && (
        <EmptyState icon={<CalendarX size={28} />} title="Sin citas"
          description="Ve a la sección Psicólogos para agendar tu primera cita." />
      )}
      {!loading && idEstudiante && filtradas.length === 0 && todas.length > 0 && (
        <EmptyState icon={<CalendarX size={28} />} title="Sin resultados"
          description="Ninguna cita coincide con el filtro seleccionado." />
      )}

      <div className={`${styles.list} stagger`}>
        {pagina.map((cita: any) => (
          <div key={cita.id_cita} className={styles.citaCard}>
            <div className={styles.citaFecha}>
              <span className={styles.citaDia}>
                {new Date(cita.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
              </span>
              <span className={styles.citaHora}><Clock size={10} /> {cita.hora_inicio?.slice(0, 5)}</span>
            </div>
            <div className={styles.citaInfo}>
              <div className={styles.citaPsicologo}>{cita.psicologo?.usuario?.nombre}</div>
              {cita.psicologo?.especialidad && (
                <div className={styles.citaEspecialidad}>
                  <Stethoscope size={11} /> {cita.psicologo.especialidad}
                </div>
              )}
              {cita.motivo && <div className={styles.citaMotivo}>"{cita.motivo}"</div>}
            </div>
            <div className={styles.citaRight}>
              <Badge label={LABEL[cita.estado] ?? cita.estado} variant={ESTADO_BADGE[cita.estado] ?? 'gray'} />
              {cita.estado === 'PENDIENTE' && (
                <Button variant="danger" size="sm" icon={<XCircle size={13} />}
                  onClick={() => setCancelTarget(cita)}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Pagination total={total} page={page} pageSize={PAGE_SIZE} onChange={setPage} />

      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancelar cita">
        <p style={{ color: 'var(--cream-dim)', fontSize: 14, lineHeight: 1.6 }}>
          ¿Estás seguro de cancelar tu cita del{' '}
          <strong style={{ color: 'var(--cream)' }}>
            {cancelTarget && new Date(cancelTarget.fecha + 'T12:00:00').toLocaleDateString('es-MX', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </strong>{' '}
          con <strong style={{ color: 'var(--cream)' }}>{cancelTarget?.psicologo?.usuario?.nombre}</strong>?
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="secondary" onClick={() => setCancelTarget(null)}>Mantener cita</Button>
          <Button
            variant="danger" loading={cancelando}
            icon={<XCircle size={14} />}
            onClick={() => cancelar({
              variables: { id_cita: cancelTarget.id_cita, input: { estado: 'CANCELADA' } },
            })}
          >
            Sí, cancelar
          </Button>
        </div>
      </Modal>
    </Layout>
  );
}
