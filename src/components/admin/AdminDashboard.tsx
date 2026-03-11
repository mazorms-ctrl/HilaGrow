import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ─────────────────────────────────────────────────────

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'user';
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────

function Badge({ role }: { role: 'admin' | 'user' }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 10px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: 600,
      background: role === 'admin' ? '#DBEAFE' : '#F1F5F9',
      color: role === 'admin' ? '#1D4ED8' : '#475569',
      border: role === 'admin' ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
    }}>
      {role === 'admin' ? 'Admin' : 'User'}
    </span>
  );
}

// ── New-user form ─────────────────────────────────────────────

interface NewUserFormProps {
  onCreated: () => void;
}

function NewUserForm({ onCreated }: NewUserFormProps) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole]         = useState<'user' | 'admin'>('user');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setBusy(true);
    try {
      // Create user via Supabase Auth admin API (service role not available
      // client-side, so we use signUp which sends a confirmation email).
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (signUpErr) throw signUpErr;

      // If role is admin, update the profile row that the trigger created.
      if (role === 'admin' && data.user) {
        const { error: roleErr } = await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', data.user.id);
        if (roleErr) throw roleErr;
      }

      setSuccess(true);
      setEmail(''); setPassword(''); setFullName(''); setRole('user');
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת המשתמש');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
        <div>
          <label style={labelStyle}>כתובת אימייל</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="user@example.com"
            style={{ ...inputStyle, direction: 'ltr' }}
          />
        </div>
        <div>
          <label style={labelStyle}>סיסמה זמנית</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="לפחות 6 תווים"
            style={{ ...inputStyle, direction: 'ltr' }}
          />
        </div>
        <div>
          <label style={labelStyle}>תפקיד</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as 'user' | 'admin')}
            style={inputStyle}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {error   && <p style={{ fontSize: '13px', color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '8px 12px' }}>{error}</p>}
      {success && <p style={{ fontSize: '13px', color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '8px 12px' }}>המשתמש נוצר בהצלחה — נשלח אימייל אימות.</p>}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" disabled={busy} style={primaryBtnStyle}>
          {busy ? 'יוצר...' : 'צור משתמש'}
        </button>
      </div>
    </form>
  );
}

// ── Main AdminDashboard ────────────────────────────────────────

export function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [users, setUsers]       = useState<UserRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [busy, setBusy]         = useState<string | null>(null); // userId being updated
  const [error, setError]       = useState<string | null>(null);
  const [showNewUser, setShowNewUser] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setUsers((data as UserRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  async function toggleRole(user: UserRow) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    setBusy(user.id);
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', user.id);
    if (error) setError(error.message);
    else setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    setBusy(null);
  }

  async function revokeAccess(user: UserRow) {
    if (!confirm(`האם לבטל גישה למשתמש ${user.email}?`)) return;
    setBusy(user.id);
    // Downgrade to 'user' role — actual account deletion requires service role key
    // so we demote and let the admin handle deletion via Supabase dashboard if needed.
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'user' })
      .eq('id', user.id);
    if (error) setError(error.message);
    else setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: 'user' } : u));
    setBusy(null);
  }

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'Rubik, sans-serif' }}>

      {/* ── Top bar ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #E2E8F0',
        padding: '0 24px',
        height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>ניהול מערכת</span>
          <span style={{ fontSize: '12px', background: '#DBEAFE', color: '#1D4ED8', padding: '2px 10px', borderRadius: '999px', fontWeight: 600 }}>Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#64748B' }}>{profile?.email}</span>
          <button onClick={signOut} style={ghostBtnStyle}>התנתק</button>
        </div>
      </header>

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'סה״כ משתמשים', value: users.length },
            { label: 'מנהלים', value: users.filter(u => u.role === 'admin').length },
            { label: 'משתמשים רגילים', value: users.filter(u => u.role === 'user').length },
          ].map(stat => (
            <div key={stat.label} style={cardStyle}>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{stat.value}</p>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── New user panel ── */}
        <div style={{ ...cardStyle, marginBottom: '24px' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setShowNewUser(v => !v)}
          >
            <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '15px' }}>הוסף משתמש חדש</span>
            <span style={{ fontSize: '18px', color: '#64748B', transform: showNewUser ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
          </div>
          {showNewUser && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #F1F5F9' }}>
              <NewUserForm onCreated={() => { fetchUsers(); setShowNewUser(false); }} />
            </div>
          )}
        </div>

        {/* ── Users table ── */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '15px' }}>
              משתמשים רשומים
              <span style={{ fontSize: '13px', fontWeight: 400, color: '#94A3B8', marginRight: '8px' }}>({filtered.length})</span>
            </span>
            <input
              type="search"
              placeholder="חיפוש לפי שם / אימייל..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, width: '220px', margin: 0 }}
            />
          </div>

          {error && <p style={{ fontSize: '13px', color: '#DC2626', marginBottom: '12px' }}>{error}</p>}

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>טוען...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>לא נמצאו משתמשים</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    {['שם', 'אימייל', 'תפקיד', 'הצטרף', 'פעולות'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#64748B', fontSize: '12px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(user => (
                    <tr
                      key={user.id}
                      style={{ borderBottom: '1px solid #F8FAFC', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px', color: '#0F172A', fontWeight: 500 }}>
                        {user.full_name ?? <span style={{ color: '#CBD5E1' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px', color: '#475569', direction: 'ltr', textAlign: 'right' }}>{user.email}</td>
                      <td style={{ padding: '12px' }}><Badge role={user.role} /></td>
                      <td style={{ padding: '12px', color: '#94A3B8', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {new Date(user.created_at).toLocaleDateString('he-IL')}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {/* Don't allow self-demotion */}
                          {user.email !== 'mazorms@gmail.com' && (
                            <>
                              <button
                                onClick={() => toggleRole(user)}
                                disabled={busy === user.id}
                                style={smallBtnStyle}
                                title={user.role === 'admin' ? 'הסר הרשאת מנהל' : 'הענק הרשאת מנהל'}
                              >
                                {busy === user.id ? '...' : user.role === 'admin' ? 'הסר Admin' : 'הפוך ל-Admin'}
                              </button>
                              <button
                                onClick={() => revokeAccess(user)}
                                disabled={busy === user.id}
                                style={{ ...smallBtnStyle, color: '#DC2626', borderColor: '#FECACA' }}
                                title="בטל גישה"
                              >
                                בטל גישה
                              </button>
                            </>
                          )}
                          {user.email === 'mazorms@gmail.com' && (
                            <span style={{ fontSize: '12px', color: '#94A3B8' }}>Super Admin</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: '16px',
  padding: '20px 24px',
  boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #E2E8F0',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'Rubik, sans-serif',
  background: '#F8FAFC',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '6px',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 20px',
  background: '#2563EB',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'Rubik, sans-serif',
};

const ghostBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  background: 'transparent',
  color: '#64748B',
  border: '1px solid #E2E8F0',
  borderRadius: '8px',
  fontSize: '13px',
  cursor: 'pointer',
  fontFamily: 'Rubik, sans-serif',
};

const smallBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: 'transparent',
  color: '#475569',
  border: '1px solid #E2E8F0',
  borderRadius: '6px',
  fontSize: '12px',
  cursor: 'pointer',
  fontFamily: 'Rubik, sans-serif',
  whiteSpace: 'nowrap',
};
