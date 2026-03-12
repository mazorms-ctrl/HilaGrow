import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// ── Icons ─────────────────────────────────────────────────────

function IconMail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="12" />
      <path d="M2 12h20" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg style={{ animation: 'spin 0.8s linear infinite', width: 18, height: 18 }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ── Shared field style ─────────────────────────────────────────

const fieldWrap: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
};

const iconWrap: React.CSSProperties = {
  position: 'absolute',
  right: '14px',
  color: '#A0AEC0',
  display: 'flex',
  alignItems: 'center',
  pointerEvents: 'none',
};

function Field({
  icon, type = 'text', value, onChange, onBlur, placeholder, dir = 'rtl', error = false, disabled = false,
}: {
  icon: React.ReactNode;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder: string;
  dir?: 'ltr' | 'rtl';
  error?: boolean;
  disabled?: boolean;
}) {
  return (
    <div style={fieldWrap}>
      <span style={iconWrap}>{icon}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        dir={dir}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '12px 44px 12px 16px',
          borderRadius: '12px',
          border: `1.5px solid ${error ? '#FC8181' : '#E8ECF0'}`,
          background: error ? '#FFF5F5' : '#F7F9FC',
          fontSize: '14px',
          fontFamily: 'Heebo, sans-serif',
          outline: 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxSizing: 'border-box',
          color: '#1A202C',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = error ? '#FC8181' : '#4A6CF7';
          e.currentTarget.style.boxShadow = error
            ? '0 0 0 3px rgba(252,129,129,0.15)'
            : '0 0 0 3px rgba(74,108,247,0.12)';
          e.currentTarget.style.background = '#FFFFFF';
        }}
        onBlurCapture={e => {
          e.currentTarget.style.borderColor = error ? '#FC8181' : '#E8ECF0';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.background = error ? '#FFF5F5' : '#F7F9FC';
        }}
      />
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────

interface Props { onClose: () => void; }
type Mode = 'login' | 'register' | 'forgot';

// ── Component ─────────────────────────────────────────────────

export function LoginModal({ onClose }: Props) {
  const { user, signInWithEmail, signUpWithEmail } = useAuth();

  useEffect(() => { if (user) onClose(); }, [user, onClose]);

  const [mode, setMode]             = useState<Mode>('login');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [fullName, setFullName]     = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition]     = useState('');
  const [touched, setTouched]       = useState({ department: false, position: false });
  const [error, setError]           = useState<string | null>(null);
  const [info, setInfo]             = useState<string | null>(null);
  const [busy, setBusy]             = useState(false);

  function clearMessages() { setError(null); setInfo(null); }
  function switchMode(next: Mode) {
    setMode(next);
    clearMessages();
    setTouched({ department: false, position: false });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearMessages();
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

  const modeTitle: Record<Mode, string> = {
    login:    'כניסה למערכת',
    register: 'יצירת חשבון חדש',
    forgot:   'איפוס סיסמה',
  };

  const modeSubtitle: Record<Mode, string> = {
    login:    'פלטפורמת המעורבות הארגונית שלך',
    register: 'הצטרף ל-GROW והילה',
    forgot:   'נשלח לך קישור לשחזור',
  };

  return (
    <>
      {/* Global keyframes */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes haloFloat {
          0%, 100% { transform: scale(1) translateY(0px); opacity: 0.7; }
          50%       { transform: scale(1.04) translateY(-6px); opacity: 0.85; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        .halo-submit:hover:not(:disabled) {
          background: linear-gradient(135deg, #3451E8 0%, #5B3FF5 100%) !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 8px 24px rgba(74,108,247,0.45) !important;
        }
        .halo-submit:active:not(:disabled) {
          transform: translateY(0px) !important;
        }
        .halo-link:hover { text-decoration: underline; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(10,14,30,0.55)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}
      >
        {/* Halo glow layer — sits behind the card */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            width: '520px',
            height: '420px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at 30% 40%, rgba(99,102,241,0.55) 0%, rgba(139,92,246,0.4) 30%, rgba(6,182,212,0.3) 60%, transparent 75%)',
            filter: 'blur(64px)',
            animation: 'haloFloat 6s ease-in-out infinite',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        {/* Second halo blob for depth */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            width: '380px',
            height: '300px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at 70% 60%, rgba(59,130,246,0.45) 0%, rgba(99,102,241,0.3) 40%, transparent 70%)',
            filter: 'blur(56px)',
            animation: 'haloFloat 8s ease-in-out infinite reverse',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Card */}
        <div
          dir="rtl"
          onClick={e => e.stopPropagation()}
          style={{
            position: 'relative',
            zIndex: 2,
            width: '100%',
            maxWidth: '420px',
            background: '#FFFFFF',
            borderRadius: '32px',
            padding: '40px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 32px rgba(74,108,247,0.1), 0 24px 64px rgba(99,102,241,0.08)',
            animation: 'fadeSlideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '20px', left: '20px',
              width: 32, height: 32, border: 'none', borderRadius: '50%',
              background: '#F1F5F9', color: '#94A3B8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#475569'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#94A3B8'; }}
            aria-label="סגור"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Logo + header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <img
                src="/hillel-yaffe-logo.png"
                alt="GROW Logo"
                style={{ height: '52px', objectFit: 'contain' }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            </div>

            {/* Brand wordmark */}
            <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px' }}>
              <span style={{
                fontSize: '28px', fontWeight: 800, fontFamily: 'Heebo, sans-serif',
                background: 'linear-gradient(135deg, #4A6CF7 0%, #7C3AED 55%, #06B6D4 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text', letterSpacing: '-0.5px',
              }}>GROW</span>
              <span style={{
                fontSize: '22px', fontWeight: 700, fontFamily: 'Heebo, sans-serif',
                color: '#64748B',
              }}>| הילה</span>
            </div>

            <h2 style={{
              margin: '0 0 4px', fontSize: '17px', fontWeight: 700,
              color: '#0F172A', fontFamily: 'Heebo, sans-serif',
            }}>
              {modeTitle[mode]}
            </h2>
            <p style={{
              margin: 0, fontSize: '13px', color: '#94A3B8',
              fontFamily: 'Heebo, sans-serif', fontWeight: 400,
            }}>
              {modeSubtitle[mode]}
            </p>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #E2E8F0, transparent)', marginBottom: '24px' }} />

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Full name — register only */}
            {mode === 'register' && (
              <div>
                <label style={labelStyle}>שם מלא</label>
                <Field icon={<IconUser />} value={fullName} onChange={setFullName} placeholder="ישראל ישראלי" />
              </div>
            )}

            {/* Email */}
            <div>
              <label style={labelStyle}>כתובת אימייל</label>
              <Field icon={<IconMail />} type="email" value={email} onChange={setEmail} placeholder="you@example.com" dir="ltr" />
            </div>

            {/* Department + Position — register only */}
            {mode === 'register' && (
              <>
                <div>
                  <label style={labelStyle}>
                    מחלקה <span style={{ color: '#FC8181' }}>*</span>
                  </label>
                  <Field
                    icon={<IconBuilding />}
                    value={department}
                    onChange={v => { setDepartment(v); setTouched(t => ({ ...t, department: true })); }}
                    onBlur={() => setTouched(t => ({ ...t, department: true }))}
                    placeholder="למשל: נוירולוגיה, אדמיניסטרציה..."
                    error={touched.department && !department.trim()}
                  />
                  {touched.department && !department.trim() && (
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#FC8181', fontFamily: 'Heebo, sans-serif' }}>שדה חובה</p>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>
                    תפקיד <span style={{ color: '#FC8181' }}>*</span>
                  </label>
                  <Field
                    icon={<IconBriefcase />}
                    value={position}
                    onChange={v => { setPosition(v); setTouched(t => ({ ...t, position: true })); }}
                    onBlur={() => setTouched(t => ({ ...t, position: true }))}
                    placeholder="למשל: רופא בכיר, חוקר..."
                    error={touched.position && !position.trim()}
                  />
                  {touched.position && !position.trim() && (
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#FC8181', fontFamily: 'Heebo, sans-serif' }}>שדה חובה</p>
                  )}
                </div>
              </>
            )}

            {/* Password */}
            {mode !== 'forgot' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>סיסמה</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="halo-link"
                      style={{ fontSize: '12px', color: '#4A6CF7', fontFamily: 'Heebo, sans-serif', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      שכחת סיסמה?
                    </button>
                  )}
                </div>
                <Field icon={<IconLock />} type="password" value={password} onChange={setPassword} placeholder="לפחות 6 תווים" dir="ltr" />
              </div>
            )}

            {mode === 'forgot' && (
              <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8', fontFamily: 'Heebo, sans-serif', lineHeight: 1.6 }}>
                נשלח אליך קישור לאיפוס הסיסמה לכתובת האימייל שהזנת.
              </p>
            )}

            {/* Error / info banners */}
            {error && (
              <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#FFF5F5', border: '1px solid #FEB2B2', fontSize: '13px', color: '#C53030', fontFamily: 'Heebo, sans-serif' }}>
                {error}
              </div>
            )}
            {info && (
              <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#F0FFF4', border: '1px solid #9AE6B4', fontSize: '13px', color: '#276749', fontFamily: 'Heebo, sans-serif' }}>
                {info}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              className="halo-submit"
              style={{
                marginTop: '4px',
                width: '100%',
                padding: '13px',
                borderRadius: '999px',
                border: 'none',
                background: 'linear-gradient(135deg, #4A6CF7 0%, #6B46F5 100%)',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 700,
                fontFamily: 'Heebo, sans-serif',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'transform 0.15s, box-shadow 0.15s, background 0.15s',
                boxShadow: '0 4px 16px rgba(74,108,247,0.35)',
              }}
            >
              {busy && <Spinner />}
              {mode === 'login' ? 'כניסה למערכת' : mode === 'register' ? 'יצירת חשבון' : 'שלח קישור לאיפוס'}
            </button>
          </form>

          {/* Footer */}
          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#94A3B8', fontFamily: 'Heebo, sans-serif' }}>
            {mode === 'forgot' ? (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="halo-link"
                style={{ color: '#4A6CF7', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Heebo, sans-serif', fontSize: '13px' }}
              >
                ← חזרה לכניסה
              </button>
            ) : (
              <>
                {mode === 'login' ? 'אין לך חשבון? ' : 'יש לך חשבון? '}
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                  className="halo-link"
                  style={{ color: '#4A6CF7', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Heebo, sans-serif', fontSize: '13px' }}
                >
                  {mode === 'login' ? 'הרשמה' : 'כניסה'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '6px',
  fontFamily: 'Heebo, sans-serif',
};
