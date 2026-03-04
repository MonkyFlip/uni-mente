import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Plus, Trash2, Clock } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader, Button, EmptyState, Alert, Field, Card } from '../../components/UI';
import { GET_PSICOLOGOS, CREAR_HORARIO, ELIMINAR_HORARIO } from '../../graphql/operations';
import styles from './Horarios.module.css';

const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado'];

export default function Horarios() {
  const idPsicologo = Number(localStorage.getItem('id_psicologo') ?? 0);
  const { data, refetch } = useQuery(GET_PSICOLOGOS);
  const [form, setForm] = useState({ dia_semana:'lunes', hora_inicio:'09:00', hora_fin:'10:00' });
  const [success, setSuccess] = useState('');

  const miPerfil = data?.psicologos?.find((p: any) => p.id_psicologo === idPsicologo);
  const horarios  = miPerfil?.horarios ?? [];

  const [crear, { loading: creando, error }] = useMutation(CREAR_HORARIO, {
    onCompleted: () => { setSuccess('Horario creado'); refetch(); setTimeout(()=>setSuccess(''), 2500); },
  });
  const [eliminar] = useMutation(ELIMINAR_HORARIO, { onCompleted: () => refetch() });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    crear({ variables: { input: { id_psicologo: idPsicologo, ...form } } });
  };

  return (
    <Layout>
      <PageHeader title="Mis Horarios" subtitle="Define tu disponibilidad semanal" />
      <div className={styles.layout}>
        <Card className={styles.formCard}>
          <h3 className={styles.formTitle}>Agregar disponibilidad</h3>
          {success && <Alert message={success} type="success" />}
          {error   && <Alert message={error.message} />}
          <form onSubmit={handleSubmit} className={styles.form}>
            <Field label="Día de la semana">
              <select value={form.dia_semana} onChange={e=>setForm(f=>({...f,dia_semana:e.target.value}))}>
                {DIAS.map(d=><option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Hora inicio">
              <input type="time" value={form.hora_inicio} onChange={e=>setForm(f=>({...f,hora_inicio:e.target.value}))} required />
            </Field>
            <Field label="Hora fin">
              <input type="time" value={form.hora_fin} onChange={e=>setForm(f=>({...f,hora_fin:e.target.value}))} required />
            </Field>
            <Button type="submit" loading={creando} style={{width:'100%'}} icon={<Plus size={16}/>}>Agregar horario</Button>
          </form>
        </Card>

        <div className={styles.horariosList}>
          <h3 className={styles.listTitle}>Horarios registrados ({horarios.length})</h3>
          {horarios.length === 0
            ? <EmptyState icon={<Clock size={28}/>} title="Sin horarios" description="Agrega tu disponibilidad con el formulario." />
            : (
              <div className={styles.grid}>
                {DIAS.map(dia => {
                  const del_dia = horarios.filter((h:any)=>h.dia_semana===dia);
                  if (!del_dia.length) return null;
                  return (
                    <div key={dia} className={styles.diaGroup}>
                      <div className={styles.diaLabel}>{dia.charAt(0).toUpperCase()+dia.slice(1)}</div>
                      {del_dia.map((h:any)=>(
                        <div key={h.id_horario} className={styles.horarioChip}>
                          <Clock size={13} style={{color:'var(--teal)',flexShrink:0}}/>
                          <span>{h.hora_inicio.slice(0,5)} – {h.hora_fin.slice(0,5)}</span>
                          <button className={styles.deleteBtn} onClick={()=>eliminar({variables:{id:h.id_horario}})}>
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      </div>
    </Layout>
  );
}
