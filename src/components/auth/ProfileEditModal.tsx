import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Props {
  onClose: () => void;
}

export function ProfileEditModal({ onClose }: Props) {
  const { user, profile, refreshProfile } = useAuth();

  const [fullName,   setFullName]   = useState(profile?.full_name   ?? '');
  const [department, setDepartment] = useState(profile?.department  ?? '');
  const [position,   setPosition]   = useState(profile?.position    ?? '');
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSuccess(false);
    setBusy(true);
    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), department: department.trim() || null, position: position.trim() || null })
        .eq('id', user.id);
      if (updateErr) throw updateErr;
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => onClose(), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה');
    } finally {
      setBusy(false);
    }
  }

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
      <div dir="rtl" style={{ width: '100%', maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
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
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', borderRadius: '6px' }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Email — read only */}
            <div>
              <label style={labelStyle}>כתובת אימייל</label>
              <input
                type="email"
                value={user?.email ?? ''}
                disabled
                style={{ ...inputStyle, background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed', direction: 'ltr' }}
              />
            </div>

            {/* Full name */}
            <div>
              <label style={labelStyle}>שם מלא</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="ישראל ישראלי"
                style={inputStyle}
              />
            </div>

            {/* Department */}
            <div>
              <label style={labelStyle}>מחלקה</label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="למשל: נוירולוגיה, אדמיניסטרציה..."
                style={inputStyle}
              />
            </div>

            {/* Position */}
            <div>
              <label style={labelStyle}>תפקיד</label>
              <input
                type="text"
                value={position}
                onChange={e => setPosition(e.target.value)}
                placeholder="למשל: רופא בכיר, חוקר..."
                style={inputStyle}
              />
            </div>

            {error && (
              <p style={{ fontSize: '13px', color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '8px 12px', margin: 0 }}>
                {error}
              </p>
            )}

            {success && (
              <p style={{ fontSize: '13px', color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '8px 12px', margin: 0 }}>
                ✓ הפרופיל עודכן בהצלחה
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 18px', background: 'transparent', color: '#475569',
                  border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px',
                  fontWeight: 500, cursor: 'pointer', fontFamily: 'Rubik, sans-serif',
                }}
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={busy}
                style={{
                  padding: '9px 20px', background: busy ? '#93c5fd' : '#2563EB',
                  color: '#fff', border: 'none', borderRadius: '8px',
                  fontSize: '14px', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer',
                  fontFamily: 'Rubik, sans-serif', transition: 'background 0.15s',
                }}
              >
                {busy ? 'שומר...' : 'שמור שינויים'}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────

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
