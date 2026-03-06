import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Plus, Trash2, Clock } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader, Button, EmptyState, Alert, Field, Card, Modal } from '../../components/UI';
import { TimePicker } from '../../components/TimePicker';
import { GET_PSICOLOGOS, CREAR_HORARIO, ELIMINAR_HORARIO } from '../../graphql/operations';
import { useAuth } from '../../auth/AuthContext';
import styles from './Horarios.module.css';

const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado'];
const DIAS_ES: Record<string,string> = {
  lunes:'Lunes', martes:'Martes', miercoles:'Miércoles',
  jueves:'Jueves', viernes:'Viernes', sabado:'Sábado',
};

/** Asegura formato HH:MM:SS que espera la columna TIME en MySQL */
function toTimeDB(t: string): string {
  if (!t) return '00:00:00';
  const parts = t.split(':');
  if (parts.length === 3) return t;           // ya tiene segundos
  if (parts.length === 2) return `${t}:00`;   // agregar :00
  return `${t}:00:00`;
}

export default function Horarios() {
  const { user } = useAuth();
  const idPsicologo = user?.id_perfil ?? 0;
  const { data, refetch } = useQuery(GET_PSICOLOGOS, { fetchPolicy: 'network-only' });

  const [form, setForm] = useState({ dia_semana: 'lunes', hora_inicio: '09:00', hora_fin: '10:00' });
  const [success, setSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formError, setFormError] = useState('');

  const miPerfil = data?.psicologos?.find((p: any) => p.id_psicologo === idPsicologo);
  const horarios = miPerfil?.horarios ?? [];

  const [crear, { loading: creando, error }] = useMutation(CREAR_HORARIO, {
    onCompleted: () => {
      setSuccess('Horario agregado exitosamente.');
      setFormError('');
      refetch();
      setTimeout(() => setSuccess(''), 2500);
    },
    onError: (e) => setFormError(e.message.replace('GraphQL error: ', '')),
  });

  const [eliminar, { loading: eliminando }] = useMutation(ELIMINAR_HORARIO, {
    onCompleted: () => { setDeleteConfirm(null); refetch(); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!idPsicologo) {
      setFormError('No se encontró tu perfil. Vuelve a iniciar sesión.');
      return;
    }

    const inicio = toTimeDB(form.hora_inicio);
    const fin    = toTimeDB(form.hora_fin);

    if (inicio >= fin) {
      setFormError('La hora de fin debe ser mayor que la hora de inicio.');
      return;
    }

    crear({
      variables: {
        input: {
          id_psicologo: idPsicologo,
          dia_semana:   form.dia_semana,
          hora_inicio:  inicio,
          hora_fin:     fin,
        },
      },
    });
  };

  return (
    <Layout>
      <PageHeader title="Mis Horarios" subtitle="Define tu disponibilidad semanal" />

      {!idPsicologo && <Alert message="No se encontró tu perfil de psicólogo. Vuelve a iniciar sesión." />}

      <div className={styles.layout}>
        <Card className={styles.formCard}>
          <h3 className={styles.formTitle}>Agregar disponibilidad</h3>
          {success    && <Alert message={success} type="success" />}
          {formError  && <Alert message={formError} />}
          {error      && !formError && <Alert message={error.message.replace('GraphQL error: ', '')} />}

          <form onSubmit={handleSubmit} className={styles.form}>
            <Field label="Día de la semana">
              <select
                value={form.dia_semana}
                onChange={e => setForm(f => ({ ...f, dia_semana: e.target.value }))}
              >
                {DIAS.map(d => (
                  <option key={d} value={d}>{DIAS_ES[d]}</option>
                ))}
              </select>
            </Field>
            <Field label="Hora inicio">
              <TimePicker
                value={form.hora_inicio}
                onChange={v => setForm(f => ({ ...f, hora_inicio: v }))}
              />
            </Field>
            <Field label="Hora fin">
              <TimePicker
                value={form.hora_fin}
                onChange={v => setForm(f => ({ ...f, hora_fin: v }))}
              />
            </Field>
            <Button
              type="submit"
              loading={creando}
              style={{ width: '100%' }}
              icon={<Plus size={16} />}
              disabled={!idPsicologo}
            >
              Agregar horario
            </Button>
          </form>
        </Card>

        <div className={styles.horariosList}>
          <h3 className={styles.listTitle}>Horarios registrados ({horarios.length})</h3>
          {horarios.length === 0 ? (
            <EmptyState
              icon={<Clock size={28} />}
              title="Sin horarios"
              description="Agrega tu disponibilidad con el formulario."
            />
          ) : (
            <div className={styles.grid}>
              {DIAS.map(dia => {
                const del_dia = horarios.filter((h: any) => h.dia_semana === dia);
                if (!del_dia.length) return null;
                return (
                  <div key={dia} className={styles.diaGroup}>
                    <div className={styles.diaLabel}>{DIAS_ES[dia]}</div>
                    {del_dia.map((h: any) => (
                      <div key={h.id_horario} className={styles.horarioChip}>
                        <Clock size={13} style={{ color: 'var(--teal)', flexShrink: 0 }} />
                        <span>{h.hora_inicio.slice(0, 5)} – {h.hora_fin.slice(0, 5)}</span>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => setDeleteConfirm(h.id_horario)}
                          title="Eliminar horario"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Eliminar horario"
      >
        <p style={{ color: 'var(--cream-dim)', fontSize: 14, lineHeight: 1.6 }}>
          ¿Estás seguro de que deseas eliminar este horario?
          Los estudiantes ya no podrán agendar en este día y hora.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          <Button
            variant="danger"
            loading={eliminando}
            icon={<Trash2 size={14} />}
            onClick={() => deleteConfirm && eliminar({ variables: { id: deleteConfirm } })}
          >
            Eliminar
          </Button>
        </div>
      </Modal>
    </Layout>
  );
}
