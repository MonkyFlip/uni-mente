import { useAuth } from '../../auth/AuthContext';
import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Layout } from '../../components/Layout';
import { PageHeader, Button, EmptyState, Alert, Field, Card } from '../../components/UI';
import { GET_PSICOLOGOS, CREAR_HORARIO, ELIMINAR_HORARIO } from '../../graphql/operations';
import styles from './Horarios.module.css';

const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado'];

export default function Horarios() {
  const { user } = useAuth();
  const idPsicologo = user?.id_perfil ?? 0;
  const { data, refetch } = useQuery(GET_PSICOLOGOS);
  const [form, setForm] = useState({ dia_semana: 'lunes', hora_inicio: '09:00', hora_fin: '10:00' });
  const [success, setSuccess] = useState('');

  const miPerfil = data?.psicologos?.find((p: any) => p.id_psicologo === idPsicologo);
  const horarios = miPerfil?.horarios ?? [];

  const [crear, { loading: creando, error }] = useMutation(CREAR_HORARIO, {
    onCompleted: () => { setSuccess('Horario creado'); refetch(); setTimeout(() => setSuccess(''), 2000); },
  });
  const [eliminar] = useMutation(ELIMINAR_HORARIO, { onCompleted: () => refetch() });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    crear({ variables: { input: { ...form } } });
  };

  return (
    <Layout>
      <PageHeader title="Mis Horarios" subtitle="Define tu disponibilidad semanal" />

      <div className={styles.layout}>
        <Card className={styles.formCard}>
          <h3 className={styles.formTitle}>Agregar disponibilidad</h3>
          {success && <Alert message={success} type="success" />}
          {error && <Alert message={error.message} />}
          <form onSubmit={handleSubmit} className={styles.form}>
            <Field label="Día de la semana">
              <select value={form.dia_semana} onChange={e => setForm(f => ({ ...f, dia_semana: e.target.value }))}>
                {DIAS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Hora inicio">
              <input type="time" value={form.hora_inicio} onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} required />
            </Field>
            <Field label="Hora fin">
              <input type="time" value={form.hora_fin} onChange={e => setForm(f => ({ ...f, hora_fin: e.target.value }))} required />
            </Field>
            <Button type="submit" loading={creando} style={{ width: '100%' }}>+ Agregar horario</Button>
          </form>
        </Card>

        <div className={styles.horariosList}>
          <h3 className={styles.listTitle}>Horarios registrados ({horarios.length})</h3>
          {horarios.length === 0 ? (
            <EmptyState icon="🕐" title="Sin horarios" description="Agrega tu disponibilidad usando el formulario." />
          ) : (
            <div className={styles.grid}>
              {DIAS.map(dia => {
                const del_dia = horarios.filter((h: any) => h.dia_semana === dia);
                if (!del_dia.length) return null;
                return (
                  <div key={dia} className={styles.diaGroup}>
                    <div className={styles.diaLabel}>{dia.charAt(0).toUpperCase() + dia.slice(1)}</div>
                    {del_dia.map((h: any) => (
                      <div key={h.id_horario} className={styles.horarioRow}>
                        <div className={styles.horarioRowLeft}>
                          <div className={styles.horarioIcon}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          </div>
                          <span className={styles.horarioTime}>{h.hora_inicio.slice(0,5)} – {h.hora_fin.slice(0,5)}</span>
                        </div>
                        <div className={styles.horarioRowRight}>
                          <span className={styles.horarioBadge}>{h.disponible ? 'Disponible' : 'Ocupado'}</span>
                          <button className={styles.deleteBtn} onClick={() => eliminar({ variables: { id: h.id_horario } })} title="Eliminar horario">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="m19 6-.867 13.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}