import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { useAuth } from '../auth/AuthContext';
import { LOGIN } from '../graphql/operations';
import { Button, Field, Alert } from '../components/UI';
import styles from './Login.module.css';

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const [doLogin, { loading, error }] = useMutation(LOGIN, {
    onCompleted: (data) => {
      const { access_token, rol, nombre, correo, id_perfil } = data.login;
      login({ token: access_token, rol, nombre, correo: correo ?? '', id_perfil: id_perfil ?? 0 });
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
      </div>

      <div className={styles.left}>
        <div className={styles.heroContent}>
          <div className={styles.logo}>🧠</div>
          <h1 className={styles.heroTitle}>UniMente</h1>
          <p className={styles.heroText}>
            Portal de bienestar psicológico universitario. Conectamos estudiantes con profesionales de salud mental.
          </p>
          <div className={styles.features}>
            {['Citas con psicólogos certificados', 'Historial clínico confidencial', 'Seguimiento personalizado'].map(f => (
              <div key={f} className={styles.feature}>
                <span className={styles.featureCheck}>✓</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

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
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </Field>

            <Button type="submit" loading={loading} size="lg" style={{ width: '100%', marginTop: 8 }}>
              Iniciar sesión
            </Button>
          </form>

          <p className={styles.registerLink}>
            ¿Primera vez?{' '}
            <Link to="/registro">Crea tu cuenta de estudiante</Link>
          </p>
        </div>
      </div>
    </div>
  );
}