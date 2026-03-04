import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Search, Calendar, Clock, User, Stethoscope } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader, Card, Badge, Button, EmptyState, Spinner, Modal, Field, Alert } from '../../components/UI';
import { GET_PSICOLOGOS, AGENDAR_CITA } from '../../graphql/operations';
import { useAuth } from '../../auth/AuthContext';
import styles from './Psicologos.module.css';

export default function Psicologos() {
  const { user } = useAuth();
  const { data, loading } = useQuery(GET_PSICOLOGOS);
  const [selected, setSelected] = useState<any>(null);
  const [searchVal, setSearchVal] = useState('');
  const [form, setForm] = useState({ fecha: '', hora_inicio: '', hora_fin: '', motivo: '' });
  const [success, setSuccess] = useState('');

  const [agendar, { loading: agendando, error: errorAgendar }] = useMutation(AGENDAR_CITA, {
    onCompleted: () => {
      setSuccess('¡Cita agendada exitosamente!');
      setTimeout(() => { setSelected(null); setSuccess(''); }, 2000);
    },
  });

  const psicologos = (data?.psicologos ?? []).filter((p: any) =>
    p.usuario.nombre.toLowerCase().includes(searchVal.toLowerCase()) ||
    (p.especialidad ?? '').toLowerCase().includes(searchVal.toLowerCase())
  );

  const handleAgendar = (e: React.FormEvent) => {
    e.preventDefault();
    agendar({ variables: { input: { id_psicologo: selected.id_psicologo, ...form } } });
  };

  return (
    <Layout>
      <PageHeader title="Psicólogos" subtitle="Encuentra el profesional adecuado para ti" />

      <div className={styles.searchBar}>
        <Search size={16} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder="Buscar por nombre o especialidad..."
          value={searchVal}
          onChange={e => setSearchVal(e.target.value)}
        />
      </div>

      {loading && <div style={{ display:'flex', justifyContent:'center', padding:64 }}><Spinner size={36} /></div>}

      {!loading && psicologos.length === 0 && (
        <EmptyState icon={<User size={28} />} title="Sin psicólogos" description="No se encontraron psicólogos registrados." />
      )}

      <div className={`${styles.grid} stagger`}>
        {psicologos.map((p: any, i: number) => (
          <Card key={p.id_psicologo} hoverable className={styles.card} style={{ animationDelay: `${i * 60}ms` } as any}>
            <div className={styles.cardTop}>
              <div className={styles.avatar}>{p.usuario.nombre.charAt(0)}</div>
              <div>
                <div className={styles.name}>{p.usuario.nombre}</div>
                <div className={styles.correo}>{p.usuario.correo}</div>
              </div>
            </div>

            {p.especialidad && (
              <div className={styles.especialidad}>
                <Stethoscope size={13} />
                <span>{p.especialidad}</span>
              </div>
            )}

            {p.horarios?.filter((h:any) => h.disponible).length > 0 && (
              <div className={styles.horarios}>
                <div className={styles.horariosTitle}>
                  <Clock size={12} /> Disponibilidad
                </div>
                <div className={styles.horariosList}>
                  {p.horarios.filter((h: any) => h.disponible).map((h: any) => (
                    <div key={h.id_horario} className={styles.horarioChip}>
                      <span className={styles.horarioDia}>{h.dia_semana}</span>
                      <span>{h.hora_inicio.slice(0,5)} – {h.hora_fin.slice(0,5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {user?.rol === 'estudiante' && (
              <Button
                variant="primary" size="sm"
                icon={<Calendar size={14} />}
                style={{ marginTop: 'auto', width: '100%' }}
                onClick={() => { setSelected(p); setForm({ fecha:'', hora_inicio:'', hora_fin:'', motivo:'' }); }}
              >
                Agendar cita
              </Button>
            )}
          </Card>
        ))}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Agendar con ${selected?.usuario?.nombre}`}>
        {success && <Alert message={success} type="success" />}
        {errorAgendar && <Alert message={errorAgendar.message} />}
        <form onSubmit={handleAgendar} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Fecha">
            <input type="date" value={form.fecha} onChange={e => setForm(f=>({...f,fecha:e.target.value}))} required min={new Date().toISOString().split('T')[0]} />
          </Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Hora inicio"><input type="time" value={form.hora_inicio} onChange={e=>setForm(f=>({...f,hora_inicio:e.target.value}))} required /></Field>
            <Field label="Hora fin"><input type="time" value={form.hora_fin} onChange={e=>setForm(f=>({...f,hora_fin:e.target.value}))} required /></Field>
          </div>
          <Field label="Motivo (opcional)">
            <textarea placeholder="Describe brevemente el motivo..." value={form.motivo} onChange={e=>setForm(f=>({...f,motivo:e.target.value}))} rows={3} style={{resize:'vertical'}} />
          </Field>
          <Button type="submit" loading={agendando} size="lg" style={{width:'100%'}} icon={<Calendar size={16} />}>Confirmar cita</Button>
        </form>
      </Modal>
    </Layout>
  );
}
