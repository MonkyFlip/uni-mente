import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { useFocusEffect } from 'expo-router';
import { Database, Download, RotateCcw, Clock, Layers, GitBranch, GitCommit, AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GET_BACKUPS, GET_BACKUP_CONFIG, CREAR_BACKUP, RESTAURAR_BACKUP } from '../../graphql/operations';
import { PageHeader, Card, Button, Modal, Field, Input, Alert, Badge, Spinner } from '../../components/UI';
import { API_REST_URL } from '../../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../contexts/ThemeContext';
import { MenuButton } from '../../components/Drawer';

const TIPOS    = ['COMPLETO', 'DIFERENCIAL', 'INCREMENTAL'] as const;
const FORMATOS = ['SQL', 'JSON', 'EXCEL', 'CSV']           as const;

const TIPO_DESC: Record<string, string> = {
  COMPLETO:    'Todos los registros',
  DIFERENCIAL: 'Cambios desde ultimo completo',
  INCREMENTAL: 'Cambios desde ultimo backup',
};

function fmtDate(d: string | Date) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtKb(kb: number | null) {
  if (!kb) return '—';
  return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

export default function Backup() {
  const { colors } = useTheme();

  const { data: dataBk, loading: lB, refetch: rB } = useQuery(GET_BACKUPS, { fetchPolicy: 'network-only' });
  const { data: dataCfg } = useQuery(GET_BACKUP_CONFIG, { fetchPolicy: 'network-only' });
  useFocusEffect(useCallback(() => { rB(); }, []));

  const backups: any[] = dataBk?.listarBackups ?? [];
  const config:  any   = dataCfg?.configBackupAutomatico ?? null;

  const [manTipo,       setManTipo]       = useState('COMPLETO');
  const [manFormato,    setManFormato]    = useState('SQL');
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [confirmMfa,    setConfirmMfa]    = useState('');
  const [backupError,   setBackupError]   = useState('');
  const [successMsg,    setSuccessMsg]    = useState('');
  const [restoreTarget, setRestoreTarget] = useState<any>(null);
  const [restoreMfa,    setRestoreMfa]    = useState('');

  const ok = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 5000); };

  const tipoIcon = (tipo: string, active: boolean) => {
    const color = active ? colors.teal : colors.creamDim;
    if (tipo === 'COMPLETO')    return <Layers    size={16} color={color} />;
    if (tipo === 'DIFERENCIAL') return <GitBranch size={16} color={color} />;
    return <GitCommit size={16} color={color} />;
  };

  const [crearBackup, { loading: creating }] = useMutation(CREAR_BACKUP, {
    onCompleted: (d) => {
      ok(`Backup creado: ${d.crearBackup.nombre_archivo} (${fmtKb(d.crearBackup.tamanio_kb)})`);
      setShowConfirm(false); setConfirmMfa(''); setBackupError(''); rB();
    },
    onError: (e) => setBackupError(e.message.replace('GraphQL error: ', '')),
  });

  const [restaurarBackup, { loading: restoring, error: errRestore }] = useMutation(RESTAURAR_BACKUP, {
    onCompleted: () => { ok('Base de datos restaurada correctamente.'); setRestoreTarget(null); setRestoreMfa(''); rB(); },
  });

  const handleDescargar = async (nombre_archivo: string) => {
    try {
      const raw   = await AsyncStorage.getItem('auth_user');
      const token = raw ? JSON.parse(raw).token : '';
      const url   = `${API_REST_URL}/api/backup-download/${encodeURIComponent(nombre_archivo)}`;
      const dest  = (FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '') + nombre_archivo;
      const dl    = await FileSystem.downloadAsync(url, dest, { headers: { Authorization: `Bearer ${token}` } });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(dl.uri);
    } catch { ok('Error al descargar el archivo.'); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <PageHeader title="Respaldos" subtitle="Gestiona los respaldos de la base de datos" />
          <MenuButton />
        </View>

        {successMsg !== '' && <Alert message={successMsg} type="success" />}

        {/* Crear respaldo */}
        <Card>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.white, marginBottom: 12 }}>Crear respaldo manual</Text>
          {TIPOS.map(t => (
            <TouchableOpacity key={t}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10,
                borderWidth: 1, marginBottom: 8,
                borderColor: manTipo === t ? colors.teal : colors.border,
                backgroundColor: manTipo === t ? colors.tealGlow : colors.navy }}
              onPress={() => setManTipo(t)}>
              {tipoIcon(t, manTipo === t)}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: manTipo === t ? colors.cream : colors.creamDim }}>{t}</Text>
                <Text style={{ fontSize: 11, color: colors.creamDim, marginTop: 2 }}>{TIPO_DESC[t]}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {FORMATOS.map(f => (
                <TouchableOpacity key={f}
                  style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9, borderWidth: 1,
                    borderColor: manFormato === f ? colors.teal : colors.border,
                    backgroundColor: manFormato === f ? colors.tealGlow : colors.navy }}
                  onPress={() => setManFormato(f)}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: manFormato === f ? colors.teal : colors.creamDim }}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <Button icon={<Download size={15} color={colors.white} />}
            onPress={() => { setConfirmMfa(''); setBackupError(''); setShowConfirm(true); }}
            style={{ marginTop: 14 }}>
            Crear respaldo {manTipo} en {manFormato}
          </Button>
        </Card>

        {/* Lista */}
        <Card>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.white, marginBottom: 12 }}>
            Respaldos disponibles ({backups.length} / 3)
          </Text>
          {lB && <Spinner size="small" />}
          {!lB && backups.length === 0 && (
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 20 }}>
              <Database size={28} color={colors.creamDim} />
              <Text style={{ fontSize: 13, color: colors.creamDim, textAlign: 'center' }}>No hay respaldos. Crea el primero arriba.</Text>
            </View>
          )}
          {backups.map((b: any) => (
            <View key={b.id_backup} style={{ flexDirection: 'row', alignItems: 'center', gap: 12,
              backgroundColor: colors.navy, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
              padding: 12, marginBottom: 8 }}>
              <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: colors.tealGlow,
                alignItems: 'center', justifyContent: 'center' }}>
                {tipoIcon(b.tipo, true)}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.cream, fontFamily: 'monospace' }} numberOfLines={1}>{b.nombre_archivo}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Badge label={b.tipo}    variant={b.tipo === 'COMPLETO' ? 'teal' : 'gray'} />
                  <Badge label={b.formato} variant="gray" />
                  <Text style={{ fontSize: 10, color: colors.creamDim }}>{fmtKb(b.tamanio_kb)}</Text>
                </View>
                <Text style={{ fontSize: 10, color: colors.creamDim, marginTop: 3 }}>{fmtDate(b.created_at)}</Text>
              </View>
              <View style={{ gap: 8 }}>
                <TouchableOpacity style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.navyHover,
                  borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => handleDescargar(b.nombre_archivo)}>
                  <Download size={15} color={colors.teal} strokeWidth={1.8} />
                </TouchableOpacity>
                <TouchableOpacity style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.navyHover,
                  borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => { setRestoreTarget(b); setRestoreMfa(''); }}>
                  <RotateCcw size={15} color={colors.creamDim} strokeWidth={1.8} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </Card>

        {/* Config automático */}
        <Card>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.white, marginBottom: 12 }}>Respaldo automático</Text>
          {config ? (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={14} color={colors.teal} />
                <Text style={{ color: colors.teal, fontWeight: '700', fontSize: 13 }}>Configurado</Text>
              </View>
              <Text style={{ fontSize: 13, color: colors.creamDim }}>Tipo: <Text style={{ color: colors.cream }}>{config.tipo}</Text></Text>
              <Text style={{ fontSize: 13, color: colors.creamDim }}>Formato: <Text style={{ color: colors.cream }}>{config.formato}</Text></Text>
              <Text style={{ fontSize: 13, color: colors.creamDim }}>Frecuencia: <Text style={{ color: colors.cream }}>cada {config.frecuencia_horas}h</Text></Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 20 }}>
              <Clock size={24} color={colors.creamDim} />
              <Text style={{ fontSize: 13, color: colors.creamDim, textAlign: 'center' }}>No hay backup automático configurado.</Text>
              <Text style={{ fontSize: 11, color: colors.creamDim, textAlign: 'center', opacity: 0.7 }}>
                Configúralo desde la versión web (admin/backup).
              </Text>
            </View>
          )}
        </Card>
      </ScrollView>

      {/* Modal: Confirmar backup */}
      <Modal open={showConfirm}
        onClose={() => { setShowConfirm(false); setConfirmMfa(''); setBackupError(''); }}
        title="Confirmar respaldo">
        {backupError !== '' && <Alert message={backupError} />}
        <View style={{ backgroundColor: colors.navy, borderRadius: 10, padding: 14, gap: 10, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: colors.creamDim, textTransform: 'uppercase', letterSpacing: 1 }}>TIPO</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.teal }}>{manTipo}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: colors.creamDim, textTransform: 'uppercase', letterSpacing: 1 }}>FORMATO</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.cream }}>{manFormato}</Text>
          </View>
        </View>
        <View style={{ gap: 8, marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.white }}>Código MFA de verificación (obligatorio)</Text>
          <Input keyboardType="number-pad" maxLength={6} autoFocus
            placeholder="1  2  3  4  5  6" value={confirmMfa}
            onChangeText={c => { setConfirmMfa(c.replace(/\D/g, '')); setBackupError(''); }}
            style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center', fontWeight: '700' }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button variant="secondary"
            onPress={() => { setShowConfirm(false); setConfirmMfa(''); setBackupError(''); }}
            style={{ flex: 1 }}>Cancelar</Button>
          <Button loading={creating} disabled={confirmMfa.length !== 6}
            icon={<Download size={15} color={colors.white} />}
            onPress={() => crearBackup({ variables: { input: { tipo: manTipo, formato: manFormato,
              ...(confirmMfa.trim() ? { codigo_mfa: confirmMfa.trim() } : {}) }}})}
            style={{ flex: 2 }}>Crear respaldo</Button>
        </View>
      </Modal>

      {/* Modal: Restaurar */}
      <Modal open={!!restoreTarget}
        onClose={() => { setRestoreTarget(null); setRestoreMfa(''); }}
        title="Restaurar respaldo">
        {errRestore && <Alert message={errRestore.message.replace('GraphQL error: ', '')} />}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10,
          backgroundColor: colors.warningBg, borderRadius: 9, padding: 12, marginBottom: 12 }}>
          <AlertTriangle size={16} color={colors.warning} />
          <Text style={{ flex: 1, fontSize: 13, color: colors.warning, lineHeight: 20 }}>
            {restoreTarget?.tipo === 'COMPLETO'
              ? 'Esta operación reemplazará TODOS los datos actuales.'
              : 'Los registros de este backup serán actualizados.'}
          </Text>
        </View>
        <View style={{ marginTop: 12 }}>
          <Field label="Código MFA (obligatorio)">
            <Input keyboardType="number-pad" maxLength={6} autoFocus placeholder="123456"
              value={restoreMfa} onChangeText={c => setRestoreMfa(c.replace(/\D/g, ''))}
              style={{ fontSize: 20, letterSpacing: 6, textAlign: 'center', fontWeight: '700' }} />
          </Field>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <Button variant="secondary" onPress={() => setRestoreTarget(null)} style={{ flex: 1 }}>Cancelar</Button>
          <Button variant="danger" loading={restoring} disabled={restoreMfa.length !== 6}
            icon={<RotateCcw size={14} color={colors.white} />}
            onPress={() => restaurarBackup({ variables: { input: { id_backup: restoreTarget.id_backup, codigo_mfa: restoreMfa }}})}
            style={{ flex: 1 }}>Restaurar</Button>
        </View>
      </Modal>
    </SafeAreaView>
  );
}