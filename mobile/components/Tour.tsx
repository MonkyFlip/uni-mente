/**
 * Tour.tsx — Tour de onboarding con iconos Lucide (sin emojis)
 */
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import {
  LayoutDashboard, Users, GraduationCap, HardDrive, Settings,
  Shield, Palette, CalendarCheck, Clock, BookOpen, FileText,
  Search, Calendar, ListFilter, X, ChevronLeft, ChevronRight, CheckCircle,
} from 'lucide-react-native';
import { useTour, TourStep } from '../contexts/TourContext';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

// Mapa de icono por paso (por índice dentro del array del rol)
const STEP_ICONS: Record<string, any> = {
  inicio:          LayoutDashboard,
  psicologos:      Users,
  estudiantes:     GraduationCap,
  respaldos:       HardDrive,
  configuracion:   Settings,
  seguridad:       Shield,
  paleta:          Palette,
  agenda:          CalendarCheck,
  horarios:        Clock,
  pacientes:       BookOpen,
  pdf:             FileText,
  buscar:          Search,
  agendar:         Calendar,
  'mis citas':     CalendarCheck,
  filtros:         ListFilter,
};

function StepIcon({ title, color, size = 32 }: { title: string; color: string; size?: number }) {
  const key = Object.keys(STEP_ICONS).find(k =>
    title.toLowerCase().includes(k)
  );
  const Icon = key ? STEP_ICONS[key] : LayoutDashboard;
  return <Icon size={size} color={color} strokeWidth={1.5} />;
}

export function Tour() {
  const { visible, step, steps, totalSteps, next, prev, finish } = useTour();
  const { colors } = useTheme();

  if (!visible || steps.length === 0) return null;

  const current = steps[step];
  const isLast  = step === totalSteps - 1;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={finish}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.navyCard, borderColor: colors.teal + '50' }]}>

          {/* Cerrar */}
          <TouchableOpacity style={styles.closeBtn} onPress={finish}>
            <X size={18} color={colors.creamDim} />
          </TouchableOpacity>

          {/* Icono */}
          <View style={[styles.iconWrap, { backgroundColor: colors.tealGlow }]}>
            <StepIcon title={current.title} color={colors.teal} size={32} />
          </View>

          {/* Contenido */}
          <Text style={[styles.title, { color: colors.white }]}>{current.title}</Text>
          <Text style={[styles.desc,  { color: colors.creamDim }]}>{current.description}</Text>

          {/* Dots */}
          <View style={styles.dots}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i <= step ? colors.teal : colors.border },
                  i === step && styles.dotActive,
                ]}
              />
            ))}
          </View>

          {/* Navegación */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: colors.navyHover, borderColor: colors.border,
                opacity: step === 0 ? 0.3 : 1 }]}
              onPress={prev}
              disabled={step === 0}
            >
              <ChevronLeft size={18} color={colors.cream} />
            </TouchableOpacity>

            <Text style={[styles.counter, { color: colors.creamDim }]}>
              {step + 1} / {totalSteps}
            </Text>

            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnPrimary, { backgroundColor: colors.teal }]}
              onPress={next}
            >
              {isLast
                ? <CheckCircle size={18} color={colors.white} />
                : <ChevronRight size={18} color={colors.white} />
              }
            </TouchableOpacity>
          </View>

          {isLast && (
            <Text style={[styles.finishHint, { color: colors.creamDim }]}>
              Toca ✓ para finalizar el tour
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center',
                   justifyContent: 'center', padding: 24 },
  card:          { width: width - 48, borderRadius: 20, borderWidth: 1, padding: 28,
                   alignItems: 'center', gap: 14 },
  closeBtn:      { position: 'absolute', top: 16, right: 16, padding: 6 },
  iconWrap:      { width: 72, height: 72, borderRadius: 20, alignItems: 'center',
                   justifyContent: 'center', marginBottom: 4 },
  title:         { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  desc:          { fontSize: 14, lineHeight: 22, textAlign: 'center' },
  dots:          { flexDirection: 'row', gap: 6, marginTop: 4 },
  dot:           { width: 6, height: 6, borderRadius: 3 },
  dotActive:     { width: 20 },
  navRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4,
                   width: '100%', justifyContent: 'space-between' },
  navBtn:        { width: 44, height: 44, borderRadius: 12, borderWidth: 1,
                   alignItems: 'center', justifyContent: 'center' },
  navBtnPrimary: { borderWidth: 0 },
  counter:       { fontSize: 13, fontWeight: '600' },
  finishHint:    { fontSize: 11, marginTop: -6 },
});