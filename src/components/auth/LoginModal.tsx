import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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

type Mode = 'login' | 'register' | 'forgot';

export function LoginModal({ onClose }: Props) {
  const { user, signInWithEmail, signUpWithEmail } = useAuth();

  useEffect(() => {
    if (user) onClose();
  }, [user, onClose]);

  const [mode, setMode]         = useState<Mode>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition]     = useState('');
  const [touched, setTouched]       = useState({ department: false, position: false });
  const [error, setError]       = useState<string | null>(null);
  const [info, setInfo]         = useState<string | null>(null);
  const [busy, setBusy]         = useState(false);

  function clearMessages() { setError(null); setInfo(null); }
  function switchMode(next: Mode) {
    setMode(next);
    clearMessages();
    setTouched({ department: false, position: false });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearMessages();

    // Manual validation for register fields
    if (mode === 'register') {
      if (!department.trim() || !position.trim()) {
        setTouched({ department: true, position: true });
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else if (mode === 'register') {
        await signUpWithEmail(email, password, fullName, department.trim(), position.trim());
        setInfo('נשלח אימייל אימות — בדוק את תיבת הדואר שלך.');
      } else {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetErr) throw resetErr;
        setInfo('נשלח קישור לאיפוס סיסמה — בדוק את תיבת הדואר שלך.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'אירעה שגיאה, נסה שנית.');
    } finally {
      setBusy(false);
    }
  }

  const titles: Record<Mode, string> = {
    login:    'כניסה לחשבון',
    register: 'יצירת חשבון חדש',
    forgot:   'איפוס סיסמה',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div dir="rtl" style={{ width: '100%', maxWidth: '448px' }} onClick={e => e.stopPropagation()}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-gray-900">GROW</h1>
              <p className="text-sm text-gray-500">{titles[mode]}</p>
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Full name — register only */}
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

            {/* Email */}
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

            {/* Department + Position — register only, between email and password */}
            {mode === 'register' && (
              <>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    מחלקה <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={e => { setDepartment(e.target.value); setTouched(t => ({ ...t, department: true })); }}
                    onBlur={() => setTouched(t => ({ ...t, department: true }))}
                    placeholder="למשל: נוירולוגיה, אדמיניסטרציה..."
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      touched.department && !department.trim() ? 'border-red-400' : 'border-gray-300'
                    }`}
                  />
                  {touched.department && !department.trim() && (
                    <p className="text-xs text-red-500 mt-1">שדה חובה</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    תפקיד <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={position}
                    onChange={e => { setPosition(e.target.value); setTouched(t => ({ ...t, position: true })); }}
                    onBlur={() => setTouched(t => ({ ...t, position: true }))}
                    placeholder="למשל: רופא בכיר, חוקר..."
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      touched.position && !position.trim() ? 'border-red-400' : 'border-gray-300'
                    }`}
                  />
                  {touched.position && !position.trim() && (
                    <p className="text-xs text-red-500 mt-1">שדה חובה</p>
                  )}
                </div>
              </>
            )}

            {/* Password */}
            {mode !== 'forgot' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">סיסמה</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      שכחת סיסמה?
                    </button>
                  )}
                </div>
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
            )}

            {mode === 'forgot' && (
              <p className="text-xs text-gray-500">
                נשלח אליך קישור לאיפוס הסיסמה לכתובת האימייל שהזנת.
              </p>
            )}

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
              {mode === 'login' ? 'כניסה' : mode === 'register' ? 'הרשמה' : 'שלח קישור לאיפוס'}
            </button>
          </form>

          {/* Footer links */}
          <div className="text-center text-sm text-gray-500 space-y-2">
            {mode === 'forgot' ? (
              <p>
                <button type="button" onClick={() => switchMode('login')} className="text-blue-600 font-medium hover:underline">
                  ← חזרה לכניסה
                </button>
              </p>
            ) : (
              <p>
                {mode === 'login' ? 'אין לך חשבון?' : 'יש לך חשבון?'}{' '}
                <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} className="text-blue-600 font-medium hover:underline">
                  {mode === 'login' ? 'הרשמה' : 'כניסה'}
                </button>
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
