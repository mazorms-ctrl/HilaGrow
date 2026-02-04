import { useState, useEffect, useRef } from 'react';
import { ToastContainer, type ToastMessage } from './components/Toast';
import { Button, Card, StatPill } from './components/ui';
import { colors, typography, spacing, radius, shadows } from './styles/tokens';
import { TasksDashboard } from './components/tasks/TasksDashboard';
import AppOriginal from './App';

// Wrapper component that uses new TasksDashboard for 'rows' view
export default function App() {
  const [viewMode, setViewMode] = useState<'dashboard' | 'rows' | 'byOwner' | 'tree'>('rows');
  
  // For rows view, use the new TasksDashboard
  if (viewMode === 'rows') {
    return (
      <div style={{ minHeight: '100vh', direction: 'rtl' }}>
        {/* Header */}
        <header style={{
          borderBottom: '2px solid #e5e5e5',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}>
          <div style={{
            maxWidth: '1920px',
            margin: '0 auto',
            display: 'flex',
            height: '72px',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: colors.brand.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                boxShadow: shadows.brand
              }}>
                🏥
              </div>
              <div>
                <h1 style={{ 
                  fontSize: '32px', 
                  fontWeight: 800, 
                  background: colors.text.gradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  margin: 0,
                  letterSpacing: '-1px'
                }}>
                  GROW - מובילים שינוי
                </h1>
                <p style={{ 
                  fontSize: '14px', 
                  color: colors.text.tertiary, 
                  margin: 0, 
                  fontWeight: 500
                }}>
                  מערכת ניהול שיפור תהליכים - בית חולים
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ width: '2px', height: '32px', background: '#e5e5e5', marginLeft: '4px', marginRight: '4px' }} />
              {(['dashboard', 'rows', 'byOwner', 'tree'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '10px 18px',
                    background: viewMode === mode 
                      ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' 
                      : 'white',
                    color: viewMode === mode ? 'white' : '#525252',
                    border: viewMode === mode ? 'none' : '2px solid #e5e5e5',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: viewMode === mode ? 700 : 600,
                    transition: 'all 0.3s',
                    boxShadow: viewMode === mode ? '0 4px 12px rgba(14, 165, 233, 0.3)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>
                    {mode === 'dashboard' ? '📊' : mode === 'rows' ? '📋' : mode === 'byOwner' ? '👥' : '🌳'}
                  </span>
                  <span>
                    {mode === 'dashboard' ? 'דשבורד' : mode === 'rows' ? 'משימות' : mode === 'byOwner' ? 'לפי אחראי' : 'דיאגרמה'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Content - New TasksDashboard */}
        <main style={{ maxWidth: '1920px', margin: '0 auto' }}>
          <TasksDashboard />
        </main>
      </div>
    );
  }
  
  // For other views, render the original App but pass viewMode state
  return <AppOriginal />;
}
