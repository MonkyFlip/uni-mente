import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Search, UserX, UserCheck } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader, Button, EmptyState, Spinner, Badge, Pagination, usePagination } from '../../components/UI';
import { GET_ESTUDIANTES_ADMIN, TOGGLE_ACTIVO_ESTUDIANTE } from '../../graphql/operations';

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

type Filtro = 'todos' | 'activos' | 'inactivos';

export default function AdminEstudiantes() {
  const [search,  setSearch]  = useState('');
  const [filtro,  setFiltro]  = useState<Filtro>('activos');
  const [success, setSuccess] = useState('');

  const { data, loading, refetch } = useQuery(GET_ESTUDIANTES_ADMIN, { fetchPolicy: 'cache-and-network' });
  const [doToggle, { loading: toggling }] = useMutation(TOGGLE_ACTIVO_ESTUDIANTE, {
    onCompleted: (d: any) => {
      const e = d.toggleActivoEstudiante;
      setSuccess(`${e.usuario.nombre} ${e.usuario.activo ? 'activado' : 'desactivado'} correctamente.`);
      setTimeout(() => setSuccess(''), 3000);
      refetch();
    },
  });

  const all: any[] = data?.estudiantesAdmin ?? [];
  const counts = {
    todos:     all.length,
    activos:   all.filter((e: any) => e.usuario.activo).length,
    inactivos: all.filter((e: any) => !e.usuario.activo).length,
  };

  const filtered = all.filter((e: any) => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.usuario.nombre.toLowerCase().includes(q) ||
      e.usuario.correo.toLowerCase().includes(q) ||
      (e.matricula ?? '').toLowerCase().includes(q) ||
      (e.carrera ?? '').toLowerCase().includes(q);
    const matchFiltro = filtro === 'todos' ? true : filtro === 'activos' ? e.usuario.activo : !e.usuario.activo;
    return matchSearch && matchFiltro;
  });

  const { page, setPage, slice, total } = usePagination(filtered, 10);
  const FILTROS: { key: Filtro; label: string }[] = [
    { key: 'todos', label: 'Todos' }, { key: 'activos', label: 'Activos' }, { key: 'inactivos', label: 'Inactivos' },
  ];

  return (
    <Layout>
      <PageHeader title="Estudiantes" subtitle={`${counts.activos} activos · ${counts.inactivos} inactivos`} />

      {success && <div style={{ background:'rgba(62,207,142,0.1)', border:'1px solid rgba(62,207,142,0.2)', borderRadius:9, padding:'10px 14px', fontSize:13, color:'#3ecf8e', marginBottom:16 }}>{success}</div>}

      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {FILTROS.map(f => (
          <button key={f.key} onClick={() => { setFiltro(f.key); setPage(1); }}
            style={{ padding:'7px 16px', borderRadius:20, border:`1px solid ${filtro===f.key ? 'var(--teal)' : 'var(--border)'}`, background:filtro===f.key ? 'var(--teal-glow)' : 'transparent', color:filtro===f.key ? 'var(--teal)' : 'var(--cream-dim)', fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.15s' }}>
            {f.label} <span style={{ marginLeft:5, opacity:.7, fontSize:11 }}>({counts[f.key]})</span>
          </button>
        ))}
      </div>

      <div style={{ position:'relative', marginBottom:20, maxWidth:480 }}>
        <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--cream-dim)', pointerEvents:'none' }} />
        <input placeholder="Buscar por nombre, matrícula, carrera..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ paddingLeft:36, width:'100%', background:'var(--navy-card)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 14px 10px 36px', fontSize:14, color:'var(--cream)', outline:'none' }} />
      </div>

      {loading && <div style={{ display:'flex', justifyContent:'center', padding:64 }}><Spinner size={36} /></div>}
      {!loading && filtered.length === 0 && <EmptyState icon="🔍" title="Sin resultados" description={search ? 'Ningún estudiante coincide.' : 'No hay estudiantes en esta categoría.'} />}

      {slice.map((e: any) => (
        <div key={e.id_estudiante} style={{ background:'var(--navy-card)', border:`1px solid ${e.usuario.activo ? 'var(--border)' : 'rgba(248,113,113,0.22)'}`, borderRadius:12, padding:'14px 18px', marginBottom:8, display:'flex', alignItems:'center', gap:14, opacity:e.usuario.activo ? 1 : 0.72, transition:'all 0.2s' }}>
          <div style={{ width:42, height:42, borderRadius:'50%', flexShrink:0, fontWeight:700, fontSize:17, background:e.usuario.activo ? 'var(--teal-glow)' : 'rgba(248,113,113,0.1)', color:e.usuario.activo ? 'var(--teal)' : '#f87171', display:'flex', alignItems:'center', justifyContent:'center', border:`2px solid ${e.usuario.activo ? 'var(--teal)' : '#f87171'}` }}>
            {e.usuario.nombre.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:600, fontSize:14, color:'var(--cream)', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              {e.usuario.nombre}
              <Badge label={e.usuario.activo ? 'Activo' : 'Inactivo'} variant={e.usuario.activo ? 'teal' : 'gray'} />
            </div>
            <div style={{ fontSize:12, color:'var(--cream-dim)', display:'flex', gap:12, flexWrap:'wrap', marginTop:3 }}>
              <span>{e.usuario.correo}</span>
              {e.matricula && <span>{e.matricula}</span>}
              {e.carrera   && <span>{e.carrera}</span>}
              <span style={{ opacity:.65 }}>Registro: {fmtDate(e.usuario.created_at)}</span>
            </div>
          </div>
          <Button variant={e.usuario.activo ? 'danger' : 'secondary'} size="sm" loading={toggling} onClick={() => doToggle({ variables: { id: e.id_estudiante } })}>
            {e.usuario.activo
              ? <><UserX size={13} style={{ marginRight:4, verticalAlign:'middle' }} />Desactivar</>
              : <><UserCheck size={13} style={{ marginRight:4, verticalAlign:'middle' }} />Activar</>
            }
          </Button>
        </div>
      ))}
      <Pagination total={total} page={page} pageSize={10} onChange={setPage} />
    </Layout>
  );
}