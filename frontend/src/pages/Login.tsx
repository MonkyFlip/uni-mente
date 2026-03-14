import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import {
  Brain, ShieldCheck, FileHeart, TrendingUp,
  ArrowRight, Lock, Eye, EyeOff, KeyRound, ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { LOGIN, CAMBIAR_PASSWORD } from '../graphql/operations';
import { Button, Field, Alert, Modal } from '../components/UI';
import styles from './Login.module.css';
import pwdStyles from './CambiarPassword.module.css';

const FEATURES = [
  { icon: ShieldCheck, text: 'Citas con psicólogos certificados' },
  { icon: FileHeart,   text: 'Historial clínico confidencial'    },
  { icon: TrendingUp,  text: 'Seguimiento personalizado'         },
];

// ─── Modal: Cambiar contraseña ────────────────────────────────────
// El código MFA es SIEMPRE obligatorio — evita que cualquiera
// cambie la contraseña de otra persona sin autorización.
function CambiarPasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [correo,     setCorreo]    = useState('');
  const [pwdActual,  setPwdActual] = useState('');
  const [pwdNueva,   setPwdNueva]  = useState('');
  const [codigoMfa,  setCodigoMfa] = useState('');
  const [showAct,    setShowAct]   = useState(false);
  const [showNew,    setShowNew]   = useState(false);
  const [successMsg, setSuccess]   = useState('');

  const [cambiarPassword, { loading, error }] = useMutation(CAMBIAR_PASSWORD, {
    onCompleted: () => {
      setSuccess('Contraseña actualizada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.');
      setTimeout(() => { onClose(); reset(); }, 2800);
    },
  });

  const reset = () => {
    setCorreo(''); setPwdActual(''); setPwdNueva('');
    setCodigoMfa(''); setShowAct(false); setShowNew(false); setSuccess('');
  };

  const handleClose = () => { onClose(); reset(); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (codigoMfa.length !== 6) return;
    cambiarPassword({
      variables: {
        input: {
          password_actual: pwdActual,
          password_nuevo:  pwdNueva,
          codigo_mfa:      codigoMfa,
        },
      },
    });
  };

  const canSubmit = correo.trim() && pwdActual && pwdNueva.length >= 8 && codigoMfa.length === 6;

  return (
    <Modal open={open} onClose={handleClose} title="Cambiar contraseña">
      {successMsg && <Alert message={successMsg} type="success" />}
      {error && !successMsg && (
        <Alert message={error.message.replace('GraphQL error: ', '')} />
      )}

      {/* Aviso de seguridad */}
      <div className={pwdStyles.securityNote}>
        <ShieldAlert size={16} style={{ color: 'var(--teal)', flexShrink: 0 }} />
        <p>
          Por seguridad, el cambio de contraseña <strong>siempre requiere el código MFA</strong> de tu app
          autenticadora (Google Authenticator, Microsoft Authenticator).
          Esto garantiza que solo tú puedes cambiar tu contraseña.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={pwdStyles.form}>
        <Field label="Correo de tu cuenta">
          <input
            type="email"
            placeholder="tu@correo.edu"
            value={correo}
            onChange={e => setCorreo(e.target.value)}
            required
            autoFocus
          />
        </Field>

        <Field label="Contraseña actual">
          <div className={pwdStyles.pwdInput}>
            <input
              type={showAct ? 'text' : 'password'}
              placeholder="Tu contraseña actual"
              value={pwdActual}
              onChange={e => setPwdActual(e.target.value)}
              required
            />
            <button type="button" className={pwdStyles.eyeBtn} onClick={() => setShowAct(v => !v)}>
              {showAct ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>

        <Field label="Nueva contraseña (mínimo 8 caracteres)">
          <div className={pwdStyles.pwdInput}>
            <input
              type={showNew ? 'text' : 'password'}
              placeholder="Nueva contraseña"
              value={pwdNueva}
              onChange={e => setPwdNueva(e.target.value)}
              required
              minLength={8}
            />
            <button type="button" className={pwdStyles.eyeBtn} onClick={() => setShowNew(v => !v)}>
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>

        {/* Código MFA — siempre visible y obligatorio */}
        <Field label="Código MFA (obligatorio)">
          <div className={pwdStyles.mfaBlock}>
            <div className={pwdStyles.mfaLabelRow}>
              <KeyRound size={14} style={{ color: 'var(--teal)' }} />
              <span>Ingresa el código de 6 dígitos de tu app autenticadora</span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={codigoMfa}
              onChange={e => setCodigoMfa(e.target.value.replace(/\D/g, ''))}
              placeholder="1  2  3  4  5  6"
              className={pwdStyles.codeInput}
              required
            />
            {codigoMfa.length > 0 && codigoMfa.length < 6 && (
              <span className={pwdStyles.codeHint}>Ingresa los 6 dígitos completos</span>
            )}
          </div>
        </Field>

        <Button
          type="submit"
          loading={loading}
          size="lg"
          style={{ width: '100%', marginTop: 4 }}
          icon={<Lock size={15} />}
          disabled={!canSubmit}
        >
          Actualizar contraseña
        </Button>
      </form>
    </Modal>
  );
}

// ─── Página de login ──────────────────────────────────────────────
export default function Login() {
  const [correo,       setCorreo]       = useState('');
  const [password,     setPassword]     = useState('');
  const [showPwd,      setShowPwd]      = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const { login }   = useAuth();
  const navigate    = useNavigate();

  const [doLogin, { loading, error }] = useMutation(LOGIN, {
    onCompleted: ({ login: data }) => {
      login({
        token:     data.access_token,
        rol:       data.rol,
        nombre:    data.nombre,
        correo:    data.correo,
        id_perfil: data.id_perfil ?? undefined,
      });
      navigate('/dashboard');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin({ variables: { correo, password } });
  };

  return (
    <div className={styles.page}>
      <div className={styles.bg}>
        <div className={styles.blob1} />
        <div className={styles.blob2} />
        <div className={styles.grid} />
      </div>

      {/* ── Panel izquierdo ───────────────────────────────── */}
      <div className={styles.left}>
        <div className={styles.heroContent}>
          <div className={styles.logoWrap}><Brain size={32} strokeWidth={1.5} /></div>
          <h1 className={styles.heroTitle}>UniMente</h1>
          <p className={styles.heroText}>
            Portal de bienestar psicológico universitario. Conectamos estudiantes con
            profesionales de salud mental.
          </p>
          <div className={styles.features}>
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className={styles.feature}>
                <div className={styles.featureIcon}><Icon size={14} strokeWidth={2} /></div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Panel derecho ─────────────────────────────────── */}
      <div className={styles.right}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Bienvenido de vuelta</h2>
            <p className={styles.formSub}>Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <Alert message={error.message.replace('GraphQL error: ', '')} />}

            <Field label="Correo electrónico">
              <input
                type="email"
                placeholder="correo@universidad.edu"
                value={correo}
                onChange={e => setCorreo(e.target.value)}
                required
              />
            </Field>

            <Field label="Contraseña">
              <div className={styles.pwdWrapper}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPwd(v => !v)}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>

            <Button
              type="submit"
              loading={loading}
              size="lg"
              icon={!loading ? <ArrowRight size={16} /> : undefined}
              style={{ width: '100%', marginTop: 8 }}
            >
              Iniciar sesión
            </Button>
          </form>

          <button
            className={styles.changePwdBtn}
            onClick={() => setShowChangePwd(true)}
          >
            <Lock size={13} />
            Cambiar contraseña
          </button>

          <p className={styles.registerLink}>
            ¿Primera vez? <Link to="/registro">Crea tu cuenta de estudiante</Link>
          </p>
        </div>
      </div>

      <CambiarPasswordModal
        open={showChangePwd}
        onClose={() => setShowChangePwd(false)}
      />
    </div>
  );
}