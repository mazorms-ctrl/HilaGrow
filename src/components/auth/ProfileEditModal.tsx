import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Props {
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────

function translateSupabaseError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'הסיסמה הנוכחית שגויה';
  if (msg.includes('Password should be at least')) return 'הסיסמה חייבת להכיל לפחות 6 תווים';
  if (msg.includes('User not found')) return 'משתמש לא נמצא';
  if (msg.includes('network')) return 'שגיאת רשת — נסה שנית';
  return msg;
}

function PasswordInput({
  label, value, onChange, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...inputStyle, direction: 'ltr', paddingLeft: '36px' }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          style={{
            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94a3b8', padding: 0, display: 'flex', alignItems: 'center',
          }}
          tabIndex={-1}
          aria-label={show ? 'הסתר סיסמה' : 'הצג סיסמה'}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────

export function ProfileEditModal({ onClose }: Props) {
  const { user, refreshProfile } = useAuth();

  // ── Profile section ──
  const [fullName,   setFullName]   = useState('');
  const [department, setDepartment] = useState('');
  const [position,   setPosition]   = useState('');
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [profBusy,    setProfBusy]    = useState(false);
  const [profError,   setProfError]   = useState<string | null>(null);
  const [profSuccess, setProfSuccess] = useState(false);

  // Fetch fresh profile data on mount so fields show the actual saved values
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('full_name, department, position')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name ?? '');
          setDepartment(data.department ?? '');
          setPosition(data.position ?? '');
        }
        setFetchingProfile(false);
      });
  }, [user]);

  // ── Password section ──
  const [showPwSection, setShowPwSection] = useState(false);
  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [pwBusy,    setPwBusy]    = useState(false);
  const [pwError,   setPwError]   = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  // Derived validation
  const pwLengthOk  = newPw.length === 0 || newPw.length >= 6;
  const pwMatchOk   = confirmPw.length === 0 || newPw === confirmPw;
  const pwCanSubmit = currentPw.length > 0 && newPw.length >= 6 && newPw === confirmPw;

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setProfError(null); setProfSuccess(false); setProfBusy(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name:  fullName.trim(),
          department: department.trim() || null,
          position:   position.trim()   || null,
        })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      setProfSuccess(true);
      setTimeout(() => onClose(), 1400);
    } catch (err: unknown) {
      setProfError(err instanceof Error ? err.message : 'שגיאה בשמירה');
    } finally {
      setProfBusy(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email || !pwCanSubmit) return;
    setPwError(null); setPwSuccess(false); setPwBusy(true);
    try {
      // Step 1 — verify current password by re-authenticating
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPw,
      });
      if (signInErr) throw new Error('Invalid login credentials');

      // Step 2 — update to new password
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
      if (updateErr) throw updateErr;

      setPwSuccess(true);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'שגיאה';
      setPwError(translateSupabaseError(raw));
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px', overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div dir="rtl" style={{ width: '100%', maxWidth: '440px', margin: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{
          background: '#fff', borderRadius: '16px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.14)',
          padding: '32px',
        }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>עריכת פרטים אישיים</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>השינויים יחולו מיד בכל מקום</p>
            </div>
            <button type="button" onClick={onClose} style={closeBtn}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* ── Profile form ── */}
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            <div>
              <label style={labelStyle}>כתובת אימייל</label>
              <input
                type="email" value={user?.email ?? ''} disabled
                style={{ ...inputStyle, background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed', direction: 'ltr' }}
              />
            </div>

            <div>
              <label style={labelStyle}>שם מלא</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder={fetchingProfile ? 'טוען...' : 'ישראל ישראלי'}
                disabled={fetchingProfile}
                style={{ ...inputStyle, ...(fetchingProfile ? loadingFieldStyle : {}) }} />
            </div>

            <div>
              <label style={labelStyle}>מחלקה</label>
              <input type="text" value={department} onChange={e => setDepartment(e.target.value)}
                placeholder={fetchingProfile ? 'טוען...' : 'למשל: נוירולוגיה, אדמיניסטרציה...'}
                disabled={fetchingProfile}
                style={{ ...inputStyle, ...(fetchingProfile ? loadingFieldStyle : {}) }} />
            </div>

            <div>
              <label style={labelStyle}>תפקיד</label>
              <input type="text" value={position} onChange={e => setPosition(e.target.value)}
                placeholder={fetchingProfile ? 'טוען...' : 'למשל: רופא בכיר, חוקר...'}
                disabled={fetchingProfile}
                style={{ ...inputStyle, ...(fetchingProfile ? loadingFieldStyle : {}) }} />
            </div>

            {profError   && <Alert type="error">{profError}</Alert>}
            {profSuccess && <Alert type="success">✓ הפרופיל עודכן בהצלחה</Alert>}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={ghostBtn}>ביטול</button>
              <button type="submit" disabled={profBusy || fetchingProfile} style={primaryBtn(profBusy || fetchingProfile)}>
                {profBusy ? 'שומר...' : 'שמור שינויים'}
              </button>
            </div>
          </form>

          {/* ── Divider ── */}
          <div style={{ borderTop: '1px solid #f1f5f9', margin: '24px 0' }} />

          {/* ── Password section toggle ── */}
          <button
            type="button"
            onClick={() => { setShowPwSection(v => !v); setPwError(null); setPwSuccess(false); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 4px',
              fontFamily: 'Rubik, sans-serif',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>שינוי סיסמה</span>
            <span style={{
              fontSize: '11px', color: '#64748b',
              transform: showPwSection ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s', display: 'inline-block',
            }}>▼</span>
          </button>

          {/* ── Password form ── */}
          {showPwSection && (
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>

              <PasswordInput
                label="סיסמה נוכחית"
                value={currentPw}
                onChange={setCurrentPw}
                placeholder="הזן סיסמה נוכחית"
              />

              <div>
                <PasswordInput
                  label="סיסמה חדשה"
                  value={newPw}
                  onChange={setNewPw}
                  placeholder="לפחות 6 תווים"
                />
                {!pwLengthOk && (
                  <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                    הסיסמה חייבת להכיל לפחות 6 תווים
                  </p>
                )}
              </div>

              <div>
                <PasswordInput
                  label="אימות סיסמה חדשה"
                  value={confirmPw}
                  onChange={setConfirmPw}
                  placeholder="חזור על הסיסמה החדשה"
                />
                {!pwMatchOk && (
                  <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                    הסיסמאות אינן תואמות
                  </p>
                )}
              </div>

              {pwError   && <Alert type="error">{pwError}</Alert>}
              {pwSuccess && <Alert type="success">✓ הסיסמה עודכנה בהצלחה</Alert>}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={pwBusy || !pwCanSubmit}
                  style={primaryBtn(pwBusy || !pwCanSubmit)}
                >
                  {pwBusy ? 'מעדכן...' : 'עדכן סיסמה'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function Alert({ type, children }: { type: 'error' | 'success'; children: React.ReactNode }) {
  const isErr = type === 'error';
  return (
    <p style={{
      fontSize: '13px', margin: 0, borderRadius: '8px', padding: '8px 12px',
      color:      isErr ? '#DC2626' : '#16A34A',
      background: isErr ? '#FEF2F2' : '#F0FDF4',
      border:     `1px solid ${isErr ? '#FECACA' : '#BBF7D0'}`,
    }}>
      {children}
    </p>
  );
}

// ── Styles ────────────────────────────────────────────────────

const loadingFieldStyle: React.CSSProperties = {
  background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed',
  animation: 'pulse 1.5s ease-in-out infinite',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  border: '1px solid #e2e8f0', borderRadius: '8px',
  fontSize: '14px', outline: 'none', fontFamily: 'Rubik, sans-serif',
  background: '#ffffff', boxSizing: 'border-box', color: '#0f172a',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 500,
  color: '#374151', marginBottom: '6px',
};

const closeBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#94a3b8', padding: '4px', borderRadius: '6px',
};

const ghostBtn: React.CSSProperties = {
  padding: '9px 18px', background: 'transparent', color: '#475569',
  border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px',
  fontWeight: 500, cursor: 'pointer', fontFamily: 'Rubik, sans-serif',
};

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '9px 20px',
    background: disabled ? '#93c5fd' : '#2563EB',
    color: '#fff', border: 'none', borderRadius: '8px',
    fontSize: '14px', fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'Rubik, sans-serif', transition: 'background 0.15s',
  };
}
