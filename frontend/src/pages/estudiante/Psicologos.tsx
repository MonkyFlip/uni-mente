import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Search, Calendar, Clock, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Layout } from '../../components/Layout';
import {
  PageHeader, Card, Badge, Button, EmptyState, Spinner,
  Modal, Alert, Pagination, usePagination,
} from '../../components/UI';
import { GET_PSICOLOGOS, GET_AGENDA_PSICOLOGO, AGENDAR_CITA } from '../../graphql/operations';
import { useAuth } from '../../auth/AuthContext';
import styles from './Psicologos.module.css';

const DIA_NUM_EX: Record<string, number> = {
  lunes:1, martes:2, miercoles:3, 'miércoles':3, jueves:4, viernes:5, sabado:6, 'sábado':6, domingo:0,
};
const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];
const DAY_HDR = ['DO','LU','MA','MI','JU','VI','SÁ'];

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDiaNum(dia: string): number {
  return DIA_NUM_EX[dia.toLowerCase()] ?? DIA_NUM_EX[dia] ?? 1;
}

interface CalendarProps {
  diaTarget: number;
  bookedDates: Set<string>;
  value: string;
  onChange: (iso: string) => void;
}

function CustomCalendar({ diaTarget, bookedDates, value, onChange }: CalendarProps) {
  const now  = new Date();
  const [yr, setYr] = useState(now.getFullYear());
  const [mo, setMo] = useState(now.getMonth());

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const prevMonth = () => { if (mo === 0) { setMo(11); setYr(y => y-1); } else setMo(m => m-1); };
  const nextMonth = () => { if (mo === 11) { setMo(0); setYr(y => y+1); } else setMo(m => m+1); };

  const daysInMonth = new Date(yr, mo+1, 0).getDate();
  const startPad    = new Date(yr, mo, 1).getDay();

  const cells: (Date | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(yr, mo, d));
  // pad end to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{ background:'var(--navy)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', marginTop:8, userSelect:'none' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <button type="button" onClick={prevMonth} style={{ background:'none', border:'none', color:'var(--cream-dim)', cursor:'pointer', padding:4, borderRadius:6, display:'flex', alignItems:'center' }}>
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontWeight:700, fontSize:14, color:'var(--cream)' }}>{MONTH_NAMES[mo]} {yr}</span>
        <button type="button" onClick={nextMonth} style={{ background:'none', border:'none', color:'var(--cream-dim)', cursor:'pointer', padding:4, borderRadius:6, display:'flex', alignItems:'center' }}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
        {DAY_HDR.map((d, i) => (
          <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:700, padding:'4px 0', color:i===diaTarget ? 'var(--teal)' : 'var(--cream-dim)' }}>{d}</div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`p${idx}`} style={{ minHeight:34 }} />;
          const iso       = localDateStr(day);
          const isPast    = day < today;
          const isTarget  = day.getDay() === diaTarget;
          const isBooked  = bookedDates.has(iso);
          const isValid   = !isPast && isTarget && !isBooked;
          const isSelected = iso === value;

          let bg     = 'transparent';
          let color  = 'var(--cream-dim)';
          let border = '1px solid transparent';
          let opacity: number = isPast ? 0.2 : 1;

          if (isSelected) { bg='var(--teal)'; color='#fff'; border='1px solid var(--teal)'; }
          else if (isBooked && isTarget && !isPast) { bg='rgba(248,113,113,0.08)'; color='#f87171'; border='1px solid rgba(248,113,113,0.18)'; }
          else if (isValid) { bg='var(--teal-glow)'; color='var(--teal)'; border='1px solid rgba(10,181,168,0.22)'; }

          return (
            <button key={iso} type="button" disabled={!isValid}
              onClick={() => isValid && onChange(iso)}
              style={{
                borderRadius:7, border, background:bg, color, opacity,
                padding:'7px 2px', fontSize:13, fontWeight:isTarget&&!isPast?600:400,
                cursor:isValid?'pointer':'not-allowed', textAlign:'center', width:'100%',
                transition:'all 0.12s', minHeight:34,
                textDecoration:isBooked&&isTarget&&!isPast?'line-through':'none',
              }}>
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <div style={{ display:'flex', gap:14, marginTop:12, fontSize:11, color:'var(--cream-dim)', flexWrap:'wrap' }}>
        <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:3, background:'var(--teal-glow)', border:'1px solid rgba(10,181,168,0.3)', marginRight:5, verticalAlign:'middle' }} />Disponible</span>
        <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:3, background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.2)', marginRight:5, verticalAlign:'middle' }} />Ocupado</span>
        <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:3, background:'var(--teal)', marginRight:5, verticalAlign:'middle' }} />Seleccionado</span>
      </div>
    </div>
  );
}

interface Horario { id_horario:number; dia_semana:string; hora_inicio:string; hora_fin:string; disponible:boolean; }
interface Psicologo { id_psicologo:number; especialidad:string; usuario:{nombre:string;correo:string;activo?:boolean}; horarios:Horario[]; }

export default function Psicologos() {
  const { user } = useAuth();
  const { data, loading } = useQuery(GET_PSICOLOGOS);
  const [selected,  setSelected]  = useState<Psicologo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [search,    setSearch]    = useState('');
  const [slotH,     setSlotH]     = useState<Horario | null>(null);
  const [fecha,     setFecha]     = useState('');
  const [motivo,    setMotivo]    = useState('');
  const [success,   setSuccess]   = useState('');

  const { data: agendaData } = useQuery(GET_AGENDA_PSICOLOGO, {
    variables: { id_psicologo: selected?.id_psicologo ?? 0 },
    skip: !selected?.id_psicologo,
    fetchPolicy: 'cache-and-network',
  });

  const bookedDates = useMemo((): Set<string> => {
    if (!slotH || !agendaData) return new Set();
    const set = new Set<string>();
    for (const cita of (agendaData.agendaPsicologo ?? [])) {
      if (
        cita.hora_inicio === slotH.hora_inicio &&
        cita.hora_fin   === slotH.hora_fin &&
        cita.estado?.toUpperCase() !== 'CANCELADA'
      ) set.add(cita.fecha);
    }
    return set;
  }, [slotH, agendaData]);

  const [agendar, { loading: agendando, error: errorAgendar }] = useMutation(AGENDAR_CITA, {
    onCompleted: () => { setSuccess('Cita agendada exitosamente.'); setTimeout(() => { setShowModal(false); setSuccess(''); }, 2000); },
  });

  const allPsicologos = ((data?.psicologos ?? []) as Psicologo[]).filter(p => {
    const isActive = p.usuario?.activo !== false;
    const matchSearch = p.usuario.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.especialidad ?? '').toLowerCase().includes(search.toLowerCase());
    return isActive && matchSearch;
  });
  const { page, setPage, slice: psicologos, total, pageSize } = usePagination(allPsicologos, 9);

  const openModal = (p: Psicologo) => { setSelected(p); setSlotH(null); setFecha(''); setMotivo(''); setShowModal(true); };
  const handleAgendar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotH || !fecha) return;
    agendar({ variables: { input: { id_psicologo: selected!.id_psicologo, id_horario: slotH.id_horario, fecha, motivo: motivo.trim() || undefined } } });
  };

  const diaTarget = slotH ? getDiaNum(slotH.dia_semana) : 1;
  const diaLabel  = slotH ? slotH.dia_semana.charAt(0).toUpperCase() + slotH.dia_semana.slice(1).toLowerCase() : '';
  // Pluralize without double-s
  const diaPlural = diaLabel.endsWith('s') || diaLabel.endsWith('S') ? diaLabel : diaLabel + 's';

  return (
    <Layout>
      <PageHeader title="Psicólogos" subtitle="Encuentra el profesional adecuado para ti" />

      <div className={styles.searchBar}>
        <Search size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--cream-dim)', pointerEvents:'none' }} />
        <input placeholder="Buscar por nombre o especialidad..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} className={styles.searchInput} />
      </div>

      {loading && <div style={{ textAlign:'center', padding:60 }}><Spinner size={36} /></div>}
      {!loading && psicologos.length === 0 && <EmptyState icon="👥" title="Sin psicólogos" description="No se encontraron psicólogos registrados." />}

      <div className={styles.grid}>
        {psicologos.map(p => {
          const disponibles = p.horarios.filter(h => h.disponible);
          return (
            <Card key={p.id_psicologo} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.avatar}>{p.usuario.nombre.charAt(0)}</div>
                <div><div className={styles.name}>{p.usuario.nombre}</div><div className={styles.correo}>{p.usuario.correo}</div></div>
              </div>
              {p.especialidad && <Badge label={p.especialidad} variant="teal" />}
              {disponibles.length > 0 && (
                <div className={styles.horarios}>
                  <div className={styles.horariosTitle}><Calendar size={13} style={{ marginRight:5 }} />Disponibilidad</div>
                  <div className={styles.horariosList}>
                    {disponibles.map(h => (
                      <div key={h.id_horario} className={styles.horarioChip}>
                        <span style={{ textTransform:'capitalize' }}>{h.dia_semana}</span>
                        <span>{h.hora_inicio.slice(0,5)} – {h.hora_fin.slice(0,5)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {user?.rol === 'estudiante' && disponibles.length > 0 && (
                <Button variant="primary" size="sm" style={{ marginTop:'auto', width:'100%' }} onClick={() => openModal(p)}>Agendar cita</Button>
              )}
              {user?.rol === 'estudiante' && disponibles.length === 0 && (
                <p style={{ fontSize:12, color:'var(--cream-dim)', textAlign:'center', marginTop:8 }}>Sin horarios disponibles</p>
              )}
            </Card>
          );
        })}
      </div>

      <Pagination total={total} page={page} pageSize={pageSize} onChange={setPage} />

      <Modal open={showModal} onClose={() => setShowModal(false)} title={`Agendar con ${selected?.usuario?.nombre}`}>
        {success      && <Alert message={success} type="success" />}
        {errorAgendar && <Alert message={errorAgendar.message} />}

        <form onSubmit={handleAgendar} style={{ display:'flex', flexDirection:'column', gap:18, marginTop:success||errorAgendar?14:0 }}>

          {/* Step 1 */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--teal)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>1</div>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--cream)' }}>Selecciona un horario disponible</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:8 }}>
              {(selected?.horarios.filter(h => h.disponible) ?? []).map(h => (
                <button key={h.id_horario} type="button" onClick={() => { setSlotH(h); setFecha(''); }}
                  style={{ display:'flex', flexDirection:'column', gap:4, padding:'10px 12px', borderRadius:10, textAlign:'left', border:`1px solid ${slotH?.id_horario===h.id_horario ? 'var(--teal)' : 'var(--border)'}`, background:slotH?.id_horario===h.id_horario ? 'var(--teal-glow)' : 'var(--navy)', cursor:'pointer', transition:'all 0.15s', position:'relative' }}>
                  {slotH?.id_horario===h.id_horario && <CheckCircle2 size={14} style={{ position:'absolute', top:8, right:8, color:'var(--teal)' }} />}
                  <span style={{ fontSize:13, fontWeight:700, color:slotH?.id_horario===h.id_horario ? 'var(--teal)' : 'var(--cream)', textTransform:'capitalize', display:'flex', alignItems:'center', gap:6 }}>
                    <Calendar size={13} />{h.dia_semana}
                  </span>
                  <span style={{ fontSize:12, color:'var(--cream-dim)', display:'flex', alignItems:'center', gap:5 }}>
                    <Clock size={12} />{h.hora_inicio.slice(0,5)} – {h.hora_fin.slice(0,5)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 – Calendar */}
          {slotH && (
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--teal)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>2</div>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--cream)' }}>Elige una fecha ({diaLabel})</span>
              </div>
              <div style={{ fontSize:12, color:'var(--cream-dim)', background:'var(--teal-glow)', border:'1px solid rgba(10,181,168,0.2)', borderRadius:7, padding:'7px 12px' }}>
                Solo puedes seleccionar fechas que sean <strong style={{ color:'var(--teal)' }}>{diaPlural}</strong>. Las marcadas en rojo ya están ocupadas.
              </div>
              {fecha && (
                <div style={{ fontSize:13, color:'var(--teal)', fontWeight:600, marginTop:8, display:'flex', alignItems:'center', gap:6 }}>
                  <CheckCircle2 size={14} />
                  {new Date(fecha+'T12:00:00').toLocaleDateString('es-MX', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}
                </div>
              )}
              <CustomCalendar diaTarget={diaTarget} bookedDates={bookedDates} value={fecha} onChange={setFecha} />
            </div>
          )}

          {/* Step 3 */}
          {slotH && fecha && (
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--teal)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>3</div>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--cream)' }}>Motivo (opcional)</span>
              </div>
              <textarea placeholder="Describe brevemente el motivo de la consulta..." value={motivo}
                onChange={e => setMotivo(e.target.value)} rows={3} style={{ width:'100%', resize:'vertical' }} />
            </div>
          )}

          <Button type="submit" loading={agendando} size="lg" style={{ width:'100%' }} disabled={!slotH || !fecha}>
            Confirmar cita
          </Button>
        </form>
      </Modal>
    </Layout>
  );
}