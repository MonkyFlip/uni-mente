import { useQuery } from '@apollo/client';
import { useAuth } from '../auth/AuthContext';
import { Layout } from '../components/Layout';
import { PageHeader, StatCard } from '../components/UI';
import {
  Calendar, Users, Clock, CheckCircle2, Hourglass,
  Search, ClipboardList, UserPlus, UserCheck, Database,
} from 'lucide-react';
import {
  GET_PSICOLOGOS, GET_MI_AGENDA, GET_MIS_CITAS,
  GET_MIS_PACIENTES,
  GET_PSICOLOGOS_SLIM, GET_ESTUDIANTES_SLIM,
} from '../graphql/operations';
import styles from './Dashboard.module.css';

const TIPS = [
  'Recuerda que buscar ayuda es un acto de valentía.',
  'La salud mental es tan importante como la física.',
  'Un paso a la vez. Estamos aquí para apoyarte.',
];

function EstudianteStats() {
  const { data: ps } = useQuery(GET_PSICOLOGOS);
  // Use JWT-resolved query — works even if id_perfil is 0
  const { data: cs } = useQuery(GET_MIS_CITAS, { fetchPolicy: 'cache-and-network' });
  const citas       = cs?.misCitas ?? [];
  const pendientes  = citas.filter((c: any) => c.estado?.toUpperCase() === 'PENDIENTE').length;
  const asistidas   = citas.filter((c: any) => c.estado?.toUpperCase() === 'ASISTIDA').length;
  const disponibles = (ps?.psicologos ?? []).filter((p: any) => p.usuario?.activo !== false).length;
  return (
    <div className={styles.statsGrid}>
      <StatCard icon={<Calendar size={22}/>} label="Citas pendientes" value={pendientes} />
      <StatCard icon={<CheckCircle2 size={22}/>} label="Sesiones completadas" value={asistidas} />
      <StatCard icon={<Users size={22}/>} label="Psicólogos disponibles" value={disponibles} />
    </div>
  );
}

function PsicologoStats() {
  // Use JWT-resolved query — works even if id_perfil is 0
  const { data: ag }  = useQuery(GET_MI_AGENDA, { fetchPolicy: 'cache-and-network' });
  const { data: pac } = useQuery(GET_MIS_PACIENTES);
  const citas      = ag?.miAgenda ?? [];
  const hoy        = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
  const citasHoy   = citas.filter((c: any) => c.fecha === hoy && c.estado?.toUpperCase() === 'PENDIENTE').length;
  const pendientes = citas.filter((c: any) => c.estado?.toUpperCase() === 'PENDIENTE').length;
  const pacientes  = (pac?.misPacientes ?? []).length;
  return (
    <div className={styles.statsGrid}>
      <StatCard icon={<Calendar size={22}/>} label="Citas hoy" value={citasHoy} />
      <StatCard icon={<Hourglass size={22}/>} label="Pendientes" value={pendientes} />
      <StatCard icon={<Users size={22}/>} label="Pacientes totales" value={pacientes} />
    </div>
  );
}

function AdminStats() {
  const { data: dp } = useQuery(GET_PSICOLOGOS_SLIM);
  const { data: de } = useQuery(GET_ESTUDIANTES_SLIM);
  const psics  = (dp?.psicologos ?? []).length;
  const ests   = (de?.estudiantes ?? []).length;
  return (
    <div className={styles.statsGrid}>
      <StatCard icon={<UserCheck size={22}/>} label="Psicólogos activos" value={psics} />
      <StatCard icon={<Users size={22}/>} label="Estudiantes registrados" value={ests} />
      <StatCard icon={<Database size={22}/>} label="Respaldos disponibles" value={3} />
    </div>
  );
}

function ActionCard({ href, icon, title, desc }: { href: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <a href={href} className={styles.actionCard}>
      <div className={styles.actionIconWrap}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div className={styles.actionTitle}>{title}</div>
        <div className={styles.actionDesc}>{desc}</div>
      </div>
      <span className={styles.actionArrow}>›</span>
    </a>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const tip = TIPS[new Date().getDay() % TIPS.length];

  return (
    <Layout>
      <PageHeader
        title={`Hola, ${user?.nombre?.split(' ')[0]}`}
        subtitle={`Bienvenido al portal UniMente — ${new Date().toLocaleDateString('es-MX', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        })}`}
      />

      <div className={styles.tip}>
        <span className={styles.tipIcon}><Clock size={16} /></span>
        <p>{tip}</p>
      </div>

      {user?.rol === 'estudiante' && (
        <>
          <EstudianteStats />
          <div className={styles.quickActions}>
            <h3 className={styles.sectionTitle}>Acciones rápidas</h3>
            <div className={styles.actionsGrid}>
              <ActionCard href="/psicologos" icon={<Search size={22} />}      title="Buscar psicólogo" desc="Explora los psicólogos disponibles" />
              <ActionCard href="/mis-citas"  icon={<ClipboardList size={22} />} title="Ver mis citas"  desc="Consulta y gestiona tus citas programadas" />
            </div>
          </div>
        </>
      )}

      {user?.rol === 'psicologo' && (
        <>
          <PsicologoStats />
          <div className={styles.quickActions}>
            <h3 className={styles.sectionTitle}>Acciones rápidas</h3>
            <div className={styles.actionsGrid}>
              <ActionCard href="/agenda"        icon={<Calendar size={22} />}     title="Ver mi agenda"      desc="Revisa todas tus citas programadas" />
              <ActionCard href="/horarios"      icon={<Clock size={22} />}         title="Gestionar horarios" desc="Define tus días y horas disponibles" />
              <ActionCard href="/mis-pacientes" icon={<ClipboardList size={22} />} title="Mis pacientes"      desc="Historial clínico de tus pacientes" />
            </div>
          </div>
        </>
      )}

      {user?.rol === 'administrador' && (
        <>
          <AdminStats />
          <div className={styles.quickActions}>
            <h3 className={styles.sectionTitle}>Administración</h3>
            <div className={styles.actionsGrid}>
              <ActionCard href="/admin/psicologos"  icon={<UserPlus size={22} />}  title="Registrar psicólogo" desc="Añade un nuevo profesional al sistema" />
              <ActionCard href="/admin/psicologos"  icon={<UserCheck size={22} />} title="Ver psicólogos"      desc="Consulta todos los psicólogos registrados" />
              <ActionCard href="/admin/estudiantes" icon={<Users size={22} />}      title="Ver estudiantes"     desc="Gestiona las cuentas de estudiantes" />
              <ActionCard href="/admin/backup"      icon={<Database size={22} />}   title="Respaldos"           desc="Backup y restauración de la base de datos" />
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}