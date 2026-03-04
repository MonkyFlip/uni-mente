import { useQuery, useMutation } from '@apollo/client';
import { CalendarX, Clock, Stethoscope, XCircle } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader, Badge, Button, EmptyState, Spinner, Alert } from '../../components/UI';
import { GET_CITAS_ESTUDIANTE, CAMBIAR_ESTADO_CITA } from '../../graphql/operations';
import styles from './MisCitas.module.css';

const ESTADO_BADGE: Record<string, 'yellow'|'green'|'red'> = {
  pendiente: 'yellow', asistida: 'green', cancelada: 'red',
};

export default function MisCitas() {
  const idEstudiante = Number(localStorage.getItem('id_estudiante') ?? 0);
  const { data, loading, error, refetch } = useQuery(GET_CITAS_ESTUDIANTE, {
    variables: { id_estudiante: idEstudiante }, skip: !idEstudiante,
  });
  const [cancelar, { loading: cancelando }] = useMutation(CAMBIAR_ESTADO_CITA, {
    onCompleted: () => refetch(),
  });

  const citas = data?.citasEstudiante ?? [];

  return (
    <Layout>
      <PageHeader title="Mis Citas" subtitle="Historial y citas programadas" />
      {!idEstudiante && <Alert message="No se encontró tu perfil de estudiante. Contacta al administrador." />}
      {loading && <div style={{display:'flex',justifyContent:'center',padding:64}}><Spinner size={36}/></div>}
      {error   && <Alert message={error.message} />}
      {!loading && citas.length === 0 && idEstudiante && (
        <EmptyState icon={<CalendarX size={28}/>} title="Sin citas registradas" description="Ve a la sección Psicólogos para agendar tu primera cita." />
      )}

      <div className={`${styles.list} stagger`}>
        {citas.map((cita: any) => (
          <div key={cita.id_cita} className={styles.citaCard}>
            <div className={styles.citaFecha}>
              <span className={styles.citaDia}>
                {new Date(cita.fecha+'T00:00:00').toLocaleDateString('es-MX',{day:'2-digit',month:'short'})}
              </span>
              <span className={styles.citaHora}>
                <Clock size={10}/> {cita.hora_inicio?.slice(0,5)}
              </span>
            </div>
            <div className={styles.citaInfo}>
              <div className={styles.citaPsicologo}>{cita.psicologo?.usuario?.nombre}</div>
              {cita.psicologo?.especialidad && (
                <div className={styles.citaEspecialidad}>
                  <Stethoscope size={11}/> {cita.psicologo.especialidad}
                </div>
              )}
              {cita.motivo && <div className={styles.citaMotivo}>"{cita.motivo}"</div>}
            </div>
            <div className={styles.citaRight}>
              <Badge label={cita.estado} variant={ESTADO_BADGE[cita.estado]??'gray'} />
              {cita.estado==='pendiente' && (
                <Button variant="danger" size="sm" loading={cancelando} icon={<XCircle size={13}/>}
                  onClick={()=>cancelar({variables:{id_cita:cita.id_cita,input:{estado:'cancelada'}}})}>
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
