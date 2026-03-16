import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { useFocusEffect } from 'expo-router';
import {
  Database, Download, RotateCcw, Settings, Clock,
  Layers, GitBranch, GitCommit,
  AlertTriangle, CheckCircle2, Play,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  GET_BACKUPS, GET_BACKUP_CONFIG, CREAR_BACKUP, RESTAURAR_BACKUP,
} from '../../graphql/operations';
import {
  PageHeader, Card, Button, Modal, Field, Input, Alert, Badge, Spinner,
} from '../../components/UI';
import { Colors } from '../../constants/colors';
import { API_REST_URL } from '../../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const TIPOS    = ['COMPLETO', 'DIFERENCIAL', 'INCREMENTAL'] as const;
const FORMATOS = ['SQL', 'JSON', 'EXCEL', 'CSV']           as const;

const TIPO_ICON = (tipo: string, color: string) => {
  if (tipo === 'COMPLETO')    return <Layers    size={16} color={color} />;
  if (tipo === 'DIFERENCIAL') return <GitBranch size={16} color={color} />;
  return <GitCommit size={16} color={color} />;
};

const TIPO_DESC: Record<string, string> = {
  COMPLETO:    'Todos los registros',
  DIFERENCIAL: 'Cambios desde ultimo completo',
  INCREMENTAL: 'Cambios desde ultimo backup',
};

function fmtDate(d: string | Date) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
function fmtKb(kb: number | null) {
  if (!kb) return '—';
  return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

export default function Backup() {
  const { data: dataBk, loading: lB, refetch: rB } = useQuery(GET_BACKUPS, { fetchPolicy: 'network-only' });
  const { data: dataCfg } = useQuery(GET_BACKUP_CONFIG, { fetchPolicy: 'network-only' });

  const backups: any[] = dataBk?.listarBackups ?? [];
  const config:  any   = dataCfg?.configBackupAutomatico ?? null;

  const [manTipo,    setManTipo]    = useState('COMPLETO');
  const [manFormato, setManFormato] = useState('SQL');

  // Modal: confirmar backup con MFA
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [confirmMfa,   setConfirmMfa]   = useState('');
  const [backupError,  setBackupError]  = useState('');
  useFocusEffect(useCallback(() => { rB(); }, []));

  const [successMsg,   setSuccessMsg]   = useState('');

  // Modal: restaurar
  const [restoreTarget, setRestoreTarget] = useState<any>(null);
  const [restoreMfa,    setRestoreMfa]    = useState('');

  const ok = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 5000); };

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
      const dest  = (FileSystem as any).documentDirectory
        ? `${(FileSystem as any).documentDirectory}${nombre_archivo}`
        : `${(FileSystem as any).cacheDirectory ?? ''}${nombre_archivo}`;
      const dl    = await FileSystem.downloadAsync(url, dest, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dl.uri);
      }
    } catch {
      ok('Error al descargar el archivo.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <PageHeader title="Respaldos" subtitle="Gestiona los respaldos de la base de datos" />

        {successMsg && <Alert message={successMsg} type="success" />}

        {/* Seleccion tipo */}
        <Card>
          <Text style={styles.cardTitle}>Crear respaldo manual</Text>
          {TIPOS.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tipoBtn, manTipo === t && styles.tipoBtnActive]}
              onPress={() => setManTipo(t)}
            >
              {TIPO_ICON(t, manTipo === t ? Colors.teal : Colors.creamDim)}
              <View style={{ flex: 1 }}>
                <Text style={[styles.tipoNombre, manTipo === t && { color: Colors.cream }]}>{t}</Text>
                <Text style={styles.tipoDesc}>{TIPO_DESC[t]}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <View style={styles.formatRow}>
              {FORMATOS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.fmtBtn, manFormato === f && styles.fmtBtnActive]}
                  onPress={() => setManFormato(f)}
                >
                  <Text style={[styles.fmtText, manFormato === f && { color: Colors.teal }]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Button
            icon={<Download size={15} color={Colors.white} />}
            onPress={() => { setConfirmMfa(''); setBackupError(''); setShowConfirm(true); }}
            style={{ marginTop: 14 }}
          >
            Crear respaldo {manTipo} en {manFormato}
          </Button>
        </Card>

        {/* Lista de backups */}
        <Card>
          <Text style={styles.cardTitle}>Respaldos disponibles ({backups.length} / 3)</Text>
          {lB && <Spinner size="small" />}
          {!lB && backups.length === 0 && (
            <View style={styles.empty}>
              <Database size={28} color={Colors.creamDim} />
              <Text style={styles.emptyText}>No hay respaldos. Crea el primero arriba.</Text>
            </View>
          )}
          {backups.map((b: any) => (
            <View key={b.id_backup} style={styles.backupItem}>
              <View style={styles.backupIcon}>
                {TIPO_ICON(b.tipo, Colors.teal)}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.backupName} numberOfLines={1}>{b.nombre_archivo}</Text>
                <View style={styles.backupMeta}>
                  <Badge label={b.tipo}    variant={b.tipo === 'COMPLETO' ? 'teal' : 'gray'} />
                  <Badge label={b.formato} variant="gray" />
                  <Text style={styles.backupSize}>{fmtKb(b.tamanio_kb)}</Text>
                </View>
                <Text style={styles.backupDate}>{fmtDate(b.created_at)}</Text>
              </View>
              <View style={styles.backupActions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleDescargar(b.nombre_archivo)}
                >
                  <Download size={15} color={Colors.teal} strokeWidth={1.8} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => { setRestoreTarget(b); setRestoreMfa(''); }}
                >
                  <RotateCcw size={15} color={Colors.creamDim} strokeWidth={1.8} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </Card>

        {/* Config automatico */}
        <Card>
          <Text style={styles.cardTitle}>Respaldo automatico</Text>
          {config ? (
            <View style={styles.configInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={14} color={Colors.teal} />
                <Text style={{ color: Colors.teal, fontWeight: '700', fontSize: 13 }}>Configurado</Text>
              </View>
              <Text style={styles.configText}>Tipo: <Text style={{ color: Colors.cream }}>{config.tipo}</Text></Text>
              <Text style={styles.configText}>Formato: <Text style={{ color: Colors.cream }}>{config.formato}</Text></Text>
              <Text style={styles.configText}>Frecuencia: <Text style={{ color: Colors.cream }}>cada {config.frecuencia_horas}h</Text></Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Clock size={24} color={Colors.creamDim} />
              <Text style={styles.emptyText}>No hay backup automatico configurado.</Text>
              <Text style={styles.emptySubText}>Configura el backup automatico desde la version web (admin/backup).</Text>
            </View>
          )}
        </Card>
      </ScrollView>

      {/* Modal: Confirmar backup */}
      <Modal
        open={showConfirm}
        onClose={() => { setShowConfirm(false); setConfirmMfa(''); setBackupError(''); }}
        title="Confirmar respaldo"
      >
        {backupError && <Alert message={backupError} />}
        <View style={styles.confirmSummary}>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>TIPO</Text>
            <Text style={[styles.confirmVal, { color: Colors.teal }]}>{manTipo}</Text>
          </View>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>FORMATO</Text>
            <Text style={styles.confirmVal}>{manFormato}</Text>
          </View>
        </View>
        <View style={styles.mfaSection}>
          <Text style={styles.mfaLabel}>Codigo MFA de verificacion (obligatorio)</Text>
          <Input
            keyboardType="number-pad" maxLength={6} autoFocus
            placeholder="1  2  3  4  5  6"
            value={confirmMfa}
            onChangeText={c => { setConfirmMfa(c.replace(/\D/g, '')); setBackupError(''); }}
            style={styles.codeInput}
          />
        </View>
        <View style={styles.row}>
          <Button variant="secondary"
            onPress={() => { setShowConfirm(false); setConfirmMfa(''); setBackupError(''); }}
            style={{ flex: 1 }}>
            Cancelar
          </Button>
          <Button
            loading={creating}
            disabled={confirmMfa.length !== 6}
            icon={<Download size={15} color={Colors.white} />}
            onPress={() => crearBackup({ variables: { input: {
              tipo: manTipo, formato: manFormato,
              ...(confirmMfa.trim() ? { codigo_mfa: confirmMfa.trim() } : {}),
            }}})}
            style={{ flex: 2 }}
          >
            Crear respaldo
          </Button>
        </View>
      </Modal>

      {/* Modal: Restaurar */}
      <Modal
        open={!!restoreTarget}
        onClose={() => { setRestoreTarget(null); setRestoreMfa(''); }}
        title="Restaurar respaldo"
      >
        {errRestore && <Alert message={errRestore.message.replace('GraphQL error: ', '')} />}
        <View style={styles.warningRow}>
          <AlertTriangle size={16} color={Colors.warning} />
          <Text style={styles.warningText}>
            {restoreTarget?.tipo === 'COMPLETO'
              ? 'Esta operacion reemplazara TODOS los datos actuales.'
              : 'Los registros incluidos en este backup seran actualizados.'
            }
          </Text>
        </View>
        <View style={{ marginTop: 12 }}>
          <Field label="Codigo MFA (obligatorio)">
            <Input
              keyboardType="number-pad" maxLength={6} autoFocus
              placeholder="123456"
              value={restoreMfa}
              onChangeText={c => setRestoreMfa(c.replace(/\D/g, ''))}
              style={styles.codeInputSm}
            />
          </Field>
        </View>
        <View style={styles.row}>
          <Button variant="secondary" onPress={() => setRestoreTarget(null)} style={{ flex: 1 }}>Cancelar</Button>
          <Button variant="danger" loading={restoring} disabled={restoreMfa.length !== 6}
            icon={<RotateCcw size={14} color={Colors.white} />}
            onPress={() => restaurarBackup({ variables: { input: {
              id_backup: restoreTarget.id_backup, codigo_mfa: restoreMfa,
            }}})}
            style={{ flex: 1 }}>
            Restaurar
          </Button>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: Colors.navy },
  scroll:        { padding: 20, gap: 14, paddingBottom: 40 },
  cardTitle:     { fontSize: 14, fontWeight: '700', color: Colors.white, marginBottom: 12 },
  tipoBtn:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.navy, marginBottom: 8 },
  tipoBtnActive: { borderColor: Colors.teal, backgroundColor: Colors.tealGlow },
  tipoNombre:    { fontSize: 13, fontWeight: '700', color: Colors.creamDim },
  tipoDesc:      { fontSize: 11, color: Colors.creamDim, marginTop: 2 },
  formatRow:     { flexDirection: 'row', gap: 8 },
  fmtBtn:        { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.navy },
  fmtBtnActive:  { borderColor: Colors.teal, backgroundColor: Colors.tealGlow },
  fmtText:       { fontSize: 13, fontWeight: '600', color: Colors.creamDim },
  empty:         { alignItems: 'center', gap: 8, paddingVertical: 20 },
  emptyText:     { fontSize: 13, color: Colors.creamDim, textAlign: 'center' },
  emptySubText:  { fontSize: 11, color: Colors.creamDim, textAlign: 'center', opacity: 0.7 },
  backupItem:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.navy, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, marginBottom: 8 },
  backupIcon:    { width: 34, height: 34, borderRadius: 9, backgroundColor: Colors.tealGlow, alignItems: 'center', justifyContent: 'center' },
  backupName:    { fontSize: 11, fontWeight: '600', color: Colors.cream, fontFamily: 'monospace' },
  backupMeta:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  backupSize:    { fontSize: 10, color: Colors.creamDim },
  backupDate:    { fontSize: 10, color: Colors.creamDim, marginTop: 3 },
  backupActions: { gap: 8 },
  actionBtn:     { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.navyHover, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  configInfo:    { gap: 6 },
  configText:    { fontSize: 13, color: Colors.creamDim },
  confirmSummary:{ backgroundColor: Colors.navy, borderRadius: 10, padding: 14, gap: 10, marginBottom: 16 },
  confirmRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confirmLabel:  { fontSize: 10, color: Colors.creamDim, textTransform: 'uppercase', letterSpacing: 1 },
  confirmVal:    { fontSize: 13, fontWeight: '700', color: Colors.cream },
  mfaSection:    { gap: 8, marginBottom: 16 },
  mfaLabel:      { fontSize: 12, fontWeight: '600', color: Colors.white },
  codeInput:     { fontSize: 24, letterSpacing: 8, textAlign: 'center', fontWeight: '700' },
  codeInputSm:   { fontSize: 20, letterSpacing: 6, textAlign: 'center', fontWeight: '700' },
  row:           { flexDirection: 'row', gap: 10 },
  warningRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.warningBg, borderRadius: 9, padding: 12, marginBottom: 12 },
  warningText:   { flex: 1, fontSize: 13, color: Colors.warning, lineHeight: 20 },
});