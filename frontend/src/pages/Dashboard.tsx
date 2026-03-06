import { useAuth } from '../auth/AuthContext';
import { Layout } from '../components/Layout';
import { PageHeader, StatCard } from '../components/UI';
import {
  Calendar, CheckCircle, Users, Clock,
  Search, ClipboardList, UserPlus, Lightbulb, ChevronRight, Sparkles,
} from 'lucide-react';
import styles from './Dashboard.module.css';

const TIPS = [
  'Recuerda que buscar ayuda es un acto de valentía.',
  'La salud mental es tan importante como la física.',
  'Un paso a la vez. Estamos aquí para apoyarte.',
];

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
          <div className={`${styles.statsGrid} stagger`}>
            <StatCard icon={<Calendar size={22} />}     label="Citas pendientes"     value="—" />
            <StatCard icon={<CheckCircle size={22} />}  label="Sesiones completadas" value="—" />
            <StatCard icon={<Users size={22} />}        label="Psicólogos disponibles" value="—" />
          </div>
          <div className={styles.quickActions}>
            <h3 className={styles.sectionTitle}>Acciones rápidas</h3>
            <div className={`${styles.actionsGrid} stagger`}>
              <ActionCard href="/psicologos" icon={<Search size={22} />}      title="Buscar psicólogo" desc="Explora los psicólogos disponibles y sus horarios" />
              <ActionCard href="/mis-citas"  icon={<ClipboardList size={22} />} title="Ver mis citas"    desc="Consulta y gestiona tus citas programadas" />
            </div>
          </div>
        </>
      )}

      {user?.rol === 'psicologo' && (
        <>
          <div className={`${styles.statsGrid} stagger`}>
            <StatCard icon={<Calendar size={22} />} label="Citas hoy"        value="—" />
            <StatCard icon={<Clock size={22} />}    label="Pendientes"       value="—" />
            <StatCard icon={<Users size={22} />}    label="Pacientes totales" value="—" />
          </div>
          <div className={styles.quickActions}>
            <h3 className={styles.sectionTitle}>Acciones rápidas</h3>
            <div className={`${styles.actionsGrid} stagger`}>
              <ActionCard href="/agenda"   icon={<Calendar size={22} />} title="Ver mi agenda"      desc="Revisa todas tus citas programadas" />
              <ActionCard href="/horarios" icon={<Clock size={22} />}    title="Gestionar horarios" desc="Define tus días y horas disponibles" />
            </div>
          </div>
        </>
      )}

      {user?.rol === 'administrador' && (
        <>
          <div className={`${styles.statsGrid} stagger`}>
            <StatCard icon={<Users size={22} />}    label="Psicólogos activos"      value="—" />
            <StatCard icon={<Users size={22} />}    label="Estudiantes registrados"  value="—" />
            <StatCard icon={<Calendar size={22} />} label="Citas totales"            value="—" />
          </div>
          <div className={styles.quickActions}>
            <h3 className={styles.sectionTitle}>Administración</h3>
            <div className={`${styles.actionsGrid} stagger`}>
              <ActionCard href="/admin/psicologos"    icon={<Users size={22} />}    title="Ver psicólogos"      desc="Consulta todos los psicólogos registrados" />
              <ActionCard href="/registrar-psicologo" icon={<UserPlus size={22} />} title="Nuevo psicólogo"     desc="Añade un nuevo profesional al sistema" />
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}

function ActionCard({ href, icon, title, desc }: { href: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <a href={href} className={styles.actionCard}>
      <div className={styles.actionIcon}>{icon}</div>
      <div className={styles.actionText}>
        <div className={styles.actionTitle}>{title}</div>
        <div className={styles.actionDesc}>{desc}</div>
      </div>
      <ChevronRight size={18} className={styles.actionArrow} />
    </a>
  );
}
