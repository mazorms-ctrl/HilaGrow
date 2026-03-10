/**
 * BigPictureModal
 * Full-screen modal with zoom/pan tree canvas.
 * Triggered via useUIStore.openBigPicture() — rendered once at app root.
 * Only fetches data when open.
 */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useTasks, useProjects } from '@/lib/supabase-hooks';
import { useAuth } from '@/contexts/AuthContext';
import { useUIStore } from '@/store/uiStore';
import { colors, shadows, spacing, radius, typography } from '@/styles/tokens';
import type { MedicalTask } from '@/lib/supabase-hooks';

// ── Shared keyframes (injected once) ─────────────────────────────────────────
const KEYFRAMES = `
  @keyframes bpPulse { 0%,100%{opacity:1} 50%{opacity:.55} }
  @keyframes bpSpin  { to{transform:rotate(360deg)} }
`;

// ── Priority badge ────────────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    P1: { bg: '#fee2e2', color: '#dc2626' },
    P2: { bg: '#fed7aa', color: '#ea580c' },
    P3: { bg: '#e0e7ff', color: '#4f46e5' },
  };
  const p = cfg[priority] ?? cfg.P2;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 7px', borderRadius: '5px',
      background: p.bg, color: p.color,
      fontSize: '11px', fontWeight: 600,
    }}>
      {priority}
    </span>
  );
}

// ── Single task card ──────────────────────────────────────────────────────────
function TaskCard({ task, color }: { task: MedicalTask; color: string }) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const closeBigPicture = useUIStore(s => s.closeBigPicture);

  const status    = task.status || 'open';
  const isDone    = status === 'done';
  const isActive  = status === 'in_progress';
  const isPending = status === 'open';

  const accent = isDone    ? '#22c55e'
               : isPending ? '#e2e8f0'
               : isActive  ? color
               : '#f59e0b';

  const doneMilestones = task.milestones.filter(m => m.done).length;

  return (
    <div
      onClick={() => { closeBigPicture(); navigate(`/task/${task.id}`); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '13px 15px 0 15px',
        background: isDone ? '#fafafa' : '#ffffff',
        border: '1px solid #e2e8f0',
        borderTop: `4px solid ${accent}`,
        borderRadius: '12px',
        minWidth: '200px',
        maxWidth: '220px',
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
        transition: 'box-shadow 0.2s, transform 0.2s',
        boxShadow: hovered ? shadows.md : shadows.sm,
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        fontFamily: typography.fontFamily,
        ...(isActive ? { animation: 'bpPulse 3s ease-in-out infinite' } : {}),
      }}
    >
      {/* Done checkmark */}
      {isDone && (
        <div style={{
          position: 'absolute', top: 10, left: 11,
          width: 17, height: 17, borderRadius: '9999px',
          background: '#dcfce7', border: '1px solid #bbf7d0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5.2L4.1 7.5L8 3" stroke="#16a34a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      {/* Title */}
      <div style={{
        fontSize: '13px', fontWeight: 300, lineHeight: '1.4',
        color: isDone ? '#94a3b8' : '#0f172a', marginBottom: '7px',
      }}>
        {task.title}
      </div>

      {!isDone && <div style={{ marginBottom: '8px' }}><PriorityBadge priority={task.priority || 'P2'} /></div>}

      {!isPending && (
        <div style={{ background: '#f1f5f9', height: '3px', borderRadius: '2px', overflow: 'hidden', marginBottom: '7px' }}>
          <div style={{ background: isDone ? '#22c55e' : color, height: '100%', width: `${task.progress}%`, transition: 'width 0.4s' }} />
        </div>
      )}

      {/* Bottom row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '11px' }}>
        <span style={{ fontSize: '11px', fontWeight: 300, color: '#94a3b8' }}>
          {task.progress}% · {doneMilestones}/{task.milestones.length}
        </span>
        {task.owner && (
          <div title={task.owner} style={{
            width: 24, height: 24, borderRadius: '9999px',
            background: isDone ? '#dcfce733' : color + '22',
            border: `1.5px solid ${isDone ? '#bbf7d0' : color + '55'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', fontWeight: 400,
            color: isDone ? '#86efac' : color, flexShrink: 0,
          }}>
            {task.owner.charAt(0)}
          </div>
        )}
      </div>

      {/* In-progress bottom strip */}
      {isActive && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '2px', width: '100%', background: '#f1f5f9', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${task.progress}%`, background: color, borderRadius: '0 2px 2px 0', transition: 'width 0.4s' }} />
        </div>
      )}
    </div>
  );
}

// ── Tree canvas ───────────────────────────────────────────────────────────────
function TreeCanvas({ tasks }: { tasks: MedicalTask[] }) {
  const categories = [...new Set(tasks.map(t => t.category))];
  const N = categories.length;

  if (N === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: colors.text.tertiary, fontFamily: typography.fontFamily, fontWeight: 300 }}>
      אין נתונים להצגה
    </div>
  );

  return (
    <div style={{ display: 'inline-block', padding: '40px' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 'max-content' }}>
      {/* Project root */}
      <div style={{
        padding: `${spacing.lg} ${spacing.xxxxl}`,
        background: '#ffffff', border: '1px solid #e2e8f0', borderTop: '4px solid #4f46e5',
        borderRadius: radius.lg, fontFamily: typography.fontFamily,
        fontSize: '18px', fontWeight: 300, color: colors.text.primary,
        boxShadow: shadows.md, letterSpacing: '-0.5px', minWidth: '220px', textAlign: 'center',
      }}>
        GROW
      </div>

      {/* Bezier connectors root → categories */}
      <svg width="100%" height={64} viewBox={`0 0 100 64`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
        {categories.map((_c, i) => {
          const cx = ((i + 0.5) / N) * 100;
          return (
            <path key={i} d={`M 50 0 C 50 ${64 * 0.6}, ${cx} ${64 * 0.4}, ${cx} 64`}
              stroke="#cbd5e1" strokeWidth="0.4" fill="none" />
          );
        })}
      </svg>

      {/* Categories */}
      <div style={{ display: 'flex', gap: '56px', alignItems: 'flex-start', justifyContent: 'center' }}>
        {categories.map(cat => {
          const catTasks = tasks.filter(t => t.category === cat);
          const color = catTasks[0]?.color ?? '#94a3b8';
          const avg = catTasks.length ? Math.round(catTasks.reduce((s, t) => s + t.progress, 0) / catTasks.length) : 0;
          return (
            <div key={cat} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xl }}>
              {/* Category card */}
              <div style={{
                padding: `${spacing.md} ${spacing.xl}`, background: '#ffffff',
                border: '1px solid #e2e8f0', borderTop: `4px solid ${color}`,
                borderRadius: radius.lg, minWidth: '200px', textAlign: 'center', boxShadow: shadows.sm,
              }}>
                <div style={{ fontSize: '15px', fontWeight: 300, color: '#171717', marginBottom: '4px', fontFamily: typography.fontFamily }}>{cat}</div>
                <div style={{ fontSize: '12px', fontWeight: 300, color: '#94a3b8', fontFamily: typography.fontFamily }}>{catTasks.length} משימות · {avg}%</div>
              </div>

              <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }} />

              {/* Tasks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', alignItems: 'center' }}>
                {catTasks.map((task, idx) => (
                  <div key={task.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {idx > 0 && <div style={{ width: '1px', height: '9px', background: '#e2e8f0' }} />}
                    <TaskCard task={task} color={color} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
}

// ── Compute a scale that fits the content inside the viewport (90% fill) ──────
function fitAndCenter(api: ReactZoomPanPinchRef, animTime = 0) {
  const wrapper = api.instance.wrapperComponent;
  const content = api.instance.contentComponent;
  if (wrapper && content) {
    const sx = wrapper.clientWidth  / content.scrollWidth;
    const sy = wrapper.clientHeight / content.scrollHeight;
    const scale = Math.max(Math.min(sx, sy) * 0.9, 0.15);
    api.centerView(scale, animTime);
  } else {
    api.centerView(0.7, animTime);
  }
}

interface LoaderProps {
  transformRef: React.MutableRefObject<ReactZoomPanPinchRef | null>;
  onTasksReady: () => void;
}

// ── Data loader — fetches only when mounted ───────────────────────────────────
function TreeDataLoader({ transformRef, onTasksReady }: LoaderProps) {
  const { user } = useAuth();
  const { projects, loading: projectsLoading } = useProjects(user?.id);
  const projectId = projects[0]?.id ?? null;
  const { tasks, loading: tasksLoading } = useTasks(projectId);

  const isLoading = projectsLoading || (!!projectId && tasksLoading);

  // Notify parent once tasks are painted in DOM
  useEffect(() => {
    if (!tasks.length) return;
    const id = setTimeout(onTasksReady, 100);
    return () => clearTimeout(id);
  }, [tasks, onTasksReady]);

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.text.tertiary, fontFamily: typography.fontFamily, fontWeight: 300, fontSize: '14px', gap: '10px' }}>
      <div style={{ width: 20, height: 20, border: '2px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '9999px', animation: 'bpSpin 0.7s linear infinite' }} />
      טוען...
    </div>
  );

  if (!projectId) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.text.tertiary, fontFamily: typography.fontFamily, fontWeight: 300, fontSize: '14px' }}>
      לא נמצאו נתונים לפרויקט זה
    </div>
  );

  return (
    <TransformWrapper
      initialScale={1}
      minScale={0.15}
      maxScale={2.5}
      limitToBounds={true}
      centerZoomedOut={true}
      wheel={{ step: 0.07 }}
      onInit={(ref) => { transformRef.current = ref; }}
    >
      {({ zoomIn, zoomOut }) => (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#f8fafc' }}>
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%', overflow: 'hidden', background: '#f8fafc' }}
            contentStyle={{ display: 'inline-block' }}
          >
            <TreeCanvas tasks={tasks} />
          </TransformComponent>

          {/* Zoom controls */}
          <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 10 }}>
            {[
              { icon: <ZoomIn size={14} />,    fn: () => zoomIn(),                                            tip: 'הגדל' },
              { icon: <ZoomOut size={14} />,   fn: () => zoomOut(),                                           tip: 'הקטן' },
              { icon: <Maximize2 size={13} />, fn: () => transformRef.current && fitAndCenter(transformRef.current, 300), tip: 'מרכז' },
            ].map(({ icon, fn, tip }) => (
              <button key={tip} onClick={fn} title={tip} style={{
                width: 32, height: 32, background: '#ffffff', border: '1px solid #e2e8f0',
                borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: colors.text.secondary, boxShadow: shadows.sm, padding: 0,
              }}>{icon}</button>
            ))}
          </div>

          <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', fontWeight: 300, color: '#94a3b8', fontFamily: typography.fontFamily, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            גלול לזום · גרור לניווט
          </div>
        </div>
      )}
    </TransformWrapper>
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────────
function ModalShell({ onClose }: { onClose: () => void }) {
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const animationDoneRef = useRef(false);
  const tasksReadyRef = useRef(false);

  // Called by whichever arrives last — guarantees both modal and data are ready
  function tryCenter() {
    if (animationDoneRef.current && tasksReadyRef.current && transformRef.current) {
      fitAndCenter(transformRef.current, 0);
    }
  }

  function handleAnimationComplete() {
    animationDoneRef.current = true;
    tryCenter();
  }

  const handleTasksReady = useRef(() => {
    tasksReadyRef.current = true;
    tryCenter();
  }).current;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* Backdrop */}
      <motion.div
        key="bp-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 1200,
        }}
      />

      {/* Modal panel — centering wrapper (plain div, no transform conflicts) */}
      <div
        style={{
          position: 'fixed', inset: 0,
          zIndex: 1201,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
      <motion.div
        key="bp-modal"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        onAnimationComplete={handleAnimationComplete}
        style={{
          width: '95vw', height: '90vh',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          pointerEvents: 'auto',
        }}
      >
        {/* Modal header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 4, height: 20, background: '#4f46e5', borderRadius: '2px' }} />
            <span style={{ fontSize: '15px', fontWeight: 300, color: colors.text.primary, fontFamily: typography.fontFamily, letterSpacing: '-0.3px' }}>
              GROW — מחזור ב מובילים שינוי
            </span>
          </div>
          <button
            onClick={onClose}
            title="סגור"
            style={{
              width: 32, height: 32, borderRadius: '8px',
              background: 'none', border: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: colors.text.tertiary,
              transition: 'background 0.15s, color 0.15s',
              padding: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = colors.text.tertiary; }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Canvas — fills remaining height */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#f8fafc' }}>
          <TreeDataLoader transformRef={transformRef} onTasksReady={handleTasksReady} />
        </div>
      </motion.div>
      </div>
    </>
  );
}

// ── Public export — rendered once at app root ─────────────────────────────────
export function BigPictureModal() {
  const bigPictureOpen  = useUIStore(s => s.bigPictureOpen);
  const closeBigPicture = useUIStore(s => s.closeBigPicture);

  return createPortal(
    <AnimatePresence>
      {bigPictureOpen && <ModalShell key="bp-modal-shell" onClose={closeBigPicture} />}
    </AnimatePresence>,
    document.body,
  );
}
