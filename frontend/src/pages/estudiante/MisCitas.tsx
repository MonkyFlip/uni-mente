import { useMemo, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useQuery, useMutation } from '@apollo/client';
import { Layout } from '../../components/Layout';
import { PageHeader, Badge, Button, EmptyState, Spinner, Pagination, usePagination } from '../../components/UI';
import {
  GET_ESTUDIANTES, GET_MIS_CITAS, GET_CITAS_ESTUDIANTE, CAMBIAR_ESTADO_CITA,
} from '../../graphql/operations';
import styles from './MisCitas.module.css';

const ESTADO_BADGE: Record<string, 'yellow' | 'green' | 'red'> = {
  PENDIENTE: 'yellow', pendiente: 'yellow',
  ASISTIDA:  'green',  asistida:  'green',
  CANCELADA: 'red',    cancelada: 'red',
};

type Filtro = 'todos' | 'pendiente' | 'asistida' | 'cancelada';

export default function MisCitas() {
  const { user } = useAuth();
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const { data: misCitasData, loading: l1, refetch } = useQuery(GET_MIS_CITAS, {
    fetchPolicy: 'cache-and-network',
  });

  const { data: allEsts } = useQuery(GET_ESTUDIANTES, {
    skip: !!(user?.id_perfil),
  });
  const idEstudiante: number = useMemo(() => {
    if (user?.id_perfil) return user.id_perfil;
    const found = (allEsts?.estudiantes ?? []).find((e: any) => e.usuario.correo === user?.correo);
    return found?.id_estudiante ?? 0;
  }, [user?.id_perfil, user?.correo, allEsts]);

  const { data: explicitData, loading: l2 } = useQuery(GET_CITAS_ESTUDIANTE, {
    variables: { id_estudiante: idEstudiante },
    skip: !idEstudiante || !!misCitasData,
    fetchPolicy: 'cache-and-network',
  });

  const [cancelar, { loading: cancelando }] = useMutation(CAMBIAR_ESTADO_CITA, {
    onCompleted: () => refetch(),
  });

  const loading = l1 || l2;
  const allCitas: any[] = (misCitasData?.misCitas ?? explicitData?.citasEstudiante ?? [])
    .slice()
    .sort((a: any, b: any) => {
      // Pendientes primero, luego por fecha descendente
      const aFutura = a.estado?.toUpperCase() === 'PENDIENTE';
      const bFutura = b.estado?.toUpperCase() === 'PENDIENTE';
      if (aFutura !== bFutura) return aFutura ? -1 : 1;
      return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
    });

  const counts = {
    todos:     allCitas.length,
    pendiente: allCitas.filter(c => c.estado?.toUpperCase() === 'PENDIENTE').length,
    asistida:  allCitas.filter(c => c.estado?.toUpperCase() === 'ASISTIDA').length,
    cancelada: allCitas.filter(c => c.estado?.toUpperCase() === 'CANCELADA').length,
  };

  const filtered = filtro === 'todos'
    ? allCitas
    : allCitas.filter(c => c.estado?.toUpperCase() === filtro.toUpperCase());

  const { page, setPage, slice: citas, total, pageSize } = usePagination(filtered, 8);

  const FILTROS: { key: Filtro; label: string; variant: string }[] = [
    { key: 'todos',     label: 'Todas',     variant: 'teal'   },
    { key: 'pendiente', label: 'Pendientes', variant: 'yellow' },
    { key: 'asistida',  label: 'Asistidas',  variant: 'green'  },
    { key: 'cancelada', label: 'Canceladas', variant: 'red'    },
  ];

  function fmtFecha(f: string) {
    return new Date(f + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  }

  return (
    <Layout>
      <PageHeader title="Mis Citas" subtitle="Historial y citas programadas" />

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTROS.map(f => (
          <button
            key={f.key}
            onClick={() => { setFiltro(f.key); setPage(1); }}
            style={{
              padding: '7px 16px', borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s',
              fontSize: 13, fontWeight: 600,
              border: `1px solid ${filtro === f.key ? 'var(--teal)' : 'var(--border)'}`,
              background: filtro === f.key ? 'var(--teal-glow)' : 'transparent',
              color: filtro === f.key ? 'var(--teal)' : 'var(--cream-dim)',
            }}
          >
            {f.label}
            <span style={{ marginLeft: 5, opacity: 0.7, fontSize: 11 }}>({counts[f.key]})</span>
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 60 }}><Spinner size={36} /></div>}

      {!loading && citas.length === 0 && (
        <EmptyState icon="📅" title="Sin citas"
          description={filtro === 'todos' ? 'Ve a Psicólogos para agendar tu primera cita.' : `No hay citas ${filtro}s.`} />
      )}

      <div className={styles.list}>
        {citas.map((cita: any) => (
          <div key={cita.id_cita} className={styles.citaCard}>
            <div className={styles.citaLeft}>
              <div className={styles.citaFecha}>
                <span className={styles.citaDia}>{fmtFecha(cita.fecha)}</span>
                <span className={styles.citaHora}>{cita.hora_inicio?.slice(0, 5)}</span>
              </div>
            </div>
            <div className={styles.citaInfo}>
              <div className={styles.citaPsicologo}>{cita.psicologo?.usuario?.nombre}</div>
              {cita.psicologo?.especialidad && (
                <div className={styles.citaEspecialidad}>{cita.psicologo.especialidad}</div>
              )}
              {cita.motivo && <div className={styles.citaMotivo}>"{cita.motivo}"</div>}
            </div>
            <div className={styles.citaRight}>
              <Badge
                label={cita.estado?.charAt(0).toUpperCase() + cita.estado?.slice(1).toLowerCase()}
                variant={ESTADO_BADGE[cita.estado] ?? 'gray'}
              />
              {(cita.estado === 'PENDIENTE' || cita.estado === 'pendiente') && (
                <Button variant="danger" size="sm" loading={cancelando}
                  onClick={() => cancelar({ variables: { id_cita: cita.id_cita, input: { estado: 'CANCELADA' } } })}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Pagination total={total} page={page} pageSize={pageSize} onChange={setPage} />
    </Layout>
  );
}