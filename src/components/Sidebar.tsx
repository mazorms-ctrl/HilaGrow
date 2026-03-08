import { LogOut, ChevronRight, ClipboardList, AlertCircle, Eye } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMyTasks, type MyTaskSummary } from '@/lib/supabase-hooks';
import { QuickViewModalById } from '@/components/tasks/QuickViewModal';
import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/contexts/AuthContext';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          '#111827',   // deep gray-900 — premium, neutral
  bgCard:      '#1a2235',   // card base on dark bg
  bgHover:     '#1e2d45',
  border:      'rgba(255,255,255,0.06)',
  accent:      '#6366f1',
  accentLight: '#818cf8',
  text:        '#e2e8f0',
  textMuted:   'rgba(226,232,240,0.50)',
  textDim:     'rgba(226,232,240,0.28)',
  danger:      '#f87171',
  dangerBg:    'rgba(239,68,68,0.10)',
};

// Priority soft-tint tokens — Soft Glass style matching header
const PRIORITY = {
  P1: { bg: 'rgba(239,68,68,0.10)',  activeBg: 'rgba(239,68,68,0.20)', text: '#f87171',  badgeBg: 'rgba(239,68,68,0.18)',  label: 'P1' },
  P2: { bg: 'rgba(249,115,22,0.10)', activeBg: 'rgba(249,115,22,0.20)', text: '#fb923c',  badgeBg: 'rgba(249,115,22,0.18)', label: 'P2' },
  P3: { bg: 'rgba(99,102,241,0.10)', activeBg: 'rgba(99,102,241,0.20)', text: '#818cf8',  badgeBg: 'rgba(99,102,241,0.18)', label: 'P3' },
};

interface Props {
  user: User;
  profile: Profile | null;
  onSignOut: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function isOverdue(dueDate: string) {
  return dueDate ? new Date(dueDate) < new Date() : false;
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{
      width: '100%', height: '3px',
      background: 'rgba(255,255,255,0.07)',
      borderRadius: '2px', marginTop: '6px', overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width: `${value}%`,
        background: value === 100 ? '#34d399' : color,
        borderRadius: '2px',
        transition: 'width 0.3s ease',
        opacity: 0.85,
      }} />
    </div>
  );
}

function TaskCard({
  task, isActive, onClick, onQuickView,
}: { task: MyTaskSummary; isActive: boolean; onClick: () => void; onQuickView: () => void }) {
  const p = PRIORITY[task.priority];
  const overdue = isOverdue(task.dueDate);

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '10px 14px',
        borderRadius: '14px',
        border: isActive ? `1px solid ${p.text}33` : '1px solid transparent',
        background: isActive ? p.activeBg : p.bg,
        cursor: 'pointer',
        textAlign: 'right',
        fontFamily: 'inherit',
        transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
        position: 'relative',
        boxShadow: isActive ? `inset 0 1px 4px rgba(0,0,0,0.12), 0 0 0 1px ${p.text}22` : 'none',
      }}
      onClick={onClick}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.background = p.activeBg;
          e.currentTarget.style.borderColor = `${p.text}22`;
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = p.bg;
          e.currentTarget.style.borderColor = 'transparent';
        }
      }}
    >
      {/* Priority badge + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
        <span style={{
          display: 'inline-block',
          padding: '2px 6px',
          borderRadius: '5px',
          fontSize: '10px',
          fontWeight: '800',
          letterSpacing: '0.4px',
          background: p.badgeBg,
          color: p.text,
          flexShrink: 0,
          marginTop: '1px',
        }}>
          {task.priority}
        </span>
        <span style={{
          fontSize: '12.5px',
          fontWeight: '500',
          color: C.text,
          lineHeight: '1.45',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
          flex: 1,
          direction: 'rtl',
          textAlign: 'right',
        }}>
          {task.title}
        </span>
      </div>

      {/* Category + overdue */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', direction: 'rtl' }}>
        <span style={{ fontSize: '10.5px', color: C.textMuted, fontWeight: '500' }}>
          {task.category}
        </span>
        {overdue && (
          <span style={{ fontSize: '10px', color: '#f87171', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '2px' }}>
            <AlertCircle size={9} />
            פג תוקף
          </span>
        )}
      </div>

      {/* Progress */}
      {task.progress > 0 && <ProgressBar value={task.progress} color={p.text} />}

      {/* Quick-view eye */}
      <button
        onClick={e => { e.stopPropagation(); onQuickView(); }}
        title="תצוגה מהירה"
        style={{
          position: 'absolute', top: '8px', left: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '20px', height: '20px', borderRadius: '5px',
          background: 'transparent', border: 'none',
          cursor: 'pointer', color: C.textDim,
          transition: 'background 0.12s, color 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = C.accentLight; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textDim; }}
      >
        <Eye size={11} />
      </button>
    </div>
  );
}

export function Sidebar({ user, profile, onSignOut, collapsed, onToggleCollapse }: Props) {
  const { myTasks, loading } = useMyTasks();
  const navigate = useNavigate();
  const location = useLocation();
  const [quickViewTaskId, setQuickViewTaskId] = useState<string | null>(null);

  const initials = (profile?.full_name || user.email || '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const sorted = [...myTasks].sort((a, b) => {
    const order = { P1: 0, P2: 1, P3: 2 };
    return order[a.priority] - order[b.priority];
  });

  const w = collapsed ? '60px' : '268px';

  return (<>
    <aside
      dir="rtl"
      style={{
        width: w, minWidth: w, maxWidth: w,
        background: C.bg,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        color: C.text,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: `1px solid ${C.border}`,
        boxShadow: '-4px 0 20px rgba(0,0,0,0.30)',
        transition: 'width 0.25s cubic-bezier(.4,0,.2,1), min-width 0.25s cubic-bezier(.4,0,.2,1)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* ── User profile card ──────────────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        padding: collapsed ? '14px 0' : '14px 12px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: collapsed ? 'column' : 'row',
        alignItems: 'center',
        gap: collapsed ? '0' : '10px',
        flexShrink: 0,
      }}>
        <div style={{
          width: '36px', height: '36px', minWidth: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: '700', fontSize: '13px', color: 'white',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(99,102,241,0.30)',
        }}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
            : initials
          }
        </div>

        {!collapsed && (
          <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '13px', fontWeight: '600', color: C.text,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              textAlign: 'right', lineHeight: '1.3',
            }}>
              {profile?.full_name || user.email || ''}
            </div>
            {profile?.full_name && (
              <div style={{
                fontSize: '10.5px', color: C.textMuted,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                marginTop: '2px', textAlign: 'right',
              }}>
                {user.email}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── "My Tasks" section label ──────────────────────────── */}
      {!collapsed && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '12px 14px 5px',
          flexShrink: 0,
        }}>
          <ClipboardList size={11} style={{ color: C.textDim }} />
          <span style={{
            fontSize: '9.5px', fontWeight: '700', color: C.textDim,
            textTransform: 'uppercase', letterSpacing: '1.5px',
          }}>
            המשימות שלי
          </span>
          {myTasks.length > 0 && (
            <span style={{
              marginRight: 'auto',
              background: 'rgba(99,102,241,0.20)', color: C.accentLight,
              fontSize: '10px', fontWeight: '700',
              padding: '1px 7px', borderRadius: '10px',
            }}>
              {myTasks.length}
            </span>
          )}
        </div>
      )}

      {/* ── Task list ─────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: 'auto', overflowX: 'hidden',
        padding: collapsed ? '8px 6px' : '4px 9px 14px',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.08) transparent',
      }}>
        <style>{`
          aside::-webkit-scrollbar { width: 3px; }
          aside::-webkit-scrollbar-track { background: transparent; }
          aside::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        `}</style>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0' }}>
            <div style={{
              width: '18px', height: '18px',
              border: '2px solid rgba(255,255,255,0.08)', borderTopColor: C.accent,
              borderRadius: '50%', animation: 'sb-spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes sb-spin { to { transform: rotate(360deg); } }`}</style>
          </div>

        ) : sorted.length === 0 ? (
          !collapsed && (
            <div style={{ padding: '20px 8px', textAlign: 'center' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: 'rgba(99,102,241,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 10px',
              }}>
                <ClipboardList size={17} style={{ color: C.textDim }} />
              </div>
              <p style={{ fontSize: '12px', color: C.textMuted, margin: 0, lineHeight: '1.7' }}>
                אין משימות משויכות אליך
              </p>
            </div>
          )

        ) : collapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>
            {sorted.map(task => {
              const p = PRIORITY[task.priority];
              const active = location.pathname === `/task/${task.id}`;
              return (
                <button
                  key={task.id}
                  title={`${task.title}\n${task.category}`}
                  onClick={() => navigate(`/task/${task.id}`)}
                  style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    background: active ? p.activeBg : p.bg,
                    border: active ? `1px solid ${p.text}44` : '1px solid transparent',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = p.activeBg; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = p.bg; }}
                >
                  {isOverdue(task.dueDate)
                    ? <AlertCircle size={12} style={{ color: p.text }} />
                    : <span style={{ fontSize: '9px', fontWeight: '800', color: p.text, letterSpacing: '0.3px' }}>{task.priority}</span>
                  }
                </button>
              );
            })}
          </div>

        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {sorted.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                isActive={location.pathname === `/task/${task.id}`}
                onClick={() => navigate(`/task/${task.id}`)}
                onQuickView={() => setQuickViewTaskId(task.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <div style={{
        borderTop: `1px solid ${C.border}`,
        padding: collapsed ? '8px 6px' : '8px',
        display: 'flex', flexDirection: 'column', gap: '2px',
        flexShrink: 0,
      }}>
        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'הרחב תפריט' : 'כווץ תפריט'}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
            padding: collapsed ? '8px 0' : '8px 10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'transparent', color: C.textDim, border: 'none',
            borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
            fontFamily: 'inherit', transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = C.textMuted; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textDim; }}
        >
          <ChevronRight size={14} style={{ flexShrink: 0, transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)' }} />
          {!collapsed && <span>כווץ תפריט</span>}
        </button>

        {/* Sign out */}
        <button
          onClick={onSignOut}
          title="יציאה"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
            padding: collapsed ? '8px 0' : '8px 10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'transparent', color: C.textDim, border: 'none',
            borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
            fontFamily: 'inherit', transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.dangerBg; e.currentTarget.style.color = C.danger; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textDim; }}
        >
          <LogOut size={13} style={{ flexShrink: 0 }} />
          {!collapsed && <span>יציאה</span>}
        </button>
      </div>
    </aside>

    <QuickViewModalById taskId={quickViewTaskId} onClose={() => setQuickViewTaskId(null)} />
  </>);
}
