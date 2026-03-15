import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getInvitationByToken, acceptInvitation } from '@/services/inviteService';

// ── Field icons ───────────────────────────────────────────────
function IconMail() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  );
}
function IconBuilding() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </svg>
  );
}
function IconBriefcase() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2 12h20" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg style={{ animation: 'lpSpin 0.8s linear infinite', width: 18, height: 18, flexShrink: 0 }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ── Input field — no label, icon left, placeholder only ───────
function Field({
  icon, type = 'text', value, onChange, onBlur,
  placeholder, dir = 'rtl', hasError = false,
}: {
  icon: React.ReactNode; type?: string; value: string;
  onChange: (v: string) => void; onBlur?: () => void;
  placeholder: string; dir?: 'ltr' | 'rtl'; hasError?: boolean;
}) {
  return (
    <div style={{ position: 'relative' }}>
      {/* Left icon — bare line icon, no bg, no border */}
      <span style={{
        position: 'absolute', left: '14px', top: '50%',
        transform: 'translateY(-50%)',
        color: hasError ? '#F87171' : '#B0B8C4',
        display: 'flex', alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 1,
      }}>
        {icon}
      </span>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        dir={dir}
        style={{
          width: '100%',
          padding: '13px 16px 13px 44px',
          borderRadius: '12px',
          border: `1.5px solid ${hasError ? '#FCA5A5' : '#E8EDF2'}`,
          background: '#FFFFFF',
          fontSize: '14px',
          fontFamily: 'Heebo, sans-serif',
          color: '#0F172A',
          outline: 'none',
          boxSizing: 'border-box',
          textAlign: 'right',
          transition: 'border-color 0.18s, box-shadow 0.18s, background 0.18s',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = '#2563EB';
          e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(37,99,235,0.09)';
          e.currentTarget.style.background  = '#FFFFFF';
        }}
        onBlurCapture={e => {
          e.currentTarget.style.borderColor = hasError ? '#FCA5A5' : '#E8EDF2';
          e.currentTarget.style.boxShadow   = 'none';
          e.currentTarget.style.background  = '#F8FAFC';
        }}
      />
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────
type Mode = 'login' | 'register' | 'forgot';

// ── LoginPage ─────────────────────────────────────────────────
export function LoginPage() {
  const { signInWithEmail, signUpWithEmail } = useAuth();

  const [mode, setMode]             = useState<Mode>('login');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [fullName, setFullName]     = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition]     = useState('');
  const [touched, setTouched]       = useState({ department: false, position: false });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [info, setInfo]             = useState<string | null>(null);
  const [busy, setBusy]             = useState(false);

  // ── Invitation token handling ──────────────────────────────────────────────
  const [inviteToken, setInviteToken]       = useState<string | null>(null);
  const [invitation, setInvitation]         = useState<Awaited<ReturnType<typeof getInvitationByToken>>>(null);
  const [inviteLoading, setInviteLoading]   = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');
    if (!token) return;

    setInviteToken(token);
    setMode('register');
    setInviteLoading(true);

    getInvitationByToken(token).then(inv => {
      if (inv) {
        setInvitation(inv);
        setEmail(inv.email);      // pre-fill email from invitation
      }
    }).finally(() => setInviteLoading(false));
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  function clearMessages() { setError(null); setInfo(null); }
  function switchMode(next: Mode) { setMode(next); clearMessages(); setTouched({ department: false, position: false }); }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    clearMessages();
    if (mode === 'register' && (!department.trim() || !position.trim())) {
      setTouched({ department: true, position: true });
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else if (mode === 'register') {
        // signUpWithEmail returns the new user's ID
        const newUserId = await signUpWithEmail(email, password, fullName, department.trim(), position.trim());

        if (inviteToken) {
          if (newUserId) {
            // User is confirmed immediately (e.g. email confirmation disabled) — accept now
            await acceptInvitation(inviteToken, email, newUserId).catch(console.error);
          } else {
            // Email confirmation required — store token so AuthContext picks it up after redirect
            sessionStorage.setItem('pendingInviteToken', inviteToken);
            sessionStorage.setItem('pendingInviteEmail', email.toLowerCase().trim());
          }
        }

        setInfo(inviteToken
          ? 'החשבון נוצר בהצלחה! תצורף אוטומטית למשימה לאחר אישור האימייל.'
          : 'נשלח אימייל אימות — בדוק את תיבת הדואר שלך.');
      } else {
        const { error: e2 } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (e2) throw e2;
        setInfo('נשלח קישור לאיפוס סיסמה — בדוק את תיבת הדואר שלך.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'אירעה שגיאה, נסה שנית.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes lpSpin    { to { transform: rotate(360deg); } }
        @keyframes lpSlideUp { from{opacity:0;transform:translateY(22px) scale(0.97);} to{opacity:1;transform:translateY(0) scale(1);} }
        .lp-btn:hover:not(:disabled) {
          background: #1D4ED8 !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 12px 30px rgba(37,99,235,0.42) !important;
        }
        .lp-btn:active:not(:disabled) { transform: translateY(0) !important; }
        .lp-link { background:none;border:none;cursor:pointer;font-family:Heebo,sans-serif;font-size:13px;color:#2563EB;font-weight:600;padding:0; }
        .lp-link:hover { text-decoration:underline; }
        .lp-check { accent-color:#2563EB; width:14px; height:14px; cursor:pointer; flex-shrink:0; }

        /* ── Fluid scale for large monitors ── */
        @media (min-width: 1280px) {
          .lp-card { max-width: 520px !important; padding: 52px !important; }
          .lp-card h1 { font-size: 42px !important; }
          .lp-card p  { font-size: 17px !important; }
          .lp-card input { font-size: 15px !important; padding: 14px 16px 14px 48px !important; }
          .lp-card .lp-btn { font-size: 17px !important; padding: 17px 32px !important; }
          .lp-halo-outer { width: 1400px !important; height: 1400px !important; }
          .lp-halo-inner { width: 820px  !important; height: 820px  !important; }
        }
        @media (min-width: 1536px) {
          .lp-card { max-width: 600px !important; padding: 60px !important; }
          .lp-card h1 { font-size: 52px !important; letter-spacing: -1.5px !important; }
          .lp-card p  { font-size: 19px !important; }
          .lp-card input { font-size: 16px !important; padding: 16px 16px 16px 52px !important; }
          .lp-card .lp-btn { font-size: 18px !important; padding: 19px 32px !important; }
          .lp-card .lp-link { font-size: 14px !important; }
          .lp-halo-outer { width: 1700px !important; height: 1700px !important; }
          .lp-halo-inner { width: 1000px !important; height: 1000px !important; }
        }
        @media (min-width: 1920px) {
          .lp-card { max-width: 700px !important; padding: 72px !important; }
          .lp-card h1 { font-size: 64px !important; letter-spacing: -2px !important; }
          .lp-card p  { font-size: 22px !important; line-height: 1.7 !important; }
          .lp-card input { font-size: 18px !important; padding: 18px 16px 18px 56px !important; border-radius: 16px !important; }
          .lp-card .lp-btn { font-size: 20px !important; padding: 22px 40px !important; }
          .lp-card .lp-link { font-size: 15px !important; }
          .lp-halo-outer { width: 2000px !important; height: 2000px !important; }
          .lp-halo-inner { width: 1200px !important; height: 1200px !important; }
        }
        @media (min-width: 2560px) {
          .lp-card { max-width: 860px !important; padding: 88px !important; }
          .lp-card h1 { font-size: 80px !important; letter-spacing: -3px !important; }
          .lp-card p  { font-size: 26px !important; }
          .lp-card input { font-size: 21px !important; padding: 22px 20px 22px 64px !important; }
          .lp-card .lp-btn { font-size: 24px !important; padding: 26px 48px !important; }
          .lp-card .lp-link { font-size: 18px !important; }
          .lp-halo-outer { width: 2600px !important; height: 2600px !important; }
          .lp-halo-inner { width: 1600px !important; height: 1600px !important; }
        }

        /* Scale the GROW wordmark and Hila logo inside the card header */
        @media (min-width: 1536px) {
          .lp-brand-grow  { font-size: 38px !important; }
          .lp-brand-tag   { font-size: 15px !important; }
          .lp-brand-logo  { height: 76px  !important; }
          .lp-brand-divider { height: 40px !important; }
        }
        @media (min-width: 1920px) {
          .lp-brand-grow  { font-size: 46px !important; }
          .lp-brand-tag   { font-size: 17px !important; }
          .lp-brand-logo  { height: 92px  !important; }
          .lp-brand-divider { height: 50px !important; }
        }
        @media (min-width: 2560px) {
          .lp-brand-grow  { font-size: 56px !important; }
          .lp-brand-tag   { font-size: 20px !important; }
          .lp-brand-logo  { height: 110px !important; }
          .lp-brand-divider { height: 60px !important; }
        }
      `}</style>

      {/* ── Page ── */}
      <div dir="rtl" style={{
        minHeight: '100vh',
        background: '#FFFFFF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: 'Heebo, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* ── Halo: wide soft cloud of light, two layers ── */}
        <div aria-hidden className="lp-halo-outer" style={{
          position: 'absolute',
          width: '1100px', height: '1100px',
          borderRadius: '50%',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: `
            radial-gradient(circle at 50% 50%,
              rgba(79,172,254,0.48)  0%,
              rgba(162,155,254,0.36) 20%,
              rgba(0,242,254,0.22)   40%,
              rgba(250,230,80,0.12)  58%,
              transparent            72%
            )
          `,
          filter: 'blur(72px)',
          pointerEvents: 'none',
        }} />
        <div aria-hidden className="lp-halo-inner" style={{
          position: 'absolute',
          width: '620px', height: '620px',
          borderRadius: '50%',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: `
            radial-gradient(circle at 50% 50%,
              rgba(99,102,241,0.28) 0%,
              rgba(6,182,212,0.16)  45%,
              transparent           68%
            )
          `,
          filter: 'blur(48px)',
          pointerEvents: 'none',
        }} />

        {/* ── Card ── */}
        <div className="lp-card" style={{
          position: 'relative', zIndex: 2,
          width: '100%', maxWidth: '420px',
          background: '#FFFFFF',
          borderRadius: '32px',
          padding: '40px',
          boxShadow:
            '0 0 0 1px rgba(15,23,42,0.05), ' +
            '0 4px 20px rgba(37,99,235,0.07), ' +
            '0 24px 64px rgba(99,102,241,0.10)',
          animation: 'lpSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        }}>

          {/* ══ HEADER: GROW (left)  |  הילה logo (right) ══ */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '16px', marginBottom: '24px',
            direction: 'ltr',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
              <span className="lp-brand-grow" style={{
                fontSize: '32px', fontWeight: 900, letterSpacing: '-0.5px',
                fontFamily: 'Heebo, sans-serif', color: '#0F172A', lineHeight: 1,
              }}>
                GROW
              </span>
              <span className="lp-brand-tag" style={{
                fontSize: '13px', fontWeight: 500, letterSpacing: '0.3px',
                fontFamily: 'Heebo, sans-serif', color: '#64748B', lineHeight: 1,
                alignSelf: 'flex-end',
              }}>
                יוצרים שינוי
              </span>
            </div>

            <div className="lp-brand-divider" style={{ width: '1.5px', height: '32px', background: '#CBD5E1', borderRadius: '1px', flexShrink: 0 }} />

            <img
              src="/hila-logo.png"
              alt="הילה"
              className="lp-brand-logo"
              style={{ height: '64px', objectFit: 'contain' }}
            />
          </div>

          {/* ══ TITLES ══ */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            {mode === 'login' && (
              <>
                <h1 style={{
                  margin: '0 0 10px',
                  fontSize: '36px', fontWeight: 900,
                  color: '#0F172A',
                  fontFamily: 'Heebo, sans-serif',
                  lineHeight: 1.2, letterSpacing: '-1px',
                }}>
                  ברוכים הבאים
                </h1>
                <p style={{
                  margin: 0, fontSize: '16px', color: '#64748B',
                  fontFamily: 'Heebo, sans-serif', fontWeight: 400, lineHeight: 1.6,
                }}>
                  הפלטפורמה למעורבות, השפעה וצמיחה משותפת
                </p>
              </>
            )}
            {mode === 'register' && (
              <>
                <h1 style={{ margin: '0 0 10px', fontSize: '26px', fontWeight: 800, color: '#0F172A', fontFamily: 'Heebo, sans-serif', lineHeight: 1.3 }}>
                  יצירת חשבון חדש
                </h1>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748B', fontFamily: 'Heebo, sans-serif', fontWeight: 400 }}>הצטרף ל-GROW והילה</p>
              </>
            )}
            {mode === 'forgot' && (
              <>
                <h1 style={{ margin: '0 0 10px', fontSize: '26px', fontWeight: 800, color: '#0F172A', fontFamily: 'Heebo, sans-serif', lineHeight: 1.3 }}>
                  איפוס סיסמה
                </h1>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748B', fontFamily: 'Heebo, sans-serif', fontWeight: 400 }}>נשלח לך קישור לשחזור הגישה</p>
              </>
            )}
          </div>

          {/* ══ INVITATION BANNER ══ */}
          {inviteToken && (
            <div style={{
              marginBottom: '16px',
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg,#eff6ff,#f5f3ff)',
              border: '1px solid #c7d2fe',
              borderRight: '4px solid #6366f1',
              fontSize: '13px',
              color: '#3730a3',
              fontFamily: 'Heebo, sans-serif',
              lineHeight: 1.6,
            }}>
              {inviteLoading ? (
                <span style={{ color: '#818cf8' }}>טוען פרטי הזמנה...</span>
              ) : invitation ? (
                <>
                  <strong>{invitation.invited_by_name}</strong> הזמין אותך להצטרף ל-GROW+<br />
                  {invitation.task_title && (
                    <span style={{ fontSize: '12px', opacity: 0.85 }}>
                      משימה: <strong>{invitation.task_title}</strong>
                    </span>
                  )}
                </>
              ) : (
                <span style={{ color: '#b91c1c' }}>ההזמנה לא נמצאה או פגה תוקפה.</span>
              )}
            </div>
          )}

          {/* ══ FORM ══ */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Full name — register */}
            {mode === 'register' && (
              <Field icon={<IconUser />} value={fullName} onChange={setFullName} placeholder="שם מלא" />
            )}

            {/* Email — no label */}
            <Field icon={<IconMail />} type="email" value={email} onChange={setEmail} placeholder="כתובת אימייל" dir="ltr" />

            {/* Department + Position — register */}
            {mode === 'register' && (
              <>
                <div>
                  <Field
                    icon={<IconBuilding />}
                    value={department}
                    onChange={v => { setDepartment(v); setTouched(t => ({ ...t, department: true })); }}
                    onBlur={() => setTouched(t => ({ ...t, department: true }))}
                    placeholder="מחלקה *"
                    hasError={touched.department && !department.trim()}
                  />
                  {touched.department && !department.trim() && (
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#EF4444', fontFamily: 'Heebo, sans-serif' }}>שדה חובה</p>
                  )}
                </div>
                <div>
                  <Field
                    icon={<IconBriefcase />}
                    value={position}
                    onChange={v => { setPosition(v); setTouched(t => ({ ...t, position: true })); }}
                    onBlur={() => setTouched(t => ({ ...t, position: true }))}
                    placeholder="תפקיד *"
                    hasError={touched.position && !position.trim()}
                  />
                  {touched.position && !position.trim() && (
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#EF4444', fontFamily: 'Heebo, sans-serif' }}>שדה חובה</p>
                  )}
                </div>
              </>
            )}

            {/* Password — no label */}
            {mode !== 'forgot' && (
              <Field icon={<IconLock />} type="password" value={password} onChange={setPassword} placeholder="סיסמה" dir="ltr" />
            )}

            {/* ── Remember me (right) ←→ Forgot password (left) ── */}
            {mode === 'login' && (
              /* direction:ltr so "left" = visual left regardless of RTL page */
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px', direction: 'ltr' }}>
                {/* visual LEFT: שכחת סיסמה? */}
                <button type="button" className="lp-link" onClick={() => switchMode('forgot')}>
                  שכחת סיסמה?
                </button>
                {/* visual RIGHT: זכור אותי + checkbox */}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  cursor: 'pointer', fontSize: '13px', color: '#475569',
                  fontFamily: 'Heebo, sans-serif', userSelect: 'none',
                }}>
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="lp-check" />
                  זכור אותי
                </label>
              </div>
            )}

            {mode === 'forgot' && (
              <p style={{ margin: '4px 0', fontSize: '13px', color: '#94A3B8', lineHeight: 1.6, fontFamily: 'Heebo, sans-serif' }}>
                נשלח אליך קישור לאיפוס הסיסמה לכתובת האימייל שהזנת.
              </p>
            )}

            {/* Banners */}
            {error && (
              <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '13px', color: '#B91C1C', fontFamily: 'Heebo, sans-serif' }}>
                {error}
              </div>
            )}
            {info && (
              <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: '13px', color: '#1D4ED8', fontFamily: 'Heebo, sans-serif' }}>
                {info}
              </div>
            )}

            {/* ── Primary button — pill, solid blue, tall ── */}
            <button
              type="submit"
              disabled={busy}
              className="lp-btn"
              style={{
                marginTop: '10px',
                width: '100%',
                padding: '15px 32px',
                borderRadius: '999px',
                border: 'none',
                background: '#2563EB',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: 700,
                fontFamily: 'Heebo, sans-serif',
                letterSpacing: '0.2px',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.72 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'transform 0.15s, box-shadow 0.15s, background 0.15s',
                boxShadow: '0 2px 12px rgba(37,99,235,0.25)',
              }}
            >
              {busy && <Spinner />}
              {mode === 'login' ? 'כניסה למערכת' : mode === 'register' ? 'יצירת חשבון' : 'שלח קישור לאיפוס'}
            </button>
          </form>

          {/* ── Footer ── */}
          <div style={{ marginTop: '22px', textAlign: 'center', fontSize: '12px', color: '#B0B8C4', fontFamily: 'Heebo, sans-serif', fontWeight: 400 }}>
            {mode === 'forgot' ? (
              <button type="button" className="lp-link" onClick={() => switchMode('login')}>← חזרה לכניסה</button>
            ) : mode === 'login' ? (
              <>
                אין לך חשבון?{' '}
                <button type="button" className="lp-link" onClick={() => switchMode('register')}>הרשמה</button>
              </>
            ) : (
              <>
                יש לך חשבון?{' '}
                <button type="button" className="lp-link" onClick={() => switchMode('login')}>כניסה</button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
