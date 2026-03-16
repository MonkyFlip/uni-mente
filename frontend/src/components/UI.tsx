import { useState } from 'react';
import type { ReactNode } from 'react';
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

// ── Pagination ───────────────────────────────────────────────────────────────
interface PaginationProps {
  total:    number;
  page:     number;
  pageSize: number;
  onChange: (page: number) => void;
}

export function Pagination({ total, page, pageSize, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  // Build page window: always show first, last, current ± 1, with ellipsis
  const pages: (number | '…')[] = [];
  const add = (n: number) => { if (!pages.includes(n)) pages.push(n); };

  add(1);
  if (page > 3) pages.push('…');
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) add(i);
  if (page < totalPages - 2) pages.push('…');
  if (totalPages > 1) add(totalPages);

  return (
    <div className={styles.pagination}>
      <span className={styles.paginationInfo}>
        {from}–{to} de {total}
      </span>
      <div className={styles.paginationPages}>
        <button
          className={styles.pageBtn}
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="Página anterior"
        >
          ‹
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className={styles.pageEllipsis}>…</span>
          ) : (
            <button
              key={p}
              className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
              onClick={() => onChange(p as number)}
            >
              {p}
            </button>
          )
        )}
        <button
          className={styles.pageBtn}
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Página siguiente"
        >
          ›
        </button>
      </div>
    </div>
  );
}

// ── usePagination hook ───────────────────────────────────────────────────────
export function usePagination<T>(items: T[], pageSize = 9) {
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever the list changes (e.g. after a search filter)
  const total    = items.length;
  const safePage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));

  const slice = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  const changePage = (p: number) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setPage(p);
  };

  return { page: safePage, setPage: changePage, slice, total, pageSize };
}