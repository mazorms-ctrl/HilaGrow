import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, BookOpen, Activity, FileText, ListChecks,
  BarChart2, AlertTriangle, Users, CheckCircle2, Circle, AlertCircle, Trash2, MessageSquare, Send,
  Plus, ChevronDown, ChevronUp, UserCircle2, AlertOctagon, CalendarDays, DatabaseBackup,
} from 'lucide-react';
import { useTaskById, useProfiles, updateTask, deleteTask, type MedicalTask, useTaskComments, createComment, deleteComment } from '@/lib/supabase-hooks';
import { useState, useRef, useEffect, useCallback } from 'react';
import { exportSingleTask, exportSingleTaskAsPdf } from '@/services/backupService';
import { sendTaskInvite } from '@/services/inviteService';
import { createPortal } from 'react-dom';
import { Toast } from '../Toast';
import { useAuth } from '@/contexts/AuthContext';

// ── Config ─────────────────────────────────────────────────────────────────────


const SCROLL_SECTIONS = [
  { id: 'section-strategy',       label: 'אסטרטגיה ומדדים', color: '#3b82f6', Icon: BarChart2     },
  { id: 'section-implementation', label: 'ביצוע וסיכונים',   color: '#f59e0b', Icon: FileText      },
  { id: 'section-team',           label: 'צוות ומשתתפים',    color: '#10b981', Icon: Users         },
  { id: 'section-completion',     label: 'סיום ותקשורת',     color: '#8b5cf6', Icon: MessageSquare },
] as const;

// ── Shared style objects ───────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #edf0f4',
  padding: '14px 16px',
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
      ref.current.style.height = Math.max(ref.current.scrollHeight, minRows * 19) + 'px';
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
          fontSize: '13px',
          lineHeight: '1.5',
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
    <section className="tp-section" style={{ ...cardStyle, ...style }}>
      <div className="tp-section-head" style={sectionHeadStyle}>
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
  const { user, profile } = useAuth();
  const { task: fetchedTask, projectId, loading, refetch } = useTaskById(taskId);
  const { profiles } = useProfiles();
  const { comments, loading: commentsLoading } = useTaskComments(taskId);

  const [localTask, setLocalTask] = useState<MedicalTask | null>(null);
  const [saving, setSaving]                 = useState(false);
  const [deleting, setDeleting]             = useState(false);
  const [backupMenuOpen, setBackupMenuOpen] = useState(false);
  const [backingUp, setBackingUp]           = useState(false);
  const backupBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!backupMenuOpen) return;
    function onOutside(e: MouseEvent) {
      if (backupBtnRef.current && !backupBtnRef.current.contains(e.target as Node))
        setBackupMenuOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [backupMenuOpen]);

  async function handleJsonBackup() {
    if (!task || backingUp) return;
    setBackupMenuOpen(false);
    setBackingUp(true);
    try { await exportSingleTask(task.id, user?.id ?? ''); }
    catch (err) { console.error('[Task JSON Backup]', err); }
    finally { setBackingUp(false); }
  }

  async function handlePdfBackup() {
    if (!task || backingUp) return;
    setBackupMenuOpen(false);
    setBackingUp(true);
    try { await exportSingleTaskAsPdf(task.id, user?.id ?? ''); }
    catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Task PDF Backup]', err);
      alert(`הפקת דוח נכשלה:\n${msg}`);
    }
    finally { setBackingUp(false); }
  }
  async function handleSendInvite() {
    if (!task || !inviteEmail.trim() || inviteSending) return;
    setInviteSending(true);
    setInviteStatus('idle');
    setInviteError(null);
    try {
      await sendTaskInvite({
        taskId:        task.id,
        taskTitle:     task.title,
        email:         inviteEmail.trim(),
        invitedByName: profile?.full_name || 'ד"ר שי שבו',
      });
      setInviteStatus('success');
      setInviteEmail('');
      setToast({ message: `ההזמנה נשלחה בהצלחה אל ${inviteEmail.trim()}`, type: 'success' });
    } catch (err) {
      setInviteStatus('error');
      setInviteError(err instanceof Error ? err.message : 'שגיאה בשליחת ההזמנה');
    } finally {
      setInviteSending(false);
    }
  }

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeSection, setActiveSection] = useState<string>('section-strategy');
  const [participantSearch, setParticipantSearch] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<number>>(new Set());
  const [expandedOverviewCard, setExpandedOverviewCard] = useState<number | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [newMilestoneText, setNewMilestoneText] = useState('');

  // Scroll-section refs for sticky side nav
  const sectionStrategyRef       = useRef<HTMLDivElement>(null);
  const sectionImplementationRef = useRef<HTMLDivElement>(null);
  const sectionTeamRef           = useRef<HTMLDivElement>(null);
  const sectionCompletionRef     = useRef<HTMLDivElement>(null);

  // Always-current ref so onBlur handlers don't use stale closure values
  const taskRef = useRef<MedicalTask | null>(null);
  useEffect(() => { taskRef.current = localTask ?? fetchedTask ?? null; }, [localTask, fetchedTask]);

  // Seed local state once the remote task arrives
  useEffect(() => {
    if (fetchedTask && !localTask) setLocalTask(fetchedTask);
  }, [fetchedTask]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── One-time migration: currentState/goal → first metrics row ───────────────
  const kpiMigrationRanRef = useRef(false);
  useEffect(() => {
    if (kpiMigrationRanRef.current || !fetchedTask) return;
    if ((fetchedTask.kpis?.length ?? 0) > 0) return;
    if (!fetchedTask.currentState && !fetchedTask.goal) return;
    kpiMigrationRanRef.current = true;
    const firstRow = { name: '', baseline: fetchedTask.currentState || '', baselineVal: '', target: fetchedTask.goal || '', targetVal: '', cadence: '', source: '', owner: '' };
    const updated = { ...fetchedTask, kpis: [firstRow] };
    setLocalTask(updated);
    save(updated);
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

  // ── Scroll-spy: highlight the active section as the user scrolls ─────────────
  useEffect(() => {
    const entries = [
      { id: 'section-strategy',       ref: sectionStrategyRef       },
      { id: 'section-implementation', ref: sectionImplementationRef },
      { id: 'section-team',           ref: sectionTeamRef           },
      { id: 'section-completion',     ref: sectionCompletionRef     },
    ];
    const valid = entries.filter(e => e.ref.current);
    if (valid.length === 0) return;
    const obs = new IntersectionObserver(
      changes => {
        for (const ch of changes) {
          if (ch.isIntersecting) {
            const found = valid.find(e => e.ref.current === ch.target);
            if (found) setActiveSection(found.id);
          }
        }
      },
      { rootMargin: '-10% 0px -65% 0px', threshold: 0 }
    );
    valid.forEach(e => obs.observe(e.ref.current!));
    return () => obs.disconnect();
  }, [localTask?.id]);

  // ── Scroll to section ─────────────────────────────────────────────────────────
  const scrollToSection = useCallback((id: string) => {
    const refMap: Record<string, React.RefObject<HTMLDivElement>> = {
      'section-strategy':       sectionStrategyRef,
      'section-implementation': sectionImplementationRef,
      'section-team':           sectionTeamRef,
      'section-completion':     sectionCompletionRef,
    };
    refMap[id]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
  }, []);

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

  // ── Delete milestone ──────────────────────────────────────────────────────
  const deleteMilestone = useCallback((mIdx: number) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את אבן הדרך ואת כל המשימות שבתוכה?')) return;
    setLocalTask(prev => {
      if (!prev) return prev;
      const milestones = prev.milestones.filter((_, i) => i !== mIdx);
      const updated = { ...prev, milestones };
      save(updated);
      setExpandedMilestones(s => {
        const n = new Set<number>();
        s.forEach(i => { if (i < mIdx) n.add(i); else if (i > mIdx) n.add(i - 1); });
        return n;
      });
      return updated;
    });
  }, [save]);

  // ── Add new milestone ─────────────────────────────────────────────────────
  const addNewMilestone = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setNewMilestoneText('');
    setLocalTask(prev => {
      if (!prev) return prev;
      const milestones = [...prev.milestones, { text: trimmed, done: false }];
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

  // ── KPI list helpers ────────────────────────────────────────────────────────
  const addKpi = useCallback(() => {
    setLocalTask(prev => {
      if (!prev) return prev;
      const updated = { ...prev, kpis: [...(prev.kpis || []), { name: '', baseline: '', baselineVal: '', target: '', targetVal: '', cadence: '', source: '', owner: '' }] };
      save(updated);
      return updated;
    });
  }, [save]);

  const patchKpi = useCallback((idx: number, key: keyof NonNullable<MedicalTask['kpis']>[number], value: string) => {
    setLocalTask(prev => {
      if (!prev) return prev;
      const kpis = (prev.kpis || []).map((k, i) => i === idx ? { ...k, [key]: value } : k);
      const updated = { ...prev, kpis };
      return updated;               // text fields save on blur
    });
  }, []);

  const deleteKpi = useCallback((idx: number) => {
    setLocalTask(prev => {
      if (!prev) return prev;
      const kpis = (prev.kpis || []).filter((_, i) => i !== idx);
      const updated = { ...prev, kpis };
      save(updated);
      return updated;
    });
  }, [save]);

  // ── Barrier list helpers ─────────────────────────────────────────────────────
  const barrierMigrationRanRef = useRef(false);
  useEffect(() => {
    if (barrierMigrationRanRef.current || !fetchedTask) return;
    if ((fetchedTask.barriers?.length ?? 0) > 0) return;
    if (!fetchedTask.risksBlockers && !fetchedTask.mitigationPlan) return;
    barrierMigrationRanRef.current = true;
    const firstRow = { risk: fetchedTask.risksBlockers || '', mitigation: fetchedTask.mitigationPlan || '' };
    const updated = { ...fetchedTask, barriers: [firstRow] };
    setLocalTask(updated);
    save(updated);
  }, [fetchedTask]); // eslint-disable-line react-hooks/exhaustive-deps

  const sectionCollapseInitRef = useRef(false);
  useEffect(() => {
    if (sectionCollapseInitRef.current || !fetchedTask) return;
    sectionCollapseInitRef.current = true;
    const c = new Set<string>();
    if (fetchedTask.proposedSolution || fetchedTask.processName || fetchedTask.deliverables || (fetchedTask.barriers?.length ?? 0) > 0)
      c.add('implementation');
    if ((fetchedTask.milestones?.length ?? 0) > 0)
      c.add('workplan');
    if (fetchedTask.finalDeliverable || fetchedTask.rolloutNotes || fetchedTask.measuredResult || fetchedTask.lessonsLearned)
      c.add('completion');
    setCollapsedSections(c);
  }, [fetchedTask]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSection = useCallback((id: string) => {
    setCollapsedSections(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const addBarrier = useCallback(() => {
    setLocalTask(prev => {
      if (!prev) return prev;
      const updated = { ...prev, barriers: [...(prev.barriers || []), { risk: '', mitigation: '' }] };
      save(updated);
      return updated;
    });
  }, [save]);

  const patchBarrier = useCallback((idx: number, key: 'risk' | 'mitigation', value: string) => {
    setLocalTask(prev => {
      if (!prev) return prev;
      const barriers = (prev.barriers || []).map((b, i) => i === idx ? { ...b, [key]: value } : b);
      return { ...prev, barriers };
    });
  }, []);

  const deleteBarrier = useCallback((idx: number) => {
    setLocalTask(prev => {
      if (!prev) return prev;
      const barriers = (prev.barriers || []).filter((_, i) => i !== idx);
      const updated = { ...prev, barriers };
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

  const overdue = task.dueDate ? new Date(task.dueDate) < new Date() : false;

  // Auto stage badge — replaces the manual status dropdown.
  // Priority order: Done > Overdue > Active > Idea
  const stageBadge = (() => {
    if (task.progress === 100)              return { label: 'הושלם',  bg: '#d1fae5', color: '#059669' };
    if (overdue)                            return { label: 'באיחור', bg: '#fee2e2', color: '#dc2626' };
    if (task.progress > 0 || task.dueDate) return { label: 'בביצוע', bg: '#dbeafe', color: '#2563eb' };
    return                                        { label: 'רעיון',   bg: '#f1f5f9', color: '#64748b' };
  })();

  const assignedProfile = task.assignedTo ? profiles.find(p => p.id === task.assignedTo) : null;
  const assignedName = assignedProfile ? (assignedProfile.full_name || assignedProfile.email || '') : null;
  const milestonesDone = task.milestones.filter(m => m.done).length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      dir="rtl"
      className="tp-page"
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

        /* ── Base grids (mobile-first: single column on all phones) ── */
        .tp-grid, .tp-grid-3, .tp-grid-4 {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 8px;
        }
        /* On mobile: span-2 must not overflow a 1-column grid */
        .tp-span-full  { grid-column: 1 / -1; }
        .tp-span-2     { grid-column: 1 / -1; }

        /* ── 768px+: 2 columns for all grids ── */
        @media (min-width: 768px) {
          .tp-grid   { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .tp-grid-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .tp-grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .tp-span-2 { grid-column: span 2; }
        }
        /* ── 860px+: 3-col and 4-col unlock ── */
        @media (min-width: 860px) {
          .tp-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .tp-grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }

        /* ── Scroll layout: content + sticky side nav ── */
        .tp-scroll-layout {
          display: grid;
          grid-template-columns: 1fr 168px;
          gap: 0 20px;
          align-items: start;
        }
        .tp-scroll-content { min-width: 0; }

        /* ── Sticky side nav ── */
        .tp-side-nav {
          position: sticky;
          top: 16px;
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e8edf3;
          padding: 8px 6px;
          box-shadow: 0 2px 8px rgba(15,23,42,0.06);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .tp-nav-item {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 8px 10px;
          border-radius: 9px;
          border: none;
          background: transparent;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 500;
          color: #64748b;
          direction: rtl;
          text-align: right;
          transition: background 0.14s, color 0.14s;
          white-space: nowrap;
        }
        .tp-nav-item:hover { background: #f1f5f9; color: #334155; }
        .tp-nav-item[data-active="true"] {
          background: var(--nav-bg, #eff6ff);
          color: var(--nav-color, #2563eb);
          font-weight: 700;
        }

        /* ── Section header bands ── */
        .tp-section-band {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 10px 10px 0 0;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.1px;
          direction: rtl;
          margin-bottom: 10px;
          cursor: pointer;
          user-select: none;
        }
        .tp-band-blue   { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .tp-band-teal   { background: #f0fdfa; color: #0f766e; border: 1px solid #99f6e4; }
        .tp-band-amber  { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
        .tp-band-green  { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
        .tp-band-indigo { background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; }
        .tp-band-purple { background: #faf5ff; color: #6d28d9; border: 1px solid #ddd6fe; }

        /* ── KPI compare grid: Baseline | → | Target ── */
        .tp-kpi-compare {
          display: grid;
          grid-template-columns: 1fr 28px 1fr;
          gap: 0;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 14px;
        }
        .tp-kpi-col-base  { background: #fef9f0; padding: 12px 14px; border-left: 1px solid #e2e8f0; }
        .tp-kpi-col-arrow { display: flex; align-items: center; justify-content: center; background: #f8fafc; color: #94a3b8; font-size: 16px; }
        .tp-kpi-col-tgt   { background: #f0fdf4; padding: 12px 14px; }
        .tp-kpi-col-label { font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 6px; direction: rtl; }
        .tp-kpi-col-base  .tp-kpi-col-label { color: #92400e; }
        .tp-kpi-col-tgt   .tp-kpi-col-label { color: #166534; }

        /* ── Barriers & Mitigation two-column table ── */
        .tp-barriers-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .tp-barriers-col { padding: 12px 14px; direction: rtl; }
        .tp-barriers-col:first-child { border-left: 1px solid #e2e8f0; background: #fff9f0; }
        .tp-barriers-col:last-child  { background: #f0fdf4; }
        .tp-barriers-col-header {
          font-size: 10.5px; font-weight: 700; letter-spacing: 0.5px;
          text-transform: uppercase; margin-bottom: 8px;
          padding-bottom: 6px; border-bottom: 1px solid;
          direction: rtl;
        }
        .tp-barriers-col:first-child .tp-barriers-col-header { color: #b45309; border-color: #fde68a; }
        .tp-barriers-col:last-child  .tp-barriers-col-header { color: #166534; border-color: #bbf7d0; }
        @media (max-width: 640px) {
          .tp-barriers-grid { grid-template-columns: 1fr; }
          .tp-barriers-col:first-child { border-left: none; border-bottom: 1px solid #e2e8f0; }
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
          padding: 6px 10px;
          direction: rtl;
          text-align: right;
          transition: border-color 0.14s, box-shadow 0.14s;
        }
        .tp-field-card:hover {
          border-color: #e2e8f0;
          box-shadow: 0 1px 4px rgba(15,23,42,0.06);
        }

        /* ── Dynamic KPI rows ── */
        .tp-kpi-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          background: #f8fafc;
          border: 1px solid #edf0f4;
          border-radius: 12px;
          direction: rtl;
          transition: border-color 0.14s, box-shadow 0.14s;
        }
        .tp-kpi-row:hover {
          border-color: #e2e8f0;
          box-shadow: 0 1px 6px rgba(15,23,42,0.06);
        }
        .tp-kpi-num {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ede9fe;
          color: #6d28d9;
          font-size: 10.5px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 4px;
        }
        .tp-kpi-fields {
          flex: 1;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 8px 12px;
        }
        @media (max-width: 560px) {
          .tp-kpi-fields { grid-template-columns: 1fr 1fr; }
        }
        .tp-kpi-field { direction: rtl; text-align: right; }
        .tp-kpi-name { grid-column: 1 / -1; }
        .tp-kpi-delete {
          flex-shrink: 0;
          background: none;
          border: none;
          cursor: pointer;
          color: #cbd5e1;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          transition: color 0.12s, background 0.12s;
          margin-top: 2px;
        }
        .tp-kpi-delete:hover { color: #ef4444; background: #fee2e2; }
        .tp-kpi-add-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 7px 14px;
          border-radius: 10px;
          border: 1.5px dashed #c7d2fe;
          background: transparent;
          color: #6366f1;
          font-size: 12.5px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          direction: rtl;
          transition: background 0.12s, border-color 0.12s;
        }
        .tp-kpi-add-btn:hover { background: #f5f3ff; border-color: #a5b4fc; }

        /* ── Unified Metrics Table (compact) ── */
        /* ── Unified Metrics Table (compact) ── */
        .tp-mtable { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-top: 8px; background: white; }
        .tp-mtable-head, .tp-mtable-row { display: grid; grid-template-columns: 1.4fr 1fr 24px 1fr 28px; direction: rtl; align-items: stretch; }
        .tp-mtable-head { background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
        .tp-mtable-row { border-bottom: 1px solid #f0f2f5; transition: background 0.12s; background: white; min-height: 42px; }
        .tp-mtable-row:last-child { border-bottom: none; }
        .tp-mtable-row:hover { background: #fbfbff; }
        .tp-mtable-hcell { padding: 6px 10px; font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px; text-transform: uppercase; text-align: right; display: flex; align-items: center; }
        .tp-mtable-cell { padding: 5px 9px; min-width: 0; overflow: hidden; display: flex; align-items: center; }
        .tp-mtable-arrow { display: flex; align-items: center; justify-content: center; color: #d1d5db; font-size: 14px; }
        .tp-mtable-del { display: flex; align-items: center; justify-content: center; }
        @media (max-width: 600px) { .tp-mtable-head { display: none; } .tp-mtable-row { grid-template-columns: 1fr 24px 1fr auto; } }

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
          padding: 2px 8px;
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

        /* ── Milestone delete button ── */
        .tp-milestone-delete-btn {
          display: flex; align-items: center; justify-content: center;
          padding: 3px; border-radius: 5px;
          border: none; background: transparent;
          cursor: pointer; color: #cbd5e1;
          transition: color 0.12s, background 0.12s;
          flex-shrink: 0;
        }
        .tp-milestone-delete-btn:hover { color: #ef4444; background: #fee2e2; }

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

        /* ── Mobile: collapse side nav to top pill row ── */
        @media (max-width: 767px) {
          .tp-scroll-layout {
            grid-template-columns: 1fr;
          }
          .tp-side-nav {
            display: flex;
            flex-direction: row;
            overflow-x: auto;
            position: relative;
            top: 0;
            border-radius: 10px;
            padding: 6px;
            gap: 4px;
            scrollbar-width: none;
            margin-bottom: 12px;
          }
          .tp-side-nav::-webkit-scrollbar { display: none; }
          .tp-nav-item { white-space: nowrap; font-size: 11.5px; padding: 6px 10px; }
        }

        /* ── Mobile tweaks — density-first ── */
        @media (max-width: 767px) {
          /* Outer page: tight horizontal padding, extra bottom for nav bar */
          .tp-page { padding: 0 12px 100px 12px !important; }

          /* Section cards: compact padding */
          .tp-section { padding: 12px 14px !important; }

          /* Tight gaps between section cards */
          .tp-grid, .tp-grid-3, .tp-grid-4 { gap: 10px; }

          /* Section headers: smaller, tighter, blue tint */
          .tp-section-head {
            font-size: 13px !important;
            font-weight: 700 !important;
            color: #1e3a5f !important;
            margin-bottom: 8px !important;
            padding-bottom: 6px !important;
          }

          /* Editable boxes: tighter internal padding */
          .tp-editable { padding: 2px 6px !important; }

          /* Body text: smaller font, readable line-height */
          .tp-section textarea { font-size: 13px !important; line-height: 1.6 !important; }

          /* Section description text */
          .tp-section-desc { font-size: 11.5px !important; margin-bottom: 8px !important; }

          /* Lists: proper indentation */
          .tp-section ul, .tp-section ol {
            padding-inline-start: 18px;
            margin: 4px 0;
          }
          .tp-section li { line-height: 1.6; margin-bottom: 3px; }
        }
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

          {/* ── Backup dropdown ── */}
          <div ref={backupBtnRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { if (!backingUp) setBackupMenuOpen(v => !v); }}
              disabled={backingUp}
              title="גיבוי משימה"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                height: '32px', padding: '0 10px', borderRadius: '8px',
                background: backupMenuOpen ? '#fef3c7' : 'transparent',
                border: '1px solid',
                borderColor: backupMenuOpen ? '#fcd34d' : '#e2e8f0',
                cursor: backingUp ? 'wait' : 'pointer',
                color: backingUp ? '#94a3b8' : '#d97706',
                fontSize: '12px', fontWeight: 500,
                fontFamily: 'inherit',
                transition: 'background 0.12s, border-color 0.12s, color 0.12s',
                opacity: backingUp ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!backingUp && !backupMenuOpen) { e.currentTarget.style.background = '#fef3c7'; e.currentTarget.style.borderColor = '#fcd34d'; } }}
              onMouseLeave={e => { if (!backupMenuOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#e2e8f0'; } }}
            >
              <DatabaseBackup size={14} />
              <span>{backingUp ? 'מגבה...' : 'גיבוי משימה'}</span>
              <ChevronDown size={11} style={{ opacity: 0.55, transform: backupMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>

            {backupMenuOpen && (
              <div style={{
                position: 'absolute', top: '36px', left: 0,
                background: '#fff', border: '1px solid #e2e8f0',
                borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                zIndex: 300, overflow: 'hidden', minWidth: '175px',
              }}>
                <button
                  onClick={handlePdfBackup}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
                    padding: '10px 14px', background: 'none', border: 'none',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer', fontSize: '12px', color: '#1e293b',
                    fontFamily: 'inherit', direction: 'rtl', textAlign: 'right',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fff7ed'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                  <FileText size={13} style={{ color: '#dc2626', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 500 }}>גיבוי PDF</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>דוח מפורט להדפסה</div>
                  </div>
                </button>
                <button
                  onClick={handleJsonBackup}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
                    padding: '10px 14px', background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: '12px', color: '#1e293b',
                    fontFamily: 'inherit', direction: 'rtl', textAlign: 'right',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                  <DatabaseBackup size={13} style={{ color: '#d97706', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 500 }}>גיבוי JSON</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>נתונים גולמיים לשחזור</div>
                  </div>
                </button>
              </div>
            )}
          </div>

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
        gap: '28px',
        flexWrap: 'wrap',
        padding: '10px 18px',
        marginBottom: '16px',
        background: 'white',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
        direction: 'rtl',
      }}>

        {/* ── Status (auto badge) ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
            סטטוס:
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            background: stageBadge.bg, color: stageBadge.color,
            borderRadius: '20px', padding: '4px 12px',
            fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap',
          }}>
            {stageBadge.label}
          </span>
        </div>

        <span style={{ width: '1px', height: '18px', background: '#e2e8f0', flexShrink: 0 }} />

        {/* ── Owner (אחראי משימה) ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
            אחראי משימה:
          </span>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              background: task.assignedTo ? '#f1f5f9' : 'transparent',
              borderRadius: '20px', padding: '4px 12px',
              fontSize: '12.5px', fontWeight: task.assignedTo ? '600' : '400',
              color: task.assignedTo ? '#1e293b' : '#94a3b8',
              whiteSpace: 'nowrap', pointerEvents: 'none',
            }}>
              {assignedName || 'לא שויך'}
            </span>
            <select
              value={task.assignedTo || ''}
              onChange={e => patch('assignedTo', e.target.value || null)}
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                opacity: 0, cursor: 'pointer', border: 'none',
                fontFamily: 'inherit', direction: 'rtl',
              }}
            >
              <option value="">לא שויך</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
              ))}
            </select>
          </div>
        </div>

        <span style={{ width: '1px', height: '18px', background: '#e2e8f0', flexShrink: 0 }} />

        {/* ── Due date (תאריך יעד) ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
            תאריך יעד:
          </span>
          <label
            style={{
              position: 'relative', display: 'inline-flex', alignItems: 'center',
              padding: '4px 12px', borderRadius: '20px', cursor: 'pointer',
              background: task.dueDate ? (overdue ? '#fee2e2' : '#f1f5f9') : 'transparent',
              fontSize: '12.5px', fontWeight: task.dueDate ? '600' : '400',
              color: overdue ? '#dc2626' : (task.dueDate ? '#1e293b' : '#94a3b8'),
              overflow: 'hidden', whiteSpace: 'nowrap',
            }}
            onClick={e => {
              const inp = e.currentTarget.querySelector('input[type=date]') as HTMLInputElement | null;
              try { inp?.showPicker?.(); } catch { inp?.focus(); }
            }}
          >
            <span style={{ pointerEvents: 'none' }}>
              {task.dueDate
                ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'בחר תאריך'}
            </span>
            <input
              type="date"
              value={task.dueDate || ''}
              onChange={e => patch('dueDate', e.target.value)}
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                opacity: 0, cursor: 'pointer', border: 'none', padding: 0,
              }}
            />
          </label>
        </div>

        {/* ── Manual progress (shown only when no milestones) ── */}
        {task.milestones.length === 0 && (
          <>
            <span style={{ width: '1px', height: '18px', background: '#e2e8f0', flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
                התקדמות:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  min={0} max={100}
                  value={task.progress}
                  onChange={e => {
                    const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                    patch('progress', v);
                  }}
                  style={{
                    width: '52px', padding: '3px 8px',
                    border: '1px solid #e2e8f0', borderRadius: '20px',
                    fontSize: '12.5px', fontWeight: '600', color: '#1e293b',
                    textAlign: 'center', background: '#f8fafc',
                    fontFamily: 'inherit', outline: 'none',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>%</span>
              </div>
            </div>
          </>
        )}

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
                      : [];
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
                  onClick={() => { scrollToSection('section-implementation'); setExpandedMilestones(s => new Set([...s, mIdx])); setExpandedOverviewCard(null); }}
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

      {/* ── Scroll layout: content + sticky side nav ── */}
      <div className="tp-scroll-layout">
        <div className="tp-scroll-content">

          {/* ══ SECTION 1: STRATEGY & METRICS (Blue) ══ */}
          <div id="section-strategy" ref={sectionStrategyRef} style={{ scrollMarginTop: '16px', marginBottom: '28px' }}>
            <div className="tp-section-band tp-band-blue" onClick={() => toggleSection('strategy')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart2 size={15} /> אסטרטגיה ומדדים</span>
              {collapsedSections.has('strategy') ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </div>
            <section className="tp-section" style={{ ...cardStyle, display: collapsedSections.has('strategy') ? 'none' : undefined }}>
              <div className="tp-grid-3">
                <Field label="תיאור כללי" className="tp-span-full">
                  <EditableArea value={task.description} onChange={v => patchLocal('description', v)} onBlur={saveLatest} placeholder="תאר בקצרה את הפרויקט — מה מתבצע, בידי מי, ובאיזה הקשר?" minRows={1} />
                </Field>
                <Field label="בעיה / הזדמנות" className="tp-span-full">
                  <EditableArea value={task.problemStatement} onChange={v => patchLocal('problemStatement', v)} onBlur={saveLatest} placeholder="מהו הכשל, הבזבוז, העיכוב או הסיכון שמניע את הפרויקט?" minRows={1} />
                </Field>
                <Field label="קהל יעד">
                  <EditableArea value={task.targetAudience ?? ''} onChange={v => patchLocal('targetAudience', v)} onBlur={saveLatest} placeholder="מחלקות, תפקידים, מטופלים..." minRows={1} />
                </Field>
              </div>

              {/* ── Unified Metrics Table (compact) ── */}
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '10px', direction: 'rtl' }}>מדדים ויעדים</div>

                {(task.kpis || []).length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', marginBottom: '10px' }}>
                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>לא הוגדרו מדדים עדיין — לחץ &quot;+ הוסף מדד&quot; כדי להתחיל.</p>
                  </div>
                ) : (
                  <div className="tp-mtable">
                    {/* Header */}
                    <div className="tp-mtable-head">
                      <div className="tp-mtable-hcell">שם המדד</div>
                      <div className="tp-mtable-hcell">מצב בסיס</div>
                      <div className="tp-mtable-hcell" />
                      <div className="tp-mtable-hcell">יעד</div>
                      <div className="tp-mtable-hcell" />
                    </div>

                    {/* Data rows */}
                    {(task.kpis || []).map((kpi, idx) => (
                      <div key={idx} className="tp-mtable-row">
                        <div className="tp-mtable-cell">
                          <EditableArea value={kpi.name} onChange={v => patchKpi(idx, 'name', v)} onBlur={saveLatest} placeholder="שם המדד" style={{ fontSize: '13px', fontWeight: '600' }} />
                        </div>
                        <div className="tp-mtable-cell">
                          <EditableArea value={kpi.baseline} onChange={v => patchKpi(idx, 'baseline', v)} onBlur={saveLatest} placeholder="מצב נוכחי..." style={{ fontSize: '12px' }} />
                        </div>
                        <div className="tp-mtable-arrow">←</div>
                        <div className="tp-mtable-cell">
                          <EditableArea value={kpi.target} onChange={v => patchKpi(idx, 'target', v)} onBlur={saveLatest} placeholder="מצב רצוי..." style={{ fontSize: '12px' }} />
                        </div>
                        <div className="tp-mtable-del">
                          <button className="tp-kpi-delete" onClick={() => deleteKpi(idx)} title="מחק מדד"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button className="tp-kpi-add-btn" onClick={addKpi} style={{ marginTop: '8px' }}><Plus size={13} /> הוסף מדד</button>
              </div>
            </section>
          </div>

          {/* ══ SECTION 2a: TEAM & PARTICIPANTS (Green) ══ */}
          <div id="section-team" ref={sectionTeamRef} style={{ scrollMarginTop: '16px', marginBottom: '16px' }}>
            <div className="tp-section-band tp-band-green" onClick={() => toggleSection('team')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={15} /> צוות ומשתתפים</span>
              {collapsedSections.has('team') ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </div>
            <section className="tp-section" style={{ ...cardStyle, display: collapsedSections.has('team') ? 'none' : undefined }}>
              <div className="tp-grid tp-grid-3">
                <Field label="אחראי">
                  <select value={task.assignedTo || ''} onChange={e => patch('assignedTo', e.target.value || null)} style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '10px 14px', fontSize: '13px', color: '#1e293b', fontFamily: 'inherit', cursor: 'pointer', outline: 'none', direction: 'rtl' }}>
                    <option value="">לא שויך</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                  </select>
                </Field>
                <Field label="משתתפים" className="tp-span-full">
                  {(task.participants || []).length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>אין משתתפים עדיין</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', direction: 'rtl' }}>
                      {(task.participants || []).map(pid => {
                        const profile = profiles.find(p => p.id === pid);
                        if (!profile) return null;
                        return (
                          <span key={pid} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px 4px 6px', borderRadius: '20px', background: '#ede9fe', border: '1px solid #c7d2fe', color: '#6d28d9', fontSize: '12px', fontWeight: '500' }}>
                            {profile.full_name || profile.email}
                            <button onClick={() => patch('participants', task.participants.filter(id => id !== pid))} title="הסר" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(109,40,217,0.15)', border: 'none', cursor: 'pointer', color: '#6d28d9', fontSize: '11px', fontWeight: '700', padding: 0, lineHeight: 1, fontFamily: 'inherit' }}>×</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </Field>
                <Field label="הוסף משתתף" className="tp-span-full">
                  <div style={{ position: 'relative', direction: 'rtl' }}>
                    <input type="text" value={participantSearch} onChange={e => setParticipantSearch(e.target.value)} placeholder="חיפוש לפי שם או אימייל..." style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '14px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px', color: '#1e293b', fontFamily: 'inherit', background: '#f8fafc', direction: 'rtl' }} onFocus={e => { e.currentTarget.style.borderColor = '#a5b4fc'; }} onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; }} />
                    {participantSearch.trim().length > 0 && (() => {
                      const q = participantSearch.trim().toLowerCase();
                      const opts = profiles.filter(p => !(task.participants || []).includes(p.id) && (p.full_name?.toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q)));
                      return (
                        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, left: 0, zIndex: 20, background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                          {opts.length === 0 ? (
                            <div style={{ padding: '10px 16px', fontSize: '13px', color: '#94a3b8' }}>אין תוצאות</div>
                          ) : (
                            opts.slice(0, 6).map(p => (
                              <button key={p.id} onMouseDown={e => { e.preventDefault(); patch('participants', [...(task.participants || []), p.id]); setParticipantSearch(''); }} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#334155', fontFamily: 'inherit', textAlign: 'right', direction: 'rtl', borderBottom: '1px solid #f1f5f9' }} onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }} onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
                                {p.full_name || p.email}
                              </button>
                            ))
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </Field>
                <Field label="הזמן לפי אימייל" className="tp-span-full">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', direction: 'rtl' }}>
                      <input type="email" dir="ltr" value={inviteEmail} onChange={e => { setInviteEmail(e.target.value); setInviteStatus('idle'); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSendInvite(); } }} placeholder="כתובת אימייל להזמנה..." style={{ flex: 1, boxSizing: 'border-box', padding: '10px 14px', borderRadius: '14px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px', color: '#1e293b', fontFamily: 'inherit', background: '#f8fafc', direction: 'ltr', textAlign: 'left' }} onFocus={e => { e.currentTarget.style.borderColor = '#a5b4fc'; }} onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; }} />
                      <button onClick={handleSendInvite} disabled={inviteSending || !inviteEmail.trim() || !profile} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '14px', background: inviteSending || !inviteEmail.trim() || !profile ? '#e2e8f0' : 'linear-gradient(135deg,#2563eb,#6366f1)', color: inviteSending || !inviteEmail.trim() || !profile ? '#94a3b8' : '#fff', border: 'none', cursor: inviteSending || !inviteEmail.trim() ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0, transition: 'background 0.15s' }}>
                        {inviteSending ? <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'tpSpin 0.7s linear infinite' }} /> : <Send size={14} />}
                        שלח הזמנה
                      </button>
                    </div>
                    {inviteStatus === 'success' && <div style={{ fontSize: '12px', color: '#059669', background: '#d1fae5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '7px 12px' }}>✅ ההזמנה נשלחה בהצלחה! המוזמן יקבל אימייל עם קישור להרשמה.</div>}
                    {inviteStatus === 'error' && <div style={{ fontSize: '12px', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '7px 12px' }}>❌ {inviteError || 'שגיאה בשליחת ההזמנה — נסה שנית.'}</div>}
                    {inviteStatus === 'idle' && <div style={{ fontSize: '11px', color: '#94a3b8' }}>המוזמן יקבל אימייל עם קישור להרשמה ל-GROW+ ויתווסף אוטומטית למשימה זו.</div>}
                  </div>
                </Field>
              </div>
            </section>
          </div>

          {/* ══ SECTION 2: BLUEPRINT — Characterization & Barriers (Teal) ══ */}
          <div id="section-implementation" ref={sectionImplementationRef} style={{ scrollMarginTop: '16px', marginBottom: '16px' }}>
            <div className="tp-section-band tp-band-teal" onClick={() => toggleSection('implementation')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={15} /> אפיון התהליך והחסמים</span>
              {collapsedSections.has('implementation') ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </div>
            <section className="tp-section" style={{ ...cardStyle, display: collapsedSections.has('implementation') ? 'none' : undefined }}>

              {/* ── Project Characterization ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                <Field label="הפתרון המתוכנן / התהליך האידיאלי" className="tp-span-full">
                  <EditableArea value={task.proposedSolution ?? ''} onChange={v => patchLocal('proposedSolution', v)} onBlur={saveLatest} placeholder="מה מתבצע ואיך זה עובד באופן אידיאלי — טכנולוגיה, תהליך, שינוי נוהל..." minRows={1} />
                </Field>
                <div className="tp-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <Field label="גישה ומתודולוגיה">
                    <EditableArea value={task.processName} onChange={v => patchLocal('processName', v)} onBlur={saveLatest} placeholder="גישה טכנית, מסגרת עבודה, שיטת הטמעה..." minRows={1} />
                  </Field>
                  <Field label="תוצרים מצופים">
                    <EditableArea value={task.deliverables ?? ''} onChange={v => patchLocal('deliverables', v)} onBlur={saveLatest} placeholder="מה יימסר בסוף — מערכת, דוח, נוהל, הדרכה..." minRows={1} />
                  </Field>
                </div>
              </div>

              {/* Barriers & Mitigation — dynamic table */}
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#0f766e', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px', direction: 'rtl' }}>חסמים ותוכנית מיתון</div>

              {(task.barriers || []).length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', marginBottom: '8px' }}>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>לא הוגדרו חסמים — לחץ &quot;+ הוסף חסם&quot; כדי להתחיל.</p>
                </div>
              ) : (
                <div className="tp-mtable" style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 28px', direction: 'rtl', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <div className="tp-mtable-hcell">חסם / סיכון</div>
                    <div className="tp-mtable-hcell">פתרון / תוכנית מיתון</div>
                    <div className="tp-mtable-hcell" />
                  </div>
                  {(task.barriers || []).map((b, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 28px', direction: 'rtl', alignItems: 'stretch', borderBottom: idx < (task.barriers || []).length - 1 ? '1px solid #f0f2f5' : 'none', background: 'white', minHeight: '38px' }}>
                      <div className="tp-mtable-cell">
                        <EditableArea value={b.risk} onChange={v => patchBarrier(idx, 'risk', v)} onBlur={saveLatest} placeholder="תאר את הסיכון או החסם..." style={{ fontSize: '12px' }} />
                      </div>
                      <div className="tp-mtable-cell" style={{ borderRight: '1px solid #f0f2f5' }}>
                        <EditableArea value={b.mitigation} onChange={v => patchBarrier(idx, 'mitigation', v)} onBlur={saveLatest} placeholder="כיצד נתמודד עם זה..." style={{ fontSize: '12px' }} />
                      </div>
                      <div className="tp-mtable-del">
                        <button className="tp-kpi-delete" onClick={() => deleteBarrier(idx)} title="מחק שורה"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button className="tp-kpi-add-btn" onClick={addBarrier}><Plus size={13} /> הוסף חסם</button>

            </section>
          </div>

          {/* ══ SECTION 2b: WORK PLAN — Milestones (Amber) ══ */}
          <div style={{ scrollMarginTop: '16px', marginBottom: '28px' }}>
            <div className="tp-section-band tp-band-indigo" onClick={() => toggleSection('workplan')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ListChecks size={15} /> תוכנית עבודה וביצוע (אבני דרך)
                {task.milestones.length > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: '600', color: milestonesDone === task.milestones.length ? '#10b981' : '#4338ca', background: milestonesDone === task.milestones.length ? '#d1fae5' : '#e0e7ff', padding: '1px 8px', borderRadius: '10px' }}>
                    {milestonesDone} / {task.milestones.length}
                  </span>
                )}
              </span>
              {collapsedSections.has('workplan') ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </div>
            <section className="tp-section" style={{ ...cardStyle, display: collapsedSections.has('workplan') ? 'none' : undefined }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {task.milestones.map((m, mIdx) => {
                  const expanded = expandedMilestones.has(mIdx);
                  const actions = m.actionItems || [];
                  const actionsDone = actions.filter(a => a.done).length;
                  const assignedProfile = m.assignedTo ? profiles.find(p => p.id === m.assignedTo) : null;
                  const milestoneParticipantProfiles = task.participants.length > 0
                    ? profiles.filter(p => task.participants.includes(p.id))
                    : [];
                  return (
                    <div key={mIdx} className={`tp-milestone-row${m.done ? ' done' : ''}`}>
                      <div className="tp-milestone-hd">
                        <button onClick={() => toggleMilestone(mIdx)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' }} title={m.done ? 'סמן כלא הושלם' : 'סמן כהושלם'}>
                          {m.done ? <CheckCircle2 size={18} style={{ color: '#10b981' }} /> : <Circle size={18} style={{ color: '#cbd5e1' }} />}
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <EditableArea value={m.text} onChange={v => patchMilestone(mIdx, 'text', v)} onBlur={saveLatest} placeholder="שם אבן הדרך..." style={{ fontSize: '13.5px', fontWeight: m.done ? '400' : '500', color: m.done ? '#6ee7b7' : '#1e293b', textDecoration: m.done ? 'line-through' : 'none' }} />
                        </div>
                        <input type="date" value={m.dueDate || ''} onChange={e => patchMilestone(mIdx, 'dueDate', e.target.value || undefined)} title="תאריך יעד" style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '11px', color: (() => { if (!m.dueDate || m.done) return '#94a3b8'; const d = new Date(m.dueDate); d.setHours(0,0,0,0); const t = new Date(); t.setHours(0,0,0,0); return d < t ? '#ef4444' : '#64748b'; })(), fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0 }} />
                        {actions.length > 0 && (
                          <span style={{ fontSize: '10.5px', fontWeight: '600', flexShrink: 0, color: actionsDone === actions.length ? '#10b981' : '#6366f1', background: actionsDone === actions.length ? '#d1fae5' : '#ede9fe', padding: '1px 7px', borderRadius: '10px' }}>
                            {actionsDone}/{actions.length}
                          </span>
                        )}
                        <div style={{ flexShrink: 0, position: 'relative' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }} className={`tp-assignee-pill${!m.assignedTo ? ' unassigned' : ''}`} title="שייך אחראי">
                            <UserCircle2 size={13} />
                            <span>{assignedProfile ? (assignedProfile.full_name || assignedProfile.email || '').split(' ')[0] : 'שייך'}</span>
                            <select className="tp-assignee-select" value={m.assignedTo || ''} onChange={e => patchMilestone(mIdx, 'assignedTo', e.target.value || undefined)}>
                              <option value="">ללא אחראי</option>
                              {milestoneParticipantProfiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                            </select>
                          </label>
                        </div>
                        <button className="tp-expand-btn" onClick={() => setExpandedMilestones(s => { const n = new Set(s); n.has(mIdx) ? n.delete(mIdx) : n.add(mIdx); return n; })} title={expanded ? 'כווץ' : 'הצג פעולות'}>
                          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          {actions.length === 0 ? 'פעולות' : ''}
                        </button>
                        <button onClick={() => deleteMilestone(mIdx)} title="מחק אבן דרך" className="tp-milestone-delete-btn">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      {expanded && (
                        <>
                          {actions.map((a, aIdx) => {
                            const participantProfiles = task.participants.length > 0 ? profiles.filter(p => task.participants.includes(p.id)) : [];
                            const aProfile = a.assignedTo ? profiles.find(p => p.id === a.assignedTo) : null;
                            return (
                              <div key={aIdx} className={`tp-action-row${a.done ? ' done-action' : ''}`}>
                                <div style={{ width: '1px', height: '100%', background: '#e2e8f0', flexShrink: 0, alignSelf: 'stretch', marginTop: '2px', marginBottom: '2px' }} />
                                <input type="checkbox" className="tp-check" checked={a.done} onChange={e => patchActionItem(mIdx, aIdx, 'done', e.target.checked)} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <EditableArea value={a.text} onChange={v => patchActionItem(mIdx, aIdx, 'text', v)} onBlur={saveLatest} placeholder="תיאור הפעולה..." style={{ fontSize: '13px', color: a.done ? '#94a3b8' : '#334155', textDecoration: a.done ? 'line-through' : 'none' }} />
                                </div>
                                <label className={`tp-assignee-pill${!a.assignedTo ? ' unassigned' : ''}`} title="שייך לפעולה">
                                  <UserCircle2 size={13} />
                                  <span>{aProfile ? (aProfile.full_name || aProfile.email || '').split(' ')[0] : 'שייך'}</span>
                                  <select className="tp-assignee-select" value={a.assignedTo || ''} onChange={e => patchActionItem(mIdx, aIdx, 'assignedTo', e.target.value || '')}>
                                    <option value="">ללא שיוך</option>
                                    {participantProfiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                                  </select>
                                </label>
                                <label className={`tp-action-date-pill${a.dueDate ? ' has-date' : ''}`} title="תאריך יעד" onClick={e => { const inp = e.currentTarget.querySelector('input[type=date]') as HTMLInputElement | null; try { inp?.showPicker?.(); } catch { inp?.focus(); } }}>
                                  <CalendarDays size={13} />
                                  <span>{a.dueDate ? new Date(a.dueDate + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }) : 'תאריך יעד'}</span>
                                  <input type="date" value={a.dueDate || ''} onChange={e => patchActionItem(mIdx, aIdx, 'dueDate', e.target.value)} />
                                </label>
                                <button onClick={() => deleteActionItem(mIdx, aIdx)} title="הסר" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: '2px', borderRadius: '4px', fontSize: '13px', lineHeight: 1, flexShrink: 0, transition: 'color 0.12s' }} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }} onMouseLeave={e => { e.currentTarget.style.color = '#cbd5e1'; }}>×</button>
                              </div>
                            );
                          })}
                          <button className="tp-add-action-btn" onClick={() => addActionItem(mIdx)}>
                            <Plus size={12} />
                            הוסף פעולה
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: task.milestones.length > 0 ? '4px' : '0' }}>
                  <button onClick={() => addNewMilestone(newMilestoneText)} title="הוסף אבן דרך" style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%', border: '1.5px dashed #94a3b8', background: newMilestoneText.trim() ? '#6366f1' : 'transparent', color: newMilestoneText.trim() ? '#fff' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', padding: 0 }}
                    onMouseEnter={e => { if (!newMilestoneText.trim()) { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; } }}
                    onMouseLeave={e => { if (!newMilestoneText.trim()) { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#94a3b8'; } }}>
                    <Plus size={13} />
                  </button>
                  <input type="text" dir="rtl" value={newMilestoneText} onChange={e => setNewMilestoneText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewMilestone(newMilestoneText); } if (e.key === 'Escape') setNewMilestoneText(''); }}
                    placeholder="הוסף אבן דרך חדשה..."
                    style={{ flex: 1, border: 'none', borderBottom: '1.5px dashed #e2e8f0', borderRadius: 0, padding: '4px 0', fontSize: '13px', color: '#334155', background: 'transparent', outline: 'none', fontFamily: 'inherit', textAlign: 'right', transition: 'border-color 0.15s' }}
                    onFocus={e => { e.currentTarget.style.borderBottomColor = '#6366f1'; }}
                    onBlur={e => { e.currentTarget.style.borderBottomColor = '#e2e8f0'; }} />
                </div>
              </div>
            </section>
          </div>


          {/* ══ SECTION 4: COMPLETION & COMMUNICATION (Purple) ══ */}
          <div id="section-completion" ref={sectionCompletionRef} style={{ scrollMarginTop: '16px', marginBottom: '28px' }}>
            <div className="tp-section-band tp-band-purple" onClick={() => toggleSection('completion')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MessageSquare size={15} /> סיום ותקשורת</span>
              {collapsedSections.has('completion') ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </div>
            <section className="tp-section" style={{ ...cardStyle, borderColor: '#c7d2fe', borderWidth: '1.5px', boxShadow: '0 4px 20px rgba(79,70,229,0.08)', background: 'linear-gradient(160deg, #fefeff 0%, #f5f3ff 100%)', display: collapsedSections.has('completion') ? 'none' : undefined }}>
              <div className="tp-grid-3" style={{ marginBottom: '16px' }}>
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
                <Field label="קישורים" className="tp-span-full">
                  <EditableArea value={task.links} onChange={v => patchLocal('links', v)} onBlur={saveLatest} placeholder="https://..." style={{ wordBreak: 'break-all' }} />
                </Field>
              </div>

              {/* Discussion */}
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px', direction: 'rtl', display: 'flex', alignItems: 'center', gap: '8px' }}>
                דיון
                {comments.length > 0 && <span style={{ fontSize: '11px', fontWeight: '600', color: '#6366f1', background: '#ede9fe', padding: '2px 8px', borderRadius: '10px', textTransform: 'none', letterSpacing: 'normal' }}>{comments.length}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                {commentsLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><div style={{ width: '20px', height: '20px', border: '2px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'tpSpin 0.8s linear infinite' }} /></div>}
                {!commentsLoading && comments.length === 0 && (
                  <div style={{ padding: '32px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <MessageSquare size={32} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>אין הודעות עדיין. התחל דיון...</p>
                  </div>
                )}
                {comments.map(comment => {
                  const isOwn = user?.id === comment.author_id;
                  const authorName = comment.author?.full_name || comment.author?.email || 'משתמש לא ידוע';
                  const date = new Date(comment.created_at);
                  const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                  const dateStr = date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
                  return (
                    <div key={comment.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '14px 16px', background: isOwn ? '#ede9fe' : '#f8fafc', borderRadius: '12px', border: `1px solid ${isOwn ? '#c7d2fe' : '#e2e8f0'}`, direction: 'rtl', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: isOwn ? '#6d28d9' : '#334155' }}>{authorName}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>{dateStr} • {timeStr}</span>
                          {isOwn && (
                            <button onClick={() => handleDeleteComment(comment.id)} title="מחק" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', fontSize: '11px', color: '#94a3b8', fontFamily: 'inherit', fontWeight: '600', borderRadius: '4px', transition: 'background 0.12s, color 0.12s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }} onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8'; }}>מחק</button>
                          )}
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.65', color: '#334155', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{comment.content}</p>
                    </div>
                  );
                })}
              </div>
              {user ? (
                <div style={{ background: '#f8fafc', borderRadius: '18px', border: '1px solid #e2e8f0', padding: '18px', direction: 'rtl' }}>
                  <textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="כתוב הודעה..." rows={3} style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', resize: 'none', background: 'white', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', fontFamily: 'inherit', color: '#334155', direction: 'rtl', textAlign: 'right' }} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSendComment(); } }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <button onClick={handleSendComment} disabled={!commentText.trim() || sendingComment} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: commentText.trim() ? 'pointer' : 'not-allowed', background: commentText.trim() ? '#6366f1' : '#e2e8f0', color: 'white', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit', transition: 'background 0.15s', opacity: sendingComment ? 0.6 : 1 }} onMouseEnter={e => { if (commentText.trim()) e.currentTarget.style.background = '#4f46e5'; }} onMouseLeave={e => { if (commentText.trim()) e.currentTarget.style.background = '#6366f1'; }}>
                      <Send size={14} />
                      {sendingComment ? 'שולח...' : 'שלח'}
                    </button>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Ctrl+Enter לשליחה</span>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', background: '#fef3c7', borderRadius: '10px', border: '1px solid #fcd34d' }}>
                  <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>יש להתחבר כדי להשתתף בדיון</p>
                </div>
              )}
            </section>
          </div>

        </div>{/* end tp-scroll-content */}

        {/* ── Sticky side nav ── */}
        <nav className="tp-side-nav">
          {SCROLL_SECTIONS.map(({ id, label, color, Icon }) => (
            <button
              key={id}
              className="tp-nav-item"
              data-active={activeSection === id}
              style={{ '--nav-bg': color + '22', '--nav-color': color } as React.CSSProperties}
              onClick={() => scrollToSection(id)}
            >
              <Icon size={14} style={{ color: activeSection === id ? color : undefined, flexShrink: 0 }} />
              {label}
            </button>
          ))}
        </nav>
      </div>{/* end tp-scroll-layout */}

      {/* ── Dead code: legacy tab panels (never rendered) ── */}
      <div key={activeSection} style={{ display: 'none' }}>

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

        {/* SNAPSHOT — מצב נוכחי + KPI merged */}
        {activeSection === 'snapshot' && <>
          <Section icon={Activity} title="מצב נוכחי — נקודת האפס">
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
          </Section>

          <div style={{ height: '12px' }} />

          <Section icon={BarChart2} title="מדדי הצלחה — KPI">
            <p className="tp-section-desc">הגדר מדדים מדידים שיוכיחו הצלחה — ספציפיים, בני השגה, ומבוססי נתונים.</p>

            {/* Dynamic KPI list */}
            {(task.kpis || []).length === 0 ? (
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 12px', direction: 'rtl', textAlign: 'right' }}>
                לא הוגדרו מדדים עדיין — לחץ "+ הוסף מדד" כדי להתחיל.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                {(task.kpis || []).map((kpi, idx) => (
                  <div key={idx} className="tp-kpi-row">
                    {/* Row number */}
                    <span className="tp-kpi-num">{idx + 1}</span>

                    {/* Fields grid */}
                    <div className="tp-kpi-fields">
                      <div className="tp-kpi-field tp-kpi-name">
                        <span style={fieldLabelStyle}>שם המדד</span>
                        <EditableArea value={kpi.name} onChange={v => patchKpi(idx, 'name', v)} onBlur={saveLatest} placeholder="זמן המתנה / שיעור זיהומים / עמידה ב-SLA" style={{ fontSize: '13px', fontWeight: '500' }} />
                      </div>
                      <div className="tp-kpi-field">
                        <span style={fieldLabelStyle}>בסיס</span>
                        <EditableArea value={kpi.baseline} onChange={v => patchKpi(idx, 'baseline', v)} onBlur={saveLatest} placeholder="ערך נוכחי..." style={{ fontSize: '13px' }} />
                      </div>
                      <div className="tp-kpi-field">
                        <span style={fieldLabelStyle}>יעד</span>
                        <EditableArea value={kpi.target} onChange={v => patchKpi(idx, 'target', v)} onBlur={saveLatest} placeholder="ערך יעד..." style={{ fontSize: '13px' }} />
                      </div>
                      <div className="tp-kpi-field">
                        <span style={fieldLabelStyle}>תדירות</span>
                        <EditableArea value={kpi.cadence} onChange={v => patchKpi(idx, 'cadence', v)} onBlur={saveLatest} placeholder="שבועי / חודשי..." style={{ fontSize: '13px' }} />
                      </div>
                      <div className="tp-kpi-field">
                        <span style={fieldLabelStyle}>מקור נתונים</span>
                        <EditableArea value={kpi.source} onChange={v => patchKpi(idx, 'source', v)} onBlur={saveLatest} placeholder="מערכת, דוח, סקר..." style={{ fontSize: '13px' }} />
                      </div>
                      <div className="tp-kpi-field">
                        <span style={fieldLabelStyle}>אחראי על המדד</span>
                        <EditableArea value={kpi.owner} onChange={v => patchKpi(idx, 'owner', v)} onBlur={saveLatest} placeholder="שם האחראי..." style={{ fontSize: '13px' }} />
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      className="tp-kpi-delete"
                      onClick={() => deleteKpi(idx)}
                      title="מחק מדד"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add KPI button */}
            <button className="tp-kpi-add-btn" onClick={addKpi}>
              <Plus size={13} />
              הוסף מדד
            </button>
          </Section>
        </>}

        {/* SPEC — אפיון + חסמים וסיכונים merged */}
        {activeSection === 'spec' && <>
          <Section icon={FileText} title="אפיון">
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
          </Section>

          <div style={{ height: '12px' }} />

          <Section icon={AlertTriangle} title="חסמים וסיכונים">
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
          </Section>
        </>}

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {task.milestones.map((m, mIdx) => {
                const expanded = expandedMilestones.has(mIdx);
                const actions = m.actionItems || [];
                const actionsDone = actions.filter(a => a.done).length;
                const assignedProfile = m.assignedTo ? profiles.find(p => p.id === m.assignedTo) : null;
                const milestoneParticipantProfiles = task.participants.length > 0
                  ? profiles.filter(p => task.participants.includes(p.id))
                  : [];

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
                            {milestoneParticipantProfiles.map(p => (
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

                      {/* Delete milestone */}
                      <button
                        onClick={() => deleteMilestone(mIdx)}
                        title="מחק אבן דרך"
                        className="tp-milestone-delete-btn"
                      >
                        <Trash2 size={13} />
                      </button>

                    </div>{/* end milestone-hd */}

                    {/* ── Action items (visible when expanded) ── */}
                    {expanded && (
                      <>
                        {actions.map((a, aIdx) => {
                          const participantProfiles = task.participants.length > 0
                            ? profiles.filter(p => task.participants.includes(p.id))
                            : [];
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

            {/* ── Add new milestone input ── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: task.milestones.length > 0 ? '4px' : '0',
              }}
            >
              <button
                onClick={() => addNewMilestone(newMilestoneText)}
                title="הוסף אבן דרך"
                style={{
                  flexShrink: 0,
                  width: '24px', height: '24px',
                  borderRadius: '50%',
                  border: '1.5px dashed #94a3b8',
                  background: newMilestoneText.trim() ? '#6366f1' : 'transparent',
                  color: newMilestoneText.trim() ? '#fff' : '#94a3b8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  padding: 0,
                }}
                onMouseEnter={e => {
                  if (!newMilestoneText.trim()) {
                    e.currentTarget.style.borderColor = '#6366f1';
                    e.currentTarget.style.color = '#6366f1';
                  }
                }}
                onMouseLeave={e => {
                  if (!newMilestoneText.trim()) {
                    e.currentTarget.style.borderColor = '#94a3b8';
                    e.currentTarget.style.color = '#94a3b8';
                  }
                }}
              >
                <Plus size={13} />
              </button>
              <input
                type="text"
                dir="rtl"
                value={newMilestoneText}
                onChange={e => setNewMilestoneText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); addNewMilestone(newMilestoneText); }
                  if (e.key === 'Escape') setNewMilestoneText('');
                }}
                placeholder="הוסף אבן דרך חדשה..."
                style={{
                  flex: 1,
                  border: 'none',
                  borderBottom: '1.5px dashed #e2e8f0',
                  borderRadius: 0,
                  padding: '4px 0',
                  fontSize: '13px',
                  color: '#334155',
                  background: 'transparent',
                  outline: 'none',
                  fontFamily: 'inherit',
                  textAlign: 'right',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.currentTarget.style.borderBottomColor = '#6366f1'; }}
                onBlur={e => { e.currentTarget.style.borderBottomColor = '#e2e8f0'; }}
              />
            </div>

          </div>
        </Section>}

        {/* KPI */}

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

            {/* Invite by Email */}
            <Field label="הזמן לפי אימייל" className="tp-span-full">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', direction: 'rtl' }}>
                  <input
                    type="email"
                    dir="ltr"
                    value={inviteEmail}
                    onChange={e => { setInviteEmail(e.target.value); setInviteStatus('idle'); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSendInvite(); } }}
                    placeholder="כתובת אימייל להזמנה..."
                    style={{
                      flex: 1, boxSizing: 'border-box',
                      padding: '10px 14px', borderRadius: '14px',
                      border: '1px solid #e2e8f0', outline: 'none',
                      fontSize: '13px', color: '#1e293b',
                      fontFamily: 'inherit', background: '#f8fafc',
                      direction: 'ltr', textAlign: 'left',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#a5b4fc'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
                  />
                  <button
                    onClick={handleSendInvite}
                    disabled={inviteSending || !inviteEmail.trim() || !profile}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '10px 16px', borderRadius: '14px',
                      background: inviteSending || !inviteEmail.trim() || !profile
                        ? '#e2e8f0' : 'linear-gradient(135deg,#2563eb,#6366f1)',
                      color: inviteSending || !inviteEmail.trim() || !profile ? '#94a3b8' : '#fff',
                      border: 'none', cursor: inviteSending || !inviteEmail.trim() ? 'not-allowed' : 'pointer',
                      fontSize: '13px', fontWeight: '600', fontFamily: 'inherit',
                      whiteSpace: 'nowrap', flexShrink: 0,
                      transition: 'background 0.15s',
                    }}
                  >
                    {inviteSending ? (
                      <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'tpSpin 0.7s linear infinite' }} />
                    ) : (
                      <Send size={14} />
                    )}
                    שלח הזמנה
                  </button>
                </div>
                {inviteStatus === 'success' && (
                  <div style={{ fontSize: '12px', color: '#059669', background: '#d1fae5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '7px 12px' }}>
                    ✅ ההזמנה נשלחה בהצלחה! המוזמן יקבל אימייל עם קישור להרשמה.
                  </div>
                )}
                {inviteStatus === 'error' && (
                  <div style={{ fontSize: '12px', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '7px 12px' }}>
                    ❌ {inviteError || 'שגיאה בשליחת ההזמנה — נסה שנית.'}
                  </div>
                )}
                {inviteStatus === 'idle' && (
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    המוזמן יקבל אימייל עם קישור להרשמה ל-GROW+ ויתווסף אוטומטית למשימה זו.
                  </div>
                )}
              </div>
            </Field>

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

      </div>{/* end legacy display:none wrapper */}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
