import { LogOut, ChevronRight, ClipboardList, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMyTasks, type MyTaskSummary } from '@/lib/supabase-hooks';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/contexts/AuthContext';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          '#1c2333',
  bgHeader:    '#212840',
  bgHover:     'rgba(255,255,255,0.06)',
  border:      'rgba(255,255,255,0.07)',
  accent:      '#6366f1',
  accentLight: '#818cf8',
  text:        '#e2e8f0',
  textMuted:   'rgba(226,232,240,0.45)',
  textDim:     'rgba(226,232,240,0.28)',
  danger:      '#f87171',
  dangerBg:    'rgba(239,68,68,0.12)',
};

const PRIORITY = {
  P1: { bg: 'rgba(239,68,68,0.18)',  text: '#f87171',  label: 'P1' },
  P2: { bg: 'rgba(249,115,22,0.18)', text: '#fb923c',  label: 'P2' },
  P3: { bg: 'rgba(99,102,241,0.18)', text: '#818cf8',  label: 'P3' },
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

function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{
      width: '100%',
      height: '3px',
      background: 'rgba(255,255,255,0.08)',
      borderRadius: '2px',
      marginTop: '5px',
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width: `${value}%`,
        background: value === 100
          ? '#34d399'
          : `linear-gradient(90deg, ${C.accent}, ${C.accentLight})`,
        borderRadius: '2px',
        transition: 'width 0.3s ease',
      }} />
    </div>
  );
}

function TaskCard({ task, onClick }: { task: MyTaskSummary; onClick: () => void }) {
  const p = PRIORITY[task.priority];
  const overdue = isOverdue(task.dueDate);

  return (
    <button
      onClick={onClick}
      title={task.title}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        padding: '10px 12px',
        borderRadius: '10px',
        border: '1px solid transparent',
        background: 'rgba(255,255,255,0.04)',
        cursor: 'pointer',
        textAlign: 'right',
        fontFamily: 'inherit',
        transition: 'background 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = C.bgHover;
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
        e.currentTarget.style.borderColor = 'transparent';
      }}
    >
      {/* Priority badge + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{
          display: 'inline-block',
          padding: '2px 7px',
          borderRadius: '5px',
          fontSize: '10px',
          fontWeight: '700',
          letterSpacing: '0.5px',
          background: p.bg,
          color: p.text,
          flexShrink: 0,
          marginTop: '1px',
        }}>
          {task.priority}
        </span>
        <span style={{
          fontSize: '13px',
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

      {/* Project name + overdue indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        direction: 'rtl',
      }}>
        <span style={{ fontSize: '11px', color: C.textMuted }}>{task.projectName}</span>
        {overdue && (
          <span style={{
            fontSize: '10px',
            color: '#f87171',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
          }}>
            <AlertCircle size={10} />
            פג תוקף
          </span>
        )}
      </div>

      {/* Progress bar */}
      {task.progress > 0 && <ProgressBar value={task.progress} />}
    </button>
  );
}

export function Sidebar({
  user,
  profile,
  onSignOut,
  collapsed,
  onToggleCollapse,
}: Props) {
  const { myTasks, loading } = useMyTasks();
  const navigate = useNavigate();

  const displayName = profile?.full_name || user.email || '';
  const emailDisplay = profile?.full_name ? user.email : undefined;
  const initials = (profile?.full_name || user.email || '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Sort: P1 first, then P2, then P3
  const sorted = [...myTasks].sort((a, b) => {
    const order = { P1: 0, P2: 1, P3: 2 };
    return order[a.priority] - order[b.priority];
  });

  const handleTaskClick = (task: MyTaskSummary) => {
    navigate(`/task/${task.id}`);
  };

  const w = collapsed ? '64px' : '272px';

  return (
    <aside
      dir="rtl"
      style={{
        width: w,
        minWidth: w,
        maxWidth: w,
        background: C.bg,
        color: C.text,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: `1px solid ${C.border}`,
        boxShadow: '-6px 0 24px rgba(0,0,0,0.22)',
        transition: 'width 0.25s cubic-bezier(.4,0,.2,1), min-width 0.25s cubic-bezier(.4,0,.2,1)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* ── User profile card ──────────────────────────────────────── */}
      <div style={{
        background: C.bgHeader,
        padding: collapsed ? '16px 0' : '16px 14px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: collapsed ? 'column' : 'row',
        alignItems: 'center',
        gap: collapsed ? '0' : '10px',
        flexShrink: 0,
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          minWidth: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '700',
          fontSize: '14px',
          color: 'white',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
        }}>
          {initials}
        </div>

        {!collapsed && (
          <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '13.5px',
              fontWeight: '600',
              color: C.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textAlign: 'right',
              lineHeight: '1.3',
            }}>
              {displayName}
            </div>
            {emailDisplay && (
              <div style={{
                fontSize: '11px',
                color: C.textMuted,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: '2px',
                textAlign: 'right',
              }}>
                {emailDisplay}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── "My Tasks" section label ───────────────────────────────── */}
      {!collapsed && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '13px 16px 6px',
          flexShrink: 0,
        }}>
          <ClipboardList size={12} style={{ color: C.textDim }} />
          <span style={{
            fontSize: '10px',
            fontWeight: '700',
            color: C.textDim,
            textTransform: 'uppercase',
            letterSpacing: '1.4px',
          }}>
            המשימות שלי
          </span>
          {myTasks.length > 0 && (
            <span style={{
              marginRight: 'auto',
              background: 'rgba(99,102,241,0.22)',
              color: C.accentLight,
              fontSize: '10px',
              fontWeight: '700',
              padding: '1px 7px',
              borderRadius: '10px',
            }}>
              {myTasks.length}
            </span>
          )}
        </div>
      )}

      {/* ── Task list ──────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: collapsed ? '10px 6px' : '4px 10px 16px',
        // Custom scrollbar
        scrollbarWidth: 'thin',
        scrollbarColor: `rgba(255,255,255,0.1) transparent`,
      }}>
        <style>{`
          aside::-webkit-scrollbar { width: 4px; }
          aside::-webkit-scrollbar-track { background: transparent; }
          aside::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        `}</style>

        {loading ? (
          /* Loading spinner */
          <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0' }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: `2px solid rgba(255,255,255,0.08)`,
              borderTopColor: C.accent,
              borderRadius: '50%',
              animation: 'sidebar-spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes sidebar-spin { to { transform: rotate(360deg); } }`}</style>
          </div>

        ) : sorted.length === 0 ? (
          /* Empty state */
          !collapsed && (
            <div style={{ padding: '20px 8px', textAlign: 'center' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(99,102,241,0.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px',
              }}>
                <ClipboardList size={18} style={{ color: C.textDim }} />
              </div>
              <p style={{ fontSize: '12px', color: C.textMuted, margin: 0, lineHeight: '1.7' }}>
                אין משימות משויכות אליך
              </p>
            </div>
          )

        ) : collapsed ? (
          /* Collapsed: small priority squares */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
            {sorted.map(task => {
              const p = PRIORITY[task.priority];
              return (
                <button
                  key={task.id}
                  title={`${task.title}\n${task.projectName}`}
                  onClick={() => handleTaskClick(task)}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: p.bg,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'opacity 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.opacity = '0.72';
                    e.currentTarget.style.transform = 'scale(0.95)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  {isOverdue(task.dueDate) ? (
                    <AlertCircle size={13} style={{ color: p.text }} />
                  ) : (
                    <span style={{ fontSize: '9px', fontWeight: '800', color: p.text, letterSpacing: '0.3px' }}>
                      {task.priority}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

        ) : (
          /* Expanded: full task cards */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {sorted.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => handleTaskClick(task)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <div style={{
        borderTop: `1px solid ${C.border}`,
        padding: collapsed ? '10px 6px' : '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        flexShrink: 0,
      }}>
        {/* Collapse / Expand toggle */}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'הרחב תפריט' : 'כווץ תפריט'}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: collapsed ? '9px 0' : '9px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'transparent',
            color: C.textDim,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'inherit',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = C.bgHover;
            e.currentTarget.style.color = C.textMuted;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = C.textDim;
          }}
        >
          {/*
            Right-side sidebar in RTL layout:
            - Expanded: ChevronRight (→) = "push sidebar inward to the right" = collapse
            - Collapsed: ChevronRight rotated 180° (←) = "expand sidebar outward to the left"
          */}
          <ChevronRight
            size={15}
            style={{
              flexShrink: 0,
              transform: collapsed ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
            }}
          />
          {!collapsed && <span>כווץ תפריט</span>}
        </button>

        {/* Sign out */}
        <button
          onClick={onSignOut}
          title="יציאה"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: collapsed ? '9px 0' : '9px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'transparent',
            color: C.textDim,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontFamily: 'inherit',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = C.dangerBg;
            e.currentTarget.style.color = C.danger;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = C.textDim;
          }}
        >
          <LogOut size={14} style={{ flexShrink: 0 }} />
          {!collapsed && <span>יציאה</span>}
        </button>
      </div>
    </aside>
  );
}
