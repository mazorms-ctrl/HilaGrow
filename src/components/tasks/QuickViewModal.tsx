import { useNavigate } from 'react-router-dom';
import { X, ExternalLink, AlertCircle, Trash2 } from 'lucide-react';
import { type MedicalTask, useTaskById, useProfiles, deleteTask } from '@/lib/supabase-hooks';
import { useEffect, useState } from 'react';

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

// ── Modal content ──────────────────────────────────────────────────────────────

function ModalContent({ task, onClose }: { task: MedicalTask; onClose: () => void }) {
  const navigate = useNavigate();
  const { profiles } = useProfiles();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm('האם אתה בטוח שברצונך למחוק את המשימה? פעולה זו אינה ניתנת לביטול.');
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deleteTask(task.id);
      onClose();
    } catch (e) {
      console.error('Delete error:', e);
      setDeleting(false);
    }
  };

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.open;
  const priorityCfg = PRIORITY_CONFIG[task.priority];
  const overdue = task.dueDate ? new Date(task.dueDate) < new Date() : false;
  const lead = profiles.find(p => p.id === task.assignedTo);
  const leadName = lead?.full_name || lead?.email || null;

  return (
    <>
      <style>{`
        @keyframes qvBackdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes qvSlideIn    { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes qvSpin       { to { transform: rotate(360deg); } }
      `}</style>

      {/*
        Single fixed overlay: covers 100vw × 100vh, flex-centers the modal.
        Click on this backdrop → close. Click inside modal → stopPropagation.
      */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          animation: 'qvBackdropIn 0.15s ease both',
        }}
      >
        {/* Modal card — stopPropagation prevents backdrop click from firing */}
        <div
          dir="rtl"
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '900px',
            maxHeight: 'calc(100vh - 48px)',
            background: 'white',
            borderRadius: '20px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.28), 0 8px 24px rgba(0,0,0,0.10)',
            animation: 'qvSlideIn 0.2s cubic-bezier(0.16,1,0.3,1) both',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <div style={{ padding: '28px 32px 0', flexShrink: 0 }}>

            {/* Category row + action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: task.color, display: 'inline-block', flexShrink: 0,
              }} />
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
                {task.category}
              </span>
              {/* Delete button */}
              <button
                onClick={handleDelete}
                disabled={deleting}
                title="מחק משימה"
                style={{
                  marginRight: 'auto',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '30px', height: '30px', borderRadius: '8px',
                  background: 'none', border: 'none',
                  cursor: deleting ? 'wait' : 'pointer', color: '#94a3b8',
                  transition: 'background 0.12s, color 0.12s',
                  flexShrink: 0, opacity: deleting ? 0.5 : 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8'; }}
              >
                <Trash2 size={15} />
              </button>
              {/* Close button */}
              <button
                onClick={onClose}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '30px', height: '30px', borderRadius: '8px',
                  background: 'none', border: 'none',
                  cursor: 'pointer', color: '#94a3b8',
                  transition: 'background 0.12s, color 0.12s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#334155'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8'; }}
                title="סגור (Escape)"
              >
                <X size={16} />
              </button>
            </div>

            {/* Title */}
            <h2 style={{
              margin: '0 0 16px 0',
              fontSize: '22px', fontWeight: '800', color: '#0f172a',
              lineHeight: '1.3', direction: 'rtl', textAlign: 'right',
            }}>
              {task.title}
            </h2>

            {/* Metadata pills row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              flexWrap: 'wrap', paddingBottom: '20px',
              borderBottom: '1px solid #e2e8f0',
              direction: 'rtl',
            }}>
              {/* Status pill */}
              <span style={{
                padding: '4px 14px', borderRadius: '20px',
                fontSize: '12px', fontWeight: '700',
                background: statusCfg.bg, color: statusCfg.color,
                letterSpacing: '0.2px',
              }}>
                {statusCfg.label}
              </span>

              {/* Priority pill */}
              <span style={{
                padding: '4px 14px', borderRadius: '20px',
                fontSize: '12px', fontWeight: '700',
                background: priorityCfg.bg, color: priorityCfg.color,
                letterSpacing: '0.2px',
              }}>
                {priorityCfg.label}
              </span>

              {/* Lead */}
              {leadName && (
                <span style={{
                  padding: '4px 12px', borderRadius: '20px',
                  fontSize: '12px', fontWeight: '500',
                  background: '#f1f5f9', color: '#475569',
                }}>
                  👤 {leadName}
                </span>
              )}

              {/* Due date */}
              {task.dueDate && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '4px 12px', borderRadius: '20px',
                  fontSize: '12px', fontWeight: overdue ? '700' : '500',
                  background: overdue ? '#fee2e2' : '#f1f5f9',
                  color: overdue ? '#dc2626' : '#475569',
                }}>
                  {overdue && <AlertCircle size={11} />}
                  {task.dueDate}
                </span>
              )}

              {/* Progress pill — pushed to left end */}
              <span style={{
                marginRight: 'auto',
                padding: '4px 12px', borderRadius: '20px',
                fontSize: '12px', fontWeight: '700',
                color:      task.progress === 100 ? '#059669' : task.progress >= 50 ? '#6366f1' : '#b45309',
                background: task.progress === 100 ? '#d1fae5' : task.progress >= 50 ? '#ede9fe' : '#fef3c7',
              }}>
                {task.progress}%
              </span>
            </div>
          </div>

          {/* ── Scrollable body ─────────────────────────────────────────── */}
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: '22px 32px',
            display: 'flex', flexDirection: 'column', gap: '22px',
            scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent',
          }}>
            {/* Description + Current State — 2-column when both present */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: task.currentState ? '1fr 1fr' : '1fr',
              gap: '24px',
            }}>
              {/* Description */}
              <div>
                <div style={{
                  fontSize: '10px', fontWeight: '700', color: '#94a3b8',
                  textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px',
                }}>
                  תיאור
                </div>
                {task.description ? (
                  <p style={{
                    margin: 0, fontSize: '14px', color: '#334155',
                    lineHeight: '1.75', direction: 'rtl', textAlign: 'right',
                    display: '-webkit-box', WebkitLineClamp: 7,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {task.description}
                  </p>
                ) : (
                  <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', textAlign: 'right' }}>
                    אין תיאור
                  </p>
                )}
              </div>

              {/* Current State */}
              {task.currentState && (
                <div>
                  <div style={{
                    fontSize: '10px', fontWeight: '700', color: '#94a3b8',
                    textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px',
                  }}>
                    מצב נוכחי — נקודת האפס
                  </div>
                  <p style={{
                    margin: 0, fontSize: '13px', color: '#334155',
                    lineHeight: '1.75', direction: 'rtl', textAlign: 'right',
                    display: '-webkit-box', WebkitLineClamp: 7,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    background: '#f8fafc', borderRadius: '10px',
                    padding: '12px 14px', border: '1px solid #e2e8f0',
                  }}>
                    {task.currentState}
                  </p>
                </div>
              )}
            </div>

            {/* Milestones mini-list */}
            {task.milestones.length > 0 && (() => {
              const done = task.milestones.filter(m => m.done).length;
              return (
                <div>
                  <div style={{
                    fontSize: '10px', fontWeight: '700', color: '#94a3b8',
                    textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px',
                  }}>
                    אבני דרך — {done}/{task.milestones.length}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {task.milestones.slice(0, 6).map((m, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', direction: 'rtl' }}>
                        <span style={{
                          width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                          background: m.done ? '#10b981' : 'white',
                          border: `2px solid ${m.done ? '#10b981' : '#d1d5db'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {m.done && <span style={{ color: 'white', fontSize: '9px', lineHeight: 1 }}>✓</span>}
                        </span>
                        <span style={{
                          fontSize: '13px', color: m.done ? '#94a3b8' : '#475569',
                          textDecoration: m.done ? 'line-through' : 'none',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {m.text}
                        </span>
                      </div>
                    ))}
                  </div>
                  {task.milestones.length > 6 && (
                    <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginTop: '6px' }}>
                      +{task.milestones.length - 6} נוספות
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ── Footer CTA ──────────────────────────────────────────────── */}
          <div style={{
            padding: '16px 32px 24px',
            borderTop: '1px solid #e2e8f0',
            flexShrink: 0,
          }}>
            <button
              onClick={() => { onClose(); navigate(`/task/${task.id}`); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '8px', padding: '12px 24px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                border: 'none', cursor: 'pointer', color: 'white',
                fontSize: '14px', fontWeight: '700', fontFamily: 'inherit',
                boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
                transition: 'opacity 0.12s, box-shadow 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.92'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.35)'; }}
            >
              <ExternalLink size={15} />
              עבור לדף המשימה המלא
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Public: pass task directly (zero fetches — dashboard) ──────────────────────

export function QuickViewModal({ task, onClose }: { task: MedicalTask; onClose: () => void }) {
  return <ModalContent task={task} onClose={onClose} />;
}

// ── Public: fetch by ID (sidebar — React Query cache) ─────────────────────────

function SidebarQuickViewInner({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { task, loading } = useTaskById(taskId);

  if (loading) {
    return (
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'white', borderRadius: '16px', padding: '32px 40px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}
        >
          <div style={{
            width: '20px', height: '20px', flexShrink: 0,
            border: '2px solid #e2e8f0', borderTopColor: '#6366f1',
            borderRadius: '50%', animation: 'qvSpin 0.8s linear infinite',
          }} />
          <style>{`@keyframes qvSpin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: '14px', color: '#64748b' }}>טוען...</span>
        </div>
      </div>
    );
  }

  if (!task) { onClose(); return null; }

  return <ModalContent task={task} onClose={onClose} />;
}

export function QuickViewModalById({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  if (!taskId) return null;
  return <SidebarQuickViewInner taskId={taskId} onClose={onClose} />;
}
