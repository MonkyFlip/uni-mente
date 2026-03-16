import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldAlert, RotateCcw, Database, CheckCircle2, RefreshCw, Eye, EyeOff } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Field, Input, Alert } from '../components/UI';
import { Colors } from '../constants/colors';
import { API_REST_URL } from '../constants/api';

interface BackupInfo {
  id_backup:      number | null;
  nombre_archivo: string;
  tipo:           string;
  formato:        string;
  tamanio_kb:     number;
  modo:           string;
  created_at:     string;
}

const TIPO_COLOR: Record<string, string> = {
  COMPLETO: Colors.teal, DIFERENCIAL: Colors.warning, INCREMENTAL: '#60a5fa',
};

function fmtKb(kb: number) {
  return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`;
}
function fmtDate(d: string | Date) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-MX', {
    hour: '2-digit', minute: '2-digit', hour12: true,
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export default function EmergencyRestore() {
  const router = useRouter();
  const [backups,   setBackups]   = useState<BackupInfo[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [loadingBk, setLoadingBk] = useState(true);
  const [selected,  setSelected]  = useState<BackupInfo | null>(null);
  const [secret,    setSecret]    = useState('');
  const [showSec,   setShowSec]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  const fetchBackups = async () => {
    setLoadingBk(true);
    try {
      const res  = await fetch(`${API_REST_URL}/api/emergency-backups`);
      const data = await res.json();
      setBackups(data.backups ?? []);
    } catch {
      setBackups([]);
    } finally {
      setLoadingBk(false);
    }
  };

  useEffect(() => { fetchBackups(); }, []);

  const handleRestore = async () => {
    if (!secret.trim() || !selected) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const body = selected.id_backup
        ? { id_backup: selected.id_backup }
        : { backup_filename: selected.nombre_archivo };
      const res  = await fetch(`${API_REST_URL}/api/emergency-restore`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-Restore-Secret': secret },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Error en la restauracion.');
      } else {
        setSuccess('Base de datos restaurada. Redirigiendo al login...');
        setTimeout(() => router.replace('/(auth)/login'), 2500);
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <ShieldAlert size={26} color={Colors.warning} strokeWidth={1.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Restauracion de Emergencia</Text>
            <Text style={styles.subtitle}>Solo cuando la BD esta vacia</Text>
          </View>
        </View>

        <View style={styles.warningCard}>
          <ShieldAlert size={14} color={Colors.warning} />
          <Text style={styles.warningText}>
            Requiere la clave RESTORE_SECRET del .env del servidor.
            Una vez restaurada, usa el login normal.
          </Text>
        </View>

        {/* Backups disponibles */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Database size={15} color={Colors.teal} />
            <Text style={styles.sectionTitle}>Respaldos disponibles</Text>
            <TouchableOpacity onPress={fetchBackups} style={styles.refreshBtn}>
              <RefreshCw size={14} color={Colors.creamDim} />
            </TouchableOpacity>
          </View>

          {loadingBk && <Text style={styles.loadingText}>Buscando respaldos...</Text>}

          {!loadingBk && backups.length === 0 && (
            <View style={styles.emptyBackups}>
              <Database size={28} color={Colors.creamDim} />
              <Text style={styles.emptyText}>No se encontraron archivos en backend/Backup/</Text>
            </View>
          )}

          {backups.map((b, i) => (
            <TouchableOpacity
              key={b.nombre_archivo}
              style={[styles.backupItem, selected?.nombre_archivo === b.nombre_archivo && styles.backupItemSelected]}
              onPress={() => { setSelected(b); setError(''); }}
              activeOpacity={0.8}
            >
              <View style={[styles.backupIcon, { backgroundColor: (TIPO_COLOR[b.tipo] ?? Colors.teal) + '22' }]}>
                <Database size={16} color={TIPO_COLOR[b.tipo] ?? Colors.teal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.backupName} numberOfLines={2}>{b.nombre_archivo}</Text>
                <View style={styles.backupMeta}>
                  <Text style={[styles.metaTag, { color: TIPO_COLOR[b.tipo] ?? Colors.teal }]}>{b.tipo}</Text>
                  <Text style={styles.metaTag}>{b.formato}</Text>
                  <Text style={styles.metaSize}>{fmtKb(b.tamanio_kb)}</Text>
                </View>
                <Text style={styles.backupDate}>{fmtDate(b.created_at)}</Text>
              </View>
              {selected?.nombre_archivo === b.nombre_archivo && (
                <CheckCircle2 size={20} color={Colors.teal} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Formulario */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <RotateCcw size={15} color={Colors.teal} />
            <Text style={styles.sectionTitle}>Confirmar restauracion</Text>
          </View>

          {error   && <Alert message={error} />}
          {success && <Alert message={success} type="success" />}

          {selected ? (
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedLabel}>ARCHIVO SELECCIONADO</Text>
              <Text style={styles.selectedName}>{selected.nombre_archivo}</Text>
              <Text style={[styles.selectedTipo, { color: TIPO_COLOR[selected.tipo] ?? Colors.teal }]}>
                {selected.tipo} — {fmtDate(selected.created_at)}
              </Text>
              {selected.tipo === 'COMPLETO' && (
                <Text style={styles.warningSmall}>Esta restauracion reemplazara TODOS los datos actuales.</Text>
              )}
            </View>
          ) : (
            <View style={styles.selectHint}>
              <Text style={styles.selectHintText}>Selecciona un respaldo de la lista de arriba</Text>
            </View>
          )}

          <Field label="Clave secreta de restauracion (RESTORE_SECRET)">
            <View style={styles.pwdRow}>
              <Input
                secureTextEntry={!showSec}
                placeholder="Clave del .env del servidor"
                value={secret}
                onChangeText={setSecret}
                style={{ flex: 1 }}
              />
              <TouchableOpacity onPress={() => setShowSec(v => !v)} style={styles.eyeBtn}>
                {showSec ? <EyeOff size={16} color={Colors.creamDim} /> : <Eye size={16} color={Colors.creamDim} />}
              </TouchableOpacity>
            </View>
          </Field>

          <Button
            onPress={handleRestore}
            loading={loading}
            disabled={!selected || !secret.trim()}
            icon={<RotateCcw size={16} color={Colors.navy} />}
            style={styles.restoreBtn}
          >
            Restaurar base de datos
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.navy },
  scroll:      { padding: 20, gap: 16, paddingBottom: 40 },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconWrap:    { width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.warningBg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title:       { fontSize: 20, fontWeight: '800', color: Colors.white },
  subtitle:    { fontSize: 12, color: Colors.creamDim, marginTop: 2 },
  warningCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.warningBg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.warning + '33' },
  warningText: { flex: 1, fontSize: 12, color: Colors.creamDim, lineHeight: 18 },
  section:     { backgroundColor: Colors.navyCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle:{ fontSize: 14, fontWeight: '700', color: Colors.white, flex: 1 },
  refreshBtn:  { padding: 6, borderRadius: 8, backgroundColor: Colors.navyHover },
  loadingText: { fontSize: 13, color: Colors.creamDim, textAlign: 'center', paddingVertical: 12 },
  emptyBackups:{ alignItems: 'center', gap: 8, paddingVertical: 16 },
  emptyText:   { fontSize: 12, color: Colors.creamDim, textAlign: 'center' },
  backupItem:  { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.navy, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12 },
  backupItemSelected: { borderColor: Colors.teal, backgroundColor: Colors.tealGlow },
  backupIcon:  { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  backupName:  { fontSize: 11, fontWeight: '600', color: Colors.cream, fontFamily: 'monospace' },
  backupMeta:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  metaTag:     { fontSize: 10, fontWeight: '700', color: Colors.creamDim },
  metaSize:    { fontSize: 10, color: Colors.creamDim, marginLeft: 'auto' },
  backupDate:  { fontSize: 10, color: Colors.creamDim, marginTop: 3 },
  selectedInfo:{ backgroundColor: Colors.navy, borderRadius: 10, padding: 12, gap: 5 },
  selectedLabel:{ fontSize: 9, color: Colors.creamDim, letterSpacing: 1, textTransform: 'uppercase' },
  selectedName: { fontSize: 11, color: Colors.cream, fontFamily: 'monospace' },
  selectedTipo: { fontSize: 12, fontWeight: '600' },
  warningSmall: { fontSize: 11, color: Colors.danger, marginTop: 4 },
  selectHint:   { backgroundColor: Colors.navy, borderRadius: 9, padding: 14, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center' },
  selectHintText:{ fontSize: 13, color: Colors.creamDim },
  pwdRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn:       { padding: 10 },
  restoreBtn:   { backgroundColor: Colors.warning },
});
