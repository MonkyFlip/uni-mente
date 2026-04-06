import { useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@apollo/client';
import { useFocusEffect } from 'expo-router';
import { gql } from '@apollo/client';
import {
  Users, ChevronDown, ChevronUp,
  FileText, Calendar, BookOpen,
} from 'lucide-react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { PageHeader, EmptyState, Spinner, Badge, Pagination } from '../../components/UI';
import { useTheme } from '../../contexts/ThemeContext';
import { MenuButton } from '../../components/Drawer';

// Query correcta — misPacientes devuelve HistorialClinico[]
const GET_MIS_PACIENTES_HISTORIAL = gql`
  query MisPacientes {
    misPacientes {
      id_historial
      fecha_apertura
      estudiante {
        id_estudiante matricula carrera
        usuario { nombre correo }
      }
      detalles {
        id_detalle
        sesion {
          id_sesion numero_sesion notas recomendaciones fecha_registro
        }
      }
    }
  }
`;

function fmtFecha(f: string) {
  return new Date(f).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

async function exportarPDF(historial: any) {
  const p        = historial.estudiante;
  const detalles = (historial.detalles ?? [])
    .filter((d: any) => d.sesion)
    .sort((a: any, b: any) => (a.sesion.numero_sesion ?? 0) - (b.sesion.numero_sesion ?? 0));

  const ahora = new Date().toLocaleString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const filasHTML = detalles.map((d: any) => `
    <div class="sesion">
      <div class="sesion-header">
        <span class="num">Sesión #${d.sesion.numero_sesion}</span>
        <span class="fecha">${fmtFecha(d.sesion.fecha_registro)}</span>
      </div>
      ${d.sesion.notas
        ? `<div class="bloque"><strong>Notas:</strong><p>${d.sesion.notas}</p></div>`
        : ''}
      ${d.sesion.recomendaciones
        ? `<div class="bloque"><strong>Recomendaciones:</strong><p>${d.sesion.recomendaciones}</p></div>`
        : ''}
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
    <style>
      body { font-family:'Helvetica Neue',Arial,sans-serif; color:#1a1a2e; padding:32px; font-size:13px; }
      h1   { font-size:22px; color:#1A7A6E; margin:0 0 4px; }
      .sub { color:#666; font-size:12px; margin-bottom:24px; }
      .info { background:#f0faf8; border-left:4px solid #1A7A6E; padding:12px 16px;
              border-radius:6px; margin-bottom:24px; }
      .info p { margin:2px 0; }
      .sesion { border:1px solid #e0e0e0; border-radius:8px; padding:14px; margin-bottom:14px; }
      .sesion-header { display:flex; justify-content:space-between; margin-bottom:10px; }
      .num  { font-weight:700; color:#1A7A6E; }
      .fecha{ color:#888; font-size:11px; }
      .bloque { margin-bottom:8px; }
      .bloque p { margin:4px 0 0; color:#444; line-height:1.5; }
      .footer { margin-top:32px; border-top:1px solid #eee; padding-top:12px;
                font-size:10px; color:#aaa; }
    </style></head><body>
      <h1>UniMente — Historial Clínico</h1>
      <div class="sub">Generado el ${ahora}</div>
      <div class="info">
        <p><strong>Paciente:</strong> ${p?.usuario?.nombre}</p>
        <p><strong>Correo:</strong>   ${p?.usuario?.correo}</p>
        ${p?.matricula ? `<p><strong>Matrícula:</strong> ${p.matricula}</p>` : ''}
        ${p?.carrera   ? `<p><strong>Carrera:</strong>   ${p.carrera}</p>`   : ''}
      </div>
      <h2 style="font-size:15px;color:#333;margin-bottom:12px">
        Sesiones clínicas (${detalles.length})
      </h2>
      ${filasHTML || '<p style="color:#888">Sin sesiones clínicas registradas.</p>'}
      <div class="footer">UniMente — Portal de Bienestar Universitario · Documento confidencial</div>
    </body></html>
  `;

  // Nombre coherente: "Historial_Juan_Lopez_2026-04-05.pdf"
  const nombreLimpio = (p?.usuario?.nombre ?? 'Paciente')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim().replace(/\s+/g, '_');
  const fechaHoy = new Date().toISOString().split('T')[0];
  const fileName = `Historial_${nombreLimpio}_${fechaHoy}.pdf`;

  const { uri } = await Print.printToFileAsync({ html });
  const destUri = uri.substring(0, uri.lastIndexOf('/') + 1) + fileName;
  await FileSystem.moveAsync({ from: uri, to: destUri }).catch(() => {});

  await Sharing.shareAsync(destUri, {
    mimeType: 'application/pdf',
    dialogTitle: `Historial de ${p?.usuario?.nombre}`,
    UTI: 'com.adobe.pdf',
  });
}

export default function MisPacientes() {
  const { colors } = useTheme();
  const [expanded,  setExpanded]  = useState<number | null>(null);
  const [exporting, setExporting] = useState<number | null>(null);
  const [page,      setPage]      = useState(1);
  const PAGE_SIZE = 8;

  const { data, loading, refetch } = useQuery(GET_MIS_PACIENTES_HISTORIAL, {
    fetchPolicy: 'cache-and-network',
  });

  useFocusEffect(useCallback(() => { refetch(); }, []));

  const historiales: any[] = data?.misPacientes ?? [];
  const totalPages = Math.max(1, Math.ceil(historiales.length / PAGE_SIZE));
  const pagina     = historiales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = async (h: any) => {
    setExporting(h.id_historial);
    try { await exportarPDF(h); }
    catch (e) { console.error('PDF error:', e); }
    finally { setExporting(null); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start',
          justifyContent: 'space-between' }}>
          <PageHeader
            title="Mis Pacientes"
            subtitle={`${historiales.length} historial${historiales.length !== 1 ? 'es' : ''}`}
          />
          <MenuButton />
        </View>

        {loading && <Spinner />}

        {!loading && historiales.length === 0 && (
          <EmptyState
            icon={<Users size={28} color={colors.creamDim} />}
            title="Sin pacientes"
            description="Aquí aparecerán los estudiantes con quienes tengas historial clínico."
          />
        )}

        {pagina.map((h: any) => {
          const isOpen   = expanded === h.id_historial;
          const detalles = (h.detalles ?? []).filter((d: any) => d.sesion);
          const p        = h.estudiante;

          return (
            <View key={h.id_historial}
              style={[s.card, { backgroundColor: colors.navyCard, borderColor: colors.border }]}>

              {/* Cabecera */}
              <TouchableOpacity
                style={s.cardHeader}
                onPress={() => setExpanded(isOpen ? null : h.id_historial)}
                activeOpacity={0.75}
              >
                <View style={[s.avatar, { backgroundColor: colors.tealGlow }]}>
                  <Text style={[s.avatarLetter, { color: colors.teal }]}>
                    {p?.usuario?.nombre?.charAt(0) ?? '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.white }}>
                    {p?.usuario?.nombre}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.creamDim, marginTop: 2 }}>
                    {p?.carrera}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <Badge
                      label={`${detalles.length} sesión${detalles.length !== 1 ? 'es' : ''}`}
                      variant={detalles.length > 0 ? 'teal' : 'gray'}
                    />
                  </View>
                </View>
                {isOpen
                  ? <ChevronUp   size={18} color={colors.creamDim} />
                  : <ChevronDown size={18} color={colors.creamDim} />}
              </TouchableOpacity>

              {/* Detalle expandido */}
              {isOpen && (
                <View style={[s.detail, { borderTopColor: colors.border }]}>

                  {/* Info adicional */}
                  <View style={{ gap: 4 }}>
                    {p?.matricula && (
                      <Text style={{ fontSize: 12, color: colors.creamDim }}>
                        Matrícula: {p.matricula}
                      </Text>
                    )}
                    <Text style={{ fontSize: 12, color: colors.creamDim }}>
                      {p?.usuario?.correo}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.creamDim }}>
                      Historial desde: {fmtFecha(h.fecha_apertura)}
                    </Text>
                  </View>

                  {/* Botón PDF */}
                  <TouchableOpacity
                    style={[s.pdfBtn, { backgroundColor: colors.tealGlow,
                      borderColor: colors.teal + '40' }]}
                    onPress={() => handleExport(h)}
                    disabled={exporting === h.id_historial}
                  >
                    {exporting === h.id_historial
                      ? <ActivityIndicator size="small" color={colors.teal} />
                      : <FileText size={16} color={colors.teal} />}
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.teal }}>
                      {exporting === h.id_historial ? 'Generando PDF...' : 'Exportar historial PDF'}
                    </Text>
                  </TouchableOpacity>

                  {/* Sesiones */}
                  {detalles.length === 0 ? (
                    <Text style={{ fontSize: 13, color: colors.creamDim, textAlign: 'center',
                      paddingVertical: 8 }}>
                      Sin sesiones clínicas registradas aún.
                    </Text>
                  ) : (
                    detalles
                      .sort((a: any, b: any) =>
                        (a.sesion.numero_sesion ?? 0) - (b.sesion.numero_sesion ?? 0))
                      .map((d: any) => (
                        <View key={d.id_detalle}
                          style={[s.sesion, { backgroundColor: colors.navy,
                            borderColor: colors.border }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center',
                            justifyContent: 'space-between', marginBottom: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <BookOpen size={13} color={colors.teal} />
                              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.teal }}>
                                Sesión #{d.sesion.numero_sesion}
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Calendar size={11} color={colors.creamDim} />
                              <Text style={{ fontSize: 11, color: colors.creamDim }}>
                                {fmtFecha(d.sesion.fecha_registro)}
                              </Text>
                            </View>
                          </View>
                          {d.sesion.notas ? (
                            <View style={{ marginTop: 4 }}>
                              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.creamDim,
                                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                                Notas
                              </Text>
                              <Text style={{ fontSize: 13, color: colors.cream, lineHeight: 20 }}>
                                {d.sesion.notas}
                              </Text>
                            </View>
                          ) : null}
                          {d.sesion.recomendaciones ? (
                            <View style={{ marginTop: 8 }}>
                              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.creamDim,
                                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                                Recomendaciones
                              </Text>
                              <Text style={{ fontSize: 13, color: colors.cream, lineHeight: 20 }}>
                                {d.sesion.recomendaciones}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      ))
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {historiales.length > PAGE_SIZE && (
        <Pagination
          total={historiales.length}
          page={page}
          totalPages={totalPages}
          pageSize={PAGE_SIZE}
          onPage={(p) => { setPage(p); setExpanded(null); }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  card:       { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  avatar:     { width: 46, height: 46, borderRadius: 12,
                alignItems: 'center', justifyContent: 'center' },
  avatarLetter:{ fontSize: 20, fontWeight: '700' },
  detail:     { borderTopWidth: 1, padding: 14, gap: 12 },
  pdfBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10,
                padding: 12, borderRadius: 10, borderWidth: 1 },
  sesion:     { borderRadius: 10, borderWidth: 1, padding: 12 },
});