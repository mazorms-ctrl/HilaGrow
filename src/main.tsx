import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Original design with auto-save functionality
import App from './App.tsx'
// New design version: ./App.new-supabase.tsx
// Safe version for debugging: ./App.safe.tsx
// Debug version: ./App.debug.tsx
import { QueryProvider } from './providers/QueryProvider.tsx'

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
      <QueryProvider>
        <App />
      </QueryProvider>
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
