import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

const AUTH_VERSION = '2'; // bump to force re-login when User shape changes

interface User {
  nombre:    string;
  correo:    string;
  rol:       'administrador' | 'psicologo' | 'estudiante';
  token:     string;
  id_perfil: number;
}

interface AuthContextType {
  user:            User | null;
  login:           (user: User) => void;
  logout:          () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      // Version guard: clear stale sessions that are missing id_perfil
      const version = localStorage.getItem('auth_version');
      if (version !== AUTH_VERSION) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('id_psicologo');
        localStorage.removeItem('id_estudiante');
        localStorage.setItem('auth_version', AUTH_VERSION);
        return null;
      }
      const stored = localStorage.getItem('user');
      if (!stored) return null;
      const parsed = JSON.parse(stored) as User;
      // Extra guard: reject if id_perfil is missing for role-specific users
      if ((parsed.rol === 'psicologo' || parsed.rol === 'estudiante') && !parsed.id_perfil) {
        localStorage.removeItem('user');
        return null;
      }
      return parsed;
    } catch { return null; }
  });

  const login = (userData: User) => {
    localStorage.setItem('token',        userData.token);
    localStorage.setItem('user',         JSON.stringify(userData));
    localStorage.setItem('auth_version', AUTH_VERSION);
    if (userData.rol === 'psicologo')  localStorage.setItem('id_psicologo',  String(userData.id_perfil));
    if (userData.rol === 'estudiante') localStorage.setItem('id_estudiante', String(userData.id_perfil));
    setUser(userData);
  };

  const logout = () => {
    ['token','user','id_psicologo','id_estudiante'].forEach(k => localStorage.removeItem(k));
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}