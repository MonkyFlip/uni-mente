import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeId = 'navy' | 'forest' | 'violet' | 'crimson' | 'amber';

export interface Theme {
  id: ThemeId;
  name: string;
  accent: string;
  preview: string;
}

export const THEMES: Theme[] = [
  {
    id: 'navy',
    name: 'Océano',
    accent: '#0ab5a8',
    preview: 'linear-gradient(135deg, #0d1b2a, #0ab5a8)',
  },
  {
    id: 'forest',
    name: 'Bosque',
    accent: '#3ecf8e',
    preview: 'linear-gradient(135deg, #0d1f16, #3ecf8e)',
  },
  {
    id: 'violet',
    name: 'Violeta',
    accent: '#a78bfa',
    preview: 'linear-gradient(135deg, #130d2a, #a78bfa)',
  },
  {
    id: 'crimson',
    name: 'Rubí',
    accent: '#f87171',
    preview: 'linear-gradient(135deg, #1f0d0d, #f87171)',
  },
  {
    id: 'amber',
    name: 'Ámbar',
    accent: '#fbbf24',
    preview: 'linear-gradient(135deg, #1f1508, #fbbf24)',
  },
];

const THEME_VARS: Record<ThemeId, Record<string, string>> = {
  navy: {
    '--base':       '#0d1b2a',
    '--base-light': '#142032',
    '--base-card':  '#1a2c40',
    '--base-hover': '#1f3349',
    '--accent':     '#0ab5a8',
    '--accent-dim': '#089488',
    '--accent-glow':'rgba(10,181,168,0.15)',
    '--accent-rgb': '10,181,168',
  },
  forest: {
    '--base':       '#0d1f16',
    '--base-light': '#122a1e',
    '--base-card':  '#183526',
    '--base-hover': '#1d3f2d',
    '--accent':     '#3ecf8e',
    '--accent-dim': '#2eaf76',
    '--accent-glow':'rgba(62,207,142,0.15)',
    '--accent-rgb': '62,207,142',
  },
  violet: {
    '--base':       '#130d2a',
    '--base-light': '#1b1238',
    '--base-card':  '#221646',
    '--base-hover': '#281a52',
    '--accent':     '#a78bfa',
    '--accent-dim': '#8b6ef5',
    '--accent-glow':'rgba(167,139,250,0.15)',
    '--accent-rgb': '167,139,250',
  },
  crimson: {
    '--base':       '#1a0d0d',
    '--base-light': '#231212',
    '--base-card':  '#2d1616',
    '--base-hover': '#361a1a',
    '--accent':     '#f87171',
    '--accent-dim': '#e55a5a',
    '--accent-glow':'rgba(248,113,113,0.15)',
    '--accent-rgb': '248,113,113',
  },
  amber: {
    '--base':       '#1a1208',
    '--base-light': '#231a0d',
    '--base-card':  '#2d2210',
    '--base-hover': '#362913',
    '--accent':     '#fbbf24',
    '--accent-dim': '#d4a017',
    '--accent-glow':'rgba(251,191,36,0.15)',
    '--accent-rgb': '251,191,36',
  },
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    return (localStorage.getItem('theme') as ThemeId) ?? 'navy';
  });

  const applyTheme = (id: ThemeId) => {
    const vars = THEME_VARS[id];
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));
    // Map to existing CSS vars
    root.style.setProperty('--navy',       vars['--base']);
    root.style.setProperty('--navy-light', vars['--base-light']);
    root.style.setProperty('--navy-card',  vars['--base-card']);
    root.style.setProperty('--navy-hover', vars['--base-hover']);
    root.style.setProperty('--teal',       vars['--accent']);
    root.style.setProperty('--teal-dim',   vars['--accent-dim']);
    root.style.setProperty('--teal-glow',  vars['--accent-glow']);
  };

  useEffect(() => { applyTheme(themeId); }, [themeId]);

  const setTheme = (id: ThemeId) => {
    setThemeId(id);
    localStorage.setItem('theme', id);
  };

  const theme = THEMES.find(t => t.id === themeId)!;

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
