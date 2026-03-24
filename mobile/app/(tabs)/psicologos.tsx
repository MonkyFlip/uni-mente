import { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { Search, Stethoscope, Clock, Calendar, BadgeCheck, Phone, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { GET_PSICOLOGOS, AGENDAR_CITA } from '../../graphql/operations';
import { PageHeader, Card, Button, Modal, Field, Input, Alert, EmptyState, Spinner, Badge, Pagination, usePagination } from '../../components/UI';
import { Colors } from '../../constants/colors';

const DIAS_ES: Record<string, string> = {
  lunes:'Lunes', martes:'Martes', miercoles:'Miercoles',
  jueves:'Jueves', viernes:'Viernes', sabado:'Sabado', domingo:'Domingo',
};
const DIA_JS: Record<string, number> = {
  domingo:0, lunes:1, martes:2, miercoles:3, jueves:4, viernes:5, sabado:6,
};

function proximaFecha(dia: string) {
  const target = DIA_JS[dia.toLowerCase()] ?? 1;
  const hoy    = new Date();
  const diff   = (target - hoy.getDay() + 7) % 7;
  const d      = new Date(hoy);
  d.setDate(hoy.getDate() + (diff === 0 ? 7 : diff));
  return d.toISOString().split('T')[0];
}

export default function Psicologos() {
  const { user }  = useAuth();
  const isStudent = user?.rol === 'estudiante';
  const { data, loading, refetch } = useQuery(GET_PSICOLOGOS, { fetchPolicy: 'cache-and-network' });

  useFocusEffect(useCallback(() => { refetch(); }, []));

  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState<any>(null);
  const [horario,   setHorario]   = useState<any>(null);
  const [fecha,     setFecha]     = useState('');
  const [motivo,    setMotivo]    = useState('');
  const [success,   setSuccess]   = useState('');
  const [calMonth,  setCalMonth]  = useState(() => {
    const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() };
  });

  const [agendar, { loading: agendando, error: errAgendar }] = useMutation(AGENDAR_CITA, {
    onCompleted: () => {
      setSuccess('Cita agendada correctamente.');
      refetch();
      setTimeout(() => { setSelected(null); setHorario(null); setFecha(''); setMotivo(''); setSuccess(''); }, 2200);
    },
  });

  const lista = useMemo(() =>
    (data?.psicologos ?? []).filter((p: any) =>
      (p.usuario?.nombre ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.especialidad ?? '').toLowerCase().includes(search.toLowerCase())
    ),
    [data, search]
  );

  const { page, setPage, slice: pagina, total, totalPages } = usePagination(lista, 6);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <PageHeader title="Psicologos" subtitle={`${total} profesional${total !== 1 ? "es" : ""} disponible${total !== 1 ? "s" : ""}`} />

        {/* Search */}
        <View style={styles.searchBar}>
          <Search size={16} color={Colors.creamDim} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o especialidad..."
            placeholderTextColor={Colors.creamDim}
            value={search}
            onChangeText={v => { setSearch(v); setPage(1); }}
          />
        </View>

        {loading && <Spinner />}
        {!loading && lista.length === 0 && (
          <EmptyState icon={<Search size={28} color={Colors.creamDim} />}
            title="Sin resultados" description="Ningun psicologo coincide con la busqueda." />
        )}

        {pagina.map((p: any) => {
          const disponibles = (p.horarios ?? []).filter((h: any) => h.disponible);
          return (
            <Card key={p.id_psicologo} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarLetter}>{p.usuario?.nombre?.charAt(0) ?? "?"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{p.usuario?.nombre ?? ""}</Text>
                  <Text style={styles.correo}>{p.usuario?.correo ?? ""}</Text>
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
              {disponibles.length > 0 && (
                <View style={styles.horarios}>
                  <Text style={styles.horariosTitle}>Disponibilidad</Text>
                  {disponibles.map((h: any) => (
                    <View key={h.id_horario} style={styles.horarioChip}>
                      <Clock size={12} color={Colors.teal} />
                      <Text style={styles.horarioText}>
                        {DIAS_ES[h.dia_semana] ?? h.dia_semana} — {h.hora_inicio?.slice(0,5)} a {h.hora_fin?.slice(0,5)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {isStudent && disponibles.length > 0 && (
                <Button
                  onPress={() => { setSelected(p); setHorario(null); setFecha(''); setMotivo(''); setSuccess(''); }}
                  size="sm"
                  icon={<Calendar size={14} color={Colors.white} />}
                  style={{ marginTop: 8 }}
                >
                  Agendar cita
                </Button>
              )}
            </Card>
          );
        })}
      </ScrollView>

      <Pagination total={total} page={page} totalPages={totalPages} pageSize={6} onPage={setPage} />

      {/* Modal de agendamiento */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Agendar con ${selected?.usuario?.nombre ?? ""}`}>
        {success ? (
          <Alert message={success} type="success" />
        ) : (
          <View style={{ gap: 16 }}>
            {errAgendar && <Alert message={errAgendar.message.replace('GraphQL error: ', '')} />}
            <Text style={styles.stepLabel}>1. Selecciona un horario</Text>
            {(selected?.horarios ?? []).filter((h: any) => h.disponible).map((h: any) => (
              <TouchableOpacity
                key={h.id_horario}
                style={[styles.horarioBtn, horario?.id_horario === h.id_horario && styles.horarioBtnActive]}
                onPress={() => {
                  setHorario(h);
                  const pf = proximaFecha(h.dia_semana);
                  setFecha('');
                  // Jump calendar to the month of the next valid date
                  const d = new Date(pf + 'T12:00:00');
                  setCalMonth({ y: d.getFullYear(), m: d.getMonth() });
                }}
              >
                <View>
                  <Text style={styles.horarioBtnDia}>{DIAS_ES[h.dia_semana] ?? h.dia_semana}</Text>
                  <Text style={styles.horarioBtnHora}>{h.hora_inicio?.slice(0,5)} – {h.hora_fin?.slice(0,5)}</Text>
                </View>
                {horario?.id_horario === h.id_horario && (
                  <CheckCircle2 size={18} color={Colors.teal} />
                )}
              </TouchableOpacity>
            ))}

            {horario && (
              <>
                <Text style={styles.stepLabel}>2. Elige una fecha</Text>
                <InlineCalendar
                  diaPermitido={DIA_JS[horario.dia_semana?.toLowerCase() ?? ''] ?? -1}
                  selected={fecha}
                  onSelect={setFecha}
                  month={calMonth}
                  onMonthChange={setCalMonth}
                />
                {fecha ? (
                  <View style={styles.fechaDisplay}>
                    <Calendar size={16} color={Colors.teal} />
                    <Text style={styles.fechaText}>
                      {new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.stepLabel}>3. Motivo (opcional)</Text>
                <Field label="">
                  <Input
                    placeholder="Describe brevemente el motivo..."
                    value={motivo}
                    onChangeText={setMotivo}
                    multiline
                    numberOfLines={3}
                    style={{ minHeight: 70, textAlignVertical: 'top' }}
                  />
                </Field>
                <Button
                  onPress={() => agendar({ variables: { input: {
                    id_psicologo: selected.id_psicologo,
                    id_horario:   horario.id_horario,
                    fecha,
                    ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
                  }}})}
                  loading={agendando}
                  size="lg"
                  disabled={!horario || !fecha || fecha.length < 8}
                  icon={<Calendar size={16} color={Colors.white} />}
                >
                  Confirmar cita
                </Button>
              </>
            )}
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

// ── Custom inline calendar ────────────────────────────────────────
const MONTH_ES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];
const DOW_ES = ['D','L','M','M','J','V','S'];

function InlineCalendar({
  diaPermitido, selected, onSelect, month, onMonthChange,
}: {
  diaPermitido: number;
  selected:     string;
  onSelect:     (d: string) => void;
  month:        { y: number; m: number };
  onMonthChange:(m: { y: number; m: number }) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build days grid
  const firstDay = new Date(month.y, month.m, 1).getDay();
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last week
  while (cells.length % 7 !== 0) cells.push(null);

  const isAllowed = (day: number) => {
    const d = new Date(month.y, month.m, day);
    return d.getDay() === diaPermitido && d > today;
  };

  const toISO = (day: number) => {
    const m = String(month.m + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${month.y}-${m}-${d}`;
  };

  const prev = () => {
    if (month.m === 0) onMonthChange({ y: month.y - 1, m: 11 });
    else onMonthChange({ y: month.y, m: month.m - 1 });
  };
  const next = () => {
    if (month.m === 11) onMonthChange({ y: month.y + 1, m: 0 });
    else onMonthChange({ y: month.y, m: month.m + 1 });
  };

  return (
    <View style={calStyles.wrap}>
      {/* Header */}
      <View style={calStyles.header}>
        <TouchableOpacity onPress={prev} style={calStyles.navBtn}>
          <ChevronLeft size={18} color={Colors.cream} />
        </TouchableOpacity>
        <Text style={calStyles.monthTitle}>
          {MONTH_ES[month.m]} {month.y}
        </Text>
        <TouchableOpacity onPress={next} style={calStyles.navBtn}>
          <ChevronRight size={18} color={Colors.cream} />
        </TouchableOpacity>
      </View>

      {/* Day of week headers */}
      <View style={calStyles.dowRow}>
        {DOW_ES.map((d, i) => (
          <Text
            key={i}
            style={[calStyles.dowText, i === diaPermitido && calStyles.dowActive]}
          >{d}</Text>
        ))}
      </View>

      {/* Days grid */}
      <View style={calStyles.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={idx} style={calStyles.cell} />;
          const iso     = toISO(day);
          const allowed = isAllowed(day);
          const isSelected = iso === selected;
          return (
            <TouchableOpacity
              key={idx}
              style={[
                calStyles.cell,
                allowed   && calStyles.cellAllowed,
                isSelected && calStyles.cellSelected,
              ]}
              onPress={() => allowed && onSelect(iso)}
              disabled={!allowed}
              activeOpacity={0.7}
            >
              <Text style={[
                calStyles.cellText,
                allowed    && calStyles.cellTextAllowed,
                isSelected && calStyles.cellTextSelected,
              ]}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const calStyles = StyleSheet.create({
  wrap:       { backgroundColor: Colors.navyCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  navBtn:     { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.navyHover, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { fontSize: 14, fontWeight: '700', color: Colors.white },
  dowRow:     { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dowText:    { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: Colors.creamDim },
  dowActive:  { color: Colors.teal },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', padding: 4 },
  cell:       { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  cellAllowed:{ backgroundColor: Colors.tealGlow },
  cellSelected:{ backgroundColor: Colors.teal },
  cellText:   { fontSize: 13, color: Colors.creamDim },
  cellTextAllowed: { color: Colors.teal, fontWeight: '600' },
  cellTextSelected:{ color: Colors.navy, fontWeight: '800' },
});


const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.navy },
  scroll:      { padding: 20, gap: 14, paddingBottom: 40 },
  searchBar:   {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.navyCard, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.white },
  card:        { gap: 10 },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:      {
    width: 46, height: 46, borderRadius: 12, backgroundColor: Colors.tealGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter:{ fontSize: 20, fontWeight: '700', color: Colors.teal },
  name:        { fontSize: 15, fontWeight: '600', color: Colors.white },
  correo:      { fontSize: 12, color: Colors.creamDim },
  detail:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText:  { fontSize: 13, color: Colors.creamDim },
  horarios:    { gap: 6 },
  horariosTitle:{ fontSize: 12, fontWeight: '600', color: Colors.creamDim },
  horarioChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  horarioText: { fontSize: 12, color: Colors.cream },
  stepLabel:   { fontSize: 13, fontWeight: '600', color: Colors.creamDim },
  horarioBtn:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.navy,
  },
  horarioBtnActive: { borderColor: Colors.teal, backgroundColor: Colors.tealGlow },
  horarioBtnDia:   { fontSize: 14, fontWeight: '600', color: Colors.cream },
  horarioBtnHora:  { fontSize: 12, color: Colors.creamDim },
  fechaDisplay:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: Colors.navyHover, borderRadius: 10 },
  fechaText:       { fontSize: 13, color: Colors.cream },
});
