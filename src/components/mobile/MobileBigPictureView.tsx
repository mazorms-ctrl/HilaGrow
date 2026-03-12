/**
 * MobileBigPictureView
 * Vertical collapsible tree for the "התמונה הגדולה" tab on mobile.
 * Categories → Projects (expandable) → Milestones
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { useTasks, useProjects, type MedicalTask } from '@/lib/supabase-hooks';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography } from '@/styles/tokens';

interface Props {
  onClose: () => void;
}

// ── Status dot ────────────────────────────────────────────────────────────────
function StatusDot({ status, progress }: { status: string; progress: number }) {
  let bg = '#94a3b8'; // gray = not started
  if (status === 'done' || progress >= 100) bg = '#10b981';      // green
  else if (status === 'blocked')            bg = '#ef4444';      // red
  else if (progress > 0)                   bg = colors.brand.primary; // blue = active
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: bg, flexShrink: 0, display: 'inline-block',
    }} />
  );
}

// ── Task node (expandable) ────────────────────────────────────────────────────
function TaskNode({ task, color }: { task: MedicalTask; color: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const doneMilestones  = task.milestones?.filter(m => m.done).length  ?? 0;
  const totalMilestones = task.milestones?.length ?? 0;
  const hasMilestones   = totalMilestones > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Task row */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: '#fff',
          borderRadius: 12,
          border: `1px solid ${color}30`,
          borderRight: `3px solid ${color}`,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
        onClick={() => hasMilestones ? setOpen(o => !o) : navigate(`/task/${task.id}`)}
      >
        {/* Status dot */}
        <StatusDot status={task.status} progress={task.progress} />

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: '#0f172a',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            direction: 'rtl', textAlign: 'right',
          }}>
            {task.title}
          </div>

          {/* Progress bar */}
          <div style={{
            marginTop: 5,
            height: 3, borderRadius: 2, background: '#f1f5f9', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: color,
              width: `${task.progress}%`, transition: 'width 0.3s',
            }} />
          </div>
        </div>

        {/* Count badge + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {totalMilestones > 0 && (
            <span style={{
              fontSize: 10.5, color: '#64748b',
              background: '#f1f5f9', borderRadius: 20,
              padding: '2px 7px', fontWeight: 500,
            }}>
              {doneMilestones}/{totalMilestones}
            </span>
          )}
          <span style={{
            fontSize: 11, color: '#94a3b8', fontWeight: 600,
            minWidth: 28, textAlign: 'left',
          }}>
            {task.progress}%
          </span>
          {hasMilestones && (
            open
              ? <ChevronDown size={14} color="#94a3b8" />
              : <ChevronRight size={14} color="#94a3b8" style={{ transform: 'scaleX(-1)' }} />
          )}
        </div>
      </div>

      {/* Milestone list (expanded) */}
      {open && hasMilestones && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 2,
          paddingRight: 20, paddingLeft: 6,
          marginTop: 4, marginBottom: 4,
          borderRight: `2px solid ${color}40`,
          marginRight: 18,
        }}>
          {task.milestones.map((m, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '7px 10px',
                background: m.done ? '#f0fdf4' : '#fafafa',
                borderRadius: 8,
                direction: 'rtl',
              }}
              onClick={() => navigate(`/task/${task.id}`)}
            >
              {/* Milestone checkbox dot */}
              <span style={{
                width: 14, height: 14, borderRadius: '50%',
                border: m.done ? 'none' : '1.5px solid #cbd5e1',
                background: m.done ? '#10b981' : 'transparent',
                flexShrink: 0, marginTop: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {m.done && (
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path d="M1 3l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span style={{
                fontSize: 12.5, color: m.done ? '#64748b' : '#334155',
                lineHeight: 1.5, flex: 1,
                textDecoration: m.done ? 'line-through' : 'none',
              }}>
                {m.text}
              </span>
            </div>
          ))}

          {/* Tap to open link */}
          <button
            onClick={() => navigate(`/task/${task.id}`)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11.5, color: colors.brand.primary,
              padding: '4px 10px', textAlign: 'right', direction: 'rtl',
              fontFamily: 'inherit', fontWeight: 500,
            }}
          >
            פתח פרטי פרויקט ←
          </button>
        </div>
      )}
    </div>
  );
}

// ── Category section ──────────────────────────────────────────────────────────
function CategorySection({ name, tasks }: { name: string; tasks: MedicalTask[] }) {
  const [open, setOpen] = useState(true);
  const color = tasks[0]?.color ?? '#94a3b8';
  const avg   = tasks.length
    ? Math.round(tasks.reduce((s, t) => s + (t.progress ?? 0), 0) / tasks.length)
    : 0;
  const activeCount = tasks.filter(t => t.progress > 0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Category header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px',
          background: '#fff',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          borderTop: `4px solid ${color}`,
          cursor: 'pointer', width: '100%', textAlign: 'right', direction: 'rtl',
          fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}
      >
        {/* Category name + stats */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: '#0f172a',
            letterSpacing: '-0.3px', lineHeight: 1.3,
          }}>
            {name}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            {tasks.length} פרויקטים · {activeCount} פעילים · ממוצע {avg}%
          </div>
        </div>

        {/* Progress ring-ish */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: `3px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, position: 'relative',
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color }}>{avg}%</span>
        </div>

        {open ? <ChevronDown size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" style={{ transform: 'scaleX(-1)' }} />}
      </button>

      {/* Tasks under this category */}
      {open && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          paddingRight: 10, paddingLeft: 4,
          borderRight: `2px solid ${color}30`,
          marginRight: 12,
        }}>
          {tasks.map(task => (
            <TaskNode key={task.id} task={task} color={color} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Data wrapper ──────────────────────────────────────────────────────────────
function TreeContent({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { projects, loading: pLoading } = useProjects(user?.id);
  const projectId = projects[0]?.id ?? null;
  const { tasks, loading: tLoading } = useTasks(projectId);

  if (pLoading || tLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flex: 1, gap: 10, color: '#94a3b8', fontSize: 14,
        fontFamily: typography.fontFamily,
      }}>
        <div style={{
          width: 18, height: 18, border: '2px solid #e2e8f0',
          borderTopColor: colors.brand.primary, borderRadius: '50%',
          animation: 'bpSpin 0.7s linear infinite',
        }} />
        טוען...
      </div>
    );
  }

  // Group by category (preserve insertion order)
  const categoryMap = new Map<string, MedicalTask[]>();
  for (const t of tasks) {
    if (!categoryMap.has(t.category)) categoryMap.set(t.category, []);
    categoryMap.get(t.category)!.push(t);
  }
  const categories = [...categoryMap.entries()];

  return (
    <div style={{
      flex: 1, overflowY: 'auto',
      padding: '12px 14px 100px',
      display: 'flex', flexDirection: 'column', gap: 12,
      direction: 'rtl',
    }}>
      <style>{`@keyframes bpSpin { to { transform: rotate(360deg); } }`}</style>

      {categories.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, paddingTop: 40 }}>
          אין נתונים להצגה
        </div>
      ) : (
        categories.map(([cat, catTasks]) => (
          <CategorySection key={cat} name={cat} tasks={catTasks} />
        ))
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function MobileBigPictureView({ onClose }: Props) {
  return (
    <div
      className="flex md:hidden"
      style={{
        position: 'fixed', inset: 0, zIndex: 35,
        flexDirection: 'column',
        background: '#f8fafc',
        fontFamily: typography.fontFamily,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px',
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 3, height: 18, background: colors.brand.primary, borderRadius: 2 }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', direction: 'rtl' }}>
            התמונה הגדולה
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: 8,
            border: '1px solid #e2e8f0', background: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#94a3b8',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <X size={16} />
        </button>
      </div>

      <TreeContent onClose={onClose} />
    </div>
  );
}
