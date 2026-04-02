import { useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useQuery, useMutation } from '@apollo/client';
import { Layout } from '../../components/Layout';
import { PageHeader, Badge, Button, EmptyState, Spinner } from '../../components/UI';
import {
  GET_ESTUDIANTES, GET_MIS_CITAS, GET_CITAS_ESTUDIANTE, CAMBIAR_ESTADO_CITA,
} from '../../graphql/operations';
import styles from './MisCitas.module.css';

const ESTADO_BADGE: Record<string, 'yellow' | 'green' | 'red'> = {
  PENDIENTE: 'yellow', pendiente: 'yellow',
  ASISTIDA:  'green',  asistida:  'green',
  CANCELADA: 'red',    cancelada: 'red',
};

export default function MisCitas() {
  const { user } = useAuth();

  // Primary: use JWT-resolved query (no id needed)
  const { data: misCitasData, loading: l1, refetch } = useQuery(GET_MIS_CITAS, {
    fetchPolicy: 'cache-and-network',
  });

  // Fallback: if id_perfil available, also try explicit query
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
  const citas   = misCitasData?.misCitas ?? explicitData?.citasEstudiante ?? [];

  function fmtFecha(f: string) {
    return new Date(f + 'T12:00:00').toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short',
    });
  }

  return (
    <Layout>
      <PageHeader title="Mis Citas" subtitle="Historial y citas programadas" />

      {loading && <div style={{ textAlign: 'center', padding: 60 }}><Spinner size={36} /></div>}

      {!loading && citas.length === 0 && (
        <EmptyState
          icon="📅"
          title="Sin citas registradas"
          description="Ve a la sección Psicólogos para agendar tu primera cita."
        />
      )}

      <div className={styles.list}>
        {citas.map((cita: any) => (
          <div key={cita.id_cita} className={styles.citaCard}>
            <div className={styles.citaLeft}>
              <div className={styles.citaFecha}>
                <span className={styles.citaDia}>{fmtFecha(cita.fecha)}</span>
                <span className={styles.citaHora}>{cita.hora_inicio?.slice(0,5)}</span>
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
                <Button
                  variant="danger"
                  size="sm"
                  loading={cancelando}
                  onClick={() => cancelar({ variables: { id_cita: cita.id_cita, input: { estado: 'CANCELADA' } } })}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}