import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Database, Download, RotateCcw, Settings, Clock,
  FileText, FileJson, FileSpreadsheet, File,
  Layers, GitBranch, GitCommit, Play, Trash2,
  CheckCircle2, AlertTriangle,
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
  SQL:   <FileText       size={13} />,
  JSON:  <FileJson       size={13} />,
  EXCEL: <FileSpreadsheet size={13} />,
  CSV:   <File           size={13} />,
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
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function Backup() {
  const { data: dataBackups,  loading: lB, refetch: rB } = useQuery(GET_BACKUPS,        { fetchPolicy: 'network-only' });
  const { data: dataConfig,   loading: lC, refetch: rC } = useQuery(GET_BACKUP_CONFIG,  { fetchPolicy: 'network-only' });

  const backups: any[] = dataBackups?.listarBackups ?? [];
  const config: any    = dataConfig?.configBackupAutomatico ?? null;

  // Manual backup state
  const [manTipo,    setManTipo]    = useState<string>('COMPLETO');
  const [manFormato, setManFormato] = useState<string>('SQL');
  const [manMfa,     setManMfa]     = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Auto config state
  const [autoTipo,    setAutoTipo]    = useState<string>(config?.tipo    ?? 'COMPLETO');
  const [autoFormato, setAutoFormato] = useState<string>(config?.formato ?? 'SQL');
  const [autoHoras,   setAutoHoras]   = useState<number>(config?.frecuencia_horas ?? 24);
  const [autoMfa,     setAutoMfa]     = useState('');
  const [showAuto,    setShowAuto]    = useState(false);

  // Restore state
  const [restoreTarget, setRestoreTarget] = useState<any>(null);
  const [restoreMfa,    setRestoreMfa]    = useState('');

  const ok = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 5000); };

  const [crearBackup, { loading: creating, error: errCreate }] = useMutation(CREAR_BACKUP, {
    onCompleted: (d) => {
      ok(`Backup creado: ${d.crearBackup.nombre_archivo} (${fmtKb(d.crearBackup.tamanio_kb)})`);
      setManMfa(''); rB();
    },
  });

  const [restaurarBackup, { loading: restoring, error: errRestore }] = useMutation(RESTAURAR_BACKUP, {
    onCompleted: () => {
      ok('Base de datos restaurada correctamente.');
      setRestoreTarget(null); setRestoreMfa(''); rB();
    },
  });

  const [configurarAuto, { loading: configuring, error: errConfig }] = useMutation(CONFIGURAR_BACKUP_AUTO, {
    onCompleted: () => {
      ok('Backup automático configurado. Se ejecutó un respaldo inicial de seguridad.');
      setShowAuto(false); setAutoMfa(''); rC(); rB();
    },
  });

  const handleManual = (e: React.FormEvent) => {
    e.preventDefault();
    const input: any = { tipo: manTipo, formato: manFormato };
    if (manMfa.trim()) input.codigo_mfa = manMfa.trim();
    crearBackup({ variables: { input } });
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
      <PageHeader
        title="Respaldos"
        subtitle="Gestiona los respaldos de la base de datos"
      />

      {successMsg && <div style={{ marginBottom: 20 }}><Alert message={successMsg} type="success" /></div>}

      <div className={styles.layout}>

        {/* ── Left: Backups list ─────────────────────────────── */}
        <div className={styles.mainCol}>

          {/* Manual backup form */}
          <Card className={styles.formCard}>
            <div className={styles.cardHead}>
              <Database size={16} style={{ color: 'var(--teal)' }} />
              <span>Crear respaldo manual</span>
            </div>
            {errCreate && <Alert message={errCreate.message.replace('GraphQL error: ', '')} />}

            <form onSubmit={handleManual} className={styles.backupForm}>
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

              <Field label="Código MFA (si está configurado)">
                <input
                  type="text" inputMode="numeric" maxLength={6}
                  value={manMfa}
                  onChange={e => setManMfa(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456 (opcional)"
                  className={styles.mfaInput}
                />
              </Field>

              <Button type="submit" loading={creating} icon={<Download size={15} />}>
                Crear respaldo {manTipo} en {manFormato}
              </Button>
            </form>
          </Card>

          {/* Backups list */}
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
                  <div className={styles.backupIcon}>
                    {TIPO_ICON[b.tipo]}
                  </div>
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
                  <Button
                    variant="secondary" size="sm"
                    icon={<RotateCcw size={13} />}
                    onClick={() => { setRestoreTarget(b); setRestoreMfa(''); }}
                  >
                    Restaurar
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Right: Auto config ─────────────────────────────── */}
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
                <div className={styles.configDetail}>
                  Tipo: <strong>{config.tipo}</strong>
                </div>
                <div className={styles.configDetail}>
                  Formato: <strong>{config.formato}</strong>
                </div>
                <div className={styles.configDetail}>
                  Frecuencia: <strong>cada {config.frecuencia_horas}h</strong>
                </div>
                <div className={styles.configDetail}>
                  Último backup: <strong>{fmtDate(config.ultima_ejecucion)}</strong>
                </div>
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
                <Button
                  icon={<Play size={14} />}
                  style={{ width: '100%' }}
                  onClick={() => setShowAuto(true)}
                >
                  Configurar automático
                </Button>
              </div>
            )}
          </Card>

          {/* Info card */}
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

      {/* ── Auto config modal ──────────────────────────────────── */}
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
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowAuto(false)}>
              Cancelar
            </Button>
            <Button
              type="submit" loading={configuring} style={{ flex: 2 }}
              icon={<Play size={14} />}
              disabled={autoMfa.length < 6}
            >
              Guardar y ejecutar backup inicial
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Restore confirmation modal ─────────────────────────── */}
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
        <Field label="Código MFA para confirmar" style={{ marginTop: 16 }}>
          <input
            type="text" inputMode="numeric" maxLength={6} autoFocus
            value={restoreMfa}
            onChange={e => setRestoreMfa(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className={styles.mfaInput}
          />
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="secondary" onClick={() => setRestoreTarget(null)}>Cancelar</Button>
          <Button
            variant="danger" loading={restoring}
            disabled={restoreMfa.length !== 6}
            icon={<RotateCcw size={14} />}
            onClick={handleRestore}
          >
            Restaurar base de datos
          </Button>
        </div>
      </Modal>
    </Layout>
  );
}
