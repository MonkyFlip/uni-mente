import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { client } from './apollo/client';
import { AuthProvider } from './auth/AuthContext';
import { ThemeProvider } from './auth/ThemeContext';
import { ProtectedRoute } from './auth/ProtectedRoute';

import Login             from './pages/Login';
import Registro          from './pages/Registro';
import Dashboard         from './pages/Dashboard';

import EstPsicologos     from './pages/estudiante/Psicologos';
import MisCitas          from './pages/estudiante/MisCitas';

import Agenda            from './pages/psicologo/Agenda';
import Horarios          from './pages/psicologo/Horarios';
import Historial         from './pages/psicologo/Historial';

import AdminPsicologos   from './pages/admin/Psicologos';
import AdminEstudiantes  from './pages/admin/Estudiantes';
import Backup            from './pages/admin/Backup';
import MfaConfig         from './pages/admin/MfaConfig';
import EmergencyRestore  from './pages/admin/EmergencyRestore';
import Estadisticas      from './pages/admin/Estadisticas';

export default function App() {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              {/* Públicas */}
              <Route path="/login"             element={<Login />} />
              <Route path="/registro"          element={<Registro />} />
              <Route path="/emergency-restore" element={<EmergencyRestore />} />
              <Route path="/"                  element={<Navigate to="/login" replace />} />

              {/* Dashboard (todos) */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

              {/* MFA (todos los autenticados) */}
              <Route path="/admin/mfa" element={<ProtectedRoute><MfaConfig /></ProtectedRoute>} />

              {/* Estudiante */}
              <Route path="/psicologos" element={<ProtectedRoute><EstPsicologos /></ProtectedRoute>} />
              <Route path="/mis-citas"  element={<ProtectedRoute roles={['estudiante']}><MisCitas /></ProtectedRoute>} />

              {/* Psicólogo */}
              <Route path="/agenda"         element={<ProtectedRoute roles={['psicologo']}><Agenda /></ProtectedRoute>} />
              <Route path="/horarios"       element={<ProtectedRoute roles={['psicologo']}><Horarios /></ProtectedRoute>} />
              <Route path="/mis-pacientes"  element={<ProtectedRoute roles={['psicologo']}><Historial /></ProtectedRoute>} />

              {/* Admin */}
              <Route path="/admin/psicologos"  element={<ProtectedRoute roles={['administrador']}><AdminPsicologos /></ProtectedRoute>} />
              <Route path="/admin/estudiantes" element={<ProtectedRoute roles={['administrador']}><AdminEstudiantes /></ProtectedRoute>} />
              <Route path="/admin/backup"      element={<ProtectedRoute roles={['administrador']}><Backup /></ProtectedRoute>} />

              {/* Estadísticas (admin y psicólogo) */}
              <Route path="/admin/estadisticas" element={<ProtectedRoute roles={['administrador']}><Estadisticas /></ProtectedRoute>} />
              
              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </ApolloProvider>
  );
}
