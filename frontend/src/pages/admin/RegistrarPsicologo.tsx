import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { UserPlus } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader, Card, Button, Field, Alert } from '../../components/UI';
import { REGISTRAR_PSICOLOGO } from '../../graphql/operations';
import styles from './RegistrarPsicologo.module.css';

export default function RegistrarPsicologo() {
  const [form, setForm] = useState({ nombre:'', correo:'', password:'', especialidad:'', cedula:'', telefono:'' });
  const [success, setSuccess] = useState('');
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f=>({...f,[k]:e.target.value}));

  const [registrar, { loading, error }] = useMutation(REGISTRAR_PSICOLOGO, {
    onCompleted: (d) => {
      setSuccess(`Psicólogo "${d.registrarPsicologo.usuario.nombre}" registrado exitosamente.`);
      setForm({ nombre:'', correo:'', password:'', especialidad:'', cedula:'', telefono:'' });
    },
  });

  return (
    <Layout>
      <PageHeader title="Registrar Psicólogo" subtitle="Agrega un nuevo profesional de salud mental" />
      <Card className={styles.card}>
        <h3 className={styles.formTitle}>Información del psicólogo</h3>
        {success && <Alert message={success} type="success" />}
        {error   && <Alert message={error.message} />}
        <form onSubmit={e=>{e.preventDefault();setSuccess('');registrar({variables:{input:form}})}} className={styles.grid}>
          <Field label="Nombre completo"><input placeholder="Dr. Carlos Ruiz" value={form.nombre} onChange={set('nombre')} required /></Field>
          <Field label="Correo electrónico"><input type="email" placeholder="carlos@uni.edu" value={form.correo} onChange={set('correo')} required /></Field>
          <Field label="Contraseña temporal"><input type="password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={set('password')} required minLength={8} /></Field>
          <Field label="Cédula profesional"><input placeholder="12345678" value={form.cedula} onChange={set('cedula')} /></Field>
          <Field label="Especialidad"><input placeholder="Ansiedad y depresión" value={form.especialidad} onChange={set('especialidad')} /></Field>
          <Field label="Teléfono"><input placeholder="5559876543" value={form.telefono} onChange={set('telefono')} /></Field>
          <div className={styles.actions}>
            <Button type="submit" loading={loading} size="lg" icon={<UserPlus size={16}/>}>Registrar psicólogo</Button>
          </div>
        </form>
      </Card>
    </Layout>
  );
}
