import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { client } from './apollo/client';
import { AuthProvider } from './auth/AuthContext';
import { ThemeProvider } from './auth/ThemeContext';
import { ProtectedRoute } from './auth/ProtectedRoute';

import Login              from './pages/Login';
import Registro           from './pages/Registro';
import Dashboard          from './pages/Dashboard';
import Psicologos         from './pages/estudiante/Psicologos';
import MisCitas           from './pages/estudiante/MisCitas';
import Agenda             from './pages/psicologo/Agenda';
import Horarios           from './pages/psicologo/Horarios';
import RegistrarPsicologo from './pages/admin/RegistrarPsicologo';
import AdminPsicologos    from './pages/admin/Psicologos';

export default function App() {
  return (
    <ApolloProvider client={client}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login"    element={<Login />} />
              <Route path="/registro" element={<Registro />} />
              <Route path="/"         element={<Navigate to="/login" replace />} />

              <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/psicologos" element={<ProtectedRoute><Psicologos /></ProtectedRoute>} />

              <Route path="/mis-citas" element={<ProtectedRoute roles={['estudiante']}><MisCitas /></ProtectedRoute>} />

              <Route path="/agenda"   element={<ProtectedRoute roles={['psicologo']}><Agenda /></ProtectedRoute>} />
              <Route path="/horarios" element={<ProtectedRoute roles={['psicologo']}><Horarios /></ProtectedRoute>} />

              <Route path="/registrar-psicologo" element={<ProtectedRoute roles={['administrador']}><RegistrarPsicologo /></ProtectedRoute>} />
              <Route path="/admin/psicologos"    element={<ProtectedRoute roles={['administrador']}><AdminPsicologos /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ApolloProvider>
  );
}
