import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@apollo/client';
import { Brain, ArrowRight, Eye, EyeOff, Lock, ShieldCheck, FileHeart, TrendingUp } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { LOGIN, CAMBIAR_PASSWORD } from '../../graphql/operations';
import { Button, Alert, Field, Input, Modal } from '../../components/UI';
import { Colors } from '../../constants/colors';

const FEATURES = [
  { Icon: ShieldCheck, text: 'Citas con psicólogos certificados' },
  { Icon: FileHeart,   text: 'Historial clínico confidencial'    },
  { Icon: TrendingUp,  text: 'Seguimiento personalizado'         },
];

export default function Login() {
  const { login }  = useAuth();
  const router     = useRouter();
  const [correo,   setCorreo]   = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Change password modal state
  const [cpCorreo,   setCpCorreo]   = useState('');
  const [cpActual,   setCpActual]   = useState('');
  const [cpNueva,    setCpNueva]    = useState('');
  const [cpMfa,      setCpMfa]      = useState('');
  const [cpSuccess,  setCpSuccess]  = useState('');
  const [showAct,    setShowAct]    = useState(false);
  const [showNew,    setShowNew]    = useState(false);

  const [doLogin, { loading, error }] = useMutation(LOGIN, {
    onCompleted: async ({ login: data }) => {
      await login({
        token:     data.access_token,
        rol:       data.rol,
        nombre:    data.nombre,
        correo:    data.correo,
        id_perfil: data.id_perfil ?? undefined,
      });
      if (data.rol === 'administrador') {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(tabs)/dashboard');
      }
    },
  });

  const [cambiarPassword, { loading: loadingPwd, error: errPwd }] = useMutation(CAMBIAR_PASSWORD, {
    onCompleted: () => {
      setCpSuccess('Contrasena actualizada. Ya puedes iniciar sesion.');
      setTimeout(() => { setShowModal(false); resetPwd(); }, 2500);
    },
  });

  const resetPwd = () => {
    setCpCorreo(''); setCpActual(''); setCpNueva('');
    setCpMfa(''); setCpSuccess(''); setShowAct(false); setShowNew(false);
  };

  const handleLogin = () => {
    if (!correo.trim() || !password.trim()) return;
    doLogin({ variables: { correo: correo.trim(), password } });
  };

  const handleCambiarPwd = () => {
    if (cpMfa.length !== 6) return;
    cambiarPassword({ variables: { input: {
      password_actual: cpActual,
      password_nuevo:  cpNueva,
      codigo_mfa:      cpMfa,
    }}});
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoWrap}>
              <Brain size={32} color={Colors.teal} strokeWidth={1.5} />
            </View>
            <Text style={styles.heroTitle}>UniMente</Text>
            <Text style={styles.heroSub}>Portal de bienestar psicologico universitario</Text>
            <View style={styles.features}>
              {FEATURES.map(({ Icon, text }) => (
                <View key={text} style={styles.feature}>
                  <Icon size={14} color={Colors.teal} strokeWidth={2} />
                  <Text style={styles.featureText}>{text}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Bienvenido de vuelta</Text>
            <Text style={styles.formSub}>Ingresa tus credenciales para continuar</Text>

            {error && <Alert message={error.message.replace('GraphQL error: ', '')} />}

            <View style={styles.fields}>
              <Field label="Correo electronico">
                <Input
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="correo@universidad.edu"
                  value={correo}
                  onChangeText={setCorreo}
                />
              </Field>

              <Field label="Contrasena">
                <View style={styles.pwdRow}>
                  <Input
                    secureTextEntry={!showPwd}
                    placeholder="Minimo 8 caracteres"
                    value={password}
                    onChangeText={setPassword}
                    style={{ flex: 1 }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPwd(v => !v)}
                    style={styles.eyeBtn}
                  >
                    {showPwd
                      ? <EyeOff size={18} color={Colors.creamDim} />
                      : <Eye    size={18} color={Colors.creamDim} />
                    }
                  </TouchableOpacity>
                </View>
              </Field>
            </View>

            <Button
              onPress={handleLogin}
              loading={loading}
              size="lg"
              icon={<ArrowRight size={16} color={Colors.white} />}
              style={{ marginTop: 8 }}
            >
              Iniciar sesion
            </Button>

            <TouchableOpacity
              style={styles.changePwdBtn}
              onPress={() => setShowModal(true)}
            >
              <Lock size={13} color={Colors.creamDim} />
              <Text style={styles.changePwdText}>Cambiar contrasena</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/registro')}
              style={styles.registerLink}
            >
              <Text style={styles.registerText}>
                Primera vez?{' '}
                <Text style={styles.registerAccent}>Crea tu cuenta de estudiante</Text>
              </Text>
            </TouchableOpacity>


          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal cambio de contrasena */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetPwd(); }} title="Cambiar contrasena">
        {cpSuccess ? (
          <Alert message={cpSuccess} type="success" />
        ) : (
          <>
            {errPwd && <Alert message={errPwd.message.replace('GraphQL error: ', '')} />}
            <View style={{ gap: 14 }}>
              <Text style={styles.modalNote}>
                Por seguridad, el cambio de contrasena siempre requiere el codigo MFA de 6 digitos de tu app autenticadora.
              </Text>
              <Field label="Correo de tu cuenta">
                <Input
                  keyboardType="email-address" autoCapitalize="none"
                  placeholder="tu@correo.edu"
                  value={cpCorreo} onChangeText={setCpCorreo}
                />
              </Field>
              <Field label="Contrasena actual">
                <View style={styles.pwdRow}>
                  <Input
                    secureTextEntry={!showAct}
                    placeholder="Tu contrasena actual"
                    value={cpActual} onChangeText={setCpActual}
                    style={{ flex: 1 }}
                  />
                  <TouchableOpacity onPress={() => setShowAct(v => !v)} style={styles.eyeBtn}>
                    {showAct ? <EyeOff size={16} color={Colors.creamDim} /> : <Eye size={16} color={Colors.creamDim} />}
                  </TouchableOpacity>
                </View>
              </Field>
              <Field label="Nueva contrasena (minimo 8 caracteres)">
                <View style={styles.pwdRow}>
                  <Input
                    secureTextEntry={!showNew}
                    placeholder="Nueva contrasena"
                    value={cpNueva} onChangeText={setCpNueva}
                    style={{ flex: 1 }}
                  />
                  <TouchableOpacity onPress={() => setShowNew(v => !v)} style={styles.eyeBtn}>
                    {showNew ? <EyeOff size={16} color={Colors.creamDim} /> : <Eye size={16} color={Colors.creamDim} />}
                  </TouchableOpacity>
                </View>
              </Field>
              <Field label="Codigo MFA (obligatorio — 6 digitos)">
                <Input
                  keyboardType="number-pad" maxLength={6}
                  placeholder="1  2  3  4  5  6"
                  value={cpMfa} onChangeText={t => setCpMfa(t.replace(/\D/g, ''))}
                  style={styles.mfaInput}
                />
                {cpMfa.length > 0 && cpMfa.length < 6 && (
                  <Text style={styles.mfaHint}>Faltan {6 - cpMfa.length} digitos</Text>
                )}
              </Field>
              <Button
                onPress={handleCambiarPwd}
                loading={loadingPwd}
                size="lg"
                disabled={!cpCorreo || !cpActual || cpNueva.length < 8 || cpMfa.length !== 6}
                icon={<Lock size={15} color={Colors.white} />}
              >
                Actualizar contrasena
              </Button>
            </View>
          </>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.navy },
  scroll: { flexGrow: 1, padding: 20, gap: 24 },
  header: { alignItems: 'center', paddingTop: 20, gap: 12 },
  logoWrap: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: Colors.tealGlow, alignItems: 'center', justifyContent: 'center',
  },
  heroTitle:   { fontSize: 32, fontWeight: '800', color: Colors.white },
  heroSub:     { fontSize: 14, color: Colors.creamDim, textAlign: 'center', maxWidth: 280 },
  features:    { gap: 8, alignSelf: 'stretch' },
  feature:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 13, color: Colors.creamDim },
  formCard: {
    backgroundColor: Colors.navyCard, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    padding: 20, gap: 16,
  },
  formTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },
  formSub:   { fontSize: 13, color: Colors.creamDim },
  fields:    { gap: 14 },
  pwdRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn:    { padding: 10 },
  changePwdBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 9,
    paddingVertical: 10, borderStyle: 'dashed',
  },
  changePwdText: { fontSize: 13, color: Colors.creamDim },
  registerLink:  { alignItems: 'center' },
  registerText:  { fontSize: 13, color: Colors.creamDim },
  registerAccent:{ color: Colors.teal, fontWeight: '600' },
  modalNote: { fontSize: 13, color: Colors.creamDim, lineHeight: 20 },
  mfaInput:  { fontSize: 22, letterSpacing: 8, textAlign: 'center', fontWeight: '700' },
  mfaHint:   { fontSize: 11, color: Colors.warning, textAlign: 'center', marginTop: 4 },
});