import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage           from './pages/LoginPage';
import DashboardPage       from './pages/DashboardPage';
import ActivosPage         from './pages/ActivosPage';
import PrestamosPage       from './pages/PrestamosPage';
import AuditoriaPage       from './pages/AuditoriaPage';
import MantenimientosPage  from './pages/MantenimientosPage';
import UsuariosPage        from './pages/UsuariosPage';
import LogsPage            from './pages/LogsPage';
import ReportesPage        from './pages/ReportesPage';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.rol)) return <Navigate to="/dashboard" replace />;

  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/activos" element={
            <ProtectedRoute><ActivosPage /></ProtectedRoute>
          } />
          <Route path="/prestamos" element={
            <ProtectedRoute><PrestamosPage /></ProtectedRoute>
          } />
          <Route path="/mantenimientos" element={
            <ProtectedRoute roles={['admin','encargado']}>
              <MantenimientosPage />
            </ProtectedRoute>
          } />
          <Route path="/auditoria" element={
            <ProtectedRoute roles={['admin']}><AuditoriaPage /></ProtectedRoute>
          } />
          <Route path="/usuarios" element={
            <ProtectedRoute roles={['admin']}><UsuariosPage /></ProtectedRoute>
          } />
          <Route path="/reportes" element={
            <ProtectedRoute roles={['admin','encargado']}><ReportesPage /></ProtectedRoute>
          } />
          <Route path="/logs" element={
            <ProtectedRoute roles={['admin']}><LogsPage /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
