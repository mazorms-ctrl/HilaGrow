import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ─────────────────────────────────────────────────────

type UserRole = 'admin' | 'assignee' | 'participant' | 'user';

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  department: string | null;
  position: string | null;
  created_at: string;
}

// Hebrew display labels
const ROLE_LABEL: Record<UserRole, string> = {
  admin:       'מנהל',
  assignee:    'אחראי משימה',
  participant: 'משתתף',
  user:        'משתתף',
};

// ── Badge ─────────────────────────────────────────────────────

function Badge({ role }: { role: UserRole }) {
  const map: Record<UserRole, { bg: string; color: string; border: string }> = {
    admin:       { bg: '#DBEAFE', color: '#1D4ED8', border: '#BFDBFE' },
    assignee:    { bg: '#EDE9FE', color: '#6D28D9', border: '#DDD6FE' },
    participant: { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' },
    user:        { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' },
  };
  const s = map[role] ?? map.participant;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: '999px',
      fontSize: '12px', fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {ROLE_LABEL[role]}
    </span>
  );
}

// ── New-user form ─────────────────────────────────────────────

function NewUserForm({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole]         = useState<UserRole>('participant');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSuccess(false); setBusy(true);
    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: fullName } },
      });
      if (signUpErr) throw signUpErr;
      if (data.user) {
        const { error: roleErr } = await supabase
          .from('profiles').update({ role }).eq('id', data.user.id);
        if (roleErr) throw roleErr;
      }
      setSuccess(true);
      setEmail(''); setPassword(''); setFullName(''); setRole('participant');
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
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
            placeholder="ישראל ישראלי" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>כתובת אימייל</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="user@example.com" style={{ ...inputStyle, direction: 'ltr' }} />
        </div>
        <div>
          <label style={labelStyle}>סיסמה זמנית</label>
          <input type="password" required minLength={6} value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="לפחות 6 תווים" style={{ ...inputStyle, direction: 'ltr' }} />
        </div>
        <div>
          <label style={labelStyle}>תפקיד</label>
          <select value={role} onChange={e => setRole(e.target.value as UserRole)} style={inputStyle}>
            <option value="participant">משתתף</option>
            <option value="assignee">אחראי משימה</option>
            <option value="admin">מנהל</option>
          </select>
        </div>
      </div>
      {error   && <p style={{ fontSize: '13px', color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '8px 12px' }}>{error}</p>}
      {success && <p style={{ fontSize: '13px', color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '8px 12px' }}>המשתמש נוצר בהצלחה — נשלח אימייל אימות.</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" disabled={busy} style={primaryBtnStyle}>{busy ? 'יוצר...' : 'צור משתמש'}</button>
      </div>
    </form>
  );
}

// ── Main AdminDashboard ────────────────────────────────────────

export function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [users, setUsers]     = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [busy, setBusy]       = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [showNewUser, setShowNewUser] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, department, position, created_at')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setUsers((data as UserRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  async function setUserRole(user: UserRow, newRole: 'participant' | 'assignee') {
    setBusy(user.id);
    const { error } = await supabase
      .from('profiles').update({ role: newRole }).eq('id', user.id);
    if (error) setError(error.message);
    else setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    setBusy(null);
  }

  async function deleteUser(user: UserRow) {
    const displayName = user.full_name || user.email;
    const confirmed = window.confirm(
      `האם אתה בטוח שברצונך למחוק את ${displayName} לצמיתות?`
    );
    if (!confirmed) return;
    setBusy(user.id);
    // Delete the profile row (cascade or auth deletion requires service role;
    // this removes their app data and locks them out of profile-gated features)
    const { error } = await supabase
      .from('profiles').delete().eq('id', user.id);
    if (error) setError(error.message);
    else setUsers(prev => prev.filter(u => u.id !== user.id));
    setBusy(null);
  }

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const adminCount       = users.filter(u => u.role === 'admin').length;
  const assigneeCount    = users.filter(u => u.role === 'assignee').length;
  const participantCount = users.filter(u => u.role === 'participant' || u.role === 'user').length;

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'Rubik, sans-serif' }}>

      {/* ── Top bar ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #E2E8F0', padding: '0 24px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>ניהול צוות</span>
          <span style={{ fontSize: '12px', background: '#DBEAFE', color: '#1D4ED8', padding: '2px 10px', borderRadius: '999px', fontWeight: 600 }}>מנהל</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#64748B' }}>{profile?.email}</span>
          <button onClick={signOut} style={ghostBtnStyle}>התנתק</button>
        </div>
      </header>

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'סה״כ משתמשים', value: users.length },
            { label: 'מנהלים',        value: adminCount },
            { label: 'אחראי משימה',   value: assigneeCount },
            { label: 'משתתפים',       value: participantCount },
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
              type="search" placeholder="חיפוש לפי שם / אימייל..."
              value={search} onChange={e => setSearch(e.target.value)}
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
                  <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                    {['שם', 'אימייל', 'מחלקה', 'תפקיד', 'הרשאה', 'הצטרף', 'שינוי הרשאה', ''].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#64748B', fontSize: '12px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(user => {
                    const isSuperAdmin = user.email === 'mazorms@gmail.com';
                    const isCurrentRole = (r: UserRole) => user.role === r || (r === 'participant' && user.role === 'user');
                    return (
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
                        <td style={{ padding: '12px', color: '#475569', fontSize: '13px' }}>
                          {user.department ?? <span style={{ color: '#CBD5E1' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px', color: '#475569', fontSize: '13px' }}>
                          {user.position ?? <span style={{ color: '#CBD5E1' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px' }}><Badge role={user.role} /></td>
                        <td style={{ padding: '12px', color: '#94A3B8', fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {new Date(user.created_at).toLocaleDateString('he-IL')}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {isSuperAdmin ? (
                            <span style={{ fontSize: '12px', color: '#94A3B8' }}>Super Admin</span>
                          ) : (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              {/* Promote to אחראי משימה */}
                              <button
                                onClick={() => setUserRole(user, 'assignee')}
                                disabled={busy === user.id || isCurrentRole('assignee')}
                                style={{
                                  ...smallBtnStyle,
                                  ...(isCurrentRole('assignee') ? activeRoleStyle('assignee') : {}),
                                }}
                              >
                                אחראי משימה
                              </button>
                              {/* Demote to משתתף */}
                              <button
                                onClick={() => setUserRole(user, 'participant')}
                                disabled={busy === user.id || isCurrentRole('participant')}
                                style={{
                                  ...smallBtnStyle,
                                  ...(isCurrentRole('participant') ? activeRoleStyle('participant') : {}),
                                }}
                              >
                                משתתף
                              </button>
                            </div>
                          )}
                        </td>
                        {/* Delete column */}
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {!isSuperAdmin && (
                            <button
                              onClick={() => deleteUser(user)}
                              disabled={busy === user.id}
                              title={`מחק את ${user.full_name || user.email}`}
                              style={{
                                width: 30, height: 30, border: 'none', borderRadius: '6px',
                                background: 'transparent', color: '#94A3B8',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function activeRoleStyle(role: 'assignee' | 'participant'): React.CSSProperties {
  if (role === 'assignee') return { background: '#EDE9FE', color: '#6D28D9', borderColor: '#DDD6FE' };
  return { background: '#F1F5F9', color: '#475569', borderColor: '#E2E8F0' };
}

// ── Shared styles ─────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px',
  padding: '20px 24px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px',
  fontSize: '14px', outline: 'none', fontFamily: 'Rubik, sans-serif',
  background: '#F8FAFC', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 20px', background: '#2563EB', color: '#FFFFFF', border: 'none',
  borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
  fontFamily: 'Rubik, sans-serif',
};

const ghostBtnStyle: React.CSSProperties = {
  padding: '6px 14px', background: 'transparent', color: '#64748B',
  border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px',
  cursor: 'pointer', fontFamily: 'Rubik, sans-serif',
};

const smallBtnStyle: React.CSSProperties = {
  padding: '4px 12px', background: 'transparent', color: '#475569',
  border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '12px',
  cursor: 'pointer', fontFamily: 'Rubik, sans-serif', whiteSpace: 'nowrap',
};
