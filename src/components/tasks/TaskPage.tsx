import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, BookOpen, Activity, FileText, ListChecks,
  BarChart2, AlertTriangle, Users, CheckCircle2, Circle, AlertCircle, Trash2, MessageSquare, Send,
  Plus, ChevronDown, ChevronUp, UserCircle2, AlertOctagon, CalendarDays,
} from 'lucide-react';
import { useTaskById, useProfiles, updateTask, deleteTask, type MedicalTask, useTaskComments, createComment, deleteComment } from '@/lib/supabase-hooks';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Toast } from '../Toast';
import { useAuth } from '@/contexts/AuthContext';

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
  { id: 'foundations',   Icon: BookOpen,      label: 'יסודות'        },
  { id: 'current-state', Icon: Activity,      label: 'מצב נוכחי'     },
  { id: 'spec',          Icon: FileText,      label: 'אפיון'          },
  { id: 'timeline',      Icon: ListChecks,    label: 'ציר זמן'       },
  { id: 'kpi',           Icon: BarChart2,     label: 'KPI'            },
  { id: 'participants',  Icon: Users,         label: 'משתתפים'       },
  { id: 'risks',         Icon: AlertTriangle, label: 'סיכונים'       },
  { id: 'discussion',    Icon: MessageSquare, label: 'דיון'           },
  { id: 'outcome',       Icon: CheckCircle2,  label: 'תוצר סופי'     },
] as const;

// ── Shared style objects ───────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #edf0f4',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#94a3b8',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  marginBottom: '2px',
  direction: 'rtl',
  textAlign: 'right',
};

const sectionHeadStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '13px',
  fontWeight: '700',
  color: '#475569',
  letterSpacing: '0.1px',
  marginBottom: '14px',
  paddingBottom: '10px',
  borderBottom: '1px solid #f1f5f9',
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

const crumbLinkStyle: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0,
  fontSize: '12px', color: '#94a3b8', cursor: 'pointer',
  fontFamily: 'inherit', fontWeight: '500',
  textDecoration: 'none', lineHeight: 1,
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
  const [hovered, setHovered] = useState(false);

  // Auto-resize
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = Math.max(ref.current.scrollHeight, minRows * 22) + 'px';
    }
  }, [value, minRows]);

  const state = focused ? 'focused' : hovered ? 'hovered' : 'idle';

  return (
    <div
      className={`tp-editable tp-editable--${state}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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
          fontSize: '13.5px',
          lineHeight: '1.75',
          fontWeight: '400',
          color: value ? '#1e293b' : '#94a3b8',
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

function Section({ icon: Icon, title, badge, children, style, iconColor }: {
  icon: React.ElementType;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
  iconColor?: string;
}) {
  return (
    <section style={{ ...cardStyle, ...style }}>
      <div style={sectionHeadStyle}>
        <Icon size={16} style={{ color: iconColor ?? '#94a3b8', flexShrink: 0 }} />
        {title}
        {badge}
      </div>
      {children}
    </section>
  );
}

// ── FieldGroup ─────────────────────────────────────────────────────────────────

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className} style={{ minWidth: 0 }}>
      <div style={fieldLabelStyle}>{label}</div>
      {children}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TaskPageContent({ taskId }: { taskId: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { task: fetchedTask, projectId, loading, refetch } = useTaskById(taskId);
  const { profiles } = useProfiles();
  const { comments, loading: commentsLoading } = useTaskComments(taskId);

  const [localTask, setLocalTask] = useState<MedicalTask | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeSection, setActiveSection] = useState<string>('foundations');
  const [participantSearch, setParticipantSearch] = useState('');
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<number>>(new Set());
  const [expandedOverviewCard, setExpandedOverviewCard] = useState<number | null>(null);

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

  // ── Delete task ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!task) return;
    const confirmed = window.confirm('האם אתה בטוח שברצונך למחוק את המשימה? פעולה זו אינה ניתנת לביטול.');
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deleteTask(task.id);
      setToast({ message: 'המשימה נמחקה בהצלחה', type: 'success' });
      setTimeout(() => navigate(-1), 1500);
    } catch (e) {
      console.error('Delete error:', e);
      setToast({ message: 'שגיאה במחיקת המשימה', type: 'error' });
      setDeleting(false);
    }
  };

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

  // ── Milestone field patch (assignedTo, text) ──────────────────────────────
  const patchMilestone = useCallback(<K extends keyof MedicalTask['milestones'][0]>(
    idx: number, key: K, value: MedicalTask['milestones'][0][K]
  ) => {
    setLocalTask(prev => {
      if (!prev) return prev;
      const milestones = prev.milestones.map((m, i) =>
        i === idx ? { ...m, [key]: value } : m
      );
      const updated = { ...prev, milestones };
      save(updated);
      return updated;
    });
  }, [save]);

  // ── Action item helpers ────────────────────────────────────────────────────
  const addActionItem = useCallback((mIdx: number) => {
    setLocalTask(prev => {
      if (!prev) return prev;
      const milestones = prev.milestones.map((m, i) => {
        if (i !== mIdx) return m;
        return { ...m, actionItems: [...(m.actionItems || []), { text: '', done: false }] };
      });
      const updated = { ...prev, milestones };
      // auto-expand
      setExpandedMilestones(s => new Set([...s, mIdx]));
      save(updated);
      return updated;
    });
  }, [save]);

  const patchActionItem = useCallback((
    mIdx: number, aIdx: number, key: 'text' | 'done' | 'assignedTo' | 'dueDate', value: string | boolean
  ) => {
    setLocalTask(prev => {
      if (!prev) return prev;
      const milestones = prev.milestones.map((m, i) => {
        if (i !== mIdx) return m;
        const actionItems = (m.actionItems || []).map((a, j) =>
          j === aIdx ? { ...a, [key]: value } : a
        );
        return { ...m, actionItems };
      });
      const updated = { ...prev, milestones };
      if (key !== 'text') save(updated);   // text saves on blur; everything else saves immediately
      return updated;
    });
  }, [save]);

  const deleteActionItem = useCallback((mIdx: number, aIdx: number) => {
    setLocalTask(prev => {
      if (!prev) return prev;
      const milestones = prev.milestones.map((m, i) => {
        if (i !== mIdx) return m;
        const actionItems = (m.actionItems || []).filter((_, j) => j !== aIdx);
        return { ...m, actionItems };
      });
      const updated = { ...prev, milestones };
      save(updated);
      return updated;
    });
  }, [save]);

  // ── Comment submission ──────────────────────────────────────────────────────
  const handleSendComment = async () => {
    if (!commentText.trim() || !user) return;
    setSendingComment(true);
    try {
      await createComment(taskId, commentText.trim(), user.id);
      setCommentText('');
    } catch (e) {
      console.error('Failed to send comment:', e);
      setToast({ message: 'שגיאה בשליחת ההודעה', type: 'error' });
    } finally {
      setSendingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('האם למחוק הודעה זו?')) return;
    try {
      await deleteComment(commentId);
    } catch (e) {
      console.error('Failed to delete comment:', e);
      setToast({ message: 'שגיאה במחיקת ההודעה', type: 'error' });
    }
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
    <div
      dir="rtl"
      style={{
        fontFamily: 'inherit',
        width: '100%',
        maxWidth: 'none',
        margin: '0',
        padding: '0 2.5% 24px',
        background: '#f8fafc',
      }}
    >

      <style>{`
        @keyframes tpSpin   { to { transform: rotate(360deg); } }
        @keyframes tpFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

        /* ── Base grids (mobile-first) ── */
        .tp-grid, .tp-grid-3, .tp-grid-4 {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 12px;
        }
        .tp-span-full  { grid-column: 1 / -1; }
        .tp-span-2     { grid-column: span 2; }

        /* ── 520px+: 2 columns for all grids ── */
        @media (min-width: 520px) {
          .tp-grid   { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .tp-grid-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .tp-grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        /* ── 860px+: 3-col and 4-col unlock ── */
        @media (min-width: 860px) {
          .tp-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .tp-grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }

        /* ── Tab bar ── */
        .tp-tabbar {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 0;
          margin-bottom: 16px;
          border-bottom: 1px solid #e2e8f0;
          direction: rtl;
          flex-wrap: wrap;
        }
        .tp-tab-button {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px 10px;
          border: none;
          border-bottom: 2px solid transparent;
          background: transparent;
          cursor: pointer;
          color: #64748b;
          font: inherit;
          font-size: 12.5px;
          font-weight: 500;
          white-space: nowrap;
          border-radius: 6px 6px 0 0;
          transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
        }
        .tp-tab-button:hover { color: #334155; background: rgba(0,0,0,0.025); }
        .tp-tab-button[data-active="true"] {
          color: #4f46e5;
          font-weight: 700;
          border-bottom-color: #4f46e5;
        }

        /* ── Ghost action buttons ── */
        .tp-ghost-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: none;
          background: transparent;
          cursor: pointer;
          color: #94a3b8;
          transition: background 0.14s, color 0.14s, transform 0.14s, opacity 0.14s;
          flex-shrink: 0;
        }
        .tp-ghost-btn:hover { background: #f1f5f9; color: #475569; transform: scale(1.08); }
        .tp-ghost-btn.danger:hover { background: #fee2e2; color: #ef4444; transform: scale(1.08); }
        .tp-ghost-btn:active { transform: scale(0.94); }

        /* ── Field inner card (for KPI-style boxed fields) ── */
        .tp-field-card {
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #eef2f7;
          padding: 10px 12px;
          direction: rtl;
          text-align: right;
          transition: border-color 0.14s, box-shadow 0.14s;
        }
        .tp-field-card:hover {
          border-color: #e2e8f0;
          box-shadow: 0 1px 4px rgba(15,23,42,0.06);
        }

        /* ── Management Overview ── */
        .tp-overview {
          background: white;
          border-radius: 14px;
          border: 1px solid #edf0f4;
          padding: 12px 16px;
          margin-bottom: 14px;
          box-shadow: 0 1px 5px rgba(15,23,42,0.04);
          direction: rtl;
        }
        .tp-progress-bar-track {
          height: 5px;
          background: #f1f5f9;
          border-radius: 99px;
          overflow: hidden;
          flex: 1;
        }
        .tp-progress-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.4s ease;
        }
        .tp-done-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 20px;
          background: #f0fdf4;
          border: 1px solid #d1fae5;
          color: #059669;
          font-size: 11px;
          font-weight: 500;
          white-space: nowrap;
          text-decoration: line-through;
          text-decoration-color: #6ee7b7;
        }
        /* ── Active milestone card ── */
        .tp-active-card {
          display: flex;
          flex-direction: column;
          border-radius: 9px;
          background: #ffffff;
          border: 1px solid #edf0f4;
          box-shadow: 0 1px 2px rgba(15,23,42,0.05);
          width: 118px;
          flex-shrink: 0;
          transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
          cursor: pointer;
          overflow: hidden;
        }
        .tp-active-card:hover {
          border-color: #c7d2fe;
          box-shadow: 0 3px 10px rgba(99,102,241,0.10);
          transform: translateY(-1px);
        }
        .tp-active-card.overdue { border-color: #fecaca; background: #fff9f9; }
        .tp-active-card.overdue:hover { border-color: #fca5a5; box-shadow: 0 3px 10px rgba(239,68,68,0.10); }

        /* tp-card-head / tp-card-body kept for backward compat but no longer rendered */

        /* Thin scrollbar for the בעבודה row */
        .tp-cards-scroll {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: thin;
          scrollbar-color: #e2e8f0 transparent;
        }
        .tp-cards-scroll::-webkit-scrollbar { height: 3px; }
        .tp-cards-scroll::-webkit-scrollbar-track { background: transparent; }
        .tp-cards-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }

        /* ── Milestone Modal (portal) ── */
        @keyframes tpModalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .tp-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.35);
          backdrop-filter: blur(2px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: tpFadeIn 0.15s ease both;
        }
        .tp-modal {
          background: #ffffff;
          border-radius: 18px;
          box-shadow: 0 24px 60px rgba(15,23,42,0.18);
          width: 100%;
          max-width: 480px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          direction: rtl;
          overflow: hidden;
          animation: tpModalIn 0.18s ease both;
        }
        .tp-modal-header {
          padding: 18px 20px 14px;
          border-bottom: 1px solid #f1f5f9;
          flex-shrink: 0;
        }
        .tp-modal-body {
          overflow-y: auto;
          flex: 1;
          padding: 0;
        }
        .tp-modal-action-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 20px;
          border-bottom: 1px solid #f8fafc;
          direction: rtl;
          transition: background 0.12s;
        }
        .tp-modal-action-row:last-child { border-bottom: none; }
        .tp-modal-action-row:hover { background: #f8fafc; }
        .tp-modal-empty {
          padding: 28px 20px;
          text-align: center;
          color: #94a3b8;
          font-size: 13px;
        }
        .tp-modal-footer {
          padding: 12px 20px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
          gap: 8px;
        }

        /* ── Section description ── */
        .tp-section-desc {
          font-size: 12px;
          color: #94a3b8;
          margin: 0 0 12px 0;
          direction: rtl;
          text-align: right;
          line-height: 1.6;
        }

        /* ── Outcome tab — subtle indigo pill ── */
        .tp-tab-button.outcome-tab {
          color: #6366f1;
          background: rgba(99,102,241,0.06);
        }
        .tp-tab-button.outcome-tab:hover {
          background: rgba(99,102,241,0.10);
          color: #4f46e5;
        }
        .tp-tab-button.outcome-tab[data-active="true"] {
          color: #4338ca;
          background: rgba(99,102,241,0.10);
          border-bottom-color: #4338ca;
        }

        /* ── Inline editable fields ── */
        .tp-editable {
          border-radius: 7px;
          padding: 4px 8px;
          border: 1px solid transparent;
          background: transparent;
          transition: background 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease;
          cursor: text;
        }
        .tp-editable--hovered {
          background: #f8fafc;
          border-color: #e8edf3;
        }
        .tp-editable--focused {
          background: #ffffff;
          border-color: #a5b4fc;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.09);
        }

        /* ── Milestone rows ── */
        .tp-milestone-row {
          border-radius: 10px;
          border: 1px solid #e8edf3;
          background: #ffffff;
          transition: border-color 0.14s, box-shadow 0.14s;
          overflow: hidden;
        }
        .tp-milestone-row:hover { border-color: #c7d2fe; box-shadow: 0 1px 6px rgba(99,102,241,0.07); }
        .tp-milestone-row.done { border-color: #d1fae5; background: #f9fffe; }

        /* ── Milestone header ── */
        .tp-milestone-hd {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          direction: rtl;
          cursor: default;
        }

        /* ── Action item rows ── */
        .tp-action-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px 6px 14px;
          border-top: 1px solid #f1f5f9;
          direction: rtl;
          background: #fafbfc;
          transition: background 0.12s;
        }
        .tp-action-row:hover { background: #f4f6f9; }
        .tp-action-row.done-action textarea { text-decoration: line-through; color: #94a3b8 !important; }

        /* ── Assignee avatar pill ── */
        .tp-assignee-pill {
          position: relative;
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px 4px 7px;
          border-radius: 20px;
          background: #ede9fe;
          color: #6d28d9;
          font-size: 11.5px;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          border: 1px solid transparent;
          font-family: inherit;
          transition: background 0.12s, border-color 0.12s;
          flex-shrink: 0;
          user-select: none;
        }
        .tp-assignee-pill:hover { background: #ddd6fe; border-color: #c4b5fd; }
        .tp-assignee-pill.unassigned {
          background: #f1f5f9;
          color: #94a3b8;
          border-color: transparent;
        }
        .tp-assignee-pill.unassigned:hover { background: #e2e8f0; color: #64748b; border-color: #cbd5e1; }

        /* ── Assignee dropdown — invisible full-cover overlay ── */
        .tp-assignee-select {
          appearance: none;
          -webkit-appearance: none;
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
          border: none;
          padding: 0;
          margin: 0;
          direction: rtl;
          font-family: inherit;
        }

        /* ── Action-item due-date pill ── */
        .tp-action-date-pill {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px 4px 8px;
          border-radius: 20px;
          background: #f1f5f9;
          color: #64748b;
          font-size: 11.5px;
          font-weight: 500;
          white-space: nowrap;
          cursor: pointer;
          border: 1px solid transparent;
          font-family: inherit;
          flex-shrink: 0;
          transition: background 0.12s, border-color 0.12s, color 0.12s;
          overflow: hidden;
          user-select: none;
        }
        .tp-action-date-pill:hover {
          background: #e8eeff;
          border-color: #c7d2fe;
          color: #4338ca;
        }
        .tp-action-date-pill.has-date {
          background: #ede9fe;
          color: #5b21b6;
          border-color: #ddd6fe;
        }
        .tp-action-date-pill.has-date:hover {
          background: #ddd6fe;
          border-color: #c4b5fd;
          color: #4c1d95;
        }
        /* Invisible full-cover native date input — receives clicks from pill */
        .tp-action-date-pill input[type=date] {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
          border: none;
          padding: 0;
          margin: 0;
        }

        /* ── Add action button ── */
        .tp-add-action-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 14px;
          border-top: 1px solid #f1f5f9;
          background: transparent;
          border-right: none;
          border-left: none;
          border-bottom: none;
          width: 100%;
          cursor: pointer;
          font-family: inherit;
          font-size: 11.5px;
          color: #94a3b8;
          direction: rtl;
          text-align: right;
          transition: background 0.12s, color 0.12s;
        }
        .tp-add-action-btn:hover { background: #f8fafc; color: #6366f1; }

        /* ── Expand toggle ── */
        .tp-expand-btn {
          display: flex; align-items: center; gap: 4px;
          padding: 2px 6px; border-radius: 6px;
          border: none; background: transparent;
          cursor: pointer; color: #94a3b8; font-size: 11px;
          font-family: inherit; font-weight: 600;
          transition: background 0.12s, color 0.12s;
          flex-shrink: 0;
        }
        .tp-expand-btn:hover { background: #f1f5f9; color: #475569; }

        /* ── Checkbox ── */
        .tp-check {
          appearance: none;
          -webkit-appearance: none;
          width: 16px; height: 16px;
          border-radius: 4px;
          border: 1.5px solid #cbd5e1;
          background: white;
          cursor: pointer;
          flex-shrink: 0;
          position: relative;
          transition: border-color 0.12s, background 0.12s;
        }
        .tp-check:checked {
          background: #10b981;
          border-color: #10b981;
        }
        .tp-check:checked::after {
          content: '';
          position: absolute;
          left: 3px; top: 1px;
          width: 5px; height: 8px;
          border: 2px solid white;
          border-top: none; border-left: none;
          transform: rotate(45deg);
        }
        .tp-check:hover:not(:checked) { border-color: #6366f1; }
      `}</style>

      {/* ── Compact internal header: breadcrumb + title + actions ────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 0 8px',
        direction: 'rtl',
      }}>

        {/* Back crumb + category dot */}
        <button onClick={() => navigate(-1)} style={crumbLinkStyle}>לוח</button>
        <span style={{ color: '#cbd5e1', fontSize: '12px' }}>›</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#94a3b8', flexShrink: 0 }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: task.color, display: 'inline-block' }} />
          <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.category}</span>
        </span>

        {/* Editable title — grows to fill */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <EditableArea
            value={task.title}
            onChange={v => patchLocal('title', v)}
            onBlur={saveLatest}
            placeholder="כותרת המשימה..."
            style={{ fontSize: 'clamp(16px, 2.4vw, 22px)', fontWeight: '700', color: '#0f172a', lineHeight: '1.3' }}
          />
        </div>

        {/* Saving indicator */}
        {saving && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}>
            <div style={{ width: '8px', height: '8px', border: '2px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'tpSpin 0.8s linear infinite' }} />
            שומר...
          </span>
        )}

        {/* Action buttons — far left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="מחק משימה"
            className="tp-ghost-btn danger"
            style={{ opacity: deleting ? 0.5 : 1, cursor: deleting ? 'wait' : 'pointer' }}
          >
            <Trash2 size={15} />
          </button>
          <button
            onClick={() => navigate(-1)}
            title="חזרה"
            className="tp-ghost-btn"
          >
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* ── Metadata bar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flexWrap: 'wrap',
        padding: '8px 14px',
        marginBottom: '16px',
        background: 'white',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
        direction: 'rtl',
      }}>

        {/* Status */}
        <select
          value={task.status}
          onChange={e => patch('status', e.target.value as MedicalTask['status'])}
          style={{
            background: statusCfg.bg, color: statusCfg.color,
            border: 'none', outline: 'none', borderRadius: '20px',
            padding: '3px 11px', fontSize: '12px', fontWeight: '700',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {(Object.entries(STATUS_CONFIG) as [MedicalTask['status'], typeof STATUS_CONFIG.open][]).map(([v, c]) => (
            <option key={v} value={v}>{c.label}</option>
          ))}
        </select>

        <span style={{ color: '#e2e8f0', fontSize: '12px' }}>|</span>

        {/* Priority */}
        <select
          value={task.priority}
          onChange={e => patch('priority', e.target.value as MedicalTask['priority'])}
          style={{
            background: priorityCfg.bg, color: priorityCfg.color,
            border: 'none', outline: 'none', borderRadius: '20px',
            padding: '3px 11px', fontSize: '12px', fontWeight: '700',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {(Object.entries(PRIORITY_CONFIG) as [MedicalTask['priority'], typeof PRIORITY_CONFIG.P1][]).map(([v, c]) => (
            <option key={v} value={v}>{c.label}</option>
          ))}
        </select>

        <span style={{ color: '#e2e8f0', fontSize: '12px' }}>|</span>

        {/* Lead */}
        <select
          value={task.assignedTo || ''}
          onChange={e => patch('assignedTo', e.target.value || null)}
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            fontSize: '12px', color: task.assignedTo ? '#334155' : '#94a3b8',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <option value="">אחראי: —</option>
          {profiles.map(p => (
            <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
          ))}
        </select>

        <span style={{ color: '#e2e8f0', fontSize: '12px' }}>|</span>

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

        <span style={{ color: '#e2e8f0', fontSize: '12px' }}>|</span>

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

        {/* Progress chip — pushed to far left */}
        <span style={{
          marginInlineStart: 'auto',
          fontSize: '12px', fontWeight: '700',
          color: task.progress === 100 ? '#10b981' : task.progress >= 50 ? '#6366f1' : '#f59e0b',
          background: task.progress === 100 ? '#d1fae5' : task.progress >= 50 ? '#ede9fe' : '#fef3c7',
          padding: '3px 10px', borderRadius: '20px',
        }}>
          {task.progress}%
        </span>
      </div>

      {/* ── Management Overview ─────────────────────────────────────────────── */}
      {task.milestones.length > 0 && (() => {
        const done = task.milestones.filter(m => m.done);
        const active = task.milestones.filter(m => !m.done);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const pct = task.progress;
        const barColor = pct === 100 ? '#10b981' : pct >= 60 ? '#6366f1' : pct >= 30 ? '#f59e0b' : '#f87171';

        return (
          <div className="tp-overview">

            {/* Progress row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: done.length > 0 || active.length > 0 ? '10px' : '0' }}>
              <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.4px', textTransform: 'uppercase', flexShrink: 0 }}>
                התקדמות
              </span>
              <div className="tp-progress-bar-track">
                <div className="tp-progress-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
              </div>
              <span style={{ fontSize: '11.5px', fontWeight: '700', color: barColor, flexShrink: 0, minWidth: '30px', textAlign: 'left' }}>
                {pct}%
              </span>
            </div>

            {/* Completed badges */}
            {done.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: active.length > 0 ? '8px' : '0' }}>
                <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.4px', textTransform: 'uppercase', flexShrink: 0 }}>
                  הושלמו:
                </span>
                {done.map((m, i) => (
                  <span key={i} className="tp-done-badge">
                    <CheckCircle2 size={10} />
                    {m.text || `אבן דרך ${i + 1}`}
                  </span>
                ))}
              </div>
            )}

            {/* Active milestone cards */}
            {active.length > 0 && (
              <div className="tp-cards-scroll">
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase', flexShrink: 0, paddingTop: '6px' }}>
                  בעבודה:
                </span>
                {active.map((m, i) => {
                  const mIdx = task.milestones.indexOf(m);
                  const assignee = m.assignedTo ? profiles.find(p => p.id === m.assignedTo) : null;
                  const assigneeName = assignee ? (assignee.full_name || assignee.email || '').split(' ')[0] : null;
                  const due = m.dueDate ? new Date(m.dueDate) : null;
                  const isOverdue = due ? due < today : false;
                  const dueFmt = due ? due.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }) : null;
                  return (
                    <div
                      key={mIdx}
                      className={`tp-active-card${isOverdue ? ' overdue' : ''}`}
                      onClick={() => setExpandedOverviewCard(mIdx)}
                    >
                      <div style={{ padding: '7px 9px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {/* Name */}
                        <span style={{
                          fontSize: '11px', fontWeight: '500', color: '#334155',
                          lineHeight: '1.3',
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        } as React.CSSProperties}>
                          {m.text || `אבן דרך ${i + 1}`}
                        </span>
                        {/* Date · Assignee */}
                        {(dueFmt || assigneeName) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', lineHeight: '1.2' }}>
                            {dueFmt && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <CalendarDays size={9} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                                <span style={{ fontSize: '10px', color: isOverdue ? '#ef4444' : '#475569' }}>{dueFmt}</span>
                              </span>
                            )}
                            {assigneeName && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <UserCircle2 size={9} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                                <span style={{ fontSize: '10px', color: '#475569' }}>{assigneeName}</span>
                              </span>
                            )}
                          </div>
                        )}
                        {/* Status */}
                        <span style={{ fontSize: '10px', color: isOverdue ? '#ef4444' : '#94a3b8', fontWeight: isOverdue ? '600' : '400', marginTop: '1px' }}>
                          {isOverdue ? 'בפיגור' : 'בזמן'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        );
      })()}

      {/* ── Milestone modal (portal to body) ────────────────────────────────── */}
      {expandedOverviewCard !== null && (() => {
        const m = task.milestones[expandedOverviewCard];
        if (!m) return null;
        const mIdx = expandedOverviewCard;
        const actions = m.actionItems || [];
        const actionsDone = actions.filter(a => a.done).length;
        const due = m.dueDate ? new Date(m.dueDate) : null;
        const today2 = new Date(); today2.setHours(0,0,0,0);
        const isOverdue = due ? due < today2 : false;
        const dueFmt = due ? due.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
        const assignee = m.assignedTo ? profiles.find(p => p.id === m.assignedTo) : null;
        const assigneeName = assignee ? (assignee.full_name || assignee.email) : null;

        return createPortal(
          <div
            className="tp-modal-backdrop"
            onClick={() => setExpandedOverviewCard(null)}
          >
            <div className="tp-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">

              {/* ── Modal header ── */}
              <div className="tp-modal-header">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '700', color: '#0f172a', lineHeight: '1.3' }}>
                      {m.text || 'אבן דרך'}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {/* Status badge */}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: isOverdue ? '700' : '500', color: isOverdue ? '#dc2626' : '#10b981' }}>
                        {isOverdue ? <AlertOctagon size={13} /> : <CheckCircle2 size={13} />}
                        {isOverdue ? 'בפיגור' : 'בזמן'}
                      </span>
                      {/* Due date */}
                      {dueFmt && (
                        <span style={{ fontSize: '12px', color: isOverdue ? '#ef4444' : '#64748b' }}>
                          יעד: {dueFmt}
                        </span>
                      )}
                      {/* Assignee */}
                      {assigneeName && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#6366f1' }}>
                          <UserCircle2 size={13} />
                          {assigneeName}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Close button */}
                  <button
                    onClick={() => setExpandedOverviewCard(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px', borderRadius: '6px', flexShrink: 0, lineHeight: 1 }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8'; }}
                    aria-label="סגור"
                  >
                    <span style={{ fontSize: '18px', lineHeight: 1 }}>×</span>
                  </button>
                </div>

                {/* Action items overall bar */}
                {actions.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '4px', borderRadius: '99px', background: '#f1f5f9', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '99px', transition: 'width 0.35s', background: actionsDone === actions.length ? '#10b981' : '#6366f1', width: `${Math.round((actionsDone / actions.length) * 100)}%` }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: actionsDone === actions.length ? '#10b981' : '#6366f1', flexShrink: 0 }}>
                      {actionsDone} / {actions.length} הושלמו
                    </span>
                  </div>
                )}
              </div>

              {/* ── Modal body: action items list ── */}
              <div className="tp-modal-body">
                {actions.length === 0 ? (
                  <div className="tp-modal-empty">
                    <ListChecks size={28} style={{ color: '#cbd5e1', margin: '0 auto 10px', display: 'block' }} />
                    אין תתי-משימות לאבן דרך זו
                  </div>
                ) : (
                  actions.map((a, aIdx) => {
                    const participantProfiles = task.participants.length > 0
                      ? profiles.filter(p => task.participants.includes(p.id))
                      : profiles;
                    const ap = a.assignedTo ? profiles.find(p => p.id === a.assignedTo) : null;
                    const apName = ap ? (ap.full_name || ap.email || '').split(' ')[0] : null;
                    return (
                      <div key={aIdx} className="tp-modal-action-row">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          className="tp-check"
                          checked={a.done}
                          onChange={e => patchActionItem(mIdx, aIdx, 'done', e.target.checked)}
                        />
                        {/* Text */}
                        <span style={{ flex: 1, fontSize: '13.5px', lineHeight: '1.45', color: a.done ? '#94a3b8' : '#1e293b', textDecoration: a.done ? 'line-through' : 'none' }}>
                          {a.text || 'פעולה ללא שם'}
                        </span>
                        {/* Due date pill */}
                        <label
                          className={`tp-action-date-pill${a.dueDate ? ' has-date' : ''}`}
                          title="תאריך יעד"
                          onClick={e => {
                            const inp = e.currentTarget.querySelector('input[type=date]') as HTMLInputElement | null;
                            try { inp?.showPicker?.(); } catch { inp?.focus(); }
                          }}
                        >
                          <CalendarDays size={13} />
                          <span>
                            {a.dueDate
                              ? new Date(a.dueDate + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
                              : 'תאריך יעד'}
                          </span>
                          <input
                            type="date"
                            value={a.dueDate || ''}
                            onChange={e => patchActionItem(mIdx, aIdx, 'dueDate', e.target.value)}
                          />
                        </label>
                        {/* Assignee dropdown */}
                        <label
                          className={`tp-assignee-pill${!a.assignedTo ? ' unassigned' : ''}`}
                          title="שייך לפעולה"
                        >
                          <UserCircle2 size={13} />
                          <span>{apName || 'שייך'}</span>
                          <select
                            className="tp-assignee-select"
                            value={a.assignedTo || ''}
                            onChange={e => patchActionItem(mIdx, aIdx, 'assignedTo', e.target.value || '')}
                          >
                            <option value="">ללא שיוך</option>
                            {participantProfiles.map(p => (
                              <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ── Modal footer ── */}
              <div className="tp-modal-footer">
                <button
                  onClick={() => { switchTab('timeline'); setExpandedMilestones(s => new Set([...s, mIdx])); setExpandedOverviewCard(null); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontSize: '12px', fontWeight: '600', color: '#6366f1', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.12s, border-color 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#a5b4fc'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  <ListChecks size={13} />
                  פתח בציר הזמן
                </button>
                <button
                  onClick={() => setExpandedOverviewCard(null)}
                  style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: '#f1f5f9', fontSize: '12px', fontWeight: '600', color: '#475569', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                >
                  סגור
                </button>
              </div>

            </div>
          </div>,
          document.body
        );
      })()}

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <nav className="tp-tabbar">
        {NAV_ITEMS.map(({ id, Icon, label }) => {
          const active = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => switchTab(id)}
              className={`tp-tab-button${id === 'outcome' ? ' outcome-tab' : ''}`}
              data-active={active}
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
          <p className="tp-section-desc">בסיס הפרויקט: מהי הבעיה, למי הפתרון מיועד, ומה מצפים להשיג?</p>
          <div className="tp-grid-3">
            <Field label="תיאור כללי" className="tp-span-full">
              <EditableArea value={task.description} onChange={v => patchLocal('description', v)} onBlur={saveLatest} placeholder="תאר בקצרה את הפרויקט — מה מתבצע, בידי מי, ובאיזה הקשר?" minRows={2} />
            </Field>
            <Field label="בעיה / הזדמנות" className="tp-span-full">
              <EditableArea value={task.problemStatement} onChange={v => patchLocal('problemStatement', v)} onBlur={saveLatest} placeholder="מהו הכשל, הבזבוז, העיכוב או הסיכון שמניע את הפרויקט?" minRows={2} />
            </Field>
            <Field label="מטרה" className="tp-span-2">
              <EditableArea value={task.goal} onChange={v => patchLocal('goal', v)} onBlur={saveLatest} placeholder="מה ישתנה בסיום? הגדר תוצאה מדידה — למשל: צמצום זמן המתנה ב-30%." minRows={2} />
            </Field>
            <Field label="קהל יעד">
              <EditableArea value={task.targetAudience ?? ''} onChange={v => patchLocal('targetAudience', v)} onBlur={saveLatest} placeholder="מחלקות, תפקידים, מטופלים..." minRows={2} />
            </Field>
            <Field label="היקף (Scope)">
              <EditableArea value={task.scope ?? ''} onChange={v => patchLocal('scope', v)} onBlur={saveLatest} placeholder="מה נכלל בפרויקט?" minRows={2} />
            </Field>
            <Field label="מחוץ להיקף">
              <EditableArea value={task.outOfScope ?? ''} onChange={v => patchLocal('outOfScope', v)} onBlur={saveLatest} placeholder="מה לא נכלל?" minRows={2} />
            </Field>
            <Field label="השפעה רצויה">
              <EditableArea value={task.desiredImpact ?? ''} onChange={v => patchLocal('desiredImpact', v)} onBlur={saveLatest} placeholder="יעילות, איכות, חוויית מטופל, חיסכון..." minRows={2} />
            </Field>
            <Field label="הגדרת הצלחה" className="tp-span-full">
              <EditableArea value={task.successDefinition ?? ''} onChange={v => patchLocal('successDefinition', v)} onBlur={saveLatest} placeholder="כיצד נדע שהפרויקט הצליח? קריטריונים ברורים." minRows={2} />
            </Field>
          </div>
        </Section>}

        {/* CURRENT STATE */}
        {activeSection === 'current-state' && <Section icon={Activity} title="מצב נוכחי — נקודת האפס">
          <p className="tp-section-desc">תיעוד שיטתי של המצב לפני ההתערבות. נתונים אלו ישמשו למדידת שיפור.</p>
          <div className="tp-grid-3">
            <Field label="קו בסיס" className="tp-span-full">
              <EditableArea value={task.currentState} onChange={v => patchLocal('currentState', v)} onBlur={saveLatest} placeholder={'מהו קו הבסיס התפעולי?\n• זמן המתנה ממוצע: ___ דקות\n• תפוסה: ___\n• שגיאות לחודש: ___'} minRows={3} />
            </Field>
            <Field label="נקודות כאב" className="tp-span-2">
              <EditableArea value={task.painPoints ?? ''} onChange={v => patchLocal('painPoints', v)} onBlur={saveLatest} placeholder="מה לא עובד היום? תסכולים, עיכובים, שגיאות..." minRows={2} />
            </Field>
            <Field label="אילוצים">
              <EditableArea value={task.constraints ?? ''} onChange={v => patchLocal('constraints', v)} onBlur={saveLatest} placeholder="תקציב, כוח אדם, רגולציה, תרבות..." minRows={2} />
            </Field>
            <Field label="תהליכים / מערכות קיימות" className="tp-span-2">
              <EditableArea value={task.existingProcess ?? ''} onChange={v => patchLocal('existingProcess', v)} onBlur={saveLatest} placeholder="כיצד נעשה היום? כלים ונהלים פעילים." minRows={2} />
            </Field>
            <Field label="ראיות / נתונים">
              <EditableArea value={task.evidence ?? ''} onChange={v => patchLocal('evidence', v)} onBlur={saveLatest} placeholder="דוחות, דשבורדים, סקרים..." minRows={2} />
            </Field>
          </div>
        </Section>}

        {/* SPEC */}
        {activeSection === 'spec' && <Section icon={FileText} title="אפיון">
          <p className="tp-section-desc">איך יראה הפתרון? מה יסופק, מה מוסכם מראש, ואילו החלטות נדרשות.</p>
          <div className="tp-grid-3">
            <Field label="שם התהליך">
              <EditableArea value={task.processName} onChange={v => patchLocal('processName', v)} onBlur={saveLatest} placeholder="שם התהליך..." />
            </Field>
            <Field label="מחלקה">
              <EditableArea value={task.department} onChange={v => patchLocal('department', v)} onBlur={saveLatest} placeholder="שם המחלקה..." />
            </Field>
            <Field label="החלטות נדרשות">
              <EditableArea value={task.requiredDecisions ?? ''} onChange={v => patchLocal('requiredDecisions', v)} onBlur={saveLatest} placeholder="מה צריך אישור לפני ההמשך? ידי מי?" minRows={1} />
            </Field>
            <Field label="פתרון מוצע" className="tp-span-full">
              <EditableArea value={task.proposedSolution ?? ''} onChange={v => patchLocal('proposedSolution', v)} onBlur={saveLatest} placeholder="מה יבוצע? טכנולוגיה, תהליך חדש, שינוי נוהל..." minRows={3} />
            </Field>
            <Field label="תוצרים (Deliverables)" className="tp-span-2">
              <EditableArea value={task.deliverables ?? ''} onChange={v => patchLocal('deliverables', v)} onBlur={saveLatest} placeholder="מה יימסר? — מערכת, דוח, הדרכה, נוהל..." minRows={2} />
            </Field>
            <Field label="הנחות">
              <EditableArea value={task.assumptions ?? ''} onChange={v => patchLocal('assumptions', v)} onBlur={saveLatest} placeholder="תקציב, שיתוף פעולה, זמינות..." minRows={2} />
            </Field>
            <Field label="קריטריוני קבלה" className="tp-span-full">
              <EditableArea value={task.acceptanceCriteria ?? ''} onChange={v => patchLocal('acceptanceCriteria', v)} onBlur={saveLatest} placeholder="מה צריך להתקיים? — איכות, ביצועים, שביעות רצון..." minRows={2} />
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
              {task.milestones.map((m, mIdx) => {
                const expanded = expandedMilestones.has(mIdx);
                const actions = m.actionItems || [];
                const actionsDone = actions.filter(a => a.done).length;
                const assignedProfile = m.assignedTo ? profiles.find(p => p.id === m.assignedTo) : null;

                return (
                  <div key={mIdx} className={`tp-milestone-row${m.done ? ' done' : ''}`}>

                    {/* ── Milestone header row ── */}
                    <div className="tp-milestone-hd">

                      {/* Toggle done */}
                      <button
                        onClick={() => toggleMilestone(mIdx)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                        title={m.done ? 'סמן כלא הושלם' : 'סמן כהושלם'}
                      >
                        {m.done
                          ? <CheckCircle2 size={18} style={{ color: '#10b981' }} />
                          : <Circle size={18} style={{ color: '#cbd5e1' }} />
                        }
                      </button>

                      {/* Title — inline editable */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <EditableArea
                          value={m.text}
                          onChange={v => patchMilestone(mIdx, 'text', v)}
                          onBlur={saveLatest}
                          placeholder="שם אבן הדרך..."
                          style={{
                            fontSize: '13.5px',
                            fontWeight: m.done ? '400' : '500',
                            color: m.done ? '#6ee7b7' : '#1e293b',
                            textDecoration: m.done ? 'line-through' : 'none',
                          }}
                        />
                      </div>

                      {/* Due date */}
                      <input
                        type="date"
                        value={m.dueDate || ''}
                        onChange={e => patchMilestone(mIdx, 'dueDate', e.target.value || undefined)}
                        title="תאריך יעד"
                        style={{
                          background: 'transparent', border: 'none', outline: 'none',
                          fontSize: '11px', color: (() => {
                            if (!m.dueDate || m.done) return '#94a3b8';
                            const d = new Date(m.dueDate); d.setHours(0,0,0,0);
                            const t = new Date(); t.setHours(0,0,0,0);
                            return d < t ? '#ef4444' : '#64748b';
                          })(),
                          fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0,
                        }}
                      />

                      {/* Action items counter badge */}
                      {actions.length > 0 && (
                        <span style={{
                          fontSize: '10.5px', fontWeight: '600', flexShrink: 0,
                          color: actionsDone === actions.length ? '#10b981' : '#6366f1',
                          background: actionsDone === actions.length ? '#d1fae5' : '#ede9fe',
                          padding: '1px 7px', borderRadius: '10px',
                        }}>
                          {actionsDone}/{actions.length}
                        </span>
                      )}

                      {/* Assignee pill */}
                      <div style={{ flexShrink: 0, position: 'relative' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          className={`tp-assignee-pill${!m.assignedTo ? ' unassigned' : ''}`}
                          title="שייך אחראי"
                        >
                          <UserCircle2 size={13} />
                          <span>
                            {assignedProfile
                              ? (assignedProfile.full_name || assignedProfile.email || '').split(' ')[0]
                              : 'שייך'}
                          </span>
                          <select
                            className="tp-assignee-select"
                            value={m.assignedTo || ''}
                            onChange={e => patchMilestone(mIdx, 'assignedTo', e.target.value || undefined)}
                          >
                            <option value="">ללא אחראי</option>
                            {profiles.map(p => (
                              <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      {/* Expand / collapse */}
                      <button
                        className="tp-expand-btn"
                        onClick={() => setExpandedMilestones(s => {
                          const n = new Set(s);
                          n.has(mIdx) ? n.delete(mIdx) : n.add(mIdx);
                          return n;
                        })}
                        title={expanded ? 'כווץ' : 'הצג פעולות'}
                      >
                        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        {actions.length === 0 ? 'פעולות' : ''}
                      </button>

                    </div>{/* end milestone-hd */}

                    {/* ── Action items (visible when expanded) ── */}
                    {expanded && (
                      <>
                        {actions.map((a, aIdx) => {
                          const participantProfiles = task.participants.length > 0
                            ? profiles.filter(p => task.participants.includes(p.id))
                            : profiles;
                          const aProfile = a.assignedTo ? profiles.find(p => p.id === a.assignedTo) : null;
                          return (
                            <div key={aIdx} className={`tp-action-row${a.done ? ' done-action' : ''}`}>

                              {/* Indent line */}
                              <div style={{ width: '1px', height: '100%', background: '#e2e8f0', flexShrink: 0, alignSelf: 'stretch', marginTop: '2px', marginBottom: '2px' }} />

                              {/* Checkbox */}
                              <input
                                type="checkbox"
                                className="tp-check"
                                checked={a.done}
                                onChange={e => patchActionItem(mIdx, aIdx, 'done', e.target.checked)}
                              />

                              {/* Text */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <EditableArea
                                  value={a.text}
                                  onChange={v => patchActionItem(mIdx, aIdx, 'text', v)}
                                  onBlur={saveLatest}
                                  placeholder="תיאור הפעולה..."
                                  style={{
                                    fontSize: '13px',
                                    color: a.done ? '#94a3b8' : '#334155',
                                    textDecoration: a.done ? 'line-through' : 'none',
                                  }}
                                />
                              </div>

                              {/* Assignee */}
                              <label
                                className={`tp-assignee-pill${!a.assignedTo ? ' unassigned' : ''}`}
                                title="שייך לפעולה"
                              >
                                <UserCircle2 size={13} />
                                <span>
                                  {aProfile
                                    ? (aProfile.full_name || aProfile.email || '').split(' ')[0]
                                    : 'שייך'}
                                </span>
                                <select
                                  className="tp-assignee-select"
                                  value={a.assignedTo || ''}
                                  onChange={e => patchActionItem(mIdx, aIdx, 'assignedTo', e.target.value || '')}
                                >
                                  <option value="">ללא שיוך</option>
                                  {participantProfiles.map(p => (
                                    <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                                  ))}
                                </select>
                              </label>

                              {/* Due date pill — overlaid invisible input triggers native picker on any click */}
                              <label
                                className={`tp-action-date-pill${a.dueDate ? ' has-date' : ''}`}
                                title="תאריך יעד"
                                onClick={e => {
                                  const inp = e.currentTarget.querySelector('input[type=date]') as HTMLInputElement | null;
                                  try { inp?.showPicker?.(); } catch { inp?.focus(); }
                                }}
                              >
                                <CalendarDays size={13} />
                                <span>
                                  {a.dueDate
                                    ? new Date(a.dueDate + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
                                    : 'תאריך יעד'}
                                </span>
                                <input
                                  type="date"
                                  value={a.dueDate || ''}
                                  onChange={e => patchActionItem(mIdx, aIdx, 'dueDate', e.target.value)}
                                />
                              </label>

                              {/* Delete action item */}
                              <button
                                onClick={() => deleteActionItem(mIdx, aIdx)}
                                title="הסר"
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  color: '#cbd5e1', padding: '2px', borderRadius: '4px',
                                  fontSize: '13px', lineHeight: 1, flexShrink: 0,
                                  transition: 'color 0.12s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#cbd5e1'; }}
                              >
                                ×
                              </button>

                            </div>
                          );
                        })}

                        {/* Add action item */}
                        <button
                          className="tp-add-action-btn"
                          onClick={() => addActionItem(mIdx)}
                        >
                          <Plus size={12} />
                          הוסף פעולה
                        </button>
                      </>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </Section>}

        {/* KPI */}
        {activeSection === 'kpi' && <Section icon={BarChart2} title="מדדי הצלחה — KPI">
          <p className="tp-section-desc">הגדר מדדים מדידים שיוכיחו הצלחה — ספציפיים, בני השגה, ומבוססי נתונים.</p>
          <div className="tp-grid-4">
            {([
              { key: 'kpiName',            label: 'שם המדד',             placeholder: 'זמן המתנה / שיעור זיהומים / עמידה ב-SLA' },
              { key: 'baseline',           label: 'בסיס — נקודת פתיחה', placeholder: 'ערך נוכחי לפני ההתערבות...' },
              { key: 'target',             label: 'יעד (Target)',          placeholder: 'ערך יעד בתום הפרויקט...' },
              { key: 'measurementCadence', label: 'תדירות מדידה',         placeholder: 'שבועי / חודשי / רבעוני' },
              { key: 'sourceOfTruth',      label: 'מקור נתונים',         placeholder: 'מערכת, דוח, סקר...' },
              { key: 'metricOwner',        label: 'אחראי על המדד',       placeholder: 'מי מוודא שהמדד נאסף ונותח?' },
            ] as const).map(({ key, label, placeholder }) => (
              <div key={key} className="tp-field-card">
                <div style={fieldLabelStyle}>{label}</div>
                <EditableArea
                  value={task[key] || ''}
                  onChange={v => patchLocal(key, v)}
                  onBlur={saveLatest}
                  placeholder={placeholder}
                  style={{ fontSize: '13px', fontWeight: '500', color: '#1e293b' }}
                />
              </div>
            ))}
          </div>
        </Section>}

        {/* PARTICIPANTS */}
        {activeSection === 'participants' && <Section icon={Users} title="משתתפים">
          <div className="tp-grid tp-grid-3">

            {/* Lead selector */}
            <Field label="אחראי">
              <select
                value={task.assignedTo || ''}
                onChange={e => patch('assignedTo', e.target.value || null)}
                style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '10px 14px', fontSize: '13px', color: '#1e293b', fontFamily: 'inherit', cursor: 'pointer', outline: 'none', direction: 'rtl' }}
              >
                <option value="">לא שויך</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
              </select>
            </Field>

            {/* Current participants as pills with X */}
            <Field label="משתתפים" className="tp-span-full">
              {(task.participants || []).length === 0 ? (
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>אין משתתפים עדיין</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', direction: 'rtl' }}>
                  {(task.participants || []).map(pid => {
                    const profile = profiles.find(p => p.id === pid);
                    if (!profile) return null;
                    return (
                      <span
                        key={pid}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '4px 10px 4px 6px', borderRadius: '20px',
                          background: '#ede9fe', border: '1px solid #c7d2fe',
                          color: '#6d28d9', fontSize: '12px', fontWeight: '500',
                        }}
                      >
                        {profile.full_name || profile.email}
                        <button
                          onClick={() => patch('participants', task.participants.filter(id => id !== pid))}
                          title="הסר"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '14px', height: '14px', borderRadius: '50%',
                            background: 'rgba(109,40,217,0.15)', border: 'none',
                            cursor: 'pointer', color: '#6d28d9', fontSize: '11px',
                            fontWeight: '700', padding: 0, lineHeight: 1, fontFamily: 'inherit',
                          }}
                        >×</button>
                      </span>
                    );
                  })}
                </div>
              )}
            </Field>

            {/* Add participant — searchable */}
            <Field label="הוסף משתתף" className="tp-span-full">
              <div style={{ position: 'relative', direction: 'rtl' }}>
              <input
                type="text"
                value={participantSearch}
                onChange={e => setParticipantSearch(e.target.value)}
                placeholder="חיפוש לפי שם או אימייל..."
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px 14px', borderRadius: '14px',
                  border: '1px solid #e2e8f0', outline: 'none',
                  fontSize: '13px', color: '#1e293b',
                  fontFamily: 'inherit', background: '#f8fafc',
                  direction: 'rtl',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#a5b4fc'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
              />
              {participantSearch.trim().length > 0 && (() => {
                const q = participantSearch.trim().toLowerCase();
                const opts = profiles.filter(p =>
                  !(task.participants || []).includes(p.id) &&
                  (p.full_name?.toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q))
                );
                return (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', right: 0, left: 0, zIndex: 20,
                    background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)', overflow: 'hidden',
                  }}>
                    {opts.length === 0 ? (
                      <div style={{ padding: '10px 16px', fontSize: '13px', color: '#94a3b8' }}>אין תוצאות</div>
                    ) : (
                      opts.slice(0, 6).map(p => (
                        <button
                          key={p.id}
                          onMouseDown={e => {
                            e.preventDefault();
                            patch('participants', [...(task.participants || []), p.id]);
                            setParticipantSearch('');
                          }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center',
                            padding: '10px 16px', background: 'none', border: 'none',
                            cursor: 'pointer', fontSize: '13px', color: '#334155',
                            fontFamily: 'inherit', textAlign: 'right', direction: 'rtl',
                            borderBottom: '1px solid #f1f5f9',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                        >
                          {p.full_name || p.email}
                        </button>
                      ))
                    )}
                  </div>
                );
              })()}
              </div>
            </Field>

          </div>
        </Section>}

        {/* RISKS */}
        {activeSection === 'risks' && <Section icon={AlertTriangle} title="סיכונים ותלויות">
          <p className="tp-section-desc">מה עלול לעכב את הצלחת הפרויקט? תיעוד מוקדם מאפשר הכנה ומיתוג.</p>
          <div className="tp-grid-3">
            <Field label="סיכונים / חסמים" className="tp-span-2">
              <EditableArea value={task.risksBlockers} onChange={v => patchLocal('risksBlockers', v)} onBlur={saveLatest} placeholder="התנגדות צוות, מגבלות רגולטוריות, תקציב, מחסור כוח אדם..." minRows={2} />
            </Field>
            <Field label="נתיב הסלמה">
              <EditableArea value={task.escalationPath ?? ''} onChange={v => patchLocal('escalationPath', v)} onBlur={saveLatest} placeholder="למי פונים אם הסיכון מתממש?" minRows={2} />
            </Field>
            <Field label="תלויות" className="tp-span-2">
              <EditableArea value={task.dependencies} onChange={v => patchLocal('dependencies', v)} onBlur={saveLatest} placeholder="אגפים, מערכות IT, ספקים, אישורים..." minRows={2} />
            </Field>
            <Field label="קישורים">
              <EditableArea value={task.links} onChange={v => patchLocal('links', v)} onBlur={saveLatest} placeholder="https://..." style={{ wordBreak: 'break-all' }} />
            </Field>
            <Field label="תוכנית מיתוג" className="tp-span-full">
              <EditableArea value={task.mitigationPlan ?? ''} onChange={v => patchLocal('mitigationPlan', v)} onBlur={saveLatest} placeholder="צעדים קונקרטיים להפחתת כל סיכון או מחסום..." minRows={2} />
            </Field>
            {task.stakeholders.length > 0 && (
              <Field label="בעלי עניין">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', direction: 'rtl', marginTop: '4px' }}>
                  {task.stakeholders.map((s, i) => (
                    <span key={i} style={{ padding: '3px 10px', borderRadius: '20px', background: '#ede9fe', color: '#6d28d9', fontSize: '12px', fontWeight: '500' }}>{s}</span>
                  ))}
                </div>
              </Field>
            )}
          </div>
        </Section>}

        {/* DISCUSSION — דיון */}
        {activeSection === 'discussion' && <Section
          icon={MessageSquare}
          title="דיון"
          badge={comments.length > 0 ? (
            <span style={{
              marginRight: '6px', fontSize: '11px', fontWeight: '600',
              color: '#6366f1', background: '#ede9fe',
              padding: '2px 8px', borderRadius: '10px',
            }}>
              {comments.length}
            </span>
          ) : null}
        >
          <p className="tp-section-desc">שיח פתוח בין המשתתפים — עדכונים, שאלות, והחלטות בזמן אמת.</p>

          {/* Comments list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
            {commentsLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <div style={{ width: '20px', height: '20px', border: '2px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'tpSpin 0.8s linear infinite' }} />
              </div>
            )}
            {!commentsLoading && comments.length === 0 && (
              <div style={{
                padding: '32px 20px', textAlign: 'center',
                background: '#f8fafc', borderRadius: '12px',
                border: '1px dashed #cbd5e1',
              }}>
                <MessageSquare size={32} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                  אין הודעות עדיין. התחל דיון...
                </p>
              </div>
            )}
            {comments.map(comment => {
              const isOwn = user?.id === comment.author_id;
              const authorName = comment.author?.full_name || comment.author?.email || 'משתמש לא ידוע';
              const date = new Date(comment.created_at);
              const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
              const dateStr = date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });

              return (
                <div
                  key={comment.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '14px 16px',
                    background: isOwn ? '#ede9fe' : '#f8fafc',
                    borderRadius: '12px',
                    border: `1px solid ${isOwn ? '#c7d2fe' : '#e2e8f0'}`,
                    direction: 'rtl',
                    textAlign: 'right',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: isOwn ? '#6d28d9' : '#334155' }}>
                      {authorName}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {dateStr} • {timeStr}
                      </span>
                      {isOwn && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          title="מחק"
                          style={{
                            background: 'none', border: 'none',
                            cursor: 'pointer', padding: '2px 6px',
                            fontSize: '11px', color: '#94a3b8',
                            fontFamily: 'inherit', fontWeight: '600',
                            borderRadius: '4px', transition: 'background 0.12s, color 0.12s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8'; }}
                        >
                          מחק
                        </button>
                      )}
                    </div>
                  </div>
                  <p style={{
                    margin: 0, fontSize: '14px', lineHeight: '1.65',
                    color: '#334155', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {comment.content}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Composer */}
          {user ? (
            <div style={{
              background: '#f8fafc', borderRadius: '18px',
              border: '1px solid #e2e8f0', padding: '18px',
              direction: 'rtl',
            }}>
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="כתוב הודעה..."
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: 'none', outline: 'none', resize: 'none',
                  background: 'white', borderRadius: '8px',
                  padding: '10px 12px', fontSize: '14px',
                  fontFamily: 'inherit', color: '#334155',
                  direction: 'rtl', textAlign: 'right',
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <button
                  onClick={handleSendComment}
                  disabled={!commentText.trim() || sendingComment}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 18px', borderRadius: '8px',
                    border: 'none', cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                    background: commentText.trim() ? '#6366f1' : '#e2e8f0',
                    color: 'white', fontSize: '13px', fontWeight: '600',
                    fontFamily: 'inherit', transition: 'background 0.15s',
                    opacity: sendingComment ? 0.6 : 1,
                  }}
                  onMouseEnter={e => { if (commentText.trim()) e.currentTarget.style.background = '#4f46e5'; }}
                  onMouseLeave={e => { if (commentText.trim()) e.currentTarget.style.background = '#6366f1'; }}
                >
                  <Send size={14} />
                  {sendingComment ? 'שולח...' : 'שלח'}
                </button>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Ctrl+Enter לשליחה
                </span>
              </div>
            </div>
          ) : (
            <div style={{
              padding: '20px', textAlign: 'center',
              background: '#fef3c7', borderRadius: '10px',
              border: '1px solid #fcd34d',
            }}>
              <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>
                יש להתחבר כדי להשתתף בדיון
              </p>
            </div>
          )}
        </Section>}

        {/* OUTCOME — תוצר סופי */}
        {activeSection === 'outcome' && <Section
          icon={CheckCircle2}
          title="תוצר סופי"
          iconColor="#6366f1"
          style={{
            borderColor: '#c7d2fe',
            borderWidth: '1.5px',
            boxShadow: '0 4px 20px rgba(79,70,229,0.08)',
            background: 'linear-gradient(160deg, #fefeff 0%, #f5f3ff 100%)',
          }}
        >
          <p className="tp-section-desc">תיעוד מה שנמסר בפועל, כיצד הפרויקט יצא לדרך, והתוצאות מול היעדים.</p>
          <div className="tp-grid-3">
            <Field label="תוצר מסירה" className="tp-span-2">
              <EditableArea value={task.finalDeliverable ?? ''} onChange={v => patchLocal('finalDeliverable', v)} onBlur={saveLatest} placeholder="מה הושלם ונמסר? — מערכת, נוהל, הדרכה, אב-טיפוס..." minRows={2} />
            </Field>
            <Field label="הערות Rollout">
              <EditableArea value={task.rolloutNotes ?? ''} onChange={v => patchLocal('rolloutNotes', v)} onBlur={saveLatest} placeholder="כיצד התבצע השילוב? תקלות? תגובות?" minRows={2} />
            </Field>
            <Field label="תוצאות מדודות" className="tp-span-2">
              <EditableArea value={task.measuredResult ?? ''} onChange={v => patchLocal('measuredResult', v)} onBlur={saveLatest} placeholder="KPI בפועל אחרי היישום — השווה לנקודת הבסיס." minRows={2} />
            </Field>
            <Field label="לקחים">
              <EditableArea value={task.lessonsLearned ?? ''} onChange={v => patchLocal('lessonsLearned', v)} onBlur={saveLatest} placeholder="מה למדנו? מה אחרת בפעם הבאה?" minRows={2} />
            </Field>
          </div>
        </Section>}

      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
