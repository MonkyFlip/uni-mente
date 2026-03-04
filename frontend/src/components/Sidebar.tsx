import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, Clock, UserPlus,
  LogOut, Brain, Palette, Check, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import type { ThemeId } from '../auth/ThemeContext';
import { useTheme, THEMES } from '../auth/ThemeContext';
import styles from './Sidebar.module.css';

const NAV = {
  estudiante: [
    { to: '/dashboard',  Icon: LayoutDashboard, label: 'Inicio' },
    { to: '/psicologos', Icon: Users,            label: 'Psicólogos' },
    { to: '/mis-citas',  Icon: Calendar,         label: 'Mis Citas' },
  ],
  psicologo: [
    { to: '/dashboard',  Icon: LayoutDashboard, label: 'Inicio' },
    { to: '/agenda',     Icon: Calendar,         label: 'Agenda' },
    { to: '/horarios',   Icon: Clock,            label: 'Mis Horarios' },
  ],
  administrador: [
    { to: '/dashboard',           Icon: LayoutDashboard, label: 'Inicio' },
    { to: '/registrar-psicologo', Icon: UserPlus,         label: 'Registrar Psicólogo' },
    { to: '/psicologos',          Icon: Users,            label: 'Psicólogos' },
  ],
};

export function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [showPalette, setShowPalette] = useState(false);

  const links = NAV[user?.rol ?? 'estudiante'];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandIcon}><Brain size={22} strokeWidth={1.8} /></div>
        <div>
          <div className={styles.brandName}>UniMente</div>
          <div className={styles.brandSub}>Portal de Bienestar</div>
        </div>
      </div>

      <div className={styles.userCard}>
        <div className={styles.avatar}>{user?.nombre?.charAt(0).toUpperCase()}</div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>{user?.nombre}</div>
          <div className={styles.userRole}>{user?.rol}</div>
        </div>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navLabel}>Menú</div>
        {links.map(({ to, Icon, label }, i) => (
          <NavLink
            key={to}
            to={to}
            style={{ animationDelay: `${i * 60}ms` }}
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
          >
            <Icon size={17} strokeWidth={1.8} className={styles.navIcon} />
            <span>{label}</span>
            <ChevronRight size={13} className={styles.navArrow} />
          </NavLink>
        ))}
      </nav>

      <div className={styles.themeSection}>
        <button className={styles.themeBtn} onClick={() => setShowPalette(p => !p)}>
          <Palette size={15} strokeWidth={1.8} />
          <span>Paleta: {theme.name}</span>
          <div className={styles.themePreview} style={{ background: theme.preview }} />
        </button>

        <div className={`${styles.palettePanel} ${showPalette ? styles.palettePanelOpen : ''}`}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`${styles.paletteOption} ${t.id === theme.id ? styles.paletteActive : ''}`}
              onClick={() => { setTheme(t.id as ThemeId); setShowPalette(false); }}
            >
              <div className={styles.paletteSwatch} style={{ background: t.preview }} />
              <span>{t.name}</span>
              {t.id === theme.id && <Check size={12} className={styles.paletteCheck} />}
            </button>
          ))}
        </div>
      </div>

      <button className={styles.logoutBtn} onClick={() => { logout(); navigate('/login'); }}>
        <LogOut size={16} strokeWidth={1.8} />
        <span>Cerrar sesión</span>
      </button>
    </aside>
  );
}
