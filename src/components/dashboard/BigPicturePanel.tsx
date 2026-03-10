/**
 * BigPictureModal
 * Full-screen modal with zoom/pan tree canvas.
 * Triggered via useUIStore.openBigPicture() — rendered once at app root.
 * Only fetches data when open.
 */
import { useEffect, useRef, useCallback } from 'react';
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

      {isActive && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '2px', width: '100%', background: '#f1f5f9', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${task.progress}%`, background: color, borderRadius: '0 2px 2px 0', transition: 'width 0.4s' }} />
        </div>
      )}
    </div>
  );
}

// ── Tree canvas ───────────────────────────────────────────────────────────────
function TreeCanvas({
  tasks,
  treeRef,
}: {
  tasks: MedicalTask[];
  treeRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  const categories = [...new Set(tasks.map(t => t.category))];
  const N = categories.length;

  if (N === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: colors.text.tertiary, fontFamily: typography.fontFamily, fontWeight: 300 }}>
      אין נתונים להצגה
    </div>
  );

  return (
    <div
      ref={treeRef}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        // No width/height — shrinks to fit the cards
      }}
    >
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
              <div style={{
                padding: `${spacing.md} ${spacing.xl}`, background: '#ffffff',
                border: '1px solid #e2e8f0', borderTop: `4px solid ${color}`,
                borderRadius: radius.lg, minWidth: '200px', textAlign: 'center', boxShadow: shadows.sm,
              }}>
                <div style={{ fontSize: '15px', fontWeight: 300, color: '#171717', marginBottom: '4px', fontFamily: typography.fontFamily }}>{cat}</div>
                <div style={{ fontSize: '12px', fontWeight: 300, color: '#94a3b8', fontFamily: typography.fontFamily }}>{catTasks.length} משימות · {avg}%</div>
              </div>

              <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }} />

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
  );
}

// ── Zoom the tree to fit, then center it ──────────────────────────────────────
// Uses setTransform so it works correctly regardless of limitToBounds.
function doFitAndCenter(
  api: ReactZoomPanPinchRef,
  treeEl: HTMLDivElement | null,
  animTime = 0,
) {
  const wrapper = api.instance.wrapperComponent;
  const content = api.instance.contentComponent;
  if (!wrapper || !content) return false;

  const w = treeEl?.offsetWidth  || content.offsetWidth;
  const h = treeEl?.offsetHeight || content.offsetHeight;
  if (!w || !h) return false;

  const ww = wrapper.clientWidth;
  const wh = wrapper.clientHeight;
  const scale = Math.min(Math.min(ww / w, wh / h) * 0.88, 1);
  const x = (ww - w * scale) / 2;
  const y = (wh - h * scale) / 2;

  api.setTransform(x, y, scale, animTime);
  return true;
}

// ── Canvas — owns TransformWrapper + retry centering ─────────────────────────
function TreeCanvas_Wrapper({
  tasks,
  treeRef,
  transformRef,
}: {
  tasks: MedicalTask[];
  treeRef: React.MutableRefObject<HTMLDivElement | null>;
  transformRef: React.MutableRefObject<ReactZoomPanPinchRef | null>;
}) {
  // Retry centering up to 3 times once tasks + API are available
  const centered = useRef(false);

  const tryCenter = useCallback(() => {
    if (centered.current) return;
    if (!transformRef.current || !treeRef.current) return;
    const ok = doFitAndCenter(transformRef.current, treeRef.current, 0);
    if (ok) centered.current = true;
  }, [transformRef, treeRef]);

  useEffect(() => {
    if (!tasks.length) return;
    centered.current = false;
    // Retry at 150ms, 400ms, 800ms to handle slow paint
    const t1 = setTimeout(tryCenter, 150);
    const t2 = setTimeout(tryCenter, 400);
    const t3 = setTimeout(tryCenter, 800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [tasks, tryCenter]);

  return (
    <TransformWrapper
      initialScale={1}
      minScale={0.15}
      maxScale={3}
      limitToBounds={true}
      centerZoomedOut={true}
      wheel={{ step: 0.06 }}
      panning={{ velocityDisabled: true }}
      doubleClick={{ disabled: true }}
      onInit={(ref) => {
        transformRef.current = ref;
        // Also try once on init (for re-opens)
        setTimeout(() => tryCenter(), 200);
      }}
    >
      {({ zoomIn, zoomOut }) => (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%', overflow: 'hidden', background: '#f8fafc' }}
            contentStyle={{ display: 'inline-flex' }}
          >
            <TreeCanvas tasks={tasks} treeRef={treeRef} />
          </TransformComponent>

          {/* Controls */}
          <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 10 }}>
            {[
              { icon: <ZoomIn size={14} />,    fn: () => zoomIn(),     tip: 'הגדל' },
              { icon: <ZoomOut size={14} />,   fn: () => zoomOut(),    tip: 'הקטן' },
              { icon: <Maximize2 size={13} />, fn: () => { centered.current = false; tryCenter(); }, tip: 'מרכז' },
            ].map(({ icon, fn, tip }) => (
              <button key={tip} onClick={fn} title={tip} style={{
                width: 32, height: 32, background: '#ffffff', border: '1px solid #e2e8f0',
                borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: colors.text.secondary, boxShadow: shadows.sm, padding: 0,
              }}>{icon}</button>
            ))}
          </div>

          <div style={{
            position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
            fontSize: '11px', fontWeight: 300, color: '#94a3b8',
            fontFamily: typography.fontFamily, pointerEvents: 'none', whiteSpace: 'nowrap',
          }}>
            גלול לזום · גרור לניווט
          </div>
        </div>
      )}
    </TransformWrapper>
  );
}

// ── Data loader — fetches only when mounted ───────────────────────────────────
interface LoaderProps {
  transformRef: React.MutableRefObject<ReactZoomPanPinchRef | null>;
  treeRef: React.MutableRefObject<HTMLDivElement | null>;
}

function TreeDataLoader({ transformRef, treeRef }: LoaderProps) {
  const { user } = useAuth();
  const { projects, loading: projectsLoading } = useProjects(user?.id);
  const projectId = projects[0]?.id ?? null;
  const { tasks, loading: tasksLoading } = useTasks(projectId);

  const isLoading = projectsLoading || (!!projectId && tasksLoading);

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.text.tertiary, fontFamily: typography.fontFamily, fontWeight: 300, fontSize: '14px', gap: '10px', background: '#f8fafc' }}>
      <div style={{ width: 20, height: 20, border: '2px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '9999px', animation: 'bpSpin 0.7s linear infinite' }} />
      טוען...
    </div>
  );

  if (!projectId) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.text.tertiary, fontFamily: typography.fontFamily, fontWeight: 300, fontSize: '14px', background: '#f8fafc' }}>
      לא נמצאו נתונים לפרויקט זה
    </div>
  );

  return (
    <TreeCanvas_Wrapper
      tasks={tasks}
      treeRef={treeRef}
      transformRef={transformRef}
    />
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────────
function ModalShell({ onClose }: { onClose: () => void }) {
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const treeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* Solid backdrop — blocks all interaction with dashboard below */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 9000,
        }}
      />

      {/* Modal */}
      <motion.div
        key="bp-modal"
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '95vw', height: '90vh',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.07)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 9001,
        }}
      >
        {/* Header */}
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
              transition: 'background 0.15s, color 0.15s', padding: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = colors.text.tertiary; }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <TreeDataLoader transformRef={transformRef} treeRef={treeRef} />
        </div>
      </motion.div>
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
