import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Brain, LayoutDashboard, Users, Calendar, Clock,
  Database, Shield, ClipboardList, GraduationCap,
  UserCheck, LogOut, ChevronDown, Palette, TrendingUp,
  Menu, X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useTheme, THEMES } from '../auth/ThemeContext';
import styles from './Sidebar.module.css';

const NAV: Record<string, { to: string; icon: React.ReactNode; label: string }[]> = {
  estudiante: [
    { to: '/dashboard',  icon: <LayoutDashboard size={16} />, label: 'Inicio'        },
    { to: '/psicologos', icon: <Users size={16} />,           label: 'Psicólogos'    },
    { to: '/mis-citas',  icon: <Calendar size={16} />,        label: 'Mis Citas'     },
    { to: '/admin/mfa',  icon: <Shield size={16} />,          label: 'Seguridad MFA' },
  ],
  psicologo: [
    { to: '/dashboard',     icon: <LayoutDashboard size={16} />, label: 'Inicio'        },
    { to: '/agenda',        icon: <Calendar size={16} />,        label: 'Agenda'        },
    { to: '/mis-pacientes', icon: <ClipboardList size={16} />,   label: 'Mis Pacientes' },
    { to: '/horarios',      icon: <Clock size={16} />,           label: 'Mis Horarios'  },
    { to: '/admin/mfa',     icon: <Shield size={16} />,          label: 'Seguridad MFA' },
  ],
  administrador: [
    { to: '/dashboard',          icon: <LayoutDashboard size={16} />, label: 'Inicio'        },
    { to: '/admin/psicologos',   icon: <UserCheck size={16} />,       label: 'Psicólogos'    },
    { to: '/admin/estudiantes',  icon: <GraduationCap size={16} />,   label: 'Estudiantes'   },
    { to: '/admin/estadisticas', icon: <TrendingUp size={16} />,      label: 'Estadísticas'  },
    { to: '/admin/backup',       icon: <Database size={16} />,        label: 'Respaldos'     },
    { to: '/admin/mfa',          icon: <Shield size={16} />,          label: 'Seguridad MFA' },
  ],
};

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const { user, logout }    = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate             = useNavigate();
  const [themeOpen, setThemeOpen] = useState(false);
  const links = NAV[user?.rol ?? 'estudiante'] ?? [];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      {/* Overlay para móvil */}
      {!collapsed && (
        <div className={styles.overlay} onClick={() => setCollapsed(true)} />
      )}

      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>

        {/* Botón toggle */}
        <button
          className={styles.toggleBtn}
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>

        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandIconWrap}><Brain size={20} strokeWidth={1.5} /></div>
          {!collapsed && (
            <div>
              <div className={styles.brandName}>UniMente</div>
              <div className={styles.brandSub}>Portal de Bienestar</div>
            </div>
          )}
        </div>

        {/* User card */}
        {!collapsed && (
          <div className={styles.userCard}>
            <div className={styles.avatar}>{user?.nombre?.charAt(0).toUpperCase()}</div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user?.nombre}</div>
              <div className={styles.userRole}>{user?.rol}</div>
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav className={styles.nav}>
          {!collapsed && <div className={styles.navLabel}>Menú</div>}
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              title={collapsed ? link.label : undefined}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''} ${collapsed ? styles.navLinkCollapsed : ''}`}
              onClick={() => {
                // En móvil, cerrar el menú al navegar
                if (window.innerWidth < 768) setCollapsed(true);
              }}
            >
              <span className={styles.navIcon}>{link.icon}</span>
              {!collapsed && link.label}
            </NavLink>
          ))}
        </nav>

        {/* Theme — solo expandido */}
        {!collapsed && (
          <div className={styles.themeSection}>
            <button
              className={styles.themeToggle}
              onClick={() => setThemeOpen(v => !v)}
            >
              <Palette size={14} />
              <span>Paleta: {theme.name}</span>
              <ChevronDown size={14} className={`${styles.themeChevron} ${themeOpen ? styles.themeChevronOpen : ''}`} />
            </button>
            {themeOpen && (
              <div className={styles.themeDropdown}>
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    className={`${styles.themeOption} ${t.id === theme.id ? styles.themeOptionActive : ''}`}
                    onClick={() => { setTheme(t.id); setThemeOpen(false); }}
                  >
                    <span className={styles.themePreview} style={{ background: t.preview }} />
                    {t.name}
                    {t.id === theme.id && <span className={styles.themeCheck}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          className={styles.logoutBtn}
          onClick={handleLogout}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <LogOut size={15} />
          {!collapsed && ' Cerrar sesión'}
        </button>
      </aside>
    </>
  );
}