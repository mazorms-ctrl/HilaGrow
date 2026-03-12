/**
 * MobileBigPictureView — Hierarchical Nested Tree
 * Goal → Project (collapsible) → Milestone (nested)
 * Vertical scroll, RTL indentation with connecting tree lines.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft, X } from 'lucide-react';
import { useTasks, useProjects, type MedicalTask } from '@/lib/supabase-hooks';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography } from '@/styles/tokens';

// ── Status helpers ────────────────────────────────────────────────────────────
function statusDotColor(status: string, progress: number) {
  if (status === 'done'    || progress >= 100) return '#10b981';
  if (status === 'blocked')                    return '#ef4444';
  if (progress > 0)                            return colors.brand.primary;
  return '#cbd5e1';
}

function statusLabel(status: string, progress: number) {
  if (status === 'done'    || progress >= 100) return 'הושלם';
  if (status === 'blocked')                    return 'תקוע';
  if (progress > 0)                            return 'פעיל';
  return 'טרם החל';
}

// ── Milestone row ─────────────────────────────────────────────────────────────
function MilestoneRow({
  milestone,
  isLast,
  lineColor,
}: {
  milestone: MedicalTask['milestones'][number];
  isLast: boolean;
  lineColor: string;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 0,
      position: 'relative',
    }}>
      {/* Vertical + horizontal tree line */}
      <div style={{
        width: 24,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginLeft: 4,
      }}>
        {/* Vertical segment */}
        <div style={{
          width: 1.5,
          background: lineColor + '55',
          flex: isLast ? '0 0 14px' : 1,
          minHeight: 14,
        }} />
        {/* Elbow */}
        <div style={{
          width: 12,
          height: 1.5,
          background: lineColor + '55',
          alignSelf: 'flex-end',
          flexShrink: 0,
        }} />
        {/* Remainder (only if not last) */}
        {!isLast && (
          <div style={{ width: 1.5, background: lineColor + '55', flex: 1 }} />
        )}
      </div>

      {/* Milestone card */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '7px 10px 7px 6px',
        background: milestone.done ? '#f0fdf480' : '#fafafa',
        borderRadius: 8,
        border: `1px solid ${milestone.done ? '#d1fae5' : '#f1f5f9'}`,
        marginBottom: 4,
        direction: 'rtl',
      }}>
        {/* Checkbox */}
        <span style={{
          width: 14, height: 14, borderRadius: '50%', flexShrink: 0, marginTop: 2,
          background: milestone.done ? '#10b981' : 'transparent',
          border: milestone.done ? 'none' : '1.5px solid #cbd5e1',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {milestone.done && (
            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
              <path d="M1 3l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span style={{
          fontSize: 12.5, color: milestone.done ? '#94a3b8' : '#334155',
          lineHeight: 1.5, flex: 1,
          textDecoration: milestone.done ? 'line-through' : 'none',
          textDecorationColor: '#cbd5e1',
        }}>
          {milestone.text}
        </span>
      </div>
    </div>
  );
}

// ── Task / Project node ───────────────────────────────────────────────────────
function TaskNode({
  task,
  catColor,
  isLast,
}: {
  task: MedicalTask;
  catColor: string;
  isLast: boolean;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dotColor    = statusDotColor(task.status, task.progress);
  const label       = statusLabel(task.status, task.progress);
  const hasMiles    = (task.milestones?.length ?? 0) > 0;
  const doneMiles   = task.milestones?.filter(m => m.done).length ?? 0;
  const totalMiles  = task.milestones?.length ?? 0;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
      {/* Tree line segment */}
      <div style={{
        width: 22, flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        marginLeft: 4,
      }}>
        <div style={{ width: 1.5, background: catColor + '40', flex: '0 0 16px' }} />
        <div style={{ width: 10, height: 1.5, background: catColor + '40', alignSelf: 'flex-end' }} />
        {!isLast && <div style={{ width: 1.5, background: catColor + '40', flex: 1 }} />}
      </div>

      {/* Task content */}
      <div style={{ flex: 1, marginBottom: 6 }}>
        {/* Task header row */}
        <div
          style={{
            display: 'flex', alignItems: 'center',
            padding: '9px 12px',
            background: '#fff',
            borderRadius: 10,
            border: `1px solid ${catColor}25`,
            borderRight: `3px solid ${catColor}`,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            direction: 'rtl',
          }}
          onClick={() => hasMiles ? setOpen(o => !o) : navigate(`/task/${task.id}`)}
        >
          {/* Status dot */}
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: dotColor,
            flexShrink: 0, marginLeft: 8,
          }} />

          {/* Title */}
          <span style={{
            flex: 1, fontSize: 13, fontWeight: 600, color: '#0f172a',
            lineHeight: 1.35,
          }}>
            {task.title}
          </span>

          {/* Right side: count + progress + chevron */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginRight: 6 }}>
            {totalMiles > 0 && (
              <span style={{
                fontSize: 10.5, color: '#94a3b8', background: '#f1f5f9',
                borderRadius: 20, padding: '1px 6px', fontWeight: 500,
              }}>
                {doneMiles}/{totalMiles}
              </span>
            )}
            <span style={{ fontSize: 10.5, color: dotColor, fontWeight: 700 }}>
              {task.progress}%
            </span>
            {hasMiles
              ? (open ? <ChevronDown size={13} color="#94a3b8" /> : <ChevronLeft size={13} color="#94a3b8" />)
              : null}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 2, borderRadius: 1, background: '#f1f5f9',
          margin: '0 0 0 0', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${task.progress}%`,
            background: dotColor, transition: 'width 0.35s',
          }} />
        </div>

        {/* Milestones (expanded) */}
        {open && hasMiles && (
          <div style={{ paddingLeft: 8, paddingTop: 4 }}>
            {task.milestones.map((m, i) => (
              <MilestoneRow
                key={i}
                milestone={m}
                isLast={i === task.milestones.length - 1}
                lineColor={catColor}
              />
            ))}
            <button
              onClick={() => navigate(`/task/${task.id}`)}
              style={{
                display: 'block', width: '100%', padding: '6px 10px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11.5, color: colors.brand.primary, fontWeight: 600,
                textAlign: 'right', direction: 'rtl', fontFamily: 'inherit',
              }}
            >
              פתח פרטים מלאים ←
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Goal / Category section ───────────────────────────────────────────────────
function GoalSection({ name, tasks }: { name: string; tasks: MedicalTask[] }) {
  const [open, setOpen] = useState(true);
  const color       = tasks[0]?.color ?? '#94a3b8';
  const totalTasks  = tasks.length;
  const activeTasks = tasks.filter(t => t.progress > 0 && t.progress < 100).length;
  const doneTasks   = tasks.filter(t => t.status === 'done' || t.progress >= 100).length;
  const avg         = totalTasks
    ? Math.round(tasks.reduce((s, t) => s + (t.progress ?? 0), 0) / totalTasks)
    : 0;

  return (
    <div style={{ marginBottom: 8 }}>
      {/* Goal header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center',
          width: '100%', padding: '12px 14px',
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          borderTop: `4px solid ${color}`,
          cursor: 'pointer', textAlign: 'right', direction: 'rtl',
          fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          gap: 10,
        }}
      >
        {/* Color dot */}
        <span style={{
          width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0,
        }} />

        {/* Name + stats */}
        <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: '#0f172a',
            letterSpacing: '-0.2px', lineHeight: 1.3,
          }}>
            {name}
          </div>
          <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2, display: 'flex', gap: 8, justifyContent: 'flex-start' }}>
            <span>{totalTasks} פרויקטים</span>
            {activeTasks > 0 && <span style={{ color: colors.brand.primary }}>{activeTasks} פעילים</span>}
            {doneTasks > 0   && <span style={{ color: '#10b981' }}>{doneTasks} הושלמו</span>}
          </div>
        </div>

        {/* Progress pill */}
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: color + '15',
            border: `2px solid ${color}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color }}>{avg}%</span>
          </div>
          {open
            ? <ChevronDown size={15} color="#94a3b8" />
            : <ChevronLeft size={15} color="#94a3b8" />}
        </div>
      </button>

      {/* Tasks branch */}
      {open && (
        <div style={{
          paddingRight: 6,
          marginRight: 10,
          marginTop: 6,
          borderRight: `2px solid ${color}30`,
        }}>
          {tasks.map((task, i) => (
            <TaskNode
              key={task.id}
              task={task}
              catColor={color}
              isLast={i === tasks.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Data loader ───────────────────────────────────────────────────────────────
function TreeContent() {
  const { user } = useAuth();
  const { projects, loading: pLoading } = useProjects(user?.id);
  const projectId = projects[0]?.id ?? null;
  const { tasks, loading: tLoading } = useTasks(projectId);

  if (pLoading || tLoading) {
    return (
      <div style={{
        display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center',
        gap: 10, color: '#94a3b8', fontSize: 14, fontFamily: typography.fontFamily,
      }}>
        <div style={{
          width: 18, height: 18, border: '2px solid #e2e8f0',
          borderTopColor: colors.brand.primary, borderRadius: '50%',
          animation: 'bpSpin 0.7s linear infinite',
        }} />
        <style>{`@keyframes bpSpin { to { transform: rotate(360deg); } }`}</style>
        טוען...
      </div>
    );
  }

  // Group by category
  const catMap = new Map<string, MedicalTask[]>();
  for (const t of tasks) {
    if (!catMap.has(t.category)) catMap.set(t.category, []);
    catMap.get(t.category)!.push(t);
  }
  const categories = [...catMap.entries()];

  if (categories.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>
        אין נתונים להצגה
      </div>
    );
  }

  return (
    <div style={{
      flex: 1, overflowY: 'auto',
      padding: '12px 14px 100px',
      direction: 'rtl',
    }}>
      {/* GROW root */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', marginBottom: 12,
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        borderTop: '4px solid #4f46e5',
        boxShadow: '0 2px 8px rgba(79,70,229,0.08)',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4f46e5' }} />
        <span style={{ fontSize: 15, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.4px' }}>GROW</span>
        <span style={{ fontSize: 11, color: '#94a3b8', marginRight: 'auto' }}>
          {tasks.length} פרויקטים · {categories.length} תחומים
        </span>
      </div>

      {/* Categories with vertical connector from root */}
      <div style={{
        paddingRight: 8,
        marginRight: 12,
        borderRight: '2px solid #4f46e530',
      }}>
        {categories.map(([cat, catTasks]) => (
          <GoalSection key={cat} name={cat} tasks={catTasks} />
        ))}
      </div>
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────
export function MobileBigPictureView({ onClose }: { onClose: () => void }) {
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
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)',
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 3, height: 18, background: colors.brand.primary, borderRadius: 2 }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
            התמונה הגדולה
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: 8,
            border: '1px solid #e2e8f0', background: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#94a3b8', WebkitTapHighlightColor: 'transparent',
          }}
        >
          <X size={16} />
        </button>
      </div>

      <TreeContent />
    </div>
  );
}
