import { useState, useEffect } from 'react';
import {
  ShieldAlert, RotateCcw, Eye, EyeOff, CheckCircle2,
  Database, FileText, FileJson, FileSpreadsheet, File,
  Layers, GitBranch, GitCommit, RefreshCw,
} from 'lucide-react';
import styles from './EmergencyRestore.module.css';

interface BackupInfo {
  id_backup:      number | null;
  nombre_archivo: string;
  tipo:           string;
  formato:        string;
  tamanio_kb:     number;
  modo:           string;
  created_at:     string;
}

const TIPO_ICON: Record<string, React.ReactNode> = {
  COMPLETO:     <Layers    size={16} />,
  DIFERENCIAL:  <GitBranch size={16} />,
  INCREMENTAL:  <GitCommit size={16} />,
};

const FORMATO_ICON: Record<string, React.ReactNode> = {
  SQL:   <FileText        size={14} />,
  JSON:  <FileJson        size={14} />,
  EXCEL: <FileSpreadsheet size={14} />,
  CSV:   <File            size={14} />,
};

const TIPO_COLOR: Record<string, string> = {
  COMPLETO:    'var(--teal)',
  DIFERENCIAL: '#f59e0b',
  INCREMENTAL: '#60a5fa',
};

function fmtDate(d: string | Date) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-MX', {
    hour: '2-digit', minute: '2-digit', hour12: true,
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function fmtKb(kb: number) {
  if (!kb) return '—';
  return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

export default function EmergencyRestore() {
  const [backups,    setBackups]    = useState<BackupInfo[]>([]);
  const [loadingBk,  setLoadingBk]  = useState(true);
  const [selected,   setSelected]   = useState<BackupInfo | null>(null);
  const [secret,     setSecret]     = useState('');
  const [showSec,    setShowSec]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  // Cargar backups disponibles al montar
  const loadBackups = async () => {
    setLoadingBk(true);
    try {
      const res  = await fetch('http://localhost:3000/api/emergency-backups');
      const data = await res.json();
      setBackups(data.backups ?? []);
    } catch {
      setBackups([]);
    } finally {
      setLoadingBk(false);
    }
  };

  useEffect(() => { loadBackups(); }, []);

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) { setError('La clave secreta es obligatoria.'); return; }
    if (!selected)      { setError('Selecciona un backup de la lista.'); return; }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const body: Record<string, any> = selected.id_backup
        ? { id_backup: selected.id_backup }
        : { backup_filename: selected.nombre_archivo };

      const res  = await fetch('http://localhost:3000/api/emergency-restore', {
        method:  'POST',
        headers: {
          'Content-Type':     'application/json',
          'X-Restore-Secret': secret,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Error en la restauración.');
      } else {
        const msg = data.mensaje ?? 'Base de datos restaurada correctamente.';
        setSuccess(msg + ' Redirigiendo al login...');
        setTimeout(() => { window.location.href = '/login'; }, 2500);
      }
    } catch {
      setError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>

        {/* ── Header ──────────────────────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.iconWrap}>
            <ShieldAlert size={26} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className={styles.title}>Restauración de Emergencia</h1>
            <p className={styles.subtitle}>UniMente — Solo cuando la base de datos está vacía</p>
          </div>
        </div>

        <div className={styles.warning}>
          <ShieldAlert size={14} style={{ flexShrink: 0, color: '#f59e0b' }} />
          <p>
            Este panel solo funciona cuando no hay usuarios en la BD.
            Requiere la clave <code>RESTORE_SECRET</code> del archivo <code>.env</code> del servidor.
            Una vez restaurada, usa <strong>/login</strong> con tus credenciales normales.
          </p>
        </div>

        {/* ── Backups disponibles ────────────────────────────── */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <Database size={15} style={{ color: 'var(--teal)' }} />
            <span>Respaldos disponibles</span>
            <button className={styles.refreshBtn} onClick={loadBackups} title="Recargar">
              <RefreshCw size={13} />
            </button>
          </div>

          {loadingBk && (
            <p className={styles.loadingTxt}>Buscando respaldos en Backup/...</p>
          )}

          {!loadingBk && backups.length === 0 && (
            <div className={styles.emptyBackups}>
              <Database size={28} style={{ opacity: 0.3 }} />
              <p>No se encontraron archivos en <code>backend/Backup/</code>.</p>
              <p style={{ fontSize: 11, opacity: 0.6 }}>
                Asegúrate de que el backend esté corriendo y que existan archivos de respaldo.
              </p>
            </div>
          )}

          {!loadingBk && backups.length > 0 && (
            <div className={styles.backupList}>
              {backups.map((b, i) => (
                <button
                  key={b.nombre_archivo}
                  type="button"
                  className={`${styles.backupItem} ${selected?.nombre_archivo === b.nombre_archivo ? styles.backupItemSelected : ''}`}
                  onClick={() => { setSelected(b); setError(''); }}
                >
                  <div className={styles.backupRank}>#{i + 1}</div>

                  <div className={styles.backupIcon} style={{ color: TIPO_COLOR[b.tipo] ?? 'var(--teal)' }}>
                    {TIPO_ICON[b.tipo] ?? <Database size={16} />}
                  </div>

                  <div className={styles.backupInfo}>
                    <div className={styles.backupName}>{b.nombre_archivo}</div>
                    <div className={styles.backupMeta}>
                      <span className={styles.metaTag} style={{ color: TIPO_COLOR[b.tipo] ?? 'var(--teal)' }}>
                        {TIPO_ICON[b.tipo]} {b.tipo}
                      </span>
                      <span className={styles.metaTag}>
                        {FORMATO_ICON[b.formato]} {b.formato}
                      </span>
                      {b.modo !== 'DESCONOCIDO' && (
                        <span className={styles.metaTag}>{b.modo}</span>
                      )}
                      <span className={styles.metaSize}>{fmtKb(b.tamanio_kb)}</span>
                    </div>
                    <div className={styles.backupDate}>{fmtDate(b.created_at)}</div>
                  </div>

                  {selected?.nombre_archivo === b.nombre_archivo && (
                    <CheckCircle2 size={18} className={styles.selectedCheck} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Formulario de restauración ─────────────────────── */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <RotateCcw size={15} style={{ color: 'var(--teal)' }} />
            <span>Confirmar restauración</span>
          </div>

          {error && (
            <div className={styles.alertError}>
              <ShieldAlert size={14} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className={styles.alertSuccess}>
              <CheckCircle2 size={14} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleRestore} className={styles.form}>
            {/* Resumen del backup seleccionado */}
            {selected ? (
              <div className={styles.selectedSummary}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Archivo</span>
                  <code className={styles.summaryVal}>{selected.nombre_archivo}</code>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Tipo</span>
                  <span style={{ color: TIPO_COLOR[selected.tipo], fontWeight: 600 }}>
                    {selected.tipo}
                  </span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Fecha</span>
                  <span>{fmtDate(selected.created_at)}</span>
                </div>
                {selected.tipo === 'COMPLETO' && (
                  <div className={styles.summaryWarning}>
                    Esta restauración reemplazará TODOS los datos actuales de la BD.
                  </div>
                )}
              </div>
            ) : (
              <p className={styles.selectHint}>
                Selecciona un respaldo de la lista de arriba para continuar.
              </p>
            )}

            {/* Clave secreta */}
            <div className={styles.field}>
              <label className={styles.label}>
                <ShieldAlert size={13} />
                Clave secreta de restauración (RESTORE_SECRET del .env)
              </label>
              <div className={styles.pwdInput}>
                <input
                  type={showSec ? 'text' : 'password'}
                  placeholder="Clave del archivo .env del servidor"
                  value={secret}
                  onChange={e => setSecret(e.target.value)}
                  required
                />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowSec(v => !v)}>
                  {showSec ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || !selected || !secret.trim()}
            >
              {loading ? (
                <span>Restaurando...</span>
              ) : (
                <>
                  <RotateCcw size={16} />
                  Restaurar base de datos
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}