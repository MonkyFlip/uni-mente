import {
  createContext, useContext, useState, ReactNode, useRef,
} from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Dimensions, Pressable, ScrollView,
} from 'react-native';
import {
  LayoutDashboard, Users, GraduationCap, Calendar, Clock,
  HardDrive, Shield, Palette, HelpCircle, LogOut, X, ChevronRight, BookOpen, TrendingUp,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, PALETTES, PaletteKey } from '../contexts/ThemeContext';
import { useTour } from '../contexts/TourContext';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(width * 0.78, 320);

interface DrawerCtx { openDrawer: () => void; closeDrawer: () => void; }
const DrawerContext = createContext<DrawerCtx>({ openDrawer: () => {}, closeDrawer: () => {} });
export const useDrawer = () => useContext(DrawerContext);

// ── Rutas exactas según archivos existentes ────────────────────────
const NAV_ITEMS = {
  administrador: [
    { label: 'Inicio',        href: '/(admin)/dashboard',   Icon: LayoutDashboard },
    { label: 'Psicólogos',    href: '/(admin)/psicologos',  Icon: Users           },
    { label: 'Respaldos',     href: '/(admin)/backup',       Icon: HardDrive       },
    { label: 'Seguridad MFA', href: '/(admin)/mfa',          Icon: Shield          },
    { label: 'Estadísticas', href: '/(admin)/estadisticas', Icon: TrendingUp },
  ],
  psicologo: [
    { label: 'Inicio',        href: '/(tabs)/dashboard',    Icon: LayoutDashboard },
    { label: 'Mi Agenda',     href: '/(tabs)/agenda',        Icon: Calendar        },
    { label: 'Mis Horarios',  href: '/(tabs)/horarios',      Icon: Clock           },
    { label: 'Mis Pacientes', href: '/(tabs)/pacientes',     Icon: BookOpen        },
    { label: 'Seguridad MFA', href: '/(tabs)/mfa',           Icon: Shield          },
  ],
  estudiante: [
    { label: 'Inicio',        href: '/(tabs)/dashboard',    Icon: LayoutDashboard },
    { label: 'Psicólogos',    href: '/(tabs)/psicologos',   Icon: Users           },
    { label: 'Mis Citas',     href: '/(tabs)/mis-citas',     Icon: Calendar        },
    { label: 'Seguridad MFA', href: '/(tabs)/mfa',           Icon: Shield          },
  ],
};

function DrawerContent({ onClose }: { onClose: () => void }) {
  const { user, logout }                    = useAuth();
  const { colors, palette, setPalette }     = useTheme();
  const { startTour }                       = useTour();
  const [showPalette, setShowPalette]       = useState(false);

  const items = user ? NAV_ITEMS[user.rol] ?? [] : [];

  const handleNav = (href: string) => {
    onClose();
    setTimeout(() => router.push(href as any), 200);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    router.replace('/(auth)/login');
  };

  const handleTour = () => { onClose(); setTimeout(() => startTour(), 300); };

  return (
    <View style={[s.drawer, { backgroundColor: colors.navyCard }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.userName, { color: colors.white }]} numberOfLines={1}>
            {user?.nombre ?? ''}
          </Text>
          <Text style={[s.userRole, { color: colors.teal }]}>
            {user?.rol === 'administrador' ? 'Administrador'
             : user?.rol === 'psicologo'   ? 'Psicólogo'
             : 'Estudiante'}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose}
          style={[s.closeBtn, { backgroundColor: colors.navyHover }]}>
          <X size={18} color={colors.creamDim} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Navegación */}
        <Text style={[s.section, { color: colors.creamDim }]}>NAVEGACIÓN</Text>
        {items.map(({ label, href, Icon }) => (
          <TouchableOpacity
            key={href}
            style={[s.item, { borderColor: colors.border }]}
            onPress={() => handleNav(href)}
          >
            <Icon size={18} color={colors.teal} strokeWidth={1.8} />
            <Text style={[s.itemLabel, { color: colors.cream }]}>{label}</Text>
            <ChevronRight size={14} color={colors.creamDim} />
          </TouchableOpacity>
        ))}

        {/* Paleta */}
        <Text style={[s.section, { color: colors.creamDim, marginTop: 20 }]}>PERSONALIZACIÓN</Text>
        <TouchableOpacity
          style={[s.item, { borderColor: colors.border }]}
          onPress={() => setShowPalette(v => !v)}
        >
          <Palette size={18} color={colors.teal} strokeWidth={1.8} />
          <Text style={[s.itemLabel, { color: colors.cream }]}>Paleta de color</Text>
          <View style={[s.palettePreview, { backgroundColor: colors.teal }]} />
        </TouchableOpacity>

        {showPalette && (
          <View style={[s.paletteGrid, { backgroundColor: colors.navy, borderColor: colors.border }]}>
            {(Object.keys(PALETTES) as PaletteKey[]).map(key => {
              const p = PALETTES[key];
              const active = palette === key;
              return (
                <TouchableOpacity key={key}
                  style={[s.paletteChip,
                    { borderColor: active ? p.teal : colors.border,
                      backgroundColor: active ? p.tealGlow : colors.navyHover }]}
                  onPress={() => setPalette(key)}
                >
                  <View style={[s.paletteDot, { backgroundColor: p.teal }]} />
                  <Text style={[s.paletteChipText, { color: active ? p.teal : colors.creamDim }]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Tour */}
        <TouchableOpacity
          style={[s.item, { borderColor: colors.border }]}
          onPress={handleTour}
        >
          <HelpCircle size={18} color={colors.teal} strokeWidth={1.8} />
          <Text style={[s.itemLabel, { color: colors.cream }]}>Ver tour de ayuda</Text>
        </TouchableOpacity>

        {/* Cerrar sesión */}
        <TouchableOpacity
          style={[s.item, s.logoutItem, { borderColor: colors.danger + '30' }]}
          onPress={handleLogout}
        >
          <LogOut size={18} color={colors.danger} strokeWidth={1.8} />
          <Text style={[s.itemLabel, { color: colors.danger }]}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export function DrawerProvider({ children }: { children: ReactNode }) {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [open, setOpen] = useState(false);

  const openDrawer = () => {
    setOpen(true);
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
  };

  const closeDrawer = () => {
    Animated.timing(translateX, {
      toValue: -DRAWER_WIDTH, duration: 220, useNativeDriver: true,
    }).start(() => setOpen(false));
  };

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      <View style={{ flex: 1 }}>
        {children}
        {open && (
          <>
            <Pressable style={s.backdrop} onPress={closeDrawer} />
            <Animated.View style={[s.drawerWrapper, { transform: [{ translateX }] }]}>
              <DrawerContent onClose={closeDrawer} />
            </Animated.View>
          </>
        )}
      </View>
    </DrawerContext.Provider>
  );
}

export function MenuButton() {
  const { openDrawer } = useDrawer();
  const { colors }     = useTheme();
  return (
    <TouchableOpacity
      style={[s.menuBtn, { backgroundColor: colors.navyCard, borderColor: colors.border }]}
      onPress={openDrawer}
    >
      <View style={[s.menuLine, { backgroundColor: colors.teal }]} />
      <View style={[s.menuLine, { backgroundColor: colors.teal, width: 14 }]} />
      <View style={[s.menuLine, { backgroundColor: colors.teal }]} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  backdrop:       { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  drawerWrapper:  { position: 'absolute', top: 0, left: 0, bottom: 0, width: DRAWER_WIDTH, zIndex: 999 },
  drawer:         { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    padding: 24, paddingTop: 56, borderBottomWidth: 1, gap: 12 },
  userName:       { fontSize: 17, fontWeight: '700' },
  userRole:       { fontSize: 13, marginTop: 2 },
  closeBtn:       { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  scroll:         { padding: 16, gap: 6, paddingBottom: 48 },
  section:        { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6, marginLeft: 4 },
  item:           { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13,
                    paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  itemLabel:      { fontSize: 14, fontWeight: '500', flex: 1 },
  logoutItem:     { marginTop: 20 },
  palettePreview: { width: 14, height: 14, borderRadius: 7 },
  paletteGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12,
                    borderRadius: 12, borderWidth: 1, marginBottom: 6 },
  paletteChip:    { flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  paletteDot:     { width: 10, height: 10, borderRadius: 5 },
  paletteChipText:{ fontSize: 12, fontWeight: '600' },
  menuBtn:        { width: 38, height: 38, borderRadius: 10, borderWidth: 1,
                    alignItems: 'center', justifyContent: 'center', gap: 4 },
  menuLine:       { width: 18, height: 2, borderRadius: 1 },
});