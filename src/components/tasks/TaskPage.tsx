import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, BookOpen, Activity, FileText, ListChecks,
  BarChart2, AlertTriangle, Users, CheckCircle2, Circle, AlertCircle,
} from 'lucide-react';
import { useTaskById, useProfiles, updateTask, type MedicalTask } from '@/lib/supabase-hooks';
import { useState, useRef, useEffect, useCallback } from 'react';

// ── Config ─────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  open:        { label: 'פתוח',   color: '#0ea5e9', bg: '#e0f2fe' },
  in_progress: { label: 'בעבודה', color: '#d97706', bg: '#fef3c7' },
  blocked:     { label: 'תקוע',   color: '#ef4444', bg: '#fee2e2' },
  done:        { label: 'הושלם',  color: '#10b981', bg: '#d1fae5' },
} as const;

const PRIORITY_CONFIG = {
  P1: { label: 'P1 — דחוף',   color: '#dc2626', bg: '#fee2e2' },
  P2: { label: 'P2 — בינוני', color: '#c2410c', bg: '#fed7aa' },
  P3: { label: 'P3 — נמוך',   color: '#4f46e5', bg: '#e0e7ff' },
} as const;

const NAV_ITEMS = [
  { id: 'foundations',   Icon: BookOpen,      label: 'יסודות'    },
  { id: 'current-state', Icon: Activity,      label: 'מצב נוכחי' },
  { id: 'spec',          Icon: FileText,      label: 'אפיון'      },
  { id: 'timeline',      Icon: ListChecks,    label: 'ציר זמן'   },
  { id: 'kpi',           Icon: BarChart2,     label: 'KPI'        },
  { id: 'participants',  Icon: Users,         label: 'משתתפים'   },
  { id: 'risks',         Icon: AlertTriangle, label: 'סיכונים'   },
] as const;

// ── Shared style objects ───────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
  padding: '24px 28px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '700',
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  marginBottom: '6px',
  direction: 'rtl',
  textAlign: 'right',
};

const sectionHeadStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
  fontSize: '11px',
  fontWeight: '700',
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  marginBottom: '18px',
  direction: 'rtl',
  textAlign: 'right',
};

const backBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 14px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  background: 'white',
  color: '#475569',
  fontSize: '13px',
  fontWeight: '600',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background 0.12s',
};

// ── EditableArea — auto-growing transparent textarea ──────────────────────────

function EditableArea({
  value,
  onChange,
  onBlur,
  placeholder,
  style,
  minRows = 1,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder: string;
  style?: React.CSSProperties;
  minRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  // Auto-resize
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = Math.max(ref.current.scrollHeight, minRows * 24) + 'px';
    }
  }, [value, minRows]);

  return (
    <div style={{
      borderRadius: '8px',
      background: focused ? '#f8fafc' : 'transparent',
      outline: focused ? '1px solid #c7d2fe' : 'none',
      padding: focused ? '8px 10px' : '0',
      transition: 'all 0.12s',
    }}>
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onBlur(); }}
        placeholder={placeholder}
        rows={minRows}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          resize: 'none',
          overflow: 'hidden',
          fontFamily: 'inherit',
          fontSize: '14px',
          lineHeight: '1.8',
          color: '#334155',
          direction: 'rtl',
          textAlign: 'right',
          padding: 0,
          boxSizing: 'border-box',
          ...style,
        }}
      />
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, badge, children }: {
  icon: React.ElementType;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={cardStyle}>
      <div style={sectionHeadStyle}>
        <Icon size={13} />
        {title}
        {badge}
      </div>
      {children}
    </section>
  );
}

// ── FieldGroup ─────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={fieldLabelStyle}>{label}</div>
      {children}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TaskPageContent({ taskId }: { taskId: string }) {
  const navigate = useNavigate();
  const { task: fetchedTask, projectId, loading, refetch } = useTaskById(taskId);
  const { profiles } = useProfiles();

  const [localTask, setLocalTask] = useState<MedicalTask | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('foundations');

  // Always-current ref so onBlur handlers don't use stale closure values
  const taskRef = useRef<MedicalTask | null>(null);
  useEffect(() => { taskRef.current = localTask ?? fetchedTask ?? null; }, [localTask, fetchedTask]);

  // Seed local state once the remote task arrives
  useEffect(() => {
    if (fetchedTask && !localTask) setLocalTask(fetchedTask);
  }, [fetchedTask]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist to Supabase ──────────────────────────────────────────────────────
  const save = useCallback(async (updated: MedicalTask) => {
    if (!projectId) return;
    setSaving(true);
    try {
      await updateTask(updated, projectId);
      await refetch();
    } catch (e) {
      console.error('TaskPage save error:', e);
    } finally {
      setSaving(false);
    }
  }, [projectId, refetch]);

  // Save whatever is currently in taskRef (used by onBlur handlers after patchLocal)
  const saveLatest = useCallback(() => {
    if (taskRef.current) save(taskRef.current);
  }, [save]);

  // Update local state + immediately save (used by dropdowns / toggles)
  const patch = useCallback(<K extends keyof MedicalTask>(key: K, value: MedicalTask[K]) => {
    setLocalTask(prev => {
      if (!prev) return prev;
      const updated = { ...prev, [key]: value };
      save(updated);
      return updated;
    });
  }, [save]);

  // Update local state only — caller is responsible for calling saveLatest on blur
  const patchLocal = useCallback(<K extends keyof MedicalTask>(key: K, value: MedicalTask[K]) => {
    setLocalTask(prev => prev ? { ...prev, [key]: value } : prev);
  }, []);

  // ── Tab switch ────────────────────────────────────────────────────────────────
  const switchTab = (id: string) => setActiveSection(id);

  // ── Milestone toggle ─────────────────────────────────────────────────────────
  const toggleMilestone = async (idx: number) => {
    if (!taskRef.current || !projectId) return;
    const t = taskRef.current;
    const milestones = t.milestones.map((m, i) => i === idx ? { ...m, done: !m.done } : m);
    const done = milestones.filter(m => m.done).length;
    const progress = milestones.length > 0 ? Math.round((done / milestones.length) * 100) : 0;
    const updated = { ...t, milestones, progress };
    setLocalTask(updated);
    await save(updated);
  };

  // ── Loading / error states ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <div style={{
          width: '28px', height: '28px',
          border: '3px solid #e2e8f0', borderTopColor: '#6366f1',
          borderRadius: '50%', animation: 'tpSpin 0.8s linear infinite',
        }} />
        <style>{`@keyframes tpSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const task = localTask ?? fetchedTask;

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

  const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.open;
  const priorityCfg = PRIORITY_CONFIG[task.priority];
  const overdue = task.dueDate ? new Date(task.dueDate) < new Date() : false;
  const milestonesDone = task.milestones.filter(m => m.done).length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" style={{ fontFamily: 'inherit', maxWidth: '860px', margin: '0 auto', paddingBottom: '80px' }}>

      <style>{`
        @keyframes tpSpin   { to { transform: rotate(360deg); } }
        @keyframes tpFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* ── Back bar ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/')} style={backBtnStyle}>
          <ArrowRight size={14} /> חזרה ללוח
        </button>
        <span style={{ color: '#cbd5e1' }}>›</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#64748b' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: task.color, display: 'inline-block', flexShrink: 0 }} />
          {task.category}
        </span>
        {saving && (
          <span style={{ marginRight: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
            <div style={{ width: '10px', height: '10px', border: '2px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'tpSpin 0.8s linear infinite', flexShrink: 0 }} />
            שומר...
          </span>
        )}
      </div>

      {/* ── Title ────────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '14px' }}>
        <EditableArea
          value={task.title}
          onChange={v => patchLocal('title', v)}
          onBlur={saveLatest}
          placeholder="כותרת המשימה..."
          style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: '800', color: '#0f172a', lineHeight: '1.25' }}
        />
      </div>

      {/* ── Metadata pill row ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
        padding: '10px 16px', marginBottom: '16px',
        background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)', direction: 'rtl',
      }}>

        {/* Status */}
        <select
          value={task.status}
          onChange={e => patch('status', e.target.value as MedicalTask['status'])}
          style={{
            background: statusCfg.bg, color: statusCfg.color,
            border: 'none', outline: 'none', borderRadius: '20px',
            padding: '4px 12px', fontSize: '12px', fontWeight: '700',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {(Object.entries(STATUS_CONFIG) as [MedicalTask['status'], typeof STATUS_CONFIG.open][]).map(([v, c]) => (
            <option key={v} value={v}>{c.label}</option>
          ))}
        </select>

        <span style={{ color: '#e2e8f0' }}>|</span>

        {/* Priority */}
        <select
          value={task.priority}
          onChange={e => patch('priority', e.target.value as MedicalTask['priority'])}
          style={{
            background: priorityCfg.bg, color: priorityCfg.color,
            border: 'none', outline: 'none', borderRadius: '20px',
            padding: '4px 12px', fontSize: '12px', fontWeight: '700',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {(Object.entries(PRIORITY_CONFIG) as [MedicalTask['priority'], typeof PRIORITY_CONFIG.P1][]).map(([v, c]) => (
            <option key={v} value={v}>{c.label}</option>
          ))}
        </select>

        <span style={{ color: '#e2e8f0' }}>|</span>

        {/* Lead */}
        <select
          value={task.assignedTo || ''}
          onChange={e => patch('assignedTo', e.target.value || null)}
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            fontSize: '12px', color: task.assignedTo ? '#334155' : '#94a3b8',
            cursor: 'pointer', fontFamily: 'inherit', maxWidth: '140px',
          }}
        >
          <option value="">אחראי: —</option>
          {profiles.map(p => (
            <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
          ))}
        </select>

        <span style={{ color: '#e2e8f0' }}>|</span>

        {/* Department */}
        <input
          type="text"
          value={task.department}
          onChange={e => patchLocal('department', e.target.value)}
          onBlur={saveLatest}
          placeholder="מחלקה"
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            fontSize: '12px', color: task.department ? '#334155' : '#94a3b8',
            fontFamily: 'inherit', width: '80px', direction: 'rtl',
          }}
        />

        <span style={{ color: '#e2e8f0' }}>|</span>

        {/* Due date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {overdue && <AlertCircle size={11} style={{ color: '#ef4444' }} />}
          <input
            type="date"
            value={task.dueDate || ''}
            onChange={e => patch('dueDate', e.target.value)}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              fontSize: '12px', color: overdue ? '#dc2626' : '#475569',
              fontFamily: 'inherit', cursor: 'pointer', fontWeight: overdue ? '600' : '400',
            }}
          />
        </div>

        {/* Progress chip */}
        <span style={{
          marginRight: 'auto',
          fontSize: '12px', fontWeight: '700',
          color: task.progress === 100 ? '#10b981' : task.progress >= 50 ? '#6366f1' : '#f59e0b',
          background: task.progress === 100 ? '#d1fae5' : task.progress >= 50 ? '#ede9fe' : '#fef3c7',
          padding: '3px 10px', borderRadius: '20px',
        }}>
          {task.progress}%
        </span>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <nav style={{
        display: 'flex', alignItems: 'center', gap: '2px',
        padding: '6px 8px',
        background: 'white',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        direction: 'rtl',
        flexWrap: 'wrap',
      }}>
        {NAV_ITEMS.map(({ id, Icon, label }) => {
          const active = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => switchTab(id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '7px 13px', borderRadius: '9px',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '12px', fontWeight: active ? '700' : '500',
                color: active ? '#6366f1' : '#64748b',
                background: active ? '#ede9fe' : 'transparent',
                transition: 'background 0.15s, color 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                if (!active) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#334155'; }
              }}
              onMouseLeave={e => {
                if (!active) { e.currentTarget.style.background = active ? '#ede9fe' : 'transparent'; e.currentTarget.style.color = active ? '#6366f1' : '#64748b'; }
              }}
            >
              <Icon size={12} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* ── Tab panel — only the active section is rendered ─────────────────── */}
      <div key={activeSection} style={{ animation: 'tpFadeIn 0.18s ease both' }}>

        {/* FOUNDATIONS — יסודות */}
        {activeSection === 'foundations' && <Section icon={BookOpen} title="יסודות">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <Field label="תיאור">
              <EditableArea
                value={task.description}
                onChange={v => patchLocal('description', v)}
                onBlur={saveLatest}
                placeholder="הוסף תיאור כללי של המשימה..."
                minRows={2}
              />
            </Field>
            <Field label="בעיה / הזדמנות">
              <EditableArea
                value={task.problemStatement}
                onChange={v => patchLocal('problemStatement', v)}
                onBlur={saveLatest}
                placeholder="מה הבעיה שאנחנו פותרים? מה ההזדמנות שזיהינו?"
                minRows={2}
              />
            </Field>
            <Field label="מטרה">
              <EditableArea
                value={task.goal}
                onChange={v => patchLocal('goal', v)}
                onBlur={saveLatest}
                placeholder="מה אנחנו רוצים להשיג? מה הצלחה נראית כמו?"
                minRows={2}
              />
            </Field>
          </div>
        </Section>}

        {/* CURRENT STATE */}
        {activeSection === 'current-state' && <Section icon={Activity} title="מצב נוכחי — נקודת האפס">
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 14px 0', direction: 'rtl', textAlign: 'right', lineHeight: '1.6' }}>
            תעד נתוני בסיס, פערים תפעוליים וצילום מצב לפני תחילת הפרויקט. מידע זה ישמש להשוואה בסיום.
          </p>
          <EditableArea
            value={task.currentState}
            onChange={v => patchLocal('currentState', v)}
            onBlur={saveLatest}
            placeholder={'לדוגמה:\n• ממוצע זמן המתנה נוכחי: X דקות\n• אחוז שגיאות בתהליך: Y%\n• עומס עובדים: Z משמרות בשבוע\n• כלים / מערכות קיימות: ...'}
            minRows={4}
            style={{ fontSize: '14px' }}
          />
        </Section>}

        {/* SPEC */}
        {activeSection === 'spec' && <Section icon={FileText} title="אפיון">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <Field label="שם התהליך">
              <EditableArea value={task.processName} onChange={v => patchLocal('processName', v)} onBlur={saveLatest} placeholder="שם התהליך..." />
            </Field>
            <Field label="מחלקה">
              <EditableArea value={task.department} onChange={v => patchLocal('department', v)} onBlur={saveLatest} placeholder="שם המחלקה..." />
            </Field>
          </div>
        </Section>}

        {/* TIMELINE */}
        {activeSection === 'timeline' && <Section
          icon={ListChecks}
          title="ציר זמן — אבני דרך"
          badge={task.milestones.length > 0 ? (
            <span style={{
              marginRight: '6px', fontSize: '11px', fontWeight: '600',
              color: milestonesDone === task.milestones.length ? '#10b981' : '#94a3b8',
              background: milestonesDone === task.milestones.length ? '#d1fae5' : '#f1f5f9',
              padding: '2px 8px', borderRadius: '10px',
            }}>
              {milestonesDone} / {task.milestones.length}
            </span>
          ) : null}
        >
          {task.milestones.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, direction: 'rtl', textAlign: 'right' }}>
              אין אבני דרך — ניתן להוסיף מתוך עריכת המשימה.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {task.milestones.map((m, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleMilestone(idx)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 16px', borderRadius: '10px',
                    border: `1px solid ${m.done ? '#d1fae5' : '#e2e8f0'}`,
                    background: m.done ? '#f0fdf4' : '#f8fafc',
                    cursor: 'pointer', textAlign: 'right',
                    fontFamily: 'inherit', direction: 'rtl',
                    transition: 'all 0.15s', width: '100%',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = m.done ? '#6ee7b7' : '#c7d2fe'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = m.done ? '#d1fae5' : '#e2e8f0'; }}
                >
                  {m.done
                    ? <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                    : <Circle size={18} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                  }
                  <span style={{ fontSize: '14px', flex: 1, color: m.done ? '#059669' : '#334155', textDecoration: m.done ? 'line-through' : 'none' }}>
                    {m.text}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Section>}

        {/* KPI */}
        {activeSection === 'kpi' && <Section icon={BarChart2} title="מדדי הצלחה — KPI">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {([
              { key: 'kpiName',            label: 'שם המדד',            placeholder: 'לדוגמה: זמן המתנה ממוצע' },
              { key: 'measurementCadence', label: 'תדירות מדידה',        placeholder: 'לדוגמה: שבועי / חודשי' },
              { key: 'baseline',           label: 'בסיס — נקודת פתיחה', placeholder: 'ערך נוכחי...' },
              { key: 'target',             label: 'יעד (Target)',         placeholder: 'ערך מטרה...' },
            ] as const).map(({ key, label, placeholder }) => (
              <div key={key} style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '14px', direction: 'rtl', textAlign: 'right' }}>
                <div style={fieldLabelStyle}>{label}</div>
                <EditableArea
                  value={task[key] || ''}
                  onChange={v => patchLocal(key, v)}
                  onBlur={saveLatest}
                  placeholder={placeholder}
                  style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b' }}
                />
              </div>
            ))}
          </div>
        </Section>}

        {/* PARTICIPANTS */}
        {activeSection === 'participants' && <Section icon={Users} title="משתתפים">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', direction: 'rtl' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', flexShrink: 0 }}>אחראי</span>
              <select
                value={task.assignedTo || ''}
                onChange={e => patch('assignedTo', e.target.value || null)}
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 10px', fontSize: '13px', color: '#334155', fontFamily: 'inherit', cursor: 'pointer', outline: 'none', direction: 'rtl' }}
              >
                <option value="">לא שויך</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
              </select>
            </div>
            <div>
              <div style={fieldLabelStyle}>משתתפים נוספים — לחץ להוספה / הסרה</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', direction: 'rtl' }}>
                {profiles.map(p => {
                  const isIn = (task.participants || []).includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => patch('participants', isIn ? task.participants.filter(id => id !== p.id) : [...(task.participants || []), p.id])}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '5px 12px', borderRadius: '20px', cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: '12px', fontWeight: '500',
                        border: `1px solid ${isIn ? '#6366f1' : '#e2e8f0'}`,
                        background: isIn ? '#ede9fe' : 'white',
                        color: isIn ? '#6366f1' : '#64748b', transition: 'all 0.12s',
                      }}
                    >
                      {isIn && <CheckCircle2 size={11} />}
                      {p.full_name || p.email}
                    </button>
                  );
                })}
                {profiles.length === 0 && <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>טוען...</p>}
              </div>
            </div>
          </div>
        </Section>}

        {/* RISKS */}
        {activeSection === 'risks' && <Section icon={AlertTriangle} title="סיכונים ותלויות">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <Field label="סיכונים / חסמים">
              <EditableArea value={task.risksBlockers} onChange={v => patchLocal('risksBlockers', v)} onBlur={saveLatest} placeholder="תאר סיכונים, חסמים ידועים..." minRows={2} />
            </Field>
            <Field label="תלויות">
              <EditableArea value={task.dependencies} onChange={v => patchLocal('dependencies', v)} onBlur={saveLatest} placeholder="מה תלוי בגורמים חיצוניים?" minRows={2} />
            </Field>
            <Field label="קישורים">
              <EditableArea value={task.links} onChange={v => patchLocal('links', v)} onBlur={saveLatest} placeholder="https://..." style={{ wordBreak: 'break-all' }} />
            </Field>
            {task.stakeholders.length > 0 && (
              <Field label="בעלי עניין">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', direction: 'rtl', marginTop: '4px' }}>
                  {task.stakeholders.map((s, i) => (
                    <span key={i} style={{ padding: '4px 12px', borderRadius: '20px', background: '#ede9fe', color: '#6d28d9', fontSize: '13px', fontWeight: '500' }}>{s}</span>
                  ))}
                </div>
              </Field>
            )}
          </div>
        </Section>}

      </div>
    </div>
  );
}
