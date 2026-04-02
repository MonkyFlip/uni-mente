import React from 'react';
import type { ReactNode } from 'react';
import styles from './UI.module.css';

// ─── Button ──────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}
export function Button({ variant = 'primary', loading, size = 'md', children, disabled, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`${styles.btn} ${styles[`btn_${variant}`]} ${styles[`btn_${size}`]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className={styles.spinner} /> : children}
    </button>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.card} ${className}`}>{children}</div>;
}

// ─── Page Header ─────────────────────────────────────────────────────────────
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

// ─── Badge ───────────────────────────────────────────────────────────────────
type BadgeVariant = 'teal' | 'yellow' | 'green' | 'red' | 'gray';
export function Badge({ label, variant = 'gray' }: { label: string; variant?: BadgeVariant }) {
  return <span className={`${styles.badge} ${styles[`badge_${variant}`]}`}>{label}</span>;
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner({ size = 24 }: { size?: number }) {
  return <span className={styles.spinner} style={{ width: size, height: size }} />;
}

// ─── Empty State ─────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description }: { icon: string; title: string; description?: string }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>{icon}</div>
      <h3 className={styles.emptyTitle}>{title}</h3>
      {description && <p className={styles.emptyDesc}>{description}</p>}
    </div>
  );
}

// ─── Form Field ──────────────────────────────────────────────────────────────
export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      {children}
      {error && <span className={styles.fieldError}>{error}</span>}
    </div>
  );
}

// ─── Alert ───────────────────────────────────────────────────────────────────
export function Alert({ message, type = 'error' }: { message: string; type?: 'error' | 'success' }) {
  return <div className={`${styles.alert} ${styles[`alert_${type}`]}`}>{message}</div>;
}

// ─── Modal ───────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
export function StatCard({ icon, label, value, color = 'teal' }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon} style={{ color: `var(--${color})`, background: `rgba(var(--${color}-rgb, 10,181,168),0.12)` }}>{icon}</div>
      <div>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
      </div>
    </div>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────
export function Pagination({ total, page, pageSize, onChange }: {
  total: number; page: number; pageSize: number; onChange: (p: number) => void;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);

  const nums: (number | '...')[] = [];
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) nums.push(i);
  } else {
    nums.push(1);
    if (page > 3) nums.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) nums.push(i);
    if (page < pages - 2) nums.push('...');
    nums.push(pages);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 20 }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          style={{ minWidth: 32, height: 32, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--cream-dim)', cursor: 'pointer', fontSize: 13, opacity: page <= 1 ? 0.4 : 1 }}>‹</button>
        {nums.map((n, i) =>
          n === '...' ? (
            <span key={`e${i}`} style={{ padding: '0 4px', color: 'var(--cream-dim)', lineHeight: '32px' }}>…</span>
          ) : (
            <button key={n} onClick={() => onChange(n as number)}
              style={{ minWidth: 32, height: 32, borderRadius: 7, border: `1px solid ${n === page ? 'var(--teal)' : 'var(--border)'}`, background: n === page ? 'var(--teal)' : 'transparent', color: n === page ? '#fff' : 'var(--cream-dim)', cursor: 'pointer', fontSize: 13, fontWeight: n === page ? 700 : 400 }}>
              {n}
            </button>
          )
        )}
        <button onClick={() => onChange(page + 1)} disabled={page >= pages}
          style={{ minWidth: 32, height: 32, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--cream-dim)', cursor: 'pointer', fontSize: 13 }}>›</button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--cream-dim)' }}>{start}–{end} de {total}</div>
    </div>
  );
}

// ─── usePagination ───────────────────────────────────────────────────────────
import { useState as _useState, useEffect as _useEffect } from 'react';
export function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = _useState(1);
  const total  = items.length;
  const pages  = Math.max(1, Math.ceil(total / pageSize));
  const safe   = Math.min(page, pages);
  const start  = (safe - 1) * pageSize;
  const slice  = items.slice(start, start + pageSize);

  _useEffect(() => {
    if (page > pages && pages > 0) setPage(pages);
  }, [items.length]);

  const setPageSafe = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return { page: safe, setPage: setPageSafe, slice, total, pageSize };
}