import {
  createContext, useContext, useState,
  useEffect, ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Paletas (mismo nombre que el frontend web) ────────────────────
export const PALETTES = {
  oceano: {
    name: 'Océano',
    teal:      '#1A7A6E',
    tealLight: '#22a08d',
    tealDim:   'rgba(26,122,110,0.5)',
    tealGlow:  'rgba(26,122,110,0.12)',
  },
  lavanda: {
    name: 'Lavanda',
    teal:      '#7C5CBF',
    tealLight: '#9b7fd4',
    tealDim:   'rgba(124,92,191,0.5)',
    tealGlow:  'rgba(124,92,191,0.12)',
  },
  coral: {
    name: 'Coral',
    teal:      '#E05C4B',
    tealLight: '#f07060',
    tealDim:   'rgba(224,92,75,0.5)',
    tealGlow:  'rgba(224,92,75,0.12)',
  },
  menta: {
    name: 'Menta',
    teal:      '#2D9E6B',
    tealLight: '#3ec882',
    tealDim:   'rgba(45,158,107,0.5)',
    tealGlow:  'rgba(45,158,107,0.12)',
  },
  noche: {
    name: 'Noche',
    teal:      '#3B7DD8',
    tealLight: '#5b9ef8',
    tealDim:   'rgba(59,125,216,0.5)',
    tealGlow:  'rgba(59,125,216,0.12)',
  },
} as const;

export type PaletteKey = keyof typeof PALETTES;

// ── Colores base (siempre iguales, independientes de la paleta) ───
const BASE = {
  navy:       '#0d1117',
  navyCard:   '#141c2e',
  navyHover:  '#1a2540',
  white:      '#f0f4f8',
  cream:      '#c8d6e5',
  creamDim:   '#8899aa',
  border:     'rgba(255,255,255,0.08)',
  borderLight:'rgba(255,255,255,0.15)',
  success:    '#3ecf8e',
  successBg:  'rgba(62,207,142,0.1)',
  danger:     '#f87171',
  dangerBg:   'rgba(248,113,113,0.1)',
  warning:    '#f59e0b',
  warningBg:  'rgba(245,158,11,0.1)',
  overlay:    'rgba(0,0,0,0.7)',
};

function buildColors(palette: PaletteKey) {
  return { ...BASE, ...PALETTES[palette] };
}

export type ThemeColors = ReturnType<typeof buildColors>;

interface ThemeContextType {
  palette:    PaletteKey;
  colors:     ThemeColors;
  setPalette: (p: PaletteKey) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [palette, setPaletteState] = useState<PaletteKey>('oceano');

  useEffect(() => {
    AsyncStorage.getItem('theme_palette').then(v => {
      if (v && v in PALETTES) setPaletteState(v as PaletteKey);
    });
  }, []);

  const setPalette = async (p: PaletteKey) => {
    await AsyncStorage.setItem('theme_palette', p);
    setPaletteState(p);
  };

  return (
    <ThemeContext.Provider value={{ palette, colors: buildColors(palette), setPalette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}