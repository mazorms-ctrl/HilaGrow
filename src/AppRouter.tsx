import { Routes, Route } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import App from './App';
import { TaskPage } from './components/tasks/TaskPage';

export function AppRouter() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/project/:projectId/task/:taskId" element={<TaskPage />} />
      <Route path="/*" element={<App />} />
    </Routes>
  );
}
