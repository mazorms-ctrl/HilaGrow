function App() {
  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '4em', margin: 0 }}>✅ React עובד!</h1>
      <p style={{ fontSize: '2em', marginTop: '20px' }}>GROW - מערכת ניהול פרויקט</p>
      <p style={{ fontSize: '1.5em', marginTop: '40px', color: '#4ade80' }}>
        אם אתה רואה את זה - המערכת מותקנת נכון
      </p>
    </div>
  );
}

export default App;
