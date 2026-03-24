import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Database, Download, RotateCcw, Settings, Clock, ArrowDownToLine,
  FileText, FileJson, FileSpreadsheet, File,
  Layers, GitBranch, GitCommit, Play,
  CheckCircle2, AlertTriangle, ShieldCheck,
} from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader, Card, Button, Alert, Field, Badge, Modal } from '../../components/UI';
import {
  GET_BACKUPS, GET_BACKUP_CONFIG,
  CREAR_BACKUP, RESTAURAR_BACKUP, CONFIGURAR_BACKUP_AUTO,
} from '../../graphql/operations';
import styles from './Backup.module.css';

const TIPOS    = ['COMPLETO', 'DIFERENCIAL', 'INCREMENTAL'] as const;
const FORMATOS = ['SQL', 'JSON', 'EXCEL', 'CSV'] as const;
const FRECUENCIAS = [1, 6, 12, 24, 48, 72, 168, 336, 720];

const TIPO_ICON: Record<string, React.ReactNode> = {
  COMPLETO:     <Layers    size={14} />,
  DIFERENCIAL:  <GitBranch size={14} />,
  INCREMENTAL:  <GitCommit size={14} />,
};

const FORMATO_ICON: Record<string, React.ReactNode> = {
  SQL:   <FileText        size={13} />,
  JSON:  <FileJson        size={13} />,
  EXCEL: <FileSpreadsheet size={13} />,
  CSV:   <File            size={13} />,
};

const TIPO_DESC: Record<string, string> = {
  COMPLETO:    'Todos los registros de todas las tablas',
  DIFERENCIAL: 'Solo cambios desde el último backup completo',
  INCREMENTAL: 'Solo cambios desde el último backup de cualquier tipo',
};

function fmtDate(d: string | Date) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtKb(kb: number | null) {
  if (!kb) return '—';
  return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

export default function Backup() {
  const { data: dataBackups, loading: lB, refetch: rB } = useQuery(GET_BACKUPS,       { fetchPolicy: 'network-only' });
  const { data: dataConfig,  refetch: rC } = useQuery(GET_BACKUP_CONFIG, { fetchPolicy: 'network-only' });

  const backups: any[] = dataBackups?.listarBackups ?? [];
  const config: any    = dataConfig?.configBackupAutomatico ?? null;

  // ── Selección de tipo y formato ───────────────────────────────
  const [manTipo,    setManTipo]    = useState<string>('COMPLETO');
  const [manFormato, setManFormato] = useState<string>('SQL');

  // ── Modal: confirmar backup con MFA ───────────────────────────
  const [showConfirmBackup, setShowConfirmBackup] = useState(false);
  const [confirmMfa,        setConfirmMfa]        = useState('');
  const [backupError,       setBackupError]       = useState('');

  // ── Modal: configuración automática ──────────────────────────
  const [showAuto,    setShowAuto]    = useState(false);
  const [autoTipo,    setAutoTipo]    = useState<string>(config?.tipo    ?? 'COMPLETO');
  const [autoFormato, setAutoFormato] = useState<string>(config?.formato ?? 'SQL');
  const [autoHoras,   setAutoHoras]   = useState<number>(config?.frecuencia_horas ?? 24);
  const [autoMfa,     setAutoMfa]     = useState('');

  // ── Modal: restaurar ─────────────────────────────────────────
  const [restoreTarget, setRestoreTarget] = useState<any>(null);
  const [restoreMfa,    setRestoreMfa]    = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const ok = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 5000); };

  /**
   * SECURITY — OWASP A03/CWE-79 DOM-based XSS:
   *   El nombre del archivo proviene de un recurso remoto (respuesta de la API).
   *   Si se usara directamente en document.createElement/innerHTML podría
   *   ejecutar código malicioso si el servidor fuera comprometido.
   *
   *   Mitigación aplicada (Defense in depth):
   *   1. sanitizeFilename(): elimina cualquier carácter fuera del patrón seguro
   *      antes de asignarlo a atributos del DOM.
   *   2. Se usa a.download (atributo seguro) en lugar de innerHTML o innerText.
   *   3. Se verifica que el nombre cumpla el patrón de backups del sistema.
   *   4. URL.createObjectURL genera una URL blob local — nunca se inserta
   *      contenido externo directamente en el DOM.
   *
   * OWASP: Output Encoding / Input Validation — A03:2021 Injection
   */
  const sanitizeFilename = (name: string): string => {
    // Allowlist: solo caracteres seguros para nombres de archivo de backup
    // Patrón: backup_TIPO_DD-MM-YYYY_HH-MMam.ext
    const ALLOWED = /^backup_[A-Za-z]+_\d{2}-\d{2}-\d{4}_\d{2}-\d{2}(?:am|pm)\.(sql|json|xlsx|csv)$/i;
    const clean   = name.replace(/[^a-zA-Z0-9_.\-]/g, '');  // eliminar chars peligrosos
    if (!ALLOWED.test(clean)) {
      throw new Error(`Nombre de archivo no permitido: ${clean}`);
    }
    return clean;
  };

  const handleDescargar = async (nombre_archivo: string) => {
    try {
      // ── 1. Sanitizar el nombre antes de usarlo en el DOM ─────────
      const safeFilename = sanitizeFilename(nombre_archivo);

      const token = localStorage.getItem('token');
      const res   = await fetch(
        // encodeURIComponent protege la URL de inyección de segmentos
        `http://localhost:3000/api/backup-download/${encodeURIComponent(safeFilename)}`,
        { headers: { Authorization: token ? `Bearer ${token}` : '' } },
      );
      if (!res.ok) { ok('No se pudo descargar el archivo.'); return; }

      const blob = await res.blob();

      // ── 2. Verificar el Content-Type recibido ─────────────────────
      // Evita que un blob con tipo text/html se abra como página
      const contentType = res.headers.get('content-type') ?? '';
      const ALLOWED_TYPES = ['application/sql', 'application/json',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv', 'application/octet-stream'];
      if (!ALLOWED_TYPES.some(t => contentType.startsWith(t))) {
        ok('Tipo de archivo no permitido.');
        return;
      }

      // ── 3. Inserción segura en el DOM ─────────────────────────────
      // Se usa a.download con el nombre ya sanitizado — nunca innerHTML
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href    = url;
      a.download = safeFilename;          // nombre sanitizado, no el de la red
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);           // liberar la URL blob inmediatamente
    } catch (e: any) {
      ok(`Error al descargar: ${e.message ?? 'Verifica que el servidor esté activo.'}`);
    }
  };

  // ── Mutations ─────────────────────────────────────────────────
  const [crearBackup, { loading: creating }] = useMutation(CREAR_BACKUP, {
    onCompleted: (d) => {
      ok(`Backup creado: ${d.crearBackup.nombre_archivo} (${fmtKb(d.crearBackup.tamanio_kb)})`);
      setShowConfirmBackup(false);
      setConfirmMfa('');
      setBackupError('');
      rB();
    },
    onError: (e) => {
      setBackupError(e.message.replace('GraphQL error: ', ''));
    },
  });

  const [restaurarBackup, { loading: restoring, error: errRestore }] = useMutation(RESTAURAR_BACKUP, {
    onCompleted: () => {
      ok('Base de datos restaurada correctamente.');
      setRestoreTarget(null);
      setRestoreMfa('');
      rB();
    },
  });

  const [configurarAuto, { loading: configuring, error: errConfig }] = useMutation(CONFIGURAR_BACKUP_AUTO, {
    onCompleted: () => {
      ok('Backup automático configurado. Se ejecutó un respaldo inicial de seguridad.');
      setShowAuto(false);
      setAutoMfa('');
      rC();
      rB();
    },
  });

  // ── Handlers ──────────────────────────────────────────────────

  /** El botón de crear abre el modal de confirmación MFA */
  const handleClickCrear = () => {
    setConfirmMfa('');
    setBackupError('');
    setShowConfirmBackup(true);
  };

  /** Confirmación desde el modal — siempre envía codigo_mfa */
  const handleConfirmBackup = () => {
    crearBackup({
      variables: {
        input: {
          tipo:       manTipo,
          formato:    manFormato,
          codigo_mfa: confirmMfa.trim() !== '' ? confirmMfa.trim() : undefined,
        },
      },
    });
  };

  const handleAuto = (e: React.FormEvent) => {
    e.preventDefault();
    configurarAuto({ variables: { input: {
      tipo: autoTipo, formato: autoFormato,
      frecuencia_horas: autoHoras, codigo_mfa: autoMfa,
    }}});
  };

  const handleRestore = () => {
    if (!restoreTarget || restoreMfa.length !== 6) return;
    restaurarBackup({ variables: { input: {
      id_backup: restoreTarget.id_backup, codigo_mfa: restoreMfa,
    }}});
  };

  return (
    <Layout>
      <PageHeader title="Respaldos" subtitle="Gestiona los respaldos de la base de datos" />

      {successMsg && <div style={{ marginBottom: 20 }}><Alert message={successMsg} type="success" /></div>}

      <div className={styles.layout}>

        {/* ── Columna principal ─────────────────────────────── */}
        <div className={styles.mainCol}>

          {/* Formulario de selección */}
          <Card className={styles.formCard}>
            <div className={styles.cardHead}>
              <Database size={16} style={{ color: 'var(--teal)' }} />
              <span>Crear respaldo manual</span>
            </div>

            {/* Tipo */}
            <div className={styles.typeGrid}>
              {TIPOS.map(t => (
                <button
                  key={t} type="button"
                  className={`${styles.typeBtn} ${manTipo === t ? styles.typeBtnActive : ''}`}
                  onClick={() => setManTipo(t)}
                >
                  {TIPO_ICON[t]}
                  <div>
                    <div className={styles.typeName}>{t}</div>
                    <div className={styles.typeDesc}>{TIPO_DESC[t]}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Formato */}
            <div className={styles.formatRow}>
              {FORMATOS.map(f => (
                <button
                  key={f} type="button"
                  className={`${styles.fmtBtn} ${manFormato === f ? styles.fmtBtnActive : ''}`}
                  onClick={() => setManFormato(f)}
                >
                  {FORMATO_ICON[f]}
                  <span>{f}</span>
                </button>
              ))}
            </div>

            {/* Botón — abre modal de confirmación MFA */}
            <div className={styles.createBtn}>
              <Button
                style={{ width: '100%' }}
                icon={<Download size={15} />}
                onClick={handleClickCrear}
              >
                Crear respaldo {manTipo} en {manFormato}
              </Button>
            </div>
          </Card>

          {/* Lista de backups */}
          <Card>
            <div className={styles.cardHead}>
              <Database size={16} style={{ color: 'var(--teal)' }} />
              <span>Respaldos disponibles ({backups.length} / 3)</span>
            </div>

            {lB && <p className={styles.loadingTxt}>Cargando respaldos...</p>}
            {!lB && backups.length === 0 && (
              <div className={styles.emptyBackups}>
                <Database size={32} style={{ color: 'var(--cream-dim)', opacity: 0.4 }} />
                <p>No hay respaldos aún. Crea el primero arriba.</p>
              </div>
            )}

            <div className={styles.backupList}>
              {backups.map((b: any) => (
                <div key={b.id_backup} className={styles.backupItem}>
                  <div className={styles.backupIcon}>{TIPO_ICON[b.tipo]}</div>
                  <div className={styles.backupInfo}>
                    <div className={styles.backupName}>{b.nombre_archivo}</div>
                    <div className={styles.backupMeta}>
                      <Badge label={b.tipo}    variant={b.tipo === 'COMPLETO' ? 'teal' : 'gray'} />
                      <Badge label={b.formato} variant="gray" />
                      <Badge label={b.modo}    variant={b.modo === 'AUTOMATICO' ? 'teal' : 'gray'} />
                      <span className={styles.backupSize}>{fmtKb(b.tamanio_kb)}</span>
                    </div>
                    <div className={styles.backupDate}>{fmtDate(b.created_at)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button
                      variant="secondary" size="sm"
                      icon={<ArrowDownToLine size={13} />}
                      onClick={() => handleDescargar(b.nombre_archivo)}
                      title="Descargar backup"
                    >
                      Descargar
                    </Button>
                    <Button
                      variant="secondary" size="sm"
                      icon={<RotateCcw size={13} />}
                      onClick={() => { setRestoreTarget(b); setRestoreMfa(''); }}
                      title="Restaurar base de datos"
                    >
                      Restaurar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Columna lateral ───────────────────────────────── */}
        <div className={styles.sideCol}>
          <Card className={styles.autoCard}>
            <div className={styles.cardHead}>
              <Settings size={16} style={{ color: 'var(--teal)' }} />
              <span>Respaldo automático</span>
            </div>

            {config ? (
              <div className={styles.configStatus}>
                <div className={styles.configRow}>
                  <CheckCircle2 size={14} style={{ color: 'var(--teal)' }} />
                  <span>Configurado</span>
                </div>
                <div className={styles.configDetail}>Tipo: <strong>{config.tipo}</strong></div>
                <div className={styles.configDetail}>Formato: <strong>{config.formato}</strong></div>
                <div className={styles.configDetail}>Frecuencia: <strong>cada {config.frecuencia_horas}h</strong></div>
                <div className={styles.configDetail}>Último backup: <strong>{fmtDate(config.ultima_ejecucion)}</strong></div>
                <Button
                  size="sm" variant="secondary"
                  icon={<Settings size={13} />}
                  style={{ marginTop: 10, width: '100%' }}
                  onClick={() => {
                    setAutoTipo(config.tipo);
                    setAutoFormato(config.formato);
                    setAutoHoras(config.frecuencia_horas);
                    setShowAuto(true);
                  }}
                >
                  Modificar configuración
                </Button>
              </div>
            ) : (
              <div className={styles.noConfig}>
                <Clock size={32} style={{ color: 'var(--cream-dim)', opacity: 0.4 }} />
                <p>No hay backup automático configurado.</p>
                <Button icon={<Play size={14} />} style={{ width: '100%' }} onClick={() => setShowAuto(true)}>
                  Configurar automático
                </Button>
              </div>
            )}
          </Card>

          <Card className={styles.infoCard}>
            <div className={styles.cardHead}>
              <AlertTriangle size={15} style={{ color: '#f59e0b' }} />
              <span>Información importante</span>
            </div>
            <ul className={styles.infoList}>
              <li>Se mantienen solo los <strong>3 respaldos más recientes</strong>. Los anteriores se eliminan automáticamente.</li>
              <li>La restauración de un respaldo <strong>COMPLETO</strong> borra y reemplaza todos los datos actuales.</li>
              <li>Los respaldos <strong>DIFERENCIAL</strong> e <strong>INCREMENTAL</strong> actualizan solo los registros incluidos.</li>
              <li>Al configurar el automático, se ejecuta un respaldo de seguridad inmediatamente.</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* ══ Modal: Confirmar backup con MFA ══════════════════════ */}
      <Modal
        open={showConfirmBackup}
        onClose={() => { setShowConfirmBackup(false); setConfirmMfa(''); setBackupError(''); }}
        title="Confirmar respaldo"
      >
        {backupError && <Alert message={backupError} />}

        {/* Resumen de lo que se va a crear */}
        <div className={styles.confirmSummary}>
          <div className={styles.confirmRow}>
            <span className={styles.confirmLabel}>Tipo</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {TIPO_ICON[manTipo]}
              <strong style={{ color: 'var(--cream)' }}>{manTipo}</strong>
            </div>
          </div>
          <div className={styles.confirmRow}>
            <span className={styles.confirmLabel}>Formato</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {FORMATO_ICON[manFormato]}
              <strong style={{ color: 'var(--cream)' }}>{manFormato}</strong>
            </div>
          </div>
          <div className={styles.confirmRow}>
            <span className={styles.confirmLabel}>Descripción</span>
            <span style={{ fontSize: 12, color: 'var(--cream-dim)' }}>{TIPO_DESC[manTipo]}</span>
          </div>
        </div>

        {/* Campo MFA */}
        <div className={styles.mfaSection}>
          <div className={styles.mfaLabel}>
            <ShieldCheck size={14} style={{ color: 'var(--teal)' }} />
            <span>Código MFA de verificación</span>
          </div>
          <p className={styles.mfaHint}>
            Ingresa el código de 6 dígitos de tu app autenticadora para autorizar esta operación.
            Este paso es obligatorio — debes tener MFA configurado en tu cuenta.
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            value={confirmMfa}
            onChange={e => { setConfirmMfa(e.target.value.replace(/\D/g, '')); setBackupError(''); }}
            placeholder="123456"
            className={styles.mfaInputLarge}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant="secondary"
            style={{ flex: 1 }}
            onClick={() => { setShowConfirmBackup(false); setConfirmMfa(''); setBackupError(''); }}
          >
            Cancelar
          </Button>
          <Button
            loading={creating}
            disabled={confirmMfa.length !== 6}
            style={{ flex: 2 }}
            icon={<Download size={15} />}
            onClick={handleConfirmBackup}
          >
            Crear respaldo
          </Button>
        </div>
      </Modal>

      {/* ══ Modal: Configurar automático ═════════════════════════ */}
      <Modal open={showAuto} onClose={() => setShowAuto(false)} title="Configurar respaldo automático">
        {errConfig && <Alert message={errConfig.message.replace('GraphQL error: ', '')} />}
        <form onSubmit={handleAuto} className={styles.autoForm}>
          <Field label="Tipo de respaldo">
            <select value={autoTipo} onChange={e => setAutoTipo(e.target.value)}>
              {TIPOS.map(t => <option key={t} value={t}>{t} — {TIPO_DESC[t]}</option>)}
            </select>
          </Field>
          <Field label="Formato">
            <select value={autoFormato} onChange={e => setAutoFormato(e.target.value)}>
              {FORMATOS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Frecuencia">
            <select value={autoHoras} onChange={e => setAutoHoras(Number(e.target.value))}>
              {FRECUENCIAS.map(h => (
                <option key={h} value={h}>
                  {h < 24 ? `Cada ${h}h` : h === 24 ? 'Diario (24h)' : h === 168 ? 'Semanal (7 días)' : h === 720 ? 'Mensual (30 días)' : `Cada ${h}h`}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Código MFA (requerido para confirmar)">
            <input
              type="text" inputMode="numeric" maxLength={6} required
              value={autoMfa}
              onChange={e => setAutoMfa(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className={styles.mfaInput}
            />
          </Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowAuto(false)}>Cancelar</Button>
            <Button type="submit" loading={configuring} style={{ flex: 2 }} icon={<Play size={14} />}
              disabled={autoMfa.length < 6}>
              Guardar y ejecutar backup inicial
            </Button>
          </div>
        </form>
      </Modal>

      {/* ══ Modal: Restaurar ═════════════════════════════════════ */}
      <Modal
        open={!!restoreTarget}
        onClose={() => { setRestoreTarget(null); setRestoreMfa(''); }}
        title="Restaurar respaldo"
      >
        {errRestore && <Alert message={errRestore.message.replace('GraphQL error: ', '')} />}
        <div className={styles.restoreInfo}>
          <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <div>
            <strong style={{ color: 'var(--cream)' }}>
              {restoreTarget?.tipo === 'COMPLETO'
                ? 'Esta operación reemplazará TODOS los datos actuales.'
                : 'Los registros incluidos en este backup serán actualizados.'}
            </strong>
            <div style={{ marginTop: 4, fontSize: 13, color: 'var(--cream-dim)' }}>
              Archivo: {restoreTarget?.nombre_archivo}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}><Field label="Código MFA (obligatorio)">
          <input
            type="text" inputMode="numeric" maxLength={6} autoFocus
            value={restoreMfa}
            onChange={e => setRestoreMfa(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className={styles.mfaInput}
          />
        </Field></div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="secondary" onClick={() => setRestoreTarget(null)}>Cancelar</Button>
          <Button variant="danger" loading={restoring} disabled={restoreMfa.length !== 6}
            icon={<RotateCcw size={14} />} onClick={handleRestore}>
            Restaurar base de datos
          </Button>
        </div>
      </Modal>
    </Layout>
  );
}