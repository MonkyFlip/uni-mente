import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { ShieldCheck, ShieldOff, QrCode, Copy, Check } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  GET_MFA_ESTADO, SETUP_MFA, HABILITAR_MFA, DESHABILITAR_MFA,
} from '../../graphql/operations';
import { PageHeader, Card, Button, Modal, Field, Input, Alert } from '../../components/UI';
import { Colors } from '../../constants/colors';

export default function MfaScreen() {
  const { data, loading, refetch } = useQuery(GET_MFA_ESTADO, { fetchPolicy: 'network-only' });
  const mfaEnabled = Number(data?.miEstadoMfa?.mfa_enabled) === 1;

  const [qrData,    setQrData]    = useState<{ qr_code: string; secret: string } | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showDis,   setShowDis]   = useState(false);
  const [codigo,    setCodigo]    = useState('');
  const [codDis,    setCodDis]    = useState('');
  const [copied,    setCopied]    = useState(false);
  const [success,   setSuccess]   = useState('');

  const ok = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };

  useFocusEffect(useCallback(() => { refetch(); }, []));

  const [setupMfa,  { loading: settingUp, error: errSetup  }] = useMutation(SETUP_MFA, {
    onCompleted: d => { setQrData(d.setupMfa); setShowSetup(true); },
  });
  const [habilitar, { loading: enabling,  error: errEnable }] = useMutation(HABILITAR_MFA, {
    onCompleted: () => { ok('MFA activado correctamente.'); setShowSetup(false); setCodigo(''); refetch(); },
  });
  const [deshabilitar, { loading: disabling, error: errDis }] = useMutation(DESHABILITAR_MFA, {
    onCompleted: () => { ok('MFA desactivado.'); setShowDis(false); setCodDis(''); refetch(); },
  });

  const copySecret = async () => {
    if (qrData?.secret) {
      await Clipboard.setStringAsync(qrData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <PageHeader title="Seguridad MFA" subtitle="Autenticacion de dos factores" />

        {success && <Alert message={success} type="success" />}

        {/* Estado */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIcon, mfaEnabled ? styles.iconOn : styles.iconOff]}>
              {mfaEnabled
                ? <ShieldCheck size={26} color={Colors.teal}     strokeWidth={1.5} />
                : <ShieldOff   size={26} color={Colors.creamDim} strokeWidth={1.5} />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>Autenticacion de dos factores</Text>
              <View style={[styles.badge, mfaEnabled ? styles.badgeOn : styles.badgeOff]}>
                <Text style={[styles.badgeText, { color: mfaEnabled ? Colors.teal : Colors.creamDim }]}>
                  {mfaEnabled ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.statusDesc}>
            {mfaEnabled
              ? 'Tu cuenta esta protegida. Los respaldos y restauraciones requieren tu codigo TOTP.'
              : 'Activa MFA para proteger las operaciones de respaldo y restauracion.'
            }
          </Text>

          {errSetup && <Alert message={errSetup.message.replace('GraphQL error: ', '')} />}

          {mfaEnabled ? (
            <Button variant="secondary" icon={<ShieldOff size={16} color={Colors.white} />}
              onPress={() => setShowDis(true)}>
              Desactivar MFA
            </Button>
          ) : (
            <Button loading={settingUp} icon={<QrCode size={16} color={Colors.white} />}
              onPress={() => setupMfa()}>
              Activar MFA
            </Button>
          )}
        </Card>

        {/* Como funciona */}
        <Card>
          <Text style={styles.howTitle}>Como funciona el MFA?</Text>
          {[
            'Haz clic en "Activar MFA" para generar el codigo QR.',
            'Abre Google Authenticator o Microsoft Authenticator.',
            'Escanea el codigo QR con la app.',
            'Ingresa el codigo de 6 digitos para confirmar.',
            'A partir de ahi, los respaldos requeriran el codigo.',
          ].map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </Card>

        {/* Nota cambio de pwd */}
        <Card style={styles.noteCard}>
          <Text style={styles.noteTitle}>Cambiar contrasena</Text>
          <Text style={styles.noteText}>
            El cambio de contrasena se realiza desde la pantalla de inicio de sesion.
            Toca "Cambiar contrasena" en el login. Si tienes MFA activo, se requerira el codigo.
          </Text>
        </Card>
      </ScrollView>

      {/* Modal Setup */}
      <Modal open={showSetup} onClose={() => { setShowSetup(false); setCodigo(''); }} title="Configurar MFA">
        {errEnable && <Alert message={errEnable.message.replace('GraphQL error: ', '')} />}
        <View style={{ gap: 16 }}>
          <Text style={styles.stepText}>1. Escanea este codigo QR con tu app autenticadora</Text>
          {qrData?.qr_code && (
            <View style={styles.qrWrap}>
              <Image source={{ uri: qrData.qr_code }} style={styles.qrImg} contentFit="contain" />
            </View>
          )}
          <View style={styles.secretRow}>
            <Text style={styles.secretLabel}>Manual:</Text>
            <Text style={styles.secretCode} numberOfLines={2}>{qrData?.secret}</Text>
            <TouchableOpacity onPress={copySecret} style={styles.copyBtn}>
              {copied ? <Check size={14} color={Colors.teal} /> : <Copy size={14} color={Colors.creamDim} />}
            </TouchableOpacity>
          </View>
          <Text style={styles.stepText}>2. Ingresa el codigo de 6 digitos que genera la app</Text>
          <Input
            keyboardType="number-pad" maxLength={6}
            placeholder="1  2  3  4  5  6"
            value={codigo} onChangeText={c => setCodigo(c.replace(/\D/g, ''))}
            style={styles.codeInput}
          />
          <Button loading={enabling} disabled={codigo.length !== 6}
            icon={<ShieldCheck size={16} color={Colors.white} />}
            onPress={() => habilitar({ variables: { input: { codigo } } })}>
            Confirmar y activar MFA
          </Button>
        </View>
      </Modal>

      {/* Modal Disable */}
      <Modal open={showDis} onClose={() => { setShowDis(false); setCodDis(''); }} title="Desactivar MFA">
        {errDis && <Alert message={errDis.message.replace('GraphQL error: ', '')} />}
        <View style={{ gap: 14 }}>
          <Text style={styles.stepText}>
            Ingresa un codigo valido de tu app autenticadora para confirmar la desactivacion.
          </Text>
          <Field label="Codigo MFA">
            <Input keyboardType="number-pad" maxLength={6} placeholder="123456"
              value={codDis} onChangeText={c => setCodDis(c.replace(/\D/g, ''))}
              style={styles.codeInput} />
          </Field>
          <View style={styles.row}>
            <Button variant="secondary" onPress={() => setShowDis(false)} style={{ flex: 1 }}>Cancelar</Button>
            <Button variant="danger" loading={disabling} disabled={codDis.length !== 6}
              icon={<ShieldOff size={14} color={Colors.white} />}
              onPress={() => deshabilitar({ variables: { input: { codigo: codDis } } })}
              style={{ flex: 1 }}>
              Desactivar
            </Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: Colors.navy },
  scroll:     { padding: 20, gap: 16, paddingBottom: 40 },
  statusCard: { gap: 14 },
  statusRow:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statusIcon: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconOn:     { backgroundColor: Colors.tealGlow },
  iconOff:    { backgroundColor: Colors.navyHover },
  statusTitle:{ fontSize: 15, fontWeight: '600', color: Colors.white, marginBottom: 6 },
  badge:      { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeOn:    { backgroundColor: 'rgba(26,122,110,0.2)' },
  badgeOff:   { backgroundColor: 'rgba(255,255,255,0.07)' },
  badgeText:  { fontSize: 11, fontWeight: '700' },
  statusDesc: { fontSize: 13, color: Colors.creamDim, lineHeight: 20 },
  howTitle:   { fontSize: 14, fontWeight: '700', color: Colors.white, marginBottom: 12 },
  step:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  stepNum:    { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.teal, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumText:{ fontSize: 12, fontWeight: '700', color: Colors.navy },
  stepText:   { fontSize: 13, color: Colors.creamDim, lineHeight: 20, flex: 1 },
  noteCard:   { gap: 8 },
  noteTitle:  { fontSize: 14, fontWeight: '600', color: Colors.white },
  noteText:   { fontSize: 13, color: Colors.creamDim, lineHeight: 20 },
  qrWrap:     { alignItems: 'center' },
  qrImg:      { width: 180, height: 180, borderRadius: 12 },
  secretRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.navy, borderRadius: 9, padding: 12 },
  secretLabel:{ fontSize: 11, color: Colors.creamDim, flexShrink: 0 },
  secretCode: { flex: 1, fontSize: 11, color: Colors.teal, fontFamily: 'monospace' },
  copyBtn:    { padding: 4 },
  codeInput:  { fontSize: 22, letterSpacing: 8, textAlign: 'center', fontWeight: '700' },
  row:        { flexDirection: 'row', gap: 10 },
});
