import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Search, Calendar, Clock, User, Stethoscope, CheckCircle2 } from 'lucide-react';
import { Layout } from '../../components/Layout';
import {
  PageHeader, Card, Button, EmptyState, Spinner,
  Modal, Field, Alert, Badge, Pagination, usePagination,
} from '../../components/UI';
import { DatePicker } from '../../components/DatePicker';
import { GET_PSICOLOGOS, AGENDAR_CITA } from '../../graphql/operations';
import { useAuth } from '../../auth/AuthContext';
import styles from './Psicologos.module.css';

const PAGE_SIZE = 6;

const DIAS_ES: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
};

const DIA_TO_JS: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3,
  jueves: 4, viernes: 5, sabado: 6,
};

function proximaFechaDia(diaSemana: string): string {
  const target = DIA_TO_JS[diaSemana.toLowerCase()] ?? 1;
  const hoy = new Date();
  const diff = (target - hoy.getDay() + 7) % 7;
  const d = new Date(hoy);
  d.setDate(hoy.getDate() + (diff === 0 ? 7 : diff));
  return d.toISOString().split('T')[0];
}

function fechaValidaParaDia(fecha: string, diaSemana: string): boolean {
  if (!fecha) return false;
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(y, m - 1, d).getDay() === (DIA_TO_JS[diaSemana.toLowerCase()] ?? -1);
}

function fmt(t: string) { return (t ?? '').slice(0, 5); }

export default function Psicologos() {
  const { user } = useAuth();
  const { data, loading } = useQuery(GET_PSICOLOGOS);

  const [selected,   setSelected]   = useState<any>(null);
  const [horarioSel, setHorarioSel] = useState<any>(null);
  const [fecha,      setFecha]      = useState('');
  const [motivo,     setMotivo]     = useState('');
  const [searchVal,  setSearchVal]  = useState('');
  const [success,    setSuccess]    = useState('');

  const [agendar, { loading: agendando, error: errorAgendar }] = useMutation(AGENDAR_CITA, {
    onCompleted: () => {
      setSuccess('Cita agendada exitosamente.');
      setTimeout(() => {
        setSelected(null); setHorarioSel(null);
        setFecha(''); setMotivo(''); setSuccess('');
      }, 2000);
    },
  });

  // Filtrado por búsqueda
  const filtrados = useMemo(() =>
    (data?.psicologos ?? []).filter((p: any) =>
      p.usuario.nombre.toLowerCase().includes(searchVal.toLowerCase()) ||
      (p.especialidad ?? '').toLowerCase().includes(searchVal.toLowerCase())
    ),
    [data, searchVal]
  );

  // Paginación
  const { page, setPage, slice: pagina, total } = usePagination(filtrados, PAGE_SIZE);

  const horariosDisponibles = useMemo(() =>
    (selected?.horarios ?? []).filter((h: any) => h.disponible),
    [selected]
  );

  const openModal = (p: any) => {
    setSelected(p); setHorarioSel(null);
    setFecha(''); setMotivo(''); setSuccess('');
  };

  const selectHorario = (h: any) => {
    setHorarioSel(h);
    setFecha(proximaFechaDia(h.dia_semana));
  };

  const manana = (() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })();

  const handleAgendar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!horarioSel || !fecha) return;
    if (!fechaValidaParaDia(fecha, horarioSel.dia_semana)) return;
    if (!selected?.id_psicologo || !horarioSel?.id_horario) return;

    const input: Record<string, any> = {
      id_psicologo: selected.id_psicologo,
      id_horario:   horarioSel.id_horario,
      fecha,
    };
    if (motivo.trim()) input.motivo = motivo.trim();
    agendar({ variables: { input } });
  };

  return (
    <Layout>
      <PageHeader
        title="Psicólogos"
        subtitle={`${total} profesional${total !== 1 ? 'es' : ''} disponible${total !== 1 ? 's' : ''}`}
      />

      <div className={styles.searchBar}>
        <Search size={16} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder="Buscar por nombre o especialidad..."
          value={searchVal}
          onChange={e => { setSearchVal(e.target.value); setPage(1); }}
        />
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <Spinner size={36} />
        </div>
      )}

      {!loading && filtrados.length === 0 && (
        <EmptyState
          icon={<User size={28} />}
          title="Sin psicólogos"
          description={searchVal ? 'Ningún psicólogo coincide con la búsqueda.' : 'No hay psicólogos registrados.'}
        />
      )}

      <div className={`${styles.grid} stagger`}>
        {pagina.map((p: any) => {
          const disponibles = (p.horarios ?? []).filter((h: any) => h.disponible);
          return (
            <Card key={p.id_psicologo} hoverable className={styles.card}>
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

              {disponibles.length > 0 ? (
                <div className={styles.horarios}>
                  <div className={styles.horariosTitle}><Clock size={12} /> Disponibilidad</div>
                  <div className={styles.horariosList}>
                    {disponibles.map((h: any) => (
                      <div key={h.id_horario} className={styles.horarioChip}>
                        <span className={styles.horarioDia}>{DIAS_ES[h.dia_semana] ?? h.dia_semana}</span>
                        <span>{fmt(h.hora_inicio)} – {fmt(h.hora_fin)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={styles.sinHorarios}>Sin horarios disponibles aún</div>
              )}

              {user?.rol === 'estudiante' && disponibles.length > 0 && (
                <Button
                  variant="primary" size="sm"
                  icon={<Calendar size={14} />}
                  style={{ marginTop: 'auto', width: '100%' }}
                  onClick={() => openModal(p)}
                >
                  Agendar cita
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      <Pagination total={total} page={page} pageSize={PAGE_SIZE} onChange={setPage} />

      {/* Modal de agendamiento */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Agendar con ${selected?.usuario?.nombre ?? ''}`}
      >
        {success       && <Alert message={success} type="success" />}
        {errorAgendar  && <Alert message={errorAgendar.message.replace('GraphQL error: ', '')} />}

        <form onSubmit={handleAgendar} className={styles.modalForm}>

          {/* Paso 1: Horario */}
          <div className={styles.stepLabel}>
            <span className={styles.stepNum}>1</span>
            Selecciona un horario disponible
          </div>
          <div className={styles.horariosGrid}>
            {horariosDisponibles.map((h: any) => (
              <button
                key={h.id_horario}
                type="button"
                className={`${styles.horarioBtn} ${horarioSel?.id_horario === h.id_horario ? styles.horarioBtnActive : ''}`}
                onClick={() => selectHorario(h)}
              >
                <div className={styles.horarioBtnDia}>{DIAS_ES[h.dia_semana] ?? h.dia_semana}</div>
                <div className={styles.horarioBtnHora}>
                  <Clock size={11} />
                  {fmt(h.hora_inicio)} – {fmt(h.hora_fin)}
                </div>
                {horarioSel?.id_horario === h.id_horario && (
                  <CheckCircle2 size={14} className={styles.horarioBtnCheck} />
                )}
              </button>
            ))}
          </div>

          {/* Paso 2: Fecha */}
          {horarioSel && (
            <>
              <div className={styles.stepLabel}>
                <span className={styles.stepNum}>2</span>
                Elige una fecha ({DIAS_ES[horarioSel.dia_semana] ?? horarioSel.dia_semana})
              </div>
              <div className={styles.fechaHint}>
                Solo puedes seleccionar fechas que sean{' '}
                <strong>{DIAS_ES[horarioSel.dia_semana] ?? horarioSel.dia_semana}</strong>.
              </div>
              <Field label="">
                <DatePicker
                  value={fecha}
                  onChange={v => setFecha(v)}
                  min={manana}
                  diaPermitido={DIA_TO_JS[horarioSel.dia_semana.toLowerCase()]}
                />
              </Field>

              {fecha && (
                <div className={styles.resumen}>
                  <div className={styles.resumenItem}>
                    <Calendar size={14} />
                    <span>
                      {new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className={styles.resumenItem}>
                    <Clock size={14} />
                    <span>{fmt(horarioSel.hora_inicio)} – {fmt(horarioSel.hora_fin)}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Paso 3: Motivo (opcional) */}
          {horarioSel && fecha && (
            <>
              <div className={styles.stepLabel}>
                <span className={styles.stepNum}>3</span>
                Motivo de la consulta (opcional)
              </div>
              <Field label="">
                <textarea
                  placeholder="Describe brevemente el motivo de tu consulta..."
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </Field>
            </>
          )}

          <Button
            type="submit"
            loading={agendando}
            size="lg"
            style={{ width: '100%' }}
            icon={<Calendar size={16} />}
            disabled={
              !horarioSel ||
              !fecha ||
              !fechaValidaParaDia(fecha, horarioSel?.dia_semana) ||
              !selected?.id_psicologo ||
              !horarioSel?.id_horario
            }
          >
            Confirmar cita
          </Button>
        </form>
      </Modal>
    </Layout>
  );
}
