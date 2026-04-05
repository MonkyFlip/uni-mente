/**
 * app/(tabs)/mfa.tsx
 * Seguridad MFA para psicólogos y estudiantes.
 * Misma funcionalidad que (admin)/mfa.tsx.
 */
import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { Shield, ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GET_MFA_ESTADO, SETUP_MFA, HABILITAR_MFA, DESHABILITAR_MFA } from '../../graphql/operations';
import { PageHeader, Card, Button, Field, Input, Alert, Spinner, Modal } from '../../components/UI';
import { useTheme } from '../../contexts/ThemeContext';
import { MenuButton } from '../../components/Drawer';

export default function MfaConfig() {
  const { colors } = useTheme();
  const [setupData,   setSetupData]   = useState<{ qr_code: string; secret: string } | null>(null);
  const [codigo,      setCodigo]      = useState('');
  const [disableCod,  setDisableCod]  = useState('');
  const [showDisable, setShowDisable] = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [success,     setSuccess]     = useState('');

  const ok = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };

  const { data: estadoData, loading, refetch } = useQuery(GET_MFA_ESTADO, { fetchPolicy: 'network-only' });
  const mfaEnabled = estadoData?.miEstadoMfa?.mfa_enabled ?? false;

  const [setupMfa,   { loading: settingUp }] = useMutation(SETUP_MFA, {
    onCompleted: (d) => setSetupData(d.setupMfa),
  });

  const [habilitarMfa, { loading: enabling, error: errEnable }] = useMutation(HABILITAR_MFA, {
    onCompleted: () => { ok('MFA activado correctamente.'); setSetupData(null); setCodigo(''); refetch(); },
  });

  const [deshabilitarMfa, { loading: disabling, error: errDisable }] = useMutation(DESHABILITAR_MFA, {
    onCompleted: () => { ok('MFA desactivado.'); setShowDisable(false); setDisableCod(''); refetch(); },
  });

  const handleCopy = async () => {
    if (setupData?.secret) {
      await Clipboard.setStringAsync(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <PageHeader title="Seguridad MFA" subtitle="Autenticación de dos factores" />
          <MenuButton />
        </View>

        {success !== '' && <Alert message={success} type="success" />}
        {loading && <Spinner />}

        {/* Estado actual */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 52, height: 52, borderRadius: 14,
              backgroundColor: mfaEnabled ? colors.tealGlow : colors.dangerBg,
              alignItems: 'center', justifyContent: 'center' }}>
              {mfaEnabled
                ? <ShieldCheck size={26} color={colors.teal} />
                : <ShieldOff   size={26} color={colors.danger} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.white }}>
                {mfaEnabled ? 'MFA Activo' : 'MFA Inactivo'}
              </Text>
              <Text style={{ fontSize: 13, color: colors.creamDim, marginTop: 2 }}>
                {mfaEnabled
                  ? 'Tu cuenta está protegida con verificación en dos pasos.'
                  : 'Activa MFA para proteger las operaciones críticas.'}
              </Text>
            </View>
          </View>
        </Card>

        {!mfaEnabled && !setupData && (
          <Button icon={<Shield size={16} color={colors.white} />}
            loading={settingUp} onPress={() => setupMfa()}>
            Configurar MFA
          </Button>
        )}

        {/* Setup QR */}
        {setupData && (
          <Card>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.white, marginBottom: 4 }}>
              Escanea el código QR
            </Text>
            <Text style={{ fontSize: 13, color: colors.creamDim, marginBottom: 16 }}>
              Usa Google Authenticator, Microsoft Authenticator o Authy.
            </Text>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Image
                source={{ uri: setupData.qr_code }}
                style={{ width: 200, height: 200, borderRadius: 12 }}
                contentFit="contain"
              />
            </View>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12,
                backgroundColor: colors.navyHover, borderRadius: 10, borderWidth: 1,
                borderColor: colors.border, marginBottom: 16 }}
              onPress={handleCopy}
            >
              <Text style={{ flex: 1, fontSize: 12, color: colors.creamDim, fontFamily: 'monospace' }}
                numberOfLines={1}>
                {setupData.secret}
              </Text>
              {copied
                ? <Check size={16} color={colors.success} />
                : <Copy  size={16} color={colors.creamDim} />}
            </TouchableOpacity>
            {errEnable && <Alert message={errEnable.message.replace('GraphQL error: ', '')} />}
            <Field label="Código de verificación (6 dígitos)">
              <Input keyboardType="number-pad" maxLength={6} placeholder="123456"
                value={codigo} onChangeText={v => setCodigo(v.replace(/\D/g, ''))} />
            </Field>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Button variant="secondary" onPress={() => setSetupData(null)} style={{ flex: 1 }}>
                Cancelar
              </Button>
              <Button loading={enabling} disabled={codigo.length !== 6}
                onPress={() => habilitarMfa({ variables: { input: { codigo } } })}
                style={{ flex: 2 }}>
                Activar MFA
              </Button>
            </View>
          </Card>
        )}

        {/* Deshabilitar */}
        {mfaEnabled && (
          <Button variant="danger" icon={<ShieldOff size={16} color={colors.white} />}
            onPress={() => setShowDisable(true)}>
            Desactivar MFA
          </Button>
        )}
      </ScrollView>

      <Modal open={showDisable} onClose={() => setShowDisable(false)} title="Desactivar MFA">
        {errDisable && <Alert message={errDisable.message.replace('GraphQL error: ', '')} />}
        <Text style={{ fontSize: 14, color: colors.creamDim, lineHeight: 22, marginBottom: 16 }}>
          Ingresa tu código actual de autenticación para desactivar MFA.
        </Text>
        <Field label="Código MFA">
          <Input keyboardType="number-pad" maxLength={6} placeholder="123456"
            value={disableCod} onChangeText={v => setDisableCod(v.replace(/\D/g, ''))} />
        </Field>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <Button variant="secondary" onPress={() => setShowDisable(false)} style={{ flex: 1 }}>
            Cancelar
          </Button>
          <Button variant="danger" loading={disabling} disabled={disableCod.length !== 6}
            onPress={() => deshabilitarMfa({ variables: { input: { codigo: disableCod } } })}
            style={{ flex: 1 }}>
            Desactivar
          </Button>
        </View>
      </Modal>
    </SafeAreaView>
  );
}