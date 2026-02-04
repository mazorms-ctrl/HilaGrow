import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Using old local version until Supabase is configured
import App from './App.tsx'
// New Supabase version (requires DB setup): ./App.new-supabase.tsx
import { QueryProvider } from './providers/QueryProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </StrictMode>,
)
