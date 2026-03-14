import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  ShieldCheck, ShieldOff, QrCode, KeyRound,
  CheckCircle2, Copy, Check,
} from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader, Card, Button, Alert, Field, Modal } from '../../components/UI';
import {
  GET_MFA_ESTADO, SETUP_MFA, HABILITAR_MFA, DESHABILITAR_MFA,
} from '../../graphql/operations';
import styles from './MfaConfig.module.css';

export default function MfaConfig() {
  const { data, loading, refetch } = useQuery(GET_MFA_ESTADO, { fetchPolicy: 'network-only' });
  const mfaEnabled: boolean = data?.miEstadoMfa?.mfa_enabled ?? false;

  const [qrData,    setQrData]    = useState<{ qr_code: string; secret: string } | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showDis,   setShowDis]   = useState(false);
  const [codigo,    setCodigo]    = useState('');
  const [codDis,    setCodDis]    = useState('');
  const [copied,    setCopied]    = useState(false);
  const [success,   setSuccess]   = useState('');

  const ok = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };

  const [setupMfa, { loading: settingUp, error: errSetup }] = useMutation(SETUP_MFA, {
    onCompleted: (d) => { setQrData(d.setupMfa); setShowSetup(true); },
  });

  const [habilitarMfa, { loading: enabling, error: errEnable }] = useMutation(HABILITAR_MFA, {
    onCompleted: () => {
      ok('MFA activado. Tu cuenta ahora tiene autenticación de dos factores.');
      setShowSetup(false); setQrData(null); setCodigo(''); refetch();
    },
  });

  const [deshabilitarMfa, { loading: disabling, error: errDis }] = useMutation(DESHABILITAR_MFA, {
    onCompleted: () => {
      ok('MFA desactivado.'); setShowDis(false); setCodDis(''); refetch();
    },
  });

  const handleCopySecret = () => {
    if (qrData?.secret) {
      navigator.clipboard.writeText(qrData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <Layout><div className={styles.loading}>Cargando...</div></Layout>;

  return (
    <Layout>
      <PageHeader
        title="Seguridad MFA"
        subtitle="Autenticación de dos factores para operaciones sensibles"
      />

      {success && <div style={{ marginBottom: 24 }}><Alert message={success} type="success" /></div>}

      <div className={styles.grid}>

        {/* ── Estado y control ──────────────────────────────── */}
        <Card className={styles.statusCard}>
          <div className={styles.statusHeader}>
            <div className={`${styles.statusIcon} ${mfaEnabled ? styles.statusIconOn : styles.statusIconOff}`}>
              {mfaEnabled
                ? <ShieldCheck size={28} strokeWidth={1.5} />
                : <ShieldOff   size={28} strokeWidth={1.5} />
              }
            </div>
            <div>
              <div className={styles.statusTitle}>Autenticación de dos factores</div>
              <div className={`${styles.statusBadge} ${mfaEnabled ? styles.statusBadgeOn : styles.statusBadgeOff}`}>
                {mfaEnabled ? 'Activo' : 'Inactivo'}
              </div>
            </div>
          </div>

          <p className={styles.statusDesc}>
            {mfaEnabled
              ? 'Tu cuenta está protegida. Las operaciones sensibles como respaldos y restauraciones requerirán un código de 6 dígitos de tu app autenticadora.'
              : 'Al activar MFA, las operaciones críticas (respaldos, restauraciones) requerirán verificación con tu app de autenticación.'
            }
          </p>

          <div className={styles.statusAction}>
            {mfaEnabled ? (
              <Button
                variant="secondary"
                icon={<ShieldOff size={16} />}
                onClick={() => setShowDis(true)}
              >
                Desactivar MFA
              </Button>
            ) : (
              <>
                {errSetup && <Alert message={errSetup.message.replace('GraphQL error: ', '')} />}
                <Button
                  loading={settingUp}
                  icon={<QrCode size={16} />}
                  onClick={() => setupMfa()}
                >
                  Activar MFA
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* ── Cómo funciona ─────────────────────────────────── */}
        <Card className={styles.howCard}>
          <div className={styles.howTitle}>
            <KeyRound size={16} style={{ color: 'var(--teal)' }} />
            ¿Cómo funciona el MFA?
          </div>

          <ol className={styles.howList}>
            <li>Haz clic en <strong>Activar MFA</strong> para generar un código QR.</li>
            <li>Abre <strong>Google Authenticator</strong> o <strong>Microsoft Authenticator</strong> en tu dispositivo.</li>
            <li>Escanea el código QR con la app.</li>
            <li>Ingresa el código de 6 dígitos que genera la app para confirmar.</li>
            <li>A partir de ese momento, los respaldos y restauraciones requerirán el código.</li>
          </ol>

          <div className={styles.apps}>
            <a
              href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
              target="_blank" rel="noreferrer" className={styles.appLink}
            >
              <ShieldCheck size={13} /> Google Authenticator
            </a>
            <a
              href="https://www.microsoft.com/es-es/security/mobile-authenticator-app"
              target="_blank" rel="noreferrer" className={styles.appLink}
            >
              <ShieldCheck size={13} /> Microsoft Authenticator
            </a>
          </div>
        </Card>
      </div>

      {/* ── Nota sobre cambio de contraseña ───────────────────── */}
      <Card className={styles.pwdNoteCard}>
        <div className={styles.pwdNoteTitle}>
          <KeyRound size={15} style={{ color: 'var(--teal)' }} />
          ¿Necesitas cambiar tu contraseña?
        </div>
        <p className={styles.pwdNoteDesc}>
          El cambio de contraseña se realiza desde la pantalla de inicio de sesión.
          Haz clic en <strong>"Cambiar contraseña"</strong> en la página de login.
          Si tienes MFA activo, se te pedirá el código de verificación para confirmar el cambio.
        </p>
      </Card>

      {/* ══ Modal: Setup MFA ══════════════════════════════════════ */}
      <Modal
        open={showSetup}
        onClose={() => { setShowSetup(false); setCodigo(''); }}
        title="Configurar MFA"
      >
        {errEnable && <Alert message={errEnable.message.replace('GraphQL error: ', '')} />}

        <div className={styles.setupSteps}>
          <div className={styles.setupStep}>
            <div className={styles.stepNum}>1</div>
            <span>Escanea este código QR con tu app de autenticación</span>
          </div>

          {qrData && (
            <img src={qrData.qr_code} alt="Código QR MFA" className={styles.qrImg} />
          )}

          <div className={styles.secretRow}>
            <span className={styles.secretLabel}>Código manual:</span>
            <code className={styles.secretCode}>{qrData?.secret}</code>
            <button className={styles.copyBtn} onClick={handleCopySecret} title="Copiar secreto">
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>

          <div className={styles.setupStep}>
            <div className={styles.stepNum}>2</div>
            <span>Ingresa el código de 6 dígitos que genera la app para confirmar</span>
          </div>

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={codigo}
            onChange={e => setCodigo(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className={styles.codeInput}
            autoFocus
          />

          <Button
            loading={enabling}
            disabled={codigo.length !== 6}
            icon={<CheckCircle2 size={16} />}
            style={{ width: '100%', marginTop: 8 }}
            onClick={() => habilitarMfa({ variables: { input: { codigo } } })}
          >
            Confirmar y activar MFA
          </Button>
        </div>
      </Modal>

      {/* ══ Modal: Desactivar MFA ═════════════════════════════════ */}
      <Modal
        open={showDis}
        onClose={() => { setShowDis(false); setCodDis(''); }}
        title="Desactivar MFA"
      >
        {errDis && <Alert message={errDis.message.replace('GraphQL error: ', '')} />}
        <p style={{ color: 'var(--cream-dim)', fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
          Ingresa un código válido de tu app autenticadora para confirmar que deseas desactivar MFA.
        </p>
        <Field label="Código MFA">
          <input
            type="text" inputMode="numeric" maxLength={6} autoFocus
            value={codDis}
            onChange={e => setCodDis(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className={styles.codeInput}
          />
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="secondary" onClick={() => setShowDis(false)}>Cancelar</Button>
          <Button
            variant="danger" loading={disabling} disabled={codDis.length !== 6}
            icon={<ShieldOff size={14} />}
            onClick={() => deshabilitarMfa({ variables: { input: { codigo: codDis } } })}
          >
            Desactivar
          </Button>
        </div>
      </Modal>
    </Layout>
  );
}
