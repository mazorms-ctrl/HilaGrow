import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

interface Props {
  onClose: () => void;
}

export function LoginModal({ onClose }: Props) {
  const { user, signInWithEmail, signUpWithEmail } = useAuth();

  // Close automatically once the user is authenticated
  useEffect(() => {
    if (user) onClose();
  }, [user, onClose]);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function clearMessages() {
    setError(null);
    setInfo(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        // onClose() triggered by useEffect above when user state updates
      } else {
        await signUpWithEmail(email, password, fullName);
        setInfo('נשלח אימייל אימות — בדוק את תיבת הדואר שלך.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'אירעה שגיאה, נסה שנית.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        dir="rtl"
        style={{ width: '100%', maxWidth: '448px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-gray-900">GROW</h1>
              <p className="text-sm text-gray-500">
                {mode === 'login' ? 'כניסה לחשבון' : 'יצירת חשבון חדש'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
              aria-label="סגור"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Email / password form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {mode === 'register' && (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">שם מלא</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="ישראל ישראלי"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">כתובת אימייל</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                dir="ltr"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">סיסמה</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="לפחות 6 תווים"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                dir="ltr"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {info && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy && <Spinner />}
              {mode === 'login' ? 'כניסה' : 'הרשמה'}
            </button>
          </form>

          {/* Toggle login / register */}
          <p className="text-center text-sm text-gray-500">
            {mode === 'login' ? 'אין לך חשבון?' : 'יש לך חשבון?'}{' '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); clearMessages(); }}
              className="text-blue-600 font-medium hover:underline"
            >
              {mode === 'login' ? 'הרשמה' : 'כניסה'}
            </button>
          </p>

        </div>
      </div>
    </div>
  );
}
