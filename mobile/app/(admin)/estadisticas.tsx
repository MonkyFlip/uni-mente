import { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { useFocusEffect } from 'expo-router';
import {
  BarChart, PieChart,
} from 'react-native-chart-kit';
import {
  TrendingUp, Calendar, Users, Stethoscope, CheckCircle,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader, Spinner, Card, StatCard } from '../../components/UI';
import { useTheme } from '../../contexts/ThemeContext';
import { MenuButton } from '../../components/Drawer';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;

const GET_ESTADISTICAS = gql`
  query EstadisticasAdmin {
    estadisticasAdmin {
      totalCitas totalPsicologos totalEstudiantes
      citasPorMes    { mes total }
      citasPorEstado { estado total }
      psicologosTop  { nombre total }
      carrerasTop    { carrera total }
    }
  }
`;

const CHART_CONFIG = (colors: any) => ({
  backgroundColor: colors.navyCard,
  backgroundGradientFrom: colors.navyCard,
  backgroundGradientTo: colors.navyCard,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(26,122,110,${opacity})`,
  labelColor: () => colors.creamDim,
  propsForBackgroundLines: { stroke: 'rgba(255,255,255,0.06)' },
  propsForLabels: { fontSize: 10 },
});

const COLORES_PIE = ['#1A7A6E', '#f59e0b', '#f87171', '#22a08d', '#3ecf8e'];

const LABEL_ESTADO: Record<string, string> = {
  ASISTIDA: 'Asistida', PENDIENTE: 'Pendiente', CANCELADA: 'Cancelada',
};

export default function Estadisticas() {
  const { colors } = useTheme();
  const { data, loading, refetch } = useQuery(GET_ESTADISTICAS, {
    fetchPolicy: 'cache-and-network',
  });

  useFocusEffect(useCallback(() => { refetch(); }, []));

  const e = data?.estadisticasAdmin;

  const tasaAsistencia = e
    ? Math.round(
        ((e.citasPorEstado.find((s: any) => s.estado === 'ASISTIDA')?.total ?? 0) /
          Math.max(e.totalCitas, 1)) * 100
      )
    : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <PageHeader title="Estadísticas" subtitle="Análisis de datos del sistema" />
          <MenuButton />
        </View>

        {loading && <Spinner />}

        {e && (
          <>
            {/* KPIs */}
            <View style={s.kpiGrid}>
              <View style={s.kpiHalf}>
                <StatCard icon={<Calendar size={18} color={colors.teal} />}
                  label="Total citas" value={e.totalCitas} />
              </View>
              <View style={s.kpiHalf}>
                <StatCard icon={<TrendingUp size={18} color={colors.teal} />}
                  label="Asistencia" value={`${tasaAsistencia}%`} />
              </View>
              <View style={s.kpiHalf}>
                <StatCard icon={<Stethoscope size={18} color={colors.teal} />}
                  label="Psicólogos" value={e.totalPsicologos} />
              </View>
              <View style={s.kpiHalf}>
                <StatCard icon={<Users size={18} color={colors.teal} />}
                  label="Estudiantes" value={e.totalEstudiantes} />
              </View>
            </View>

            {/* Citas por mes */}
            <Card style={{ gap: 12 }}>
              <Text style={[s.chartTitle, { color: colors.cream }]}>
                Citas por mes (últimos 6 meses)
              </Text>
              {e.citasPorMes.length > 0 && (
                <BarChart
                  data={{
                    labels: e.citasPorMes.map((m: any) => m.mes.split(' ')[0]),
                    datasets: [{ data: e.citasPorMes.map((m: any) => m.total) }],
                  }}
                  width={CHART_WIDTH}
                  height={180}
                  chartConfig={CHART_CONFIG(colors)}
                  style={{ borderRadius: 10, marginLeft: -8 }}
                  showValuesOnTopOfBars
                  fromZero
                  yAxisLabel=""
                  yAxisSuffix=""
                />
              )}
            </Card>

            {/* Distribución por estado */}
            <Card style={{ gap: 12 }}>
              <Text style={[s.chartTitle, { color: colors.cream }]}>
                Distribución por estado
              </Text>
              {e.citasPorEstado.length > 0 && (
                <>
                  <PieChart
                    data={e.citasPorEstado.map((est: any, i: number) => ({
                      name: LABEL_ESTADO[est.estado] ?? est.estado,
                      population: est.total,
                      color: COLORES_PIE[i % COLORES_PIE.length],
                      legendFontColor: colors.creamDim,
                      legendFontSize: 12,
                    }))}
                    width={CHART_WIDTH}
                    height={160}
                    chartConfig={CHART_CONFIG(colors)}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="10"
                    absolute
                  />
                  {/* Leyenda manual */}
                  <View style={{ gap: 6, marginTop: 4 }}>
                    {e.citasPorEstado.map((est: any, i: number) => (
                      <View key={est.estado} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5,
                          backgroundColor: COLORES_PIE[i % COLORES_PIE.length] }} />
                        <Text style={{ fontSize: 12, color: colors.creamDim, flex: 1 }}>
                          {LABEL_ESTADO[est.estado] ?? est.estado}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.cream, fontWeight: '600' }}>
                          {est.total}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </Card>

            {/* Psicólogos top */}
            <Card style={{ gap: 12 }}>
              <Text style={[s.chartTitle, { color: colors.cream }]}>
                Psicólogos más solicitados
              </Text>
              {e.psicologosTop.map((p: any, i: number) => (
                <View key={i} style={s.barRow}>
                  <Text style={[s.barLabel, { color: colors.creamDim }]} numberOfLines={1}>
                    {p.nombre.split(' ').slice(0, 2).join(' ')}
                  </Text>
                  <View style={[s.barTrack, { backgroundColor: colors.navyHover }]}>
                    <View style={[s.barFill, {
                      backgroundColor: COLORES_PIE[i % COLORES_PIE.length],
                      width: `${Math.round((p.total / Math.max(...e.psicologosTop.map((x: any) => x.total), 1)) * 100)}%`,
                    }]} />
                  </View>
                  <Text style={[s.barValue, { color: colors.cream }]}>{p.total}</Text>
                </View>
              ))}
            </Card>

            {/* Carreras top */}
            <Card style={{ gap: 12 }}>
              <Text style={[s.chartTitle, { color: colors.cream }]}>
                Carreras con más citas
              </Text>
              {e.carrerasTop.map((c: any, i: number) => (
                <View key={i} style={s.barRow}>
                  <Text style={[s.barLabel, { color: colors.creamDim }]} numberOfLines={1}>
                    {c.carrera}
                  </Text>
                  <View style={[s.barTrack, { backgroundColor: colors.navyHover }]}>
                    <View style={[s.barFill, {
                      backgroundColor: COLORES_PIE[i % COLORES_PIE.length],
                      width: `${Math.round((c.total / Math.max(...e.carrerasTop.map((x: any) => x.total), 1)) * 100)}%`,
                    }]} />
                  </View>
                  <Text style={[s.barValue, { color: colors.cream }]}>{c.total}</Text>
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  kpiGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiHalf:    { flex: 1, minWidth: '45%' },
  chartTitle: { fontSize: 14, fontWeight: '600' },
  barRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel:   { width: 90, fontSize: 11 },
  barTrack:   { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill:    { height: '100%', borderRadius: 4 },
  barValue:   { width: 28, fontSize: 12, fontWeight: '700', textAlign: 'right' },
});