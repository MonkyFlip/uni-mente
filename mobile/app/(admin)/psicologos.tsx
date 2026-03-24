import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { useFocusEffect } from 'expo-router';
import { UserPlus, Edit2, Trash2, Search, Stethoscope, Phone, BadgeCheck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GET_PSICOLOGOS, REGISTRAR_PSICOLOGO, ACTUALIZAR_PSICOLOGO } from '../../graphql/operations';
import {
  PageHeader, Card, Button, Modal, Field, Input,
  Alert, EmptyState, Spinner, Badge, Pagination, usePagination,
} from '../../components/UI';
import { Colors } from '../../constants/colors';

function clean<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k in obj) { if (obj[k] !== '' && obj[k] != null) out[k] = obj[k]; }
  return out;
}

const emptyCreate = { nombre: '', correo: '', password: '', especialidad: '', cedula: '', telefono: '' };
const emptyEdit   = { especialidad: '', cedula: '', telefono: '' };

export default function AdminPsicologos() {
  const { data, loading, refetch } = useQuery(GET_PSICOLOGOS, { fetchPolicy: 'cache-and-network' });

  useFocusEffect(useCallback(() => { refetch(); }, []));
  const [search,       setSearch]       = useState('');
  const [showCreate,   setShowCreate]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [createForm,   setCreateForm]   = useState(emptyCreate);
  const [editForm,     setEditForm]     = useState(emptyEdit);
  const [success,      setSuccess]      = useState('');

  const ok = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const [registrar, { loading: creando, error: errCreate }] = useMutation(REGISTRAR_PSICOLOGO, {
    onCompleted: (d) => {
      ok(`Psicologo "${d.registrarPsicologo.usuario.nombre}" creado.`);
      setShowCreate(false); setCreateForm(emptyCreate); refetch();
    },
  });

  const [actualizar, { loading: editando, error: errEdit }] = useMutation(ACTUALIZAR_PSICOLOGO, {
    onCompleted: () => { ok('Psicologo actualizado.'); setEditTarget(null); refetch(); },
  });

  const lista = (data?.psicologos ?? []).filter((p: any) =>
    (p.usuario?.nombre ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (p.especialidad ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const { page, setPage, slice: pagina, total, totalPages } = usePagination(lista, 9);

  const openEdit = (p: any) => {
    setEditTarget(p);
    setEditForm({ especialidad: p.especialidad ?? '', cedula: p.cedula ?? '', telefono: p.telefono ?? '' });
  };

  const set = (k: keyof typeof createForm) => (v: string) => setCreateForm(f => ({ ...f, [k]: v }));
  const setE = (k: keyof typeof editForm)  => (v: string) => setEditForm(f => ({ ...f, [k]: v }));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <PageHeader title="Psicologos" subtitle={`${total} registrado${total !== 1 ? "s" : ""}`} />
          <Button size="sm" icon={<UserPlus size={15} color={Colors.white} />} onPress={() => setShowCreate(true)}>
            Registrar
          </Button>
        </View>

        {success && <Alert message={success} type="success" />}

        <View style={styles.searchBar}>
          <Search size={16} color={Colors.creamDim} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o especialidad..."
            placeholderTextColor={Colors.creamDim}
            value={search} onChangeText={v => { setSearch(v); setPage(1); }}
          />
        </View>

        {loading && <Spinner />}
        {!loading && lista.length === 0 && (
          <EmptyState icon={<UserPlus size={28} color={Colors.creamDim} />}
            title="Sin psicologos"
            description={search ? 'Ninguno coincide con la busqueda.' : 'Registra el primero con el boton de arriba.'} />
        )}

        {pagina.map((p: any) => (
          <Card key={p.id_psicologo} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>{p.usuario?.nombre?.charAt(0) ?? "?"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{p.usuario?.nombre ?? ""}</Text>
                <Text style={styles.correo}>{p.usuario?.correo ?? ""}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => openEdit(p)}
                >
                  <Edit2 size={15} color={Colors.creamDim} strokeWidth={1.8} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconBtn, styles.iconBtnDanger]}
                  onPress={() => setDeleteTarget(p)}
                >
                  <Trash2 size={15} color={Colors.danger} strokeWidth={1.8} />
                </TouchableOpacity>
              </View>
            </View>

            {p.especialidad && (
              <View style={styles.detail}>
                <Stethoscope size={13} color={Colors.teal} />
                <Text style={styles.detailText}>{p.especialidad}</Text>
              </View>
            )}
            {p.cedula && (
              <View style={styles.detail}>
                <BadgeCheck size={13} color={Colors.teal} />
                <Text style={styles.detailText}>Cedula: {p.cedula}</Text>
              </View>
            )}
            {p.telefono && (
              <View style={styles.detail}>
                <Phone size={13} color={Colors.teal} />
                <Text style={styles.detailText}>{p.telefono}</Text>
              </View>
            )}
            <Badge
              label={`${p.horarios?.length ?? 0} horarios`}
              variant={p.horarios?.length > 0 ? 'teal' : 'gray'}
            />
          </Card>
        ))}
      </ScrollView>

      <Pagination total={total} page={page} totalPages={totalPages} pageSize={9} onPage={setPage} />

      {/* CREATE */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setCreateForm(emptyCreate); }} title="Registrar psicologo">
        {errCreate && <Alert message={errCreate.message.replace('GraphQL error: ', '')} />}
        <View style={{ gap: 14 }}>
          <Field label="Nombre completo *">
            <Input placeholder="Dr. Carlos Ruiz" value={createForm.nombre} onChangeText={set('nombre')} />
          </Field>
          <Field label="Correo *">
            <Input keyboardType="email-address" autoCapitalize="none"
              placeholder="carlos@uni.edu" value={createForm.correo} onChangeText={set('correo')} />
          </Field>
          <Field label="Contrasena temporal *">
            <Input secureTextEntry placeholder="Minimo 8 caracteres"
              value={createForm.password} onChangeText={set('password')} />
          </Field>
          <Field label="Especialidad (opcional)">
            <Input placeholder="Ansiedad y depresion" value={createForm.especialidad} onChangeText={set('especialidad')} />
          </Field>
          <Field label="Cedula (opcional)">
            <Input placeholder="12345678" value={createForm.cedula} onChangeText={set('cedula')} />
          </Field>
          <Field label="Telefono (opcional)">
            <Input keyboardType="phone-pad" placeholder="5559876543"
              value={createForm.telefono} onChangeText={set('telefono')} />
          </Field>
          <Button loading={creando} size="lg" icon={<UserPlus size={16} color={Colors.white} />}
            disabled={!createForm.nombre || !createForm.correo || createForm.password.length < 8}
            onPress={() => {
              const { nombre, correo, password, ...opt } = createForm;
              registrar({ variables: { input: { nombre: nombre.trim(), correo: correo.trim(), password, ...clean(opt) } } });
            }}>
            Registrar
          </Button>
        </View>
      </Modal>

      {/* EDIT */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Editar — ${editTarget?.usuario?.nombre ?? ""}`}>
        {errEdit && <Alert message={errEdit.message.replace('GraphQL error: ', '')} />}
        <View style={{ gap: 14 }}>
          <Field label="Especialidad">
            <Input placeholder="Psicologia clinica" value={editForm.especialidad} onChangeText={setE('especialidad')} />
          </Field>
          <Field label="Cedula">
            <Input placeholder="12345678" value={editForm.cedula} onChangeText={setE('cedula')} />
          </Field>
          <Field label="Telefono">
            <Input keyboardType="phone-pad" placeholder="5559876543" value={editForm.telefono} onChangeText={setE('telefono')} />
          </Field>
          <Button loading={editando} size="lg" icon={<Edit2 size={16} color={Colors.white} />}
            onPress={() => actualizar({ variables: { id: editTarget?.id_psicologo, input: clean(editForm) } })}>
            Guardar cambios
          </Button>
        </View>
      </Modal>

      {/* DELETE */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar psicologo">
        <Text style={styles.modalText}>
          Eliminar a <Text style={{ color: Colors.cream, fontWeight: '700' }}>{deleteTarget?.usuario?.nombre ?? ""}</Text>?
          Esta accion eliminara todos sus horarios y citas asociadas.
        </Text>
        <View style={styles.row}>
          <Button variant="secondary" onPress={() => setDeleteTarget(null)} style={{ flex: 1 }}>Cancelar</Button>
          <Button variant="danger" icon={<Trash2 size={14} color={Colors.white} strokeWidth={1.8} />}
            onPress={() => setDeleteTarget(null)} style={{ flex: 1 }}>
            Eliminar
          </Button>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.navy },
  scroll:      { padding: 20, gap: 12, paddingBottom: 40 },
  headerRow:   { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  searchBar:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.navyCard, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.white },
  card:        { gap: 10 },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:      { width: 46, height: 46, borderRadius: 12, backgroundColor: Colors.tealGlow, alignItems: 'center', justifyContent: 'center' },
  avatarLetter:{ fontSize: 20, fontWeight: '700', color: Colors.teal },
  name:        { fontSize: 15, fontWeight: '600', color: Colors.white },
  correo:      { fontSize: 12, color: Colors.creamDim },
  cardActions: { flexDirection: 'row', gap: 8 },
  iconBtn:     { width: 34, height: 34, borderRadius: 8, backgroundColor: Colors.navyHover, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  iconBtnDanger:{ backgroundColor: Colors.dangerBg, borderColor: Colors.danger + '44' },
  detail:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText:  { fontSize: 13, color: Colors.creamDim },
  modalText:   { fontSize: 14, color: Colors.creamDim, lineHeight: 22, marginBottom: 16 },
  row:         { flexDirection: 'row', gap: 10 },
});
