import { Component, ErrorInfo, ReactNode } from 'react';

// Enhanced Error Boundary with detailed error display
class DetailedErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    this.setState({ hasError: true, error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '40px', 
          fontFamily: 'Arial', 
          direction: 'rtl',
          background: '#fff',
          minHeight: '100vh'
        }}>
          <div style={{ 
            maxWidth: '800px', 
            margin: '0 auto',
            background: '#fee',
            border: '2px solid #f00',
            borderRadius: '10px',
            padding: '30px'
          }}>
            <h1 style={{ color: '#c00', marginBottom: '20px' }}>
              ⚠️ שגיאה באפליקציה
            </h1>
            
            <div style={{ 
              background: '#fff', 
              padding: '20px', 
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'left',
              fontFamily: 'monospace',
              fontSize: '14px',
              overflowX: 'auto'
            }}>
              <strong>Error Name:</strong>
              <pre>{this.state.error?.name || 'Unknown'}</pre>
              
              <strong style={{ display: 'block', marginTop: '15px' }}>Error Message:</strong>
              <pre>{this.state.error?.message || 'No message available'}</pre>
              
              <strong style={{ display: 'block', marginTop: '15px' }}>Error String:</strong>
              <pre>{this.state.error?.toString() || 'No error details'}</pre>
              
              <strong style={{ display: 'block', marginTop: '15px' }}>Stack:</strong>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                {this.state.error?.stack || 'No stack trace'}
              </pre>

              <strong style={{ display: 'block', marginTop: '15px' }}>Component Stack:</strong>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                {this.state.errorInfo?.componentStack || 'No component stack'}
              </pre>
            </div>

            <div style={{
              background: '#fff3cd',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'right'
            }}>
              <strong>⚠️ הוראות חשובות:</strong>
              <ol style={{ marginTop: '10px', lineHeight: '1.8' }}>
                <li>פתח Developer Console (לחץ F12)</li>
                <li>עבור ללשונית Console</li>
                <li>צלם screenshot של כל השגיאות האדומות</li>
                <li>שלח לי את הצילום</li>
              </ol>
            </div>

            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                background: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              רענן דף
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy load the main app
import { Suspense, lazy } from 'react';

const MainApp = lazy(() => import('./App.new-supabase.tsx'));

function App() {
  return (
    <DetailedErrorBoundary>
      <Suspense fallback={
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          fontFamily: 'Arial',
          direction: 'rtl'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>טוען...</h1>
          <div style={{ 
            fontSize: '48px',
            animation: 'spin 1s linear infinite'
          }}>⏳</div>
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      }>
        <MainApp />
      </Suspense>
    </DetailedErrorBoundary>
  );
}

export default App;
