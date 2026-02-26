import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// ── Google icon (SVG inline — no extra dependency) ────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

// ── Spinner ───────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────
export function LoginPage() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

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

  async function handleGoogle() {
    clearMessages();
    setBusy(true);
    try {
      await signInWithGoogle();
      // Page will redirect — no need to setBusy(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בהתחברות עם Google.');
      setBusy(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-gray-50 px-4"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">GROW</h1>
          <p className="text-sm text-gray-500">
            {mode === 'login' ? 'כניסה לפרויקט' : 'יצירת חשבון חדש'}
          </p>
        </div>

        {/* Google button */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <GoogleIcon />
          {busy ? <Spinner /> : 'התחבר עם Google'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 text-gray-400 text-xs">
          <div className="flex-1 h-px bg-gray-200" />
          <span>או</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email / password form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {mode === 'register' && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                שם מלא
              </label>
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
            <label className="block text-sm font-medium text-gray-700">
              כתובת אימייל
            </label>
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
            <label className="block text-sm font-medium text-gray-700">
              סיסמה
            </label>
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

          {/* Error / info messages */}
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

        {/* Google OAuth note */}
        <p className="text-center text-xs text-gray-400">
          {/* Google sign-in requires enabling the Google provider in */}
          {/* Supabase Dashboard → Authentication → Providers → Google */}
        </p>
      </div>
    </div>
  );
}
