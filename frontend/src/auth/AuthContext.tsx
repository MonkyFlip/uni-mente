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
      const stored  = localStorage.getItem('user');
      const token   = localStorage.getItem('token');
      const version = localStorage.getItem('auth_version');

      // Nothing stored → not logged in
      if (!stored || !token) return null;

      const parsed = JSON.parse(stored) as User;

      // Version guard: if the stored session is from before AUTH_VERSION
      // and is missing required fields, force re-login
      if (version !== AUTH_VERSION) {
        // Accept the session only if it has all required fields
        if (!parsed.nombre || !parsed.rol || !parsed.token) {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          return null;
        }
        // Upgrade version tag without clearing the valid session
        localStorage.setItem('auth_version', AUTH_VERSION);
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
    ['token', 'user', 'id_psicologo', 'id_estudiante', 'auth_version']
      .forEach(k => localStorage.removeItem(k));
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