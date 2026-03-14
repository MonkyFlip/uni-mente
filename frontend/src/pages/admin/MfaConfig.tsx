import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  ShieldCheck, ShieldOff, QrCode, KeyRound, Lock,
  CheckCircle2, Eye, EyeOff, Copy, Check,
} from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader, Card, Button, Alert, Field, Modal } from '../../components/UI';
import {
  GET_MFA_ESTADO, SETUP_MFA, HABILITAR_MFA,
  DESHABILITAR_MFA, CAMBIAR_PASSWORD,
} from '../../graphql/operations';
import styles from './MfaConfig.module.css';

export default function MfaConfig() {
  const { data, loading, refetch } = useQuery(GET_MFA_ESTADO, { fetchPolicy: 'network-only' });
  const mfaEnabled: boolean = data?.miEstadoMfa?.mfa_enabled ?? false;

  const [qrData,    setQrData]    = useState<{ qr_code: string; secret: string } | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showDis,   setShowDis]   = useState(false);
  const [showPwd,   setShowPwd]   = useState(false);
  const [codigo,    setCodigo]    = useState('');
  const [codDis,    setCodDis]    = useState('');
  const [copied,    setCopied]    = useState(false);
  const [success,   setSuccess]   = useState('');
  const [showPwdAct, setShowPwdAct] = useState(false);
  const [showPwdNew, setShowPwdNew] = useState(false);
  const [pwdForm, setPwdForm] = useState({
    password_actual: '', password_nuevo: '', codigo_mfa: '',
  });

  const ok = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };

  const [setupMfa, { loading: settingUp, error: errSetup }] = useMutation(SETUP_MFA, {
    onCompleted: (d) => {
      setQrData(d.setupMfa);
      setShowSetup(true);
    },
  });

  const [habilitarMfa, { loading: enabling, error: errEnable }] = useMutation(HABILITAR_MFA, {
    onCompleted: () => {
      ok('MFA activado correctamente. Tu cuenta ahora tiene autenticación de dos factores.');
      setShowSetup(false); setQrData(null); setCodigo(''); refetch();
    },
  });

  const [deshabilitarMfa, { loading: disabling, error: errDis }] = useMutation(DESHABILITAR_MFA, {
    onCompleted: () => {
      ok('MFA desactivado.'); setShowDis(false); setCodDis(''); refetch();
    },
  });

  const [cambiarPassword, { loading: changingPwd, error: errPwd }] = useMutation(CAMBIAR_PASSWORD, {
    onCompleted: () => {
      ok('Contraseña actualizada correctamente.');
      setShowPwd(false);
      setPwdForm({ password_actual: '', password_nuevo: '', codigo_mfa: '' });
    },
  });

  const handleCopySecret = () => {
    if (qrData?.secret) {
      navigator.clipboard.writeText(qrData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleHabilitar = () => {
    if (codigo.length !== 6) return;
    habilitarMfa({ variables: { input: { codigo } } });
  };

  const handleDeshabilitar = () => {
    if (codDis.length !== 6) return;
    deshabilitarMfa({ variables: { input: { codigo: codDis } } });
  };

  const handleCambiarPwd = (e: React.FormEvent) => {
    e.preventDefault();
    const input: any = {
      password_actual: pwdForm.password_actual,
      password_nuevo:  pwdForm.password_nuevo,
    };
    if (mfaEnabled && pwdForm.codigo_mfa.trim()) {
      input.codigo_mfa = pwdForm.codigo_mfa.trim();
    }
    cambiarPassword({ variables: { input } });
  };

  if (loading) return <Layout><div className={styles.loading}>Cargando...</div></Layout>;

  return (
    <Layout>
      <PageHeader
        title="Seguridad"
        subtitle="Autenticación de dos factores y gestión de contraseña"
      />

      {success && <div style={{ marginBottom: 20 }}><Alert message={success} type="success" /></div>}

      {/* ── MFA Status ────────────────────────────────────────── */}
      <div className={styles.grid}>
        <Card className={styles.statusCard}>
          <div className={styles.statusHeader}>
            <div className={`${styles.statusIcon} ${mfaEnabled ? styles.statusIconOn : styles.statusIconOff}`}>
              {mfaEnabled
                ? <ShieldCheck size={28} strokeWidth={1.5} />
                : <ShieldOff   size={28} strokeWidth={1.5} />
              }
            </div>
            <div>
              <div className={styles.statusTitle}>
                Autenticación de dos factores
              </div>
              <div className={`${styles.statusBadge} ${mfaEnabled ? styles.statusBadgeOn : styles.statusBadgeOff}`}>
                {mfaEnabled ? 'Activo' : 'Inactivo'}
              </div>
            </div>
          </div>

          <p className={styles.statusDesc}>
            {mfaEnabled
              ? 'Tu cuenta está protegida. Las operaciones sensibles (respaldos, restauraciones) requerirán un código de 6 dígitos de tu aplicación autenticadora.'
              : 'Al activar MFA, necesitarás un código de tu app de autenticación (Google Authenticator, Microsoft Authenticator) para realizar operaciones sensibles.'
            }
          </p>

          {mfaEnabled ? (
            <Button
              variant="secondary"
              icon={<ShieldOff size={16} />}
              onClick={() => setShowDis(true)}
            >
              Desactivar MFA
            </Button>
          ) : (
            <Button
              variant="primary"
              loading={settingUp}
              icon={<QrCode size={16} />}
              onClick={() => setupMfa()}
            >
              Activar MFA
            </Button>
          )}
          {errSetup && <Alert message={errSetup.message.replace('GraphQL error: ', '')} />}
        </Card>

        {/* ── How it works ─────────────────────────────────── */}
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
            <li>A partir de ese momento, las operaciones de respaldo requerirán el código.</li>
          </ol>
          <div className={styles.apps}>
            <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
               target="_blank" rel="noreferrer" className={styles.appLink}>
              <ShieldCheck size={13} /> Google Authenticator
            </a>
            <a href="https://www.microsoft.com/es-es/security/mobile-authenticator-app"
               target="_blank" rel="noreferrer" className={styles.appLink}>
              <ShieldCheck size={13} /> Microsoft Authenticator
            </a>
          </div>
        </Card>
      </div>

      {/* ── Change Password ───────────────────────────────────── */}
      <Card className={styles.pwdCard} style={{ marginTop: 24 }}>
        <div className={styles.pwdHeader}>
          <Lock size={18} style={{ color: 'var(--teal)' }} />
          <span>Cambiar contraseña</span>
        </div>
        {errPwd && <Alert message={errPwd.message.replace('GraphQL error: ', '')} />}
        <form onSubmit={handleCambiarPwd} className={styles.pwdForm}>
          <Field label="Contraseña actual">
            <div className={styles.pwdInput}>
              <input
                type={showPwdAct ? 'text' : 'password'}
                value={pwdForm.password_actual}
                onChange={e => setPwdForm(f => ({ ...f, password_actual: e.target.value }))}
                placeholder="Tu contraseña actual"
                required
              />
              <button type="button" className={styles.eyeBtn}
                onClick={() => setShowPwdAct(v => !v)}>
                {showPwdAct ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>
          <Field label="Nueva contraseña (mínimo 8 caracteres)">
            <div className={styles.pwdInput}>
              <input
                type={showPwdNew ? 'text' : 'password'}
                value={pwdForm.password_nuevo}
                onChange={e => setPwdForm(f => ({ ...f, password_nuevo: e.target.value }))}
                placeholder="Nueva contraseña"
                required
                minLength={8}
              />
              <button type="button" className={styles.eyeBtn}
                onClick={() => setShowPwdNew(v => !v)}>
                {showPwdNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>
          {mfaEnabled && (
            <Field label="Código MFA (requerido)">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pwdForm.codigo_mfa}
                onChange={e => setPwdForm(f => ({ ...f, codigo_mfa: e.target.value.replace(/\D/g, '') }))}
                placeholder="123456"
                required={mfaEnabled}
                className={styles.codeInput}
              />
            </Field>
          )}
          <Button type="submit" loading={changingPwd} icon={<Lock size={15} />}>
            Actualizar contraseña
          </Button>
        </form>
      </Card>

      {/* ── Setup Modal ───────────────────────────────────────── */}
      <Modal open={showSetup} onClose={() => { setShowSetup(false); setCodigo(''); }} title="Configurar MFA">
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
            onClick={handleHabilitar}
          >
            Confirmar y activar MFA
          </Button>
        </div>
      </Modal>

      {/* ── Disable Modal ─────────────────────────────────────── */}
      <Modal open={showDis} onClose={() => { setShowDis(false); setCodDis(''); }} title="Desactivar MFA">
        {errDis && <Alert message={errDis.message.replace('GraphQL error: ', '')} />}
        <p style={{ color: 'var(--cream-dim)', fontSize: 14, marginBottom: 16 }}>
          Ingresa un código válido de tu app autenticadora para confirmar que deseas desactivar MFA.
        </p>
        <Field label="Código MFA">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={codDis}
            onChange={e => setCodDis(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className={styles.codeInput}
            autoFocus
          />
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="secondary" onClick={() => setShowDis(false)}>Cancelar</Button>
          <Button
            variant="danger"
            loading={disabling}
            disabled={codDis.length !== 6}
            icon={<ShieldOff size={14} />}
            onClick={handleDeshabilitar}
          >
            Desactivar
          </Button>
        </div>
      </Modal>
    </Layout>
  );
}
