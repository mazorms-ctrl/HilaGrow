import { LogOut, UserCog, ShieldAlert, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/contexts/AuthContext';

const T = {
  bg:         '#f8fafc',
  card:       '#ffffff',
  border:     'rgba(0,0,0,0.06)',
  shadow:     '0 2px 10px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)',
  title:      '#1e293b',
  sub:        '#64748b',
  dim:        '#94a3b8',
  blue:       '#2563eb',
  blueSoft:   'rgba(37,99,235,0.07)',
  danger:     '#ef4444',
  dangerSoft: 'rgba(239,68,68,0.06)',
};

interface Props {
  user: User;
  profile: Profile | null;
  isAdmin: boolean;
  onClose: () => void;
  onEditProfile: () => void;
  onSignOut: () => void;
}

function ActionRow({
  icon, label, color, bg, onClick,
}: { icon: React.ReactNode; label: string; color: string; bg: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
        padding: '16px', borderRadius: 14,
        background: T.card, boxShadow: T.shadow,
        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 15, fontWeight: 500, color,
        textAlign: 'right', direction: 'rtl',
        minHeight: 56,
        WebkitTapHighlightColor: 'transparent',
        transition: 'background 0.12s',
      }}
      onTouchStart={e => { (e.currentTarget as HTMLElement).style.background = bg; }}
      onTouchEnd={e   => { (e.currentTarget as HTMLElement).style.background = T.card; }}
    >
      <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>
      {label}
    </button>
  );
}

export function MobileSettingsView({ user, profile, isAdmin, onClose, onEditProfile, onSignOut }: Props) {
  const navigate = useNavigate();

  const initials = (profile?.full_name || user.email || '?')
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      dir="rtl"
      className="flex md:hidden"
      style={{
        position: 'fixed', inset: 0, zIndex: 35,
        background: T.bg,
        flexDirection: 'column',
        fontFamily: 'Rubik, Heebo, sans-serif',
        paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 16px 12px',
        borderBottom: `1px solid ${T.border}`,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        flexShrink: 0,
      }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.title, letterSpacing: '-0.3px' }}>
          הגדרות
        </h2>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(0,0,0,0.05)', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <X size={18} color={T.sub} />
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px 16px' } as React.CSSProperties}>

        {/* Profile card */}
        <div style={{
          background: T.card, borderRadius: 16, boxShadow: T.shadow,
          padding: '20px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 14, direction: 'rtl',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg, #2563eb 0%, #6366f1 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 600, color: '#fff',
            boxShadow: '0 2px 10px rgba(37,99,235,0.3)',
          }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 }} />
              : initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.title, marginBottom: 3 }}>
              {profile?.full_name || user.email}
            </div>
            {profile?.full_name && (
              <div style={{ fontSize: 13, color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            )}
            {(profile?.department || profile?.position) && (
              <div style={{ fontSize: 12, color: T.dim, marginTop: 2 }}>
                {[profile.position, profile.department].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ActionRow
            icon={<UserCog size={20} />}
            label="עריכת פרופיל"
            color={T.title}
            bg="rgba(0,0,0,0.03)"
            onClick={() => { onClose(); onEditProfile(); }}
          />

          {isAdmin && (
            <ActionRow
              icon={<ShieldAlert size={20} />}
              label="ניהול מערכת"
              color={T.blue}
              bg={T.blueSoft}
              onClick={() => { onClose(); navigate('/admin'); }}
            />
          )}

          <ActionRow
            icon={<LogOut size={20} />}
            label="יציאה"
            color={T.danger}
            bg={T.dangerSoft}
            onClick={onSignOut}
          />
        </div>
      </div>
    </div>
  );
}
