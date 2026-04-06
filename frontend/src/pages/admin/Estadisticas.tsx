import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Layout } from '../../components/Layout';
import { PageHeader, Card, StatCard, Spinner } from '../../components/UI';
import { TrendingUp, Users, Calendar, Stethoscope } from 'lucide-react';
import styles from './Estadisticas.module.css';

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

const COLORES_ESTADO: Record<string, string> = {
  ASISTIDA:  '#1A7A6E',
  PENDIENTE: '#f59e0b',
  CANCELADA: '#f87171',
};

const PALETTE = ['#1A7A6E','#22a08d','#3ecf8e','#f59e0b','#f87171'];

const LABEL_ESTADO: Record<string, string> = {
  ASISTIDA: 'Asistida', PENDIENTE: 'Pendiente', CANCELADA: 'Cancelada',
};

export default function Estadisticas() {
  const { data, loading } = useQuery(GET_ESTADISTICAS, { fetchPolicy: 'cache-and-network' });
  const e = data?.estadisticasAdmin;

  return (
    <Layout>
      <PageHeader title="Estadísticas" subtitle="Análisis de datos del sistema" />

      {loading && <Spinner />}

      {e && (
        <>
          {/* KPIs */}
          <div className={styles.kpiRow}>
            <StatCard icon={<Calendar size={20} color="var(--teal)" />}
              label="Total de citas" value={e.totalCitas} />
            <StatCard icon={<Stethoscope size={20} color="var(--teal)" />}
              label="Psicólogos" value={e.totalPsicologos} />
            <StatCard icon={<Users size={20} color="var(--teal)" />}
              label="Estudiantes" value={e.totalEstudiantes} />
            <StatCard icon={<TrendingUp size={20} color="var(--teal)" />}
              label="Tasa de asistencia"
              value={`${e.totalCitas > 0
                ? Math.round((e.citasPorEstado.find((s: any) => s.estado === 'ASISTIDA')?.total ?? 0) / e.totalCitas * 100)
                : 0}%`}
            />
          </div>

          <div className={styles.grid}>
            {/* Citas por mes */}
            <Card className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Citas por mes (últimos 6 meses)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={e.citasPorMes} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#8899aa' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#8899aa' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#141c2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                    labelStyle={{ color: '#e6e1d6' }}
                    itemStyle={{ color: '#1A7A6E' }}
                  />
                  <Bar dataKey="total" fill="#1A7A6E" radius={[4,4,0,0]} name="Citas" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Distribución por estado */}
            <Card className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Distribución por estado</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={e.citasPorEstado}
                    dataKey="total"
                    nameKey="estado"
                    cx="50%" cy="50%"
                    outerRadius={80}
                    label={({ estado, percent }: any) =>
                      `${LABEL_ESTADO[estado] ?? estado} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  >
                    {e.citasPorEstado.map((entry: any) => (
                      <Cell key={entry.estado}
                        fill={COLORES_ESTADO[entry.estado] ?? '#8899aa'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#141c2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                    formatter={(v: any, name: any) => [v, LABEL_ESTADO[name] ?? name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Top psicólogos */}
            <Card className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Psicólogos más solicitados</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={e.psicologosTop}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#8899aa' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11, fill: '#8899aa' }} width={110} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#141c2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                    labelStyle={{ color: '#e6e1d6' }}
                    itemStyle={{ color: '#22a08d' }}
                  />
                  <Bar dataKey="total" radius={[0,4,4,0]} name="Citas">
                    {e.psicologosTop.map((_: any, i: number) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Top carreras */}
            <Card className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Carreras con más citas</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={e.carrerasTop}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#8899aa' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="carrera" tick={{ fontSize: 11, fill: '#8899aa' }} width={130} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#141c2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                    labelStyle={{ color: '#e6e1d6' }}
                    itemStyle={{ color: '#3ecf8e' }}
                  />
                  <Bar dataKey="total" radius={[0,4,4,0]} name="Citas">
                    {e.carrerasTop.map((_: any, i: number) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </>
      )}
    </Layout>
  );
}