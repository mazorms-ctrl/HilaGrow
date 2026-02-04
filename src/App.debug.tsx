import { useState } from 'react';

// Simple debug app to test if React is working
function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'Arial', 
      direction: 'rtl',
      textAlign: 'center' 
    }}>
      <h1 style={{ color: '#1a1a1a', marginBottom: '20px' }}>
        🎉 האתר עובד!
      </h1>
      
      <p style={{ fontSize: '18px', marginBottom: '20px' }}>
        אם אתה רואה את ההודעה הזאת - React עובד בסדר גמור!
      </p>

      <div style={{ 
        background: '#f0f0f0', 
        padding: '20px', 
        borderRadius: '10px',
        marginBottom: '20px'
      }}>
        <p style={{ marginBottom: '10px' }}>בדיקה: {count}</p>
        <button 
          onClick={() => setCount(count + 1)}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            background: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          לחץ כאן
        </button>
      </div>

      <div style={{ 
        background: '#fff3cd', 
        padding: '15px', 
        borderRadius: '8px',
        border: '1px solid #ffc107'
      }}>
        <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>
          ✅ מה לעשות עכשיו:
        </p>
        <ol style={{ textAlign: 'right', lineHeight: '1.8' }}>
          <li>פתח את Developer Console (F12)</li>
          <li>בדוק אם יש שגיאות אדומות</li>
          <li>העתק את השגיאות ושלח אותן</li>
        </ol>
      </div>

      <p style={{ marginTop: '30px', color: '#666', fontSize: '14px' }}>
        נתיב: {window.location.href}
      </p>
    </div>
  );
}

export default App;
