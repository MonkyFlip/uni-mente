import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Edit2, Search, Stethoscope, Phone, BadgeCheck, UserX, UserCheck } from 'lucide-react';
import { Layout } from '../../components/Layout';
import {
  PageHeader, Card, Button, EmptyState, Spinner,
  Modal, Field, Alert, Badge, Pagination, usePagination,
} from '../../components/UI';
import {
  GET_PSICOLOGOS_ADMIN, REGISTRAR_PSICOLOGO, ACTUALIZAR_PSICOLOGO, TOGGLE_ACTIVO_PSICOLOGO,
} from '../../graphql/operations';
import styles from './Psicologos.module.css';

const PAGE_SIZE = 9;

function clean<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k in obj) {
    const v = obj[k];
    if (v !== '' && v !== null && v !== undefined) out[k] = v;
  }
  return out;
}

const emptyCreate = { nombre: '', correo: '', password: '', especialidad: '', cedula: '', telefono: '' };
const emptyEdit   = { especialidad: '', cedula: '', telefono: '' };

export default function AdminPsicologos() {
  const { data, loading, refetch } = useQuery(GET_PSICOLOGOS_ADMIN, { fetchPolicy: 'cache-and-network' });
  const [search,       setSearch]       = useState('');
  const [filtro,       setFiltro]       = useState<'todos'|'activos'|'inactivos'>('activos');
  const [showCreate,   setShowCreate]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<any>(null);
  const [createForm,   setCreateForm]   = useState(emptyCreate);
  const [editForm,     setEditForm]     = useState(emptyEdit);
  const [success,      setSuccess]      = useState('');

  const ok = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const [registrar, { loading: creando, error: errCreate }] = useMutation(REGISTRAR_PSICOLOGO, {
    onCompleted: (d) => {
      ok(`Psicólogo "${d.registrarPsicologo.usuario.nombre}" creado.`);
      setShowCreate(false);
      setCreateForm(emptyCreate);
      refetch();
    },
  });

  const [actualizar, { loading: editando, error: errEdit }] = useMutation(ACTUALIZAR_PSICOLOGO, {
    onCompleted: () => { ok('Psicólogo actualizado.'); setEditTarget(null); refetch(); },
  });

  const [toggleActivo, { loading: toggling }] = useMutation(TOGGLE_ACTIVO_PSICOLOGO, {
    onCompleted: (d) => {
      const p = d.toggleActivoPsicologo;
      ok(`${p.usuario.nombre} ${p.usuario.activo ? 'activado' : 'desactivado'}.`);
      refetch();
    },
  });

  const todos = ((data?.psicologosAdmin ?? []) as any[])
    .filter((p: any) => {
      const matchSearch =
        p.usuario.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (p.especialidad ?? '').toLowerCase().includes(search.toLowerCase());
      const matchActive = filtro === 'todos' ? true : filtro === 'activos' ? p.usuario.activo : !p.usuario.activo;
      return matchSearch && matchActive;
    });

  const { page, setPage, slice: pagina, total } = usePagination(todos, PAGE_SIZE);

  const openEdit = (p: any) => {
    setEditTarget(p);
    setEditForm({ especialidad: p.especialidad ?? '', cedula: p.cedula ?? '', telefono: p.telefono ?? '' });
  };

  const setC = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCreateForm(f => ({ ...f, [k]: e.target.value }));
  const setE = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditForm(f => ({ ...f, [k]: e.target.value }));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const { nombre, correo, password, ...opcionales } = createForm;
    if (!nombre.trim() || !correo.trim() || !password.trim()) return;
    registrar({ variables: { input: { nombre: nombre.trim(), correo: correo.trim(), password, ...clean(opcionales) } } });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    actualizar({ variables: { id: editTarget.id_psicologo, input: clean(editForm) } });
  };

  return (
    <Layout>
      <PageHeader
        title="Psicólogos"
        subtitle={`${total} profesional${total !== 1 ? 'es' : ''} registrado${total !== 1 ? 's' : ''}`}
        action={
          <Button variant="primary"  onClick={() => setShowCreate(true)}>
            Registrar psicólogo
          </Button>
        }
      />

      {success && <div style={{ marginBottom: 16 }}><Alert message={success} type="success" /></div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className={styles.searchBar}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Buscar por nombre o especialidad..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['todos','activos','inactivos'] as const).map(f => (
            <button key={f} onClick={() => { setFiltro(f); setPage(1); }}
              style={{ padding: '7px 14px', borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s', fontSize: 12, fontWeight: 600,
                border: `1px solid ${filtro === f ? 'var(--teal)' : 'var(--border)'}`,
                background: filtro === f ? 'var(--teal-glow)' : 'transparent',
                color: filtro === f ? 'var(--teal)' : 'var(--cream-dim)',
              }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size={36} /></div>}
      {!loading && todos.length === 0 && (
        <EmptyState
          icon="👤"
          title="Sin psicólogos"
          description={search ? 'Ningún psicólogo coincide con la búsqueda.' : 'Registra el primer psicólogo con el botón de arriba.'}
        />
      )}

      <div className={`${styles.grid} stagger`}>
        {pagina.map((p: any) => (
          <div key={p.id_psicologo} style={{ opacity: p.usuario.activo ? 1 : 0.65, transition: "opacity 0.2s" }}><Card className={styles.card}>
            <div className={styles.cardTop}>
              <div className={styles.avatar}>{p.usuario.nombre.charAt(0)}</div>
              <div className={styles.info}>
                <div className={styles.name}>{p.usuario.nombre}</div>
                <div className={styles.correo}>{p.usuario.correo}</div>
              </div>
              <div className={styles.cardActions}>
                <button className={styles.iconBtn} title="Editar" onClick={() => openEdit(p)}>
                  <Edit2 size={15} strokeWidth={1.8} />
                </button>
                <button
                  className={`${styles.iconBtn} ${!p.usuario.activo ? '' : styles.iconBtnDanger}`}
                  title={p.usuario.activo ? 'Desactivar' : 'Activar'}
                  onClick={() => toggleActivo({ variables: { id: p.id_psicologo } })}
                  disabled={toggling}
                >
                  {p.usuario.activo ? <UserX size={15} strokeWidth={1.8} /> : <UserCheck size={15} strokeWidth={1.8} />}
                </button>
              </div>
            </div>

            <div className={styles.details}>
              {p.especialidad && <div className={styles.detail}><Stethoscope size={13} /><span>{p.especialidad}</span></div>}
              {p.cedula       && <div className={styles.detail}><BadgeCheck  size={13} /><span>Cédula: {p.cedula}</span></div>}
              {p.telefono     && <div className={styles.detail}><Phone       size={13} /><span>{p.telefono}</span></div>}
            </div>

            <div className={styles.horarioCount} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Badge label={`${p.horarios?.length ?? 0} Horarios`} variant={p.horarios?.length > 0 ? 'teal' : 'gray'} />
              <Badge label={p.usuario.activo ? 'Activo' : 'Inactivo'} variant={p.usuario.activo ? 'teal' : 'gray'} />
            </div>
          </Card>
          </div>
        ))}
      </div>

      <Pagination total={total} page={page} pageSize={PAGE_SIZE} onChange={setPage} />

      {/* CREATE */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setCreateForm(emptyCreate); }} title="Registrar psicólogo">
        {errCreate && <Alert message={errCreate.message.replace('GraphQL error: ', '')} />}
        <form onSubmit={handleCreate} className={styles.modalGrid}>
          <Field label="Nombre completo *">
            <input placeholder="Dr. Carlos Ruiz" value={createForm.nombre} onChange={setC('nombre')} required />
          </Field>
          <Field label="Correo *">
            <input type="email" placeholder="carlos@uni.edu" value={createForm.correo} onChange={setC('correo')} required />
          </Field>
          <Field label="Contraseña temporal *">
            <input type="password" placeholder="Mínimo 8 caracteres" value={createForm.password}
              onChange={setC('password')} required minLength={8} />
          </Field>
          <Field label="Teléfono (opcional)">
            <input placeholder="5559876543" value={createForm.telefono} onChange={setC('telefono')} />
          </Field>
          <Field label="Especialidad (opcional)">
            <input placeholder="Ansiedad y depresión" value={createForm.especialidad} onChange={setC('especialidad')} />
          </Field>
          <Field label="Cédula profesional (opcional)">
            <input placeholder="12345678" value={createForm.cedula} onChange={setC('cedula')} />
          </Field>
          <div className={styles.modalFull}>
            <Button type="submit" loading={creando} size="lg" style={{ width: '100%' }} >
              Registrar
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Editar — ${editTarget?.usuario?.nombre}`}>
        {errEdit && <Alert message={errEdit.message.replace('GraphQL error: ', '')} />}
        <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Especialidad">
            <input value={editForm.especialidad} onChange={setE('especialidad')} placeholder="Psicología clínica" />
          </Field>
          <Field label="Cédula">
            <input value={editForm.cedula} onChange={setE('cedula')} placeholder="12345678" />
          </Field>
          <Field label="Teléfono">
            <input value={editForm.telefono} onChange={setE('telefono')} placeholder="5559876543" />
          </Field>
          <Button type="submit" loading={editando} size="lg" style={{ width: '100%' }} >
            Guardar cambios
          </Button>
        </form>
      </Modal>
    </Layout>
  );
}