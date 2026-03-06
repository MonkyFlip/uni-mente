import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { Brain, UserPlus } from 'lucide-react';
import { REGISTRAR_ESTUDIANTE } from '../graphql/operations';
import { Button, Field, Alert } from '../components/UI';
import styles from './Login.module.css';
import regStyles from './Registro.module.css';

/** Convierte cadenas vacías a undefined para no enviar campos opcionales nulos */
function strip<T extends Record<string, any>>(obj: T, optionales: (keyof T)[]): T {
  const out = { ...obj };
  for (const k of optionales) {
    if (out[k] === '' || out[k] === null) out[k] = undefined as any;
  }
  return out;
}

export default function Registro() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: '', correo: '', password: '',
    matricula: '', carrera: '', telefono: '',
  });
  const [success, setSuccess] = useState(false);

  const [registrar, { loading, error }] = useMutation(REGISTRAR_ESTUDIANTE, {
    onCompleted: () => { setSuccess(true); setTimeout(() => navigate('/login'), 2000); },
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = strip(form, ['matricula', 'carrera', 'telefono']);
    registrar({ variables: { input } });
  };

  return (
    <div className={styles.page}>
      <div className={styles.bg}>
        <div className={styles.blob1} />
        <div className={styles.blob2} />
        <div className={styles.grid} />
      </div>

      <div className={styles.left}>
        <div className={styles.heroContent}>
          <div className={styles.logoWrap}><Brain size={32} strokeWidth={1.5} /></div>
          <h1 className={styles.heroTitle}>UniMente</h1>
          <p className={styles.heroText}>
            Crea tu cuenta y accede al servicio de atención psicológica universitaria
            de manera confidencial y segura.
          </p>
        </div>
      </div>

      <div className={styles.right}>
        <div className={`${styles.formCard} ${regStyles.wide}`}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Crear cuenta</h2>
            <p className={styles.formSub}>Registro de estudiante</p>
          </div>

          {success && <Alert message="Cuenta creada exitosamente. Redirigiendo al login..." type="success" />}
          {error   && <Alert message={error.message.replace('GraphQL error: ', '')} />}

          <form onSubmit={handleSubmit} className={regStyles.grid}>
            <Field label="Nombre completo">
              <input placeholder="Ana López" value={form.nombre} onChange={set('nombre')} required />
            </Field>
            <Field label="Correo institucional">
              <input type="email" placeholder="ana@uni.edu" value={form.correo} onChange={set('correo')} required />
            </Field>
            <Field label="Contraseña">
              <input type="password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={set('password')} required minLength={8} />
            </Field>
            <Field label="Teléfono (opcional)">
              <input placeholder="5551234567" value={form.telefono} onChange={set('telefono')} />
            </Field>
            <Field label="Matrícula (opcional)">
              <input placeholder="2021001" value={form.matricula} onChange={set('matricula')} />
            </Field>
            <Field label="Carrera (opcional)">
              <input placeholder="Psicología" value={form.carrera} onChange={set('carrera')} />
            </Field>
            <div className={regStyles.fullRow}>
              <Button type="submit" loading={loading} size="lg" icon={<UserPlus size={16} />} style={{ width: '100%' }}>
                Crear cuenta
              </Button>
            </div>
          </form>

          <p className={styles.registerLink}>
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
