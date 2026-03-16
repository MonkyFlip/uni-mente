import {
  createContext, useContext, useState,
  useEffect, ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Rol = 'administrador' | 'psicologo' | 'estudiante';

export interface AuthUser {
  token:     string;
  rol:       Rol;
  nombre:    string;
  correo:    string;
  id_perfil?: number;
}

interface AuthContextType {
  user:    AuthUser | null;
  loading: boolean;
  login:   (u: AuthUser) => Promise<void>;
  logout:  () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('auth_user').then(raw => {
      if (raw) setUser(JSON.parse(raw));
    }).finally(() => setLoading(false));
  }, []);

  const login = async (u: AuthUser) => {
    await AsyncStorage.setItem('auth_user', JSON.stringify(u));
    setUser(u);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('auth_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
