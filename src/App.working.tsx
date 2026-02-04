import { useState } from 'react';

function App() {
  const [viewMode, setViewMode] = useState<'cards' | 'board' | 'tree'>('cards');

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', direction: 'rtl' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid #e5e5e5',
        background: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <div style={{
          maxWidth: '1920px',
          margin: '0 auto',
          display: 'flex',
          height: '64px',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px'
        }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#171717' }}>
            GROW - מחזור ב מובילים שינוי
          </h1>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setViewMode('cards')}
              style={{
                padding: '8px 16px',
                background: viewMode === 'cards' ? '#0ea5e9' : 'white',
                color: viewMode === 'cards' ? 'white' : '#171717',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'Assistant, Arial, sans-serif'
              }}
            >
              משימות
            </button>
            <button
              onClick={() => setViewMode('board')}
              style={{
                padding: '8px 16px',
                background: viewMode === 'board' ? '#0ea5e9' : 'white',
                color: viewMode === 'board' ? 'white' : '#171717',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'Assistant, Arial, sans-serif'
              }}
            >
              לוח
            </button>
            <button
              onClick={() => setViewMode('tree')}
              style={{
                padding: '8px 16px',
                background: viewMode === 'tree' ? '#0ea5e9' : 'white',
                color: viewMode === 'tree' ? 'white' : '#171717',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'Assistant, Arial, sans-serif'
              }}
            >
              דיאגרמה
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '1920px', margin: '0 auto', padding: '24px' }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e5e5',
          padding: '32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          {viewMode === 'cards' && (
            <div>
              <h2 style={{ fontSize: '24px', color: '#171717', marginBottom: '16px' }}>
                תצוגת משימות
              </h2>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px'
              }}>
                {[
                  { title: 'הגדרת יעדי הפרויקט', category: 'תכנון', color: '#7dd3fc', owner: 'ד״ר כהן' },
                  { title: 'מיפוי בעלי עניין', category: 'תכנון', color: '#7dd3fc', owner: 'רחל לוי' },
                  { title: 'פיתוח חומרי הדרכה', category: 'פיתוח', color: '#86efac', owner: 'שרה מזרחי' },
                ].map((task, i) => (
                  <div key={i} style={{
                    border: '1px solid #e5e5e5',
                    borderRadius: '12px',
                    padding: '16px',
                    background: 'white',
                    borderTop: `4px solid ${task.color}`,
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                  >
                    <div style={{ 
                      background: task.color + '20', 
                      color: task.color,
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      marginBottom: '8px'
                    }}>
                      {task.category}
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '8px 0' }}>
                      {task.title}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#737373', marginBottom: '12px' }}>
                      👤 {task.owner}
                    </p>
                    <div style={{ background: '#e5e5e5', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ 
                        background: '#22c55e', 
                        height: '100%', 
                        width: `${Math.random() * 100}%`,
                        transition: 'width 0.3s'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'board' && (
            <div>
              <h2 style={{ fontSize: '24px', color: '#171717' }}>תצוגת לוח</h2>
              <p style={{ color: '#737373', marginTop: '8px' }}>טבלה של כל המשימות</p>
            </div>
          )}

          {viewMode === 'tree' && (
            <div>
              <h2 style={{ fontSize: '24px', color: '#171717' }}>דיאגרמת עץ</h2>
              <p style={{ color: '#737373', marginTop: '8px' }}>תצוגה גרפית של המבנה</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
