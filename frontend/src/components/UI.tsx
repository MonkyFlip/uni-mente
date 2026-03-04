import { ReactNode } from 'react';
import { Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import styles from './UI.module.css';

// ── Button ──────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
}
export function Button({ variant = 'primary', loading, size = 'md', children, disabled, className = '', icon, ...props }: ButtonProps) {
  return (
    <button
      className={`${styles.btn} ${styles[`btn_${variant}`]} ${styles[`btn_${size}`]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading
        ? <Loader2 size={16} className={styles.spinIcon} />
        : icon ? <span className={styles.btnIcon}>{icon}</span> : null
      }
      {children}
    </button>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', hoverable }: { children: ReactNode; className?: string; hoverable?: boolean }) {
  return <div className={`${styles.card} ${hoverable ? styles.cardHoverable : ''} ${className}`}>{children}</div>;
}

// ── Page Header ──────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className={styles.pageHeader}>
      <div>
        <h1 className={styles.pageTitle}>{title}</h1>
        {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────────────────────
type BadgeVariant = 'teal' | 'yellow' | 'green' | 'red' | 'gray';
export function Badge({ label, variant = 'gray' }: { label: string; variant?: BadgeVariant }) {
  return <span className={`${styles.badge} ${styles[`badge_${variant}`]}`}>{label}</span>;
}

// ── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 24 }: { size?: number }) {
  return <Loader2 size={size} className={styles.spinIcon} style={{ color: 'var(--teal)' }} />;
}

// ── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description?: string }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>{icon}</div>
      <h3 className={styles.emptyTitle}>{title}</h3>
      {description && <p className={styles.emptyDesc}>{description}</p>}
    </div>
  );
}

// ── Form Field ───────────────────────────────────────────────────────────────
export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      {children}
      {error && <span className={styles.fieldError}>{error}</span>}
    </div>
  );
}

// ── Alert ────────────────────────────────────────────────────────────────────
export function Alert({ message, type = 'error' }: { message: string; type?: 'error' | 'success' }) {
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div className={`${styles.alert} ${styles[`alert_${type}`]}`}>
      <Icon size={15} style={{ flexShrink: 0 }} />
      <span>{message}</span>
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button className={styles.modalClose} onClick={onClose}><X size={16} /></button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon}>{icon}</div>
      <div>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
      </div>
    </div>
  );
}
