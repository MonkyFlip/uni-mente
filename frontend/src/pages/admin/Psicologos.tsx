import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { UserPlus, Edit2, Trash2, Search, Stethoscope, Phone, BadgeCheck } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader, Card, Button, EmptyState, Spinner, Modal, Field, Alert, Badge } from '../../components/UI';
import { GET_PSICOLOGOS, REGISTRAR_PSICOLOGO, ACTUALIZAR_PSICOLOGO } from '../../graphql/operations';
import styles from './Psicologos.module.css';

/** Elimina claves con valor vacío o null del objeto, dejando solo campos con dato real */
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
  const { data, loading, refetch } = useQuery(GET_PSICOLOGOS);
  const [search,       setSearch]      = useState('');
  const [showCreate,   setShowCreate]  = useState(false);
  const [editTarget,   setEditTarget]  = useState<any>(null);
  const [deleteTarget, setDeleteTarget]= useState<any>(null);
  const [createForm,   setCreateForm]  = useState(emptyCreate);
  const [editForm,     setEditForm]    = useState(emptyEdit);
  const [success,      setSuccess]     = useState('');

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

  const psicologos = (data?.psicologos ?? []).filter((p: any) =>
    p.usuario.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (p.especialidad ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (p: any) => {
    setEditTarget(p);
    setEditForm({
      especialidad: p.especialidad ?? '',
      cedula:       p.cedula       ?? '',
      telefono:     p.telefono     ?? '',
    });
  };

  const setC = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCreateForm(f => ({ ...f, [k]: e.target.value }));
  const setE = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditForm(f => ({ ...f, [k]: e.target.value }));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    // nombre, correo, password son requeridos — los demás son opcionales
    const { nombre, correo, password, ...opcionales } = createForm;
    if (!nombre.trim() || !correo.trim() || !password.trim()) return;
    const input = { nombre: nombre.trim(), correo: correo.trim(), password, ...clean(opcionales) };
    registrar({ variables: { input } });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    // Solo enviar campos que tienen valor real
    const input = clean(editForm);
    actualizar({ variables: { id: editTarget.id_psicologo, input } });
  };

  return (
    <Layout>
      <PageHeader
        title="Psicólogos"
        subtitle="Gestiona el equipo de profesionales"
        action={
          <Button variant="primary" icon={<UserPlus size={16} />} onClick={() => setShowCreate(true)}>
            Registrar psicólogo
          </Button>
        }
      />

      {success && <div style={{ marginBottom: 16 }}><Alert message={success} type="success" /></div>}

      <div className={styles.searchBar}>
        <Search size={15} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder="Buscar por nombre o especialidad..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size={36} /></div>}
      {!loading && psicologos.length === 0 && (
        <EmptyState icon={<UserPlus size={28} />} title="Sin psicólogos"
          description="Registra el primer psicólogo con el botón de arriba." />
      )}

      <div className={`${styles.grid} stagger`}>
        {psicologos.map((p: any) => (
          <Card key={p.id_psicologo} className={styles.card}>
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
                <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} title="Eliminar"
                  onClick={() => setDeleteTarget(p)}>
                  <Trash2 size={15} strokeWidth={1.8} />
                </button>
              </div>
            </div>

            <div className={styles.details}>
              {p.especialidad && <div className={styles.detail}><Stethoscope size={13} /><span>{p.especialidad}</span></div>}
              {p.cedula       && <div className={styles.detail}><BadgeCheck  size={13} /><span>Cédula: {p.cedula}</span></div>}
              {p.telefono     && <div className={styles.detail}><Phone       size={13} /><span>{p.telefono}</span></div>}
            </div>

            <div className={styles.horarioCount}>
              <Badge
                label={`${p.horarios?.length ?? 0} horarios`}
                variant={p.horarios?.length > 0 ? 'teal' : 'gray'}
              />
            </div>
          </Card>
        ))}
      </div>

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
            <Button type="submit" loading={creando} size="lg" style={{ width: '100%' }} icon={<UserPlus size={16} />}>
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
          <Button type="submit" loading={editando} size="lg" style={{ width: '100%' }} icon={<Edit2 size={16} />}>
            Guardar cambios
          </Button>
        </form>
      </Modal>

      {/* DELETE confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar psicólogo">
        <p style={{ color: 'var(--cream-dim)', fontSize: 14, lineHeight: 1.6 }}>
          ¿Estás seguro de que deseas eliminar a{' '}
          <strong style={{ color: 'var(--cream)' }}>{deleteTarget?.usuario?.nombre}</strong>?
          Esta acción eliminará también todos sus horarios y citas asociadas.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          <Button variant="danger" icon={<Trash2 size={14} strokeWidth={1.8} />}
            onClick={() => setDeleteTarget(null)}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </Layout>
  );
}
