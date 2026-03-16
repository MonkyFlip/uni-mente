import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@apollo/client';
import { UserPlus, ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { REGISTRAR_ESTUDIANTE } from '../../graphql/operations';
import { Button, Alert, Field, Input } from '../../components/UI';
import { Colors } from '../../constants/colors';

export default function Registro() {
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: '', correo: '', password: '',
    matricula: '', carrera: '', telefono: '',
  });
  const [success, setSuccess] = useState('');

  const [registrar, { loading, error }] = useMutation(REGISTRAR_ESTUDIANTE, {
    onCompleted: () => {
      setSuccess('Cuenta creada correctamente. Ya puedes iniciar sesion.');
      setTimeout(() => router.replace('/(auth)/login'), 2200);
    },
  });

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.nombre || !form.correo || !form.password) return;
    const input: any = {
      nombre:   form.nombre.trim(),
      correo:   form.correo.trim(),
      password: form.password,
    };
    if (form.matricula.trim()) input.matricula = form.matricula.trim();
    if (form.carrera.trim())   input.carrera   = form.carrera.trim();
    if (form.telefono.trim())  input.telefono  = form.telefono.trim();
    registrar({ variables: { input } });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <ArrowLeft size={20} color={Colors.creamDim} />
            <Text style={styles.backText}>Regresar</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.sub}>Registro de estudiante universitario</Text>

          {success && <Alert message={success} type="success" />}
          {error   && <Alert message={error.message.replace('GraphQL error: ', '')} />}

          <View style={styles.fields}>
            <Field label="Nombre completo *">
              <Input placeholder="Tu nombre completo" value={form.nombre} onChangeText={set('nombre')} />
            </Field>
            <Field label="Correo universitario *">
              <Input
                keyboardType="email-address" autoCapitalize="none"
                placeholder="nombre@universidad.edu"
                value={form.correo} onChangeText={set('correo')}
              />
            </Field>
            <Field label="Contrasena * (minimo 8 caracteres)">
              <Input
                secureTextEntry placeholder="Contrasena segura"
                value={form.password} onChangeText={set('password')}
              />
            </Field>
            <Field label="Matricula (opcional)">
              <Input placeholder="A00123456" value={form.matricula} onChangeText={set('matricula')} />
            </Field>
            <Field label="Carrera (opcional)">
              <Input placeholder="Ingenieria en Sistemas" value={form.carrera} onChangeText={set('carrera')} />
            </Field>
            <Field label="Telefono (opcional)">
              <Input keyboardType="phone-pad" placeholder="5559876543" value={form.telefono} onChangeText={set('telefono')} />
            </Field>
          </View>

          <Button
            onPress={handleSubmit} loading={loading} size="lg"
            disabled={!form.nombre || !form.correo || form.password.length < 8}
            icon={<UserPlus size={16} color={Colors.white} />}
          >
            Crear cuenta
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.navy },
  scroll: { flexGrow: 1, padding: 20, gap: 16 },
  back:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  backText: { fontSize: 14, color: Colors.creamDim },
  title:  { fontSize: 28, fontWeight: '800', color: Colors.white },
  sub:    { fontSize: 14, color: Colors.creamDim, marginBottom: 4 },
  fields: { gap: 14 },
});
