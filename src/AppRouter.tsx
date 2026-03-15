import { Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import App from './App';
import { LoginPage } from './components/auth/LoginPage';
import { AdminRoute } from './components/auth/AdminRoute';
import { AdminDashboard } from './components/admin/AdminDashboard';

export function AppRouter() {
  const { loading, user } = useAuth();
  const location = useLocation();

  // Spinner while session resolves — matches the login page background
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F4F6FB',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(74,108,247,0.15)',
          borderTopColor: '#4A6CF7',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // /signup always renders LoginPage — handles invitation tokens for both
  // authenticated and unauthenticated users
  if (location.pathname === '/signup') {
    return <LoginPage />;
  }

  // Unauthenticated → login page
  if (!user) {
    return <LoginPage />;
  }

  // Authenticated → full app (owns layout: header + sidebar + routes)
  return (
    <Routes>
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route path="/*" element={<App />} />
    </Routes>
  );
}
