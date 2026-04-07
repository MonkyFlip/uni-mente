import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, Switch,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { useFocusEffect } from 'expo-router';
import {
  UserPlus, Edit2, Search, Stethoscope, Phone,
  BadgeCheck, UserCheck, UserX,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  GET_PSICOLOGOS_ADMIN, REGISTRAR_PSICOLOGO,
  ACTUALIZAR_PSICOLOGO, TOGGLE_ACTIVO_PSICOLOGO,
} from '../../graphql/operations';
import {
  PageHeader, Card, Button, Modal, Field, Input,
  Alert, EmptyState, Spinner, Badge, Pagination, usePagination,
} from '../../components/UI';
import { useTheme } from '../../contexts/ThemeContext';
import { MenuButton } from '../../components/Drawer';

function clean<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k in obj) { if (obj[k] !== '' && obj[k] != null) out[k] = obj[k]; }
  return out;
}

const emptyCreate = { nombre: '', correo: '', password: '', especialidad: '', cedula: '', telefono: '' };
const emptyEdit   = { especialidad: '', cedula: '', telefono: '' };
type Filtro = 'todos' | 'activos' | 'inactivos';

export default function AdminPsicologos() {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const { data, loading, refetch } = useQuery(GET_PSICOLOGOS_ADMIN, { fetchPolicy: 'cache-and-network' });
  useFocusEffect(useCallback(() => { refetch(); }, []));

  const [search,      setSearch]      = useState('');
  const [filtro,      setFiltro]      = useState<Filtro>('todos');
  const [showCreate,  setShowCreate]  = useState(false);
  const [editTarget,  setEditTarget]  = useState<any>(null);
  const [createForm,  setCreateForm]  = useState(emptyCreate);
  const [editForm,    setEditForm]    = useState(emptyEdit);
  const [success,     setSuccess]     = useState('');

  const ok = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const [registrar,{ loading: creando, error: errCreate }] = useMutation(REGISTRAR_PSICOLOGO, {
    onCompleted: (d) => {
      ok(`Psicólogo "${d.registrarPsicologo.usuario.nombre}" creado.`);
      setShowCreate(false); setCreateForm(emptyCreate); refetch();
    },
  });

  const [actualizar, { loading: editando, error: errEdit }] = useMutation(ACTUALIZAR_PSICOLOGO, {
    onCompleted: () => { ok('Psicólogo actualizado.'); setEditTarget(null); refetch(); },
  });

  const [toggleActivo] = useMutation(TOGGLE_ACTIVO_PSICOLOGO, {
    onCompleted: (d) => {
      const activo = d.toggleActivoPsicologo.usuario.activo;
      ok(activo ? 'Psicólogo activado.' : 'Psicólogo desactivado.');
      refetch();
    },
  });

  const todos = data?.psicologosAdmin ?? [];

  // Contadores para tabs
  const totalActivos   = todos.filter((p: any) => p.usuario?.activo).length;
  const totalInactivos = todos.filter((p: any) => !p.usuario?.activo).length;

  const lista = todos.filter((p: any) => {
    const matchSearch =
      (p.usuario?.nombre ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.especialidad ?? '').toLowerCase().includes(search.toLowerCase());
    const matchFiltro =
      filtro === 'todos' ? true :
      filtro === 'activos' ? p.usuario?.activo :
      !p.usuario?.activo;
    return matchSearch && matchFiltro;
  });

  const { page, setPage, slice: pagina, total, totalPages } = usePagination(lista, 9);

  const openEdit = (p: any) => {
    setEditTarget(p);
    setEditForm({ especialidad: p.especialidad ?? '', cedula: p.cedula ?? '', telefono: p.telefono ?? '' });
  };

  const set  = (k: keyof typeof createForm) => (v: string) => setCreateForm(f => ({ ...f, [k]: v }));
  const setE = (k: keyof typeof editForm)   => (v: string) => setEditForm(f => ({ ...f, [k]: v }));

  const tabs: { key: Filtro; label: string; count: number }[] = [
    { key: 'todos',    label: 'Todos',    count: todos.length  },
    { key: 'activos',  label: 'Activos',  count: totalActivos  },
    { key: 'inactivos',label: 'Inactivos',count: totalInactivos},
  ];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>

        {/* Header */}
        <View style={s.headerRow}>
          <MenuButton />
          <PageHeader title="Psicólogos" subtitle={`${total} resultado${total !== 1 ? 's' : ''}`} />
          <Button size="sm" icon={<UserPlus size={15} color={colors.white} />}
            onPress={() => setShowCreate(true)}>
            Registrar
          </Button>
        </View>

        {success && <Alert message={success} type="success" />}

        {/* Tabs filtro */}
        <View style={s.tabs}>
          {tabs.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.tab, filtro === t.key && s.tabActive]}
              onPress={() => { setFiltro(t.key); setPage(1); }}
            >
              <Text style={[s.tabLabel, filtro === t.key && s.tabLabelActive]}>
                {t.label}
              </Text>
              <View style={[s.tabBadge, filtro === t.key && s.tabBadgeActive]}>
                <Text style={[s.tabBadgeText, filtro === t.key && s.tabBadgeTextActive]}>
                  {t.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
        <View style={s.searchBar}>
          <Search size={16} color={colors.creamDim} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar por nombre o especialidad..."
            placeholderTextColor={colors.creamDim}
            value={search}
            onChangeText={v => { setSearch(v); setPage(1); }}
          />
        </View>

        {loading && <Spinner />}
        {!loading && lista.length === 0 && (
          <EmptyState
            icon={<UserPlus size={28} color={colors.creamDim} />}
            title="Sin psicólogos"
            description={search ? 'Ninguno coincide con la búsqueda.' : 'Registra el primero.'}
          />
        )}

        {/* Lista */}
        {pagina.map((p: any) => {
          const activo = p.usuario?.activo ?? true;
          return (
            <Card key={p.id_psicologo} style={[s.card, !activo && s.cardInactive]}>
              <View style={s.cardTop}>
                <View style={[s.avatar, !activo && s.avatarInactive]}>
                  <Text style={[s.avatarLetter, !activo && s.avatarLetterInactive]}>
                    {p.usuario?.nombre?.charAt(0) ?? '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.nameRow}>
                    <Text style={[s.name, !activo && s.nameInactive]}>{p.usuario?.nombre ?? ''}</Text>
                    {!activo && (
                      <View style={s.inactiveBadge}>
                        <Text style={s.inactiveBadgeText}>Inactivo</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.correo}>{p.usuario?.correo ?? ''}</Text>
                </View>
                {/* Botón editar */}
                <TouchableOpacity style={s.iconBtn} onPress={() => openEdit(p)}>
                  <Edit2 size={15} color={colors.creamDim} strokeWidth={1.8} />
                </TouchableOpacity>
              </View>

              {p.especialidad && (
                <View style={s.detail}>
                  <Stethoscope size={13} color={colors.teal} />
                  <Text style={s.detailText}>{p.especialidad}</Text>
                </View>
              )}
              {p.cedula && (
                <View style={s.detail}>
                  <BadgeCheck size={13} color={colors.teal} />
                  <Text style={s.detailText}>Cédula: {p.cedula}</Text>
                </View>
              )}
              {p.telefono && (
                <View style={s.detail}>
                  <Phone size={13} color={colors.teal} />
                  <Text style={s.detailText}>{p.telefono}</Text>
                </View>
              )}

              {/* Fila inferior: horarios + toggle */}
              <View style={s.cardFooter}>
                <Badge
                  label={`${p.horarios?.length ?? 0} horarios`}
                  variant={p.horarios?.length > 0 ? 'teal' : 'gray'}
                />
                <View style={s.toggleRow}>
                  {activo
                    ? <UserCheck size={14} color={colors.success} />
                    : <UserX    size={14} color={colors.danger}  />
                  }
                  <Switch
                    value={activo}
                    onValueChange={async () => { await toggleActivo({ variables: { id: p.id_psicologo } }); }}
                    trackColor={{ false: colors.dangerBg, true: colors.tealDim }}
                    thumbColor={activo ? colors.teal : colors.danger}
                    ios_backgroundColor={colors.navyHover}
                  />
                </View>
              </View>
            </Card>
          );
        })}
      </ScrollView>

      <Pagination total={total} page={page} totalPages={totalPages} pageSize={9} onPage={setPage} />

      {/* Modal CREAR */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setCreateForm(emptyCreate); }}
        title="Registrar psicólogo"
      >
        {errCreate && <Alert message={errCreate.message.replace('GraphQL error: ', '')} />}
        <View style={{ gap: 14 }}>
          <Field label="Nombre completo *">
            <Input placeholder="Dr. Carlos Ruiz" value={createForm.nombre} onChangeText={set('nombre')} />
          </Field>
          <Field label="Correo *">
            <Input keyboardType="email-address" autoCapitalize="none"
              placeholder="carlos@uni.edu" value={createForm.correo} onChangeText={set('correo')} />
          </Field>
          <Field label="Contraseña temporal *">
            <Input secureTextEntry placeholder="Mínimo 8 caracteres"
              value={createForm.password} onChangeText={set('password')} />
          </Field>
          <Field label="Especialidad (opcional)">
            <Input placeholder="Ansiedad y depresión" value={createForm.especialidad} onChangeText={set('especialidad')} />
          </Field>
          <Field label="Cédula (opcional)">
            <Input placeholder="12345678" value={createForm.cedula} onChangeText={set('cedula')} />
          </Field>
          <Field label="Teléfono (opcional)">
            <Input keyboardType="phone-pad" placeholder="5559876543"
              value={createForm.telefono} onChangeText={set('telefono')} />
          </Field>
          <Button
            loading={creando} size="lg"
            icon={<UserPlus size={16} color={colors.white} />}
            disabled={!createForm.nombre || !createForm.correo || createForm.password.length < 8}
            onPress={() => {
              const { nombre, correo, password, ...opt } = createForm;
              registrar({ variables: { input: { nombre: nombre.trim(), correo: correo.trim(), password, ...clean(opt) } } });
            }}
          >
            Registrar
          </Button>
        </View>
      </Modal>

      {/* Modal EDITAR */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Editar — ${editTarget?.usuario?.nombre ?? ''}`}
      >
        {errEdit && <Alert message={errEdit.message.replace('GraphQL error: ', '')} />}
        <View style={{ gap: 14 }}>
          <Field label="Especialidad">
            <Input placeholder="Psicología clínica" value={editForm.especialidad} onChangeText={setE('especialidad')} />
          </Field>
          <Field label="Cédula">
            <Input placeholder="12345678" value={editForm.cedula} onChangeText={setE('cedula')} />
          </Field>
          <Field label="Teléfono">
            <Input keyboardType="phone-pad" placeholder="5559876543"
              value={editForm.telefono} onChangeText={setE('telefono')} />
          </Field>
          <Button
            loading={editando} size="lg"
            icon={<Edit2 size={16} color={colors.white} />}
            onPress={() => actualizar({ variables: { id: editTarget?.id_psicologo, input: clean(editForm) } })}
          >
            Guardar cambios
          </Button>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  safe:               { flex: 1, backgroundColor: colors.navy },
  scroll:             { padding: 20, gap: 12, paddingBottom: 40 },
  headerRow:          { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  tabs:               { flexDirection: 'row', gap: 8, marginBottom: 4 },
  tab:                { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                        paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10,
                        backgroundColor: colors.navyCard, borderWidth: 1, borderColor: colors.border },
  tabActive:          { backgroundColor: colors.tealGlow, borderColor: colors.teal },
  tabLabel:           { fontSize: 12, fontWeight: '600', color: colors.creamDim },
  tabLabelActive:     { color: colors.teal },
  tabBadge:           { backgroundColor: colors.navyHover, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeActive:     { backgroundColor: colors.teal },
  tabBadgeText:       { fontSize: 10, fontWeight: '700', color: colors.creamDim },
  tabBadgeTextActive: { color: colors.white },
  searchBar:          { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.navyCard,
                        borderRadius: 10, borderWidth: 1, borderColor: colors.border,
                        paddingHorizontal: 14, paddingVertical: 10 },
  searchInput:        { flex: 1, fontSize: 14, color: colors.white },
  card:               { gap: 10 },
  cardInactive:       { opacity: 0.65 },
  cardTop:            { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:             { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.tealGlow,
                        alignItems: 'center', justifyContent: 'center' },
  avatarInactive:     { backgroundColor: colors.navyHover },
  avatarLetter:       { fontSize: 20, fontWeight: '700', color: colors.teal },
  avatarLetterInactive:{ color: colors.creamDim },
  nameRow:            { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name:               { fontSize: 15, fontWeight: '600', color: colors.white },
  nameInactive:       { color: colors.creamDim },
  inactiveBadge:      { backgroundColor: colors.dangerBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  inactiveBadgeText:  { fontSize: 10, fontWeight: '700', color: colors.danger },
  correo:             { fontSize: 12, color: colors.creamDim },
  iconBtn:            { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.navyHover,
                        borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  detail:             { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText:         { fontSize: 13, color: colors.creamDim },
  cardFooter:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  toggleRow:          { flexDirection: 'row', alignItems: 'center', gap: 6 },
});