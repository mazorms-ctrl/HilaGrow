import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calendar, Flag, Users, User, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { useTaskById, useProfiles, updateTask, type MedicalTask } from '@/lib/supabase-hooks';
import { useState } from 'react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const PRIORITY_STYLES = {
  P1: { bg: '#fee2e2', text: '#dc2626', label: 'P1 — דחוף' },
  P2: { bg: '#fed7aa', text: '#c2410c', label: 'P2 — בינוני' },
  P3: { bg: '#e0e7ff', text: '#4f46e5', label: 'P3 — נמוך' },
};

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isOverdue(dateStr: string) {
  return dateStr ? new Date(dateStr) < new Date() : false;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function MetaRow({ icon, label, children }: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '11px', fontWeight: '700', color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '0.8px', direction: 'rtl',
      }}>
        {icon}{label}
      </div>
      <div style={{ fontSize: '14px', color: '#1e293b', direction: 'rtl' }}>
        {children}
      </div>
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value === 100 ? '#10b981' : value >= 60 ? '#6366f1' : '#f59e0b';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', direction: 'rtl' }}>
      <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="24" cy="24" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <span style={{ fontSize: '20px', fontWeight: '700', color }}>{value}%</span>
    </div>
  );
}

// ── TaskPageContent — renders INSIDE the app's existing layout shell ───────────
// Props come from App.tsx (via useMatch). Only needs taskId — project is resolved internally.
export function TaskPageContent({ taskId }: { taskId: string }) {
  const navigate = useNavigate();
  const { task: fetchedTask, projectId, loading, refetch } = useTaskById(taskId);
  const { profiles } = useProfiles();
  const [saving, setSaving] = useState(false);
  const [localTask, setLocalTask] = useState<MedicalTask | null>(null);

  const task = localTask ?? fetchedTask;

  const toggleMilestone = async (idx: number) => {
    if (!task || !projectId) return;
    const updated: MedicalTask = {
      ...task,
      milestones: task.milestones.map((m, i) => i === idx ? { ...m, done: !m.done } : m),
    };
    const doneCount = updated.milestones.filter(m => m.done).length;
    updated.progress = updated.milestones.length > 0
      ? Math.round((doneCount / updated.milestones.length) * 100) : 0;
    setLocalTask(updated);
    setSaving(true);
    try {
      await updateTask(updated, projectId);
      await refetch();
    }
    catch (e) { console.error('Error saving milestone:', e); }
    finally { setSaving(false); }
  };

  // Loading
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <div style={{
          width: '28px', height: '28px',
          border: '3px solid #e2e8f0', borderTopColor: '#6366f1',
          borderRadius: '50%', animation: 'tp-spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes tp-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not found
  if (!task) {
    return (
      <div dir="rtl" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: '16px', minHeight: '40vh', color: '#64748b',
      }}>
        <AlertCircle size={36} style={{ color: '#f87171' }} />
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
          המשימה לא נמצאה
        </h2>
        <button onClick={() => navigate('/')} style={backBtnStyle}>
          <ArrowRight size={15} /> חזרה ללוח
        </button>
      </div>
    );
  }

  const ps = PRIORITY_STYLES[task.priority];
  const overdue = isOverdue(task.dueDate);
  const assignedProfile = task.assignedTo
    ? profiles.find(p => p.id === task.assignedTo) : null;

  return (
    <div dir="rtl" style={{ fontFamily: 'inherit' }}>

      {/* ── Back bar ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: '24px', flexWrap: 'wrap',
      }}>
        <button onClick={() => navigate('/')} style={backBtnStyle}>
          <ArrowRight size={15} /> חזרה ללוח
        </button>
        {/* Category breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#94a3b8' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: task.color, flexShrink: 0, display: 'inline-block' }} />
          {task.category}
        </div>
        {saving && <span style={{ fontSize: '12px', color: '#94a3b8', marginRight: 'auto' }}>שומר...</span>}
      </div>

      {/* ── 2-column body ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: '28px',
        alignItems: 'flex-start',
        direction: 'rtl',
      }}>

        {/* ── RIGHT: Metadata sidebar ───────────────────────────── */}
        <aside style={{
          width: '260px',
          flexShrink: 0,
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          position: 'sticky',
          top: '24px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>

          {/* Progress */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              התקדמות
            </div>
            <ProgressRing value={task.progress} />
          </div>

          <div style={{ height: '1px', background: '#f1f5f9' }} />

          {/* Priority */}
          <MetaRow icon={<Flag size={12} />} label="דחיפות">
            <span style={{
              display: 'inline-block', padding: '4px 12px', borderRadius: '6px',
              background: ps.bg, color: ps.text, fontSize: '13px', fontWeight: '700',
            }}>
              {ps.label}
            </span>
          </MetaRow>

          {/* Due Date */}
          <MetaRow icon={<Calendar size={12} />} label="תאריך יעד">
            <span style={{ color: overdue ? '#dc2626' : '#1e293b', fontWeight: overdue ? '600' : '400' }}>
              {task.dueDate ? formatDate(task.dueDate) : '—'}
              {overdue && <span style={{ marginRight: '6px', fontSize: '11px' }}>⚠ פג תוקף</span>}
            </span>
          </MetaRow>

          {task.startDate && (
            <MetaRow icon={<Calendar size={12} />} label="תאריך התחלה">
              {formatDate(task.startDate)}
            </MetaRow>
          )}

          <div style={{ height: '1px', background: '#f1f5f9' }} />

          {/* Lead */}
          <MetaRow icon={<User size={12} />} label="אחראי">
            {assignedProfile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '26px', height: '26px', borderRadius: '7px', flexShrink: 0,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: '700', color: 'white',
                }}>
                  {(assignedProfile.full_name || assignedProfile.email || '?')
                    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <span>{assignedProfile.full_name || assignedProfile.email}</span>
              </div>
            ) : task.owner ? (
              <span>{task.owner}</span>
            ) : (
              <span style={{ color: '#94a3b8' }}>—</span>
            )}
          </MetaRow>

          {/* Participants */}
          {(task.participants ?? []).length > 0 && (
            <MetaRow icon={<Users size={12} />} label="משתתפים">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(task.participants ?? []).map(id => {
                  const p = profiles.find(pr => pr.id === id);
                  const name = p ? (p.full_name || p.email) : id;
                  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                  return (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                        background: '#e0e7ff', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '9px', fontWeight: '700', color: '#4f46e5',
                      }}>
                        {initials}
                      </div>
                      <span style={{ fontSize: '13px' }}>{name}</span>
                    </div>
                  );
                })}
              </div>
            </MetaRow>
          )}

          {task.department && (
            <MetaRow icon={<span style={{ fontSize: '12px' }}>🏥</span>} label="מחלקה">
              {task.department}
            </MetaRow>
          )}

          <MetaRow icon={
            <span style={{
              width: '10px', height: '10px', borderRadius: '3px',
              background: task.color, display: 'inline-block',
            }} />
          } label="קטגוריה">
            {task.category}
          </MetaRow>
        </aside>

        {/* ── LEFT: Main content ───────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Title */}
          <h1 style={{
            fontSize: 'clamp(22px, 3.5vw, 34px)',
            fontWeight: '800', color: '#0f172a',
            margin: 0, lineHeight: '1.25',
            direction: 'rtl', textAlign: 'right',
          }}>
            {task.title}
          </h1>

          {/* Description */}
          {task.description && (
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>תיאור</h2>
              <p style={bodyTextStyle}>{task.description}</p>
            </section>
          )}

          {/* Goal / Problem */}
          {(task.goal || task.problemStatement) && (
            <section style={sectionStyle}>
              {task.problemStatement && <>
                <h2 style={sectionTitleStyle}>בעיה / הזדמנות</h2>
                <p style={bodyTextStyle}>{task.problemStatement}</p>
              </>}
              {task.goal && <>
                <h2 style={{ ...sectionTitleStyle, marginTop: task.problemStatement ? '16px' : 0 }}>מטרה</h2>
                <p style={bodyTextStyle}>{task.goal}</p>
              </>}
            </section>
          )}

          {/* Milestones */}
          {task.milestones && task.milestones.length > 0 && (
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>
                אבני דרך
                <span style={{
                  marginRight: '10px', fontSize: '12px', fontWeight: '500',
                  color: '#94a3b8', background: '#f1f5f9',
                  padding: '2px 8px', borderRadius: '10px',
                }}>
                  {task.milestones.filter(m => m.done).length} / {task.milestones.length}
                </span>
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: '4px' }}>
                {task.milestones.map((m, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleMilestone(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '11px 16px', borderRadius: '10px',
                      border: `1px solid ${m.done ? '#d1fae5' : '#e2e8f0'}`,
                      background: m.done ? '#f0fdf4' : 'white',
                      cursor: 'pointer', textAlign: 'right',
                      fontFamily: 'inherit', direction: 'rtl',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = m.done ? '#6ee7b7' : '#c7d2fe'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = m.done ? '#d1fae5' : '#e2e8f0'; }}
                  >
                    {m.done
                      ? <CheckCircle2 size={19} style={{ color: '#10b981', flexShrink: 0 }} />
                      : <Circle size={19} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                    }
                    <span style={{
                      fontSize: '14px', flex: 1,
                      color: m.done ? '#059669' : '#334155',
                      textDecoration: m.done ? 'line-through' : 'none',
                    }}>
                      {m.text}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* KPIs */}
          {task.kpiName && (
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>מדד הצלחה (KPI)</h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
              }}>
                {[
                  { label: 'שם ה-KPI', value: task.kpiName },
                  { label: 'בסיס', value: task.baseline },
                  { label: 'יעד', value: task.target },
                  { label: 'תדירות', value: task.measurementCadence },
                ].filter(i => i.value).map(item => (
                  <div key={item.label} style={{
                    background: '#f8fafc', borderRadius: '10px',
                    padding: '12px', border: '1px solid #e2e8f0',
                    direction: 'rtl', textAlign: 'right',
                  }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', marginBottom: '4px' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Risks / Dependencies / Links */}
          {(task.risksBlockers || task.dependencies || task.links) && (
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>סיכונים ותלויות</h2>
              {task.risksBlockers && (
                <div style={{ marginBottom: '12px', direction: 'rtl' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>סיכונים / חסמים</div>
                  <p style={bodyTextStyle}>{task.risksBlockers}</p>
                </div>
              )}
              {task.dependencies && (
                <div style={{ marginBottom: '12px', direction: 'rtl' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>תלויות</div>
                  <p style={bodyTextStyle}>{task.dependencies}</p>
                </div>
              )}
              {task.links && (
                <div style={{ direction: 'rtl' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>קישורים</div>
                  <p style={{ ...bodyTextStyle, wordBreak: 'break-all' }}>{task.links}</p>
                </div>
              )}
            </section>
          )}

          {/* Stakeholders */}
          {task.stakeholders && task.stakeholders.length > 0 && (
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>בעלי עניין</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', direction: 'rtl' }}>
                {task.stakeholders.map((s, i) => (
                  <span key={i} style={{
                    padding: '4px 12px', borderRadius: '20px',
                    background: '#ede9fe', color: '#6d28d9',
                    fontSize: '13px', fontWeight: '500',
                  }}>{s}</span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const backBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '7px 14px', borderRadius: '8px',
  border: '1px solid #e2e8f0', background: 'white',
  color: '#475569', fontSize: '13px', fontWeight: '600',
  cursor: 'pointer', fontFamily: 'inherit',
  transition: 'background 0.15s, border-color 0.15s',
};

const sectionStyle: React.CSSProperties = {
  background: 'white', borderRadius: '14px',
  border: '1px solid #e2e8f0', padding: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: '700', color: '#64748b',
  margin: '0 0 12px 0', textTransform: 'uppercase',
  letterSpacing: '0.6px', direction: 'rtl', textAlign: 'right',
  display: 'flex', alignItems: 'center',
};

const bodyTextStyle: React.CSSProperties = {
  fontSize: '14px', lineHeight: '1.75',
  color: '#334155', margin: 0,
  direction: 'rtl', textAlign: 'right',
  whiteSpace: 'pre-wrap',
};
