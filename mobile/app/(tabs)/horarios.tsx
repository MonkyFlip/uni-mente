import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { useFocusEffect } from 'expo-router';
import { Plus, Trash2, Clock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { GET_PSICOLOGOS, CREAR_HORARIO, ELIMINAR_HORARIO } from '../../graphql/operations';
import { PageHeader, Button, Modal, Field, Input, Alert, EmptyState, Card } from '../../components/UI';
import { Colors } from '../../constants/colors';

const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
const DIAS_ES: Record<string, string> = {
  lunes:'Lunes', martes:'Martes', miercoles:'Miercoles',
  jueves:'Jueves', viernes:'Viernes', sabado:'Sabado', domingo:'Domingo',
};

export default function Horarios() {
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ dia_semana: 'lunes', hora_inicio: '09:00', hora_fin: '10:00' });
  const [success, setSuccess] = useState('');

  const { data, refetch } = useQuery(GET_PSICOLOGOS, { fetchPolicy: 'network-only' });

  // Find current user's psychologist data
  const psicologo = (data?.psicologos ?? []).find(
    (p: any) => p.id_psicologo === user?.id_perfil
  );
  const horarios  = psicologo?.horarios ?? [];

  useFocusEffect(useCallback(() => { refetch(); }, []));

  const [crear, { loading: creando, error: errCrear }] = useMutation(CREAR_HORARIO, {
    onCompleted: () => {
      setSuccess('Horario agregado.');
      setShowAdd(false);
      setForm({ dia_semana: 'lunes', hora_inicio: '09:00', hora_fin: '10:00' });
      setTimeout(() => setSuccess(''), 2000);
      refetch();
    },
  });

  const [eliminar, { loading: eliminando }] = useMutation(ELIMINAR_HORARIO, {
    onCompleted: () => refetch(),
  });

  const handleCrear = () => {
    crear({ variables: { input: {
      id_psicologo: user?.id_perfil,
      dia_semana:   form.dia_semana,
      hora_inicio:  form.hora_inicio.length === 5 ? `${form.hora_inicio}:00` : form.hora_inicio,
      hora_fin:     form.hora_fin.length   === 5 ? `${form.hora_fin}:00`   : form.hora_fin,
      disponible:   true,
    }}});
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <PageHeader title="Mis Horarios" />
          <Button
            size="sm"
            icon={<Plus size={16} color={Colors.white} />}
            onPress={() => setShowAdd(true)}
          >
            Agregar
          </Button>
        </View>

        {success && <Alert message={success} type="success" />}

        {horarios.length === 0 ? (
          <EmptyState
            icon={<Clock size={28} color={Colors.creamDim} />}
            title="Sin horarios"
            description="Agrega tu primer horario disponible con el boton de arriba."
          />
        ) : (
          horarios.map((h: any) => (
            <Card key={h.id_horario} style={styles.horarioCard}>
              <View style={styles.horarioRow}>
                <View style={styles.horarioIcon}>
                  <Clock size={18} color={Colors.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.horarioDia}>{DIAS_ES[h.dia_semana] ?? h.dia_semana}</Text>
                  <Text style={styles.horarioHora}>
                    {h.hora_inicio?.slice(0,5)} — {h.hora_fin?.slice(0,5)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => eliminar({ variables: { id: h.id_horario } })}
                  disabled={eliminando}
                >
                  <Trash2 size={16} color={Colors.danger} strokeWidth={1.8} />
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Agregar horario">
        {errCrear && <Alert message={errCrear.message.replace('GraphQL error: ', '')} />}
        <View style={{ gap: 14 }}>
          <Field label="Dia de la semana">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.diasRow}>
                {DIAS.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.diaBtn, form.dia_semana === d && styles.diaBtnActive]}
                    onPress={() => setForm(f => ({ ...f, dia_semana: d }))}
                  >
                    <Text style={[styles.diaText, form.dia_semana === d && styles.diaTextActive]}>
                      {DIAS_ES[d].slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Field>
          <Field label="Hora inicio (HH:MM)">
            <Input placeholder="09:00" value={form.hora_inicio}
              onChangeText={v => setForm(f => ({ ...f, hora_inicio: v }))} />
          </Field>
          <Field label="Hora fin (HH:MM)">
            <Input placeholder="10:00" value={form.hora_fin}
              onChangeText={v => setForm(f => ({ ...f, hora_fin: v }))} />
          </Field>
          <Button loading={creando} size="lg" icon={<Plus size={16} color={Colors.white} />} onPress={handleCrear}>
            Guardar horario
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
  horarioCard: { gap: 0 },
  horarioRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  horarioIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.tealGlow, alignItems: 'center', justifyContent: 'center' },
  horarioDia:  { fontSize: 14, fontWeight: '600', color: Colors.white },
  horarioHora: { fontSize: 13, color: Colors.creamDim, marginTop: 2 },
  deleteBtn:   { padding: 8, borderRadius: 8, backgroundColor: Colors.dangerBg },
  diasRow:     { flexDirection: 'row', gap: 8 },
  diaBtn:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.navyCard },
  diaBtnActive:{ borderColor: Colors.teal, backgroundColor: Colors.tealGlow },
  diaText:     { fontSize: 13, color: Colors.creamDim, fontWeight: '600' },
  diaTextActive:{ color: Colors.teal },
});
