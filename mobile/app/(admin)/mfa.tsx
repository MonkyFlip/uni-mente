import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { ShieldCheck, ShieldOff, QrCode, Copy, Check } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GET_MFA_ESTADO, SETUP_MFA, HABILITAR_MFA, DESHABILITAR_MFA } from '../../graphql/operations';
import { PageHeader, Card, Button, Modal, Field, Input, Alert } from '../../components/UI';
import { useTheme } from '../../contexts/ThemeContext';
import { MenuButton } from '../../components/Drawer';

export default function MfaScreen() {
  const { colors } = useTheme();
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

  const [setupMfa,     { loading: settingUp, error: errSetup  }] = useMutation(SETUP_MFA, {
    onCompleted: d => { setQrData(d.setupMfa); setShowSetup(true); },
  });
  const [habilitar,    { loading: enabling,  error: errEnable }] = useMutation(HABILITAR_MFA, {
    onCompleted: () => { ok('MFA activado.'); setShowSetup(false); setCodigo(''); refetch(); },
  });
  const [deshabilitar, { loading: disabling, error: errDis   }] = useMutation(DESHABILITAR_MFA, {
    onCompleted: () => { ok('MFA desactivado.'); setShowDis(false); setCodDis(''); refetch(); },
  });

  const copySecret = async () => {
    if (qrData?.secret) { await Clipboard.setStringAsync(qrData.secret); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  if (loading) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <PageHeader title="Seguridad MFA" subtitle="Autenticación de dos factores" />
          <MenuButton />
        </View>

        {success !== '' && <Alert message={success} type="success" />}

        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
              backgroundColor: mfaEnabled ? colors.tealGlow : colors.navyHover }}>
              {mfaEnabled
                ? <ShieldCheck size={26} color={colors.teal}     strokeWidth={1.5} />
                : <ShieldOff   size={26} color={colors.creamDim} strokeWidth={1.5} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.white, marginBottom: 6 }}>
                Autenticación de dos factores
              </Text>
              <View style={{ borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start',
                backgroundColor: mfaEnabled ? 'rgba(26,122,110,0.2)' : 'rgba(255,255,255,0.07)' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: mfaEnabled ? colors.teal : colors.creamDim }}>
                  {mfaEnabled ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
            </View>
          </View>
          <Text style={{ fontSize: 13, color: colors.creamDim, lineHeight: 20 }}>
            {mfaEnabled
              ? 'Tu cuenta está protegida con verificación en dos pasos.'
              : 'Activa MFA para proteger las operaciones críticas.'}
          </Text>
          {errSetup && <Alert message={errSetup.message.replace('GraphQL error: ', '')} />}
          {mfaEnabled
            ? <Button variant="secondary" icon={<ShieldOff size={16} color={colors.white} />} onPress={() => setShowDis(true)}>Desactivar MFA</Button>
            : <Button loading={settingUp} icon={<QrCode size={16} color={colors.white} />} onPress={() => setupMfa()}>Activar MFA</Button>}
        </Card>

        <Card>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.white, marginBottom: 12 }}>¿Cómo funciona el MFA?</Text>
          {['Toca "Activar MFA" para generar el código QR.',
            'Abre Google Authenticator o Microsoft Authenticator.',
            'Escanea el código QR con la app.',
            'Ingresa el código de 6 dígitos para confirmar.',
            'Los respaldos y operaciones críticas requerirán el código.',
          ].map((step, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.teal,
                alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.navy }}>{i + 1}</Text>
              </View>
              <Text style={{ fontSize: 13, color: colors.creamDim, lineHeight: 20, flex: 1 }}>{step}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>

      <Modal open={showSetup} onClose={() => { setShowSetup(false); setCodigo(''); }} title="Configurar MFA">
        {errEnable && <Alert message={errEnable.message.replace('GraphQL error: ', '')} />}
        <View style={{ gap: 16 }}>
          <Text style={{ fontSize: 13, color: colors.creamDim }}>1. Escanea este código QR</Text>
          {qrData?.qr_code && (
            <View style={{ alignItems: 'center' }}>
              <Image source={{ uri: qrData.qr_code }} style={{ width: 180, height: 180, borderRadius: 12 }} contentFit="contain" />
            </View>
          )}
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: colors.navy, borderRadius: 9, padding: 12 }} onPress={copySecret}>
            <Text style={{ fontSize: 11, color: colors.creamDim, flexShrink: 0 }}>Manual:</Text>
            <Text style={{ flex: 1, fontSize: 11, color: colors.teal, fontFamily: 'monospace' }} numberOfLines={2}>{qrData?.secret}</Text>
            {copied ? <Check size={14} color={colors.teal} /> : <Copy size={14} color={colors.creamDim} />}
          </TouchableOpacity>
          <Text style={{ fontSize: 13, color: colors.creamDim }}>2. Ingresa el código de 6 dígitos</Text>
          <Input keyboardType="number-pad" maxLength={6} placeholder="1  2  3  4  5  6"
            value={codigo} onChangeText={c => setCodigo(c.replace(/\D/g, ''))}
            style={{ fontSize: 22, letterSpacing: 8, textAlign: 'center', fontWeight: '700' }} />
          <Button loading={enabling} disabled={codigo.length !== 6}
            icon={<ShieldCheck size={16} color={colors.white} />}
            onPress={() => habilitar({ variables: { input: { codigo } } })}>
            Confirmar y activar MFA
          </Button>
        </View>
      </Modal>

      <Modal open={showDis} onClose={() => { setShowDis(false); setCodDis(''); }} title="Desactivar MFA">
        {errDis && <Alert message={errDis.message.replace('GraphQL error: ', '')} />}
        <View style={{ gap: 14 }}>
          <Text style={{ fontSize: 13, color: colors.creamDim, lineHeight: 20 }}>
            Ingresa un código válido para confirmar la desactivación.
          </Text>
          <Field label="Código MFA">
            <Input keyboardType="number-pad" maxLength={6} placeholder="123456"
              value={codDis} onChangeText={c => setCodDis(c.replace(/\D/g, ''))}
              style={{ fontSize: 20, letterSpacing: 6, textAlign: 'center', fontWeight: '700' }} />
          </Field>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button variant="secondary" onPress={() => setShowDis(false)} style={{ flex: 1 }}>Cancelar</Button>
            <Button variant="danger" loading={disabling} disabled={codDis.length !== 6}
              icon={<ShieldOff size={14} color={colors.white} />}
              onPress={() => deshabilitar({ variables: { input: { codigo: codDis } } })}
              style={{ flex: 1 }}>Desactivar</Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}