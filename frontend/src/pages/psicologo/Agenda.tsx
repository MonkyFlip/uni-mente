import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { CalendarCheck, Clock, UserCheck, XCircle, PenLine, Users } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader, Badge, Button, EmptyState, Spinner, Alert, Modal, Field } from '../../components/UI';
import { GET_AGENDA_PSICOLOGO, CAMBIAR_ESTADO_CITA, REGISTRAR_SESION } from '../../graphql/operations';
import styles from './Agenda.module.css';

const ESTADO_BADGE: Record<string, 'yellow'|'green'|'red'> = {
  pendiente: 'yellow', asistida: 'green', cancelada: 'red',
};

export default function Agenda() {
  const idPsicologo = Number(localStorage.getItem('id_psicologo') ?? 0);
  const { data, loading, error, refetch } = useQuery(GET_AGENDA_PSICOLOGO, {
    variables: { id_psicologo: idPsicologo }, skip: !idPsicologo,
  });
  const [selectedCita, setSelectedCita] = useState<any>(null);
  const [sesionForm, setSesionForm] = useState({ notas: '', recomendaciones: '', numero_sesion: 1 });

  const [cambiarEstado] = useMutation(CAMBIAR_ESTADO_CITA, { onCompleted: () => refetch() });
  const [registrarSesion, { loading: guardando, error: errorSesion }] = useMutation(REGISTRAR_SESION, {
    onCompleted: () => { setSelectedCita(null); refetch(); },
  });

  const citas = data?.agendaPsicologo ?? [];
  const pendientes = citas.filter((c: any) => c.estado === 'pendiente');
  const historial  = citas.filter((c: any) => c.estado !== 'pendiente');

  const handleRegistrarSesion = (e: React.FormEvent) => {
    e.preventDefault();
    registrarSesion({ variables: { input: { id_cita: selectedCita.id_cita, ...sesionForm } } });
  };

  return (
    <Layout>
      <PageHeader title="Mi Agenda" subtitle="Gestiona tus citas y registra sesiones" />
      {!idPsicologo && <Alert message="No se encontró tu perfil de psicólogo." />}
      {loading && <div style={{display:'flex',justifyContent:'center',padding:64}}><Spinner size={36} /></div>}
      {error && <Alert message={error.message} />}

      {pendientes.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Próximas citas
            <span className={styles.count}>{pendientes.length}</span>
          </h3>
          <div className={`${styles.list} stagger`}>
            {pendientes.map((cita: any) => (
              <CitaRow key={cita.id_cita} cita={cita}
                onAsistida={() => cambiarEstado({ variables: { id_cita: cita.id_cita, input: { estado: 'asistida' } } })}
                onCancelar={() => cambiarEstado({ variables: { id_cita: cita.id_cita, input: { estado: 'cancelada' } } })}
                onSesion={() => { setSelectedCita(cita); setSesionForm({ notas:'', recomendaciones:'', numero_sesion:1 }); }}
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

      {!loading && citas.length === 0 && idPsicologo && (
        <EmptyState icon={<CalendarCheck size={28} />} title="Sin citas registradas" description="Tus citas aparecerán aquí una vez que los estudiantes las agenden." />
      )}

      <Modal open={!!selectedCita} onClose={() => setSelectedCita(null)} title="Registrar sesión clínica">
        {errorSesion && <Alert message={errorSesion.message} />}
        <form onSubmit={handleRegistrarSesion} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Número de sesión">
            <input type="number" min={1} value={sesionForm.numero_sesion} onChange={e=>setSesionForm(f=>({...f,numero_sesion:+e.target.value}))} required />
          </Field>
          <Field label="Notas clínicas">
            <textarea placeholder="Observaciones de la sesión..." value={sesionForm.notas} onChange={e=>setSesionForm(f=>({...f,notas:e.target.value}))} rows={4} style={{resize:'vertical'}} />
          </Field>
          <Field label="Recomendaciones">
            <textarea placeholder="Indicaciones para el paciente..." value={sesionForm.recomendaciones} onChange={e=>setSesionForm(f=>({...f,recomendaciones:e.target.value}))} rows={3} style={{resize:'vertical'}} />
          </Field>
          <Button type="submit" loading={guardando} size="lg" style={{width:'100%'}} icon={<PenLine size={16} />}>Guardar sesión</Button>
        </form>
      </Modal>
    </Layout>
  );
}

function CitaRow({ cita, onAsistida, onCancelar, onSesion }: any) {
  const fecha = new Date(cita.fecha + 'T00:00:00');
  return (
    <div className={styles.citaCard}>
      <div className={styles.citaFecha}>
        <span className={styles.citaDia}>{fecha.toLocaleDateString('es-MX',{day:'2-digit',month:'short'})}</span>
        <span className={styles.citaHora}>{cita.hora_inicio?.slice(0,5)}</span>
      </div>
      <div className={styles.citaInfo}>
        <div className={styles.citaNombre}>{cita.estudiante?.usuario?.nombre}</div>
        <div className={styles.citaMeta}>{cita.estudiante?.carrera} · {cita.estudiante?.matricula}</div>
        {cita.motivo && <div className={styles.citaMotivo}>"{cita.motivo}"</div>}
      </div>
      <div className={styles.citaActions}>
        <Badge label={cita.estado} variant={ESTADO_BADGE[cita.estado] ?? 'gray'} />
        {cita.estado === 'pendiente' && (
          <>
            <Button variant="primary"   size="sm" icon={<PenLine size={13}/>}    onClick={onSesion}>Sesión</Button>
            <Button variant="secondary" size="sm" icon={<UserCheck size={13}/>}  onClick={onAsistida}>Asistida</Button>
            <Button variant="danger"    size="sm" icon={<XCircle size={13}/>}    onClick={onCancelar}>Cancelar</Button>
          </>
        )}
      </div>
    </div>
  );
}
