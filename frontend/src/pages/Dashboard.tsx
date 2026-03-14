import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Layout } from '../components/Layout';
import { PageHeader, StatCard } from '../components/UI';
import {
  Calendar, CheckCircle, Users, Clock,
  Search, ClipboardList, UserPlus, Lightbulb, ChevronRight,
  Database, ShieldCheck,
} from 'lucide-react';
import {
  GET_PSICOLOGOS_SLIM, GET_ESTUDIANTES_SLIM,
  GET_CITAS_ESTUDIANTE, GET_AGENDA_PSICOLOGO,
} from '../graphql/operations';
import styles from './Dashboard.module.css';

const TIPS = [
  'Recuerda que buscar ayuda es un acto de valentía.',
  'La salud mental es tan importante como la física.',
  'Un paso a la vez. Estamos aquí para apoyarte.',
];

// ── Admin stats ───────────────────────────────────────────────────
function AdminStats() {
  const { data: dataPsi,  loading: lPsi  } = useQuery(GET_PSICOLOGOS_SLIM);
  const { data: dataEst,  loading: lEst  } = useQuery(GET_ESTUDIANTES_SLIM);
  const countPsi = dataPsi?.psicologos?.length  ?? null;
  const countEst = dataEst?.estudiantes?.length ?? null;

  return (
    <div className={`${styles.statsGrid} stagger`} data-tour="tour-stats">
      <StatCard icon={<Users    size={22} />} label="Psicólogos activos"     value={lPsi ? '...' : (countPsi ?? '—')} />
      <StatCard icon={<Users    size={22} />} label="Estudiantes registrados" value={lEst ? '...' : (countEst ?? '—')} />
      <StatCard icon={<Calendar size={22} />} label="Módulos activos"         value={3} />
    </div>
  );
}

// ── Psicólogo stats ───────────────────────────────────────────────
function PsicologoStats({ id_psicologo }: { id_psicologo: number }) {
  const { data, loading } = useQuery(GET_AGENDA_PSICOLOGO, {
    variables: { id_psicologo },
    skip: !id_psicologo,
    fetchPolicy: 'network-only',
  });

  const citas      = data?.agendaPsicologo ?? [];
  const hoy        = new Date().toISOString().split('T')[0];
  const citasHoy   = citas.filter((c: any) => c.fecha === hoy).length;
  const pendientes = citas.filter((c: any) => c.estado === 'PENDIENTE').length;
  const pacientes  = new Set(citas.map((c: any) => c.estudiante?.id_estudiante)).size;

  return (
    <div className={`${styles.statsGrid} stagger`} data-tour="tour-stats">
      <StatCard icon={<Calendar    size={22} />} label="Citas hoy"        value={loading ? '...' : citasHoy} />
      <StatCard icon={<Clock       size={22} />} label="Pendientes"       value={loading ? '...' : pendientes} />
      <StatCard icon={<Users       size={22} />} label="Pacientes totales" value={loading ? '...' : pacientes} />
    </div>
  );
}

// ── Estudiante stats ──────────────────────────────────────────────
function EstudianteStats({ id_estudiante }: { id_estudiante: number }) {
  const { data: dataPsi, loading: lPsi } = useQuery(GET_PSICOLOGOS_SLIM);
  const { data, loading } = useQuery(GET_CITAS_ESTUDIANTE, {
    variables: { id_estudiante },
    skip: !id_estudiante,
    fetchPolicy: 'network-only',
  });

  const citas      = data?.citasEstudiante ?? [];
  const pendientes = citas.filter((c: any) => c.estado === 'PENDIENTE').length;
  const asistidas  = citas.filter((c: any) => c.estado === 'ASISTIDA').length;
  const disponibles = dataPsi?.psicologos?.length ?? null;

  return (
    <div className={`${styles.statsGrid} stagger`} data-tour="tour-stats">
      <StatCard icon={<Calendar    size={22} />} label="Citas pendientes"     value={loading ? '...' : pendientes} />
      <StatCard icon={<CheckCircle size={22} />} label="Sesiones completadas" value={loading ? '...' : asistidas} />
      <StatCard icon={<Users       size={22} />} label="Psicólogos disponibles" value={lPsi ? '...' : (disponibles ?? '—')} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const tip = TIPS[new Date().getDay() % TIPS.length];

  return (
    <Layout>
      <PageHeader
        title={`Hola, ${user?.nombre?.split(' ')[0]}`}
        subtitle={`Bienvenido al portal UniMente — ${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
      />

      <div className={styles.tip}>
        <Lightbulb size={18} className={styles.tipIcon} />
        <p>{tip}</p>
      </div>

      {user?.rol === 'estudiante' && (
        <>
          <EstudianteStats id_estudiante={user.id_perfil ?? 0} />
          <div className={styles.quickActions}>
            <h3 className={styles.sectionTitle}>Acciones rápidas</h3>
            <div className={`${styles.actionsGrid} stagger`} data-tour="tour-actions">
              <ActionCard href="/psicologos" icon={<Search      size={22} />} title="Buscar psicólogo" desc="Explora los psicólogos disponibles y sus horarios" />
              <ActionCard href="/mis-citas"  icon={<ClipboardList size={22} />} title="Ver mis citas"   desc="Consulta y gestiona tus citas programadas" />
            </div>
          </div>
        </>
      )}

      {user?.rol === 'psicologo' && (
        <>
          <PsicologoStats id_psicologo={user.id_perfil ?? 0} />
          <div className={styles.quickActions}>
            <h3 className={styles.sectionTitle}>Acciones rápidas</h3>
            <div className={`${styles.actionsGrid} stagger`} data-tour="tour-actions">
              <ActionCard href="/agenda"   icon={<Calendar size={22} />} title="Ver mi agenda"      desc="Revisa todas tus citas programadas" />
              <ActionCard href="/horarios" icon={<Clock    size={22} />} title="Gestionar horarios" desc="Define tus días y horas disponibles" />
            </div>
          </div>
        </>
      )}

      {user?.rol === 'administrador' && (
        <>
          <AdminStats />
          <div className={styles.quickActions}>
            <h3 className={styles.sectionTitle}>Administración</h3>
            <div className={`${styles.actionsGrid} stagger`} data-tour="tour-actions">
              <ActionCard href="/admin/psicologos"    icon={<Users     size={22} />}      title="Ver psicólogos"  desc="Consulta todos los psicólogos registrados" />
              <ActionCard href="/registrar-psicologo" icon={<UserPlus  size={22} />}      title="Nuevo psicólogo" desc="Añade un nuevo profesional al sistema" />
              <ActionCard href="/admin/backup"        icon={<Database  size={22} />}      title="Respaldos"       desc="Gestiona los respaldos de la base de datos" />
              <ActionCard href="/admin/mfa"           icon={<ShieldCheck size={22} />}    title="Seguridad MFA"   desc="Configura la autenticación de dos factores" />
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}

function ActionCard({ href, icon, title, desc }: {
  href: string; icon: React.ReactNode; title: string; desc: string;
}) {
  const navigate = useNavigate();
  return (
    <button className={styles.actionCard} onClick={() => navigate(href)}>
      <div className={styles.actionIcon}>{icon}</div>
      <div className={styles.actionText}>
        <div className={styles.actionTitle}>{title}</div>
        <div className={styles.actionDesc}>{desc}</div>
      </div>
      <ChevronRight size={18} className={styles.actionArrow} />
    </button>
  );
}
