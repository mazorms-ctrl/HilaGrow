import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { QueryProvider } from './providers/QueryProvider.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { LoginPage } from './components/auth/LoginPage.tsx'
import { ProtectedRoute } from './components/auth/ProtectedRoute.tsx'

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  console.error('Error message:', event.message);
  console.error('Error filename:', event.filename);
  console.error('Error line:', event.lineno, 'col:', event.colno);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

console.log('🚀 Starting GROW+ application...');

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <QueryProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <App />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </QueryProvider>
      </BrowserRouter>
    </StrictMode>,
  );
  console.log('✅ React app rendered successfully');
} catch (error) {
  console.error('❌ Fatal error rendering app:', error);
  document.body.innerHTML = `
    <div style="padding: 40px; font-family: Arial; direction: rtl; text-align: center;">
      <h1 style="color: red;">שגיאה קריטית</h1>
      <p>לא ניתן לטעון את האפליקציה</p>
      <p style="color: #666; font-size: 14px;">פתח Console (F12) לפרטים</p>
      <pre style="background: #f5f5f5; padding: 20px; text-align: left; overflow: auto;">
        ${error}
      </pre>
    </div>
  `;
}
