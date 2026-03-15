/**
 * BigPictureModal — 'Ribbon & Focus' Desktop Cockpit
 * Full-screen modal with zoom/pan tree canvas.
 * Triggered via useUIStore.openBigPicture() — rendered once at app root.
 */
import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { X, ZoomIn, ZoomOut, Maximize2, Pencil, Check } from 'lucide-react';
import { useTasks, useProjects } from '@/lib/supabase-hooks';
import { useAuth } from '@/contexts/AuthContext';
import { useUIStore } from '@/store/uiStore';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { colors, shadows, typography } from '@/styles/tokens';
import { supabase } from '@/lib/supabase';
import type { MedicalTask } from '@/lib/supabase-hooks';

// ── Shared keyframes ──────────────────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes bpPulse { 0%,100%{opacity:1} 50%{opacity:.55} }
  @keyframes bpSpin  { to{transform:rotate(360deg)} }
`;

// Card dimensions (desktop cockpit)
const CARD_W = 210;
const CARD_GAP = 16; // horizontal gap between category columns

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Convert hex color → pastel background (light tint). */
function pastel(hex: string) { return hex + '18'; }
/** Slightly darker tint for borders. */
function borderTint(hex: string) { return hex + '55'; }
/** Ribbon color: darken slightly via indigo override unless color is dark already. */
const RIBBON_COLOR = '#4338ca'; // indigo-700 — universal, readable

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

// ── Corner ribbon (diagonal band, top-right) ──────────────────────────────────
function CornerRibbon() {
  return (
    <div style={{
      position: 'absolute', top: 0, right: 0,
      width: 44, height: 44,
      overflow: 'hidden',
      borderRadius: '0 12px 0 0',
      pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute',
        top: 10, right: -12,
        width: 48, height: 11,
        background: RIBBON_COLOR,
        transform: 'rotate(45deg)',
        transformOrigin: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
      }} />
    </div>
  );
}

// ── Single task card ──────────────────────────────────────────────────────────
function TaskCard({
  task,
  color,
  currentUserName,
  editMode,
  onDragStart,
  isDragging,
}: {
  task: MedicalTask;
  color: string;
  currentUserName: string | null;
  editMode: boolean;
  onDragStart: (taskId: string) => void;
  isDragging: boolean;
}) {
  const navigate = useNavigate();
  const closeBigPicture = useUIStore(s => s.closeBigPicture);

  const progress  = task.progress ?? 0;
  const isActive  = progress > 0;
  const isPersonal = !!currentUserName && task.owner === currentUserName;

  // ── Visual tokens based on activity ──────────────────────────────────────
  const bg          = isActive ? pastel(color)         : '#f8fafc';
  const borderStyle = isActive ? `1px solid ${borderTint(color)}` : '1px dashed #cbd5e1';
  const titleColor  = isActive ? '#0f172a'             : '#94a3b8';
  const metaColor   = isActive ? '#475569'             : '#cbd5e1';
  const barBg       = isActive ? color                 : '#e2e8f0';
  const topAccent   = isActive ? color                 : '#e2e8f0';

  const boxShadow = isPersonal
    ? '0 20px 40px rgba(79,70,229,0.18), 0 6px 16px rgba(0,0,0,0.10)'
    : '0 1px 4px rgba(0,0,0,0.06)';
  const transform = isPersonal ? 'translateY(-3px)' : 'none';

  const doneMilestones = task.milestones?.filter(m => m.done).length ?? 0;
  const totalMilestones = task.milestones?.length ?? 0;

  return (
    <div
      draggable={editMode}
      onDragStart={editMode ? (e) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id);
        onDragStart(task.id);
      } : undefined}
      onClick={editMode ? undefined : () => { closeBigPicture(); navigate(`/task/${task.id}`); }}
      style={{
        width: CARD_W,
        minWidth: CARD_W,
        maxWidth: CARD_W,
        padding: '11px 13px 0 13px',
        background: bg,
        border: editMode ? `2px dashed ${color}88` : borderStyle,
        borderTop: `3px solid ${topAccent}`,
        borderRadius: '12px',
        cursor: editMode ? 'grab' : 'pointer',
        overflow: 'hidden',
        position: 'relative',
        transition: 'box-shadow 0.2s, transform 0.2s, opacity 0.2s',
        boxShadow: isDragging ? 'none' : boxShadow,
        transform: isDragging ? 'none' : transform,
        opacity: isDragging ? 0.35 : 1,
        fontFamily: typography.fontFamily,
        ...(isActive && task.status === 'in_progress' && !editMode
          ? { animation: 'bpPulse 3s ease-in-out infinite' }
          : {}),
      }}
    >
      {/* Corner ribbon for personal tasks */}
      {isPersonal && <CornerRibbon />}

      {/* Title */}
      <div style={{
        fontSize: '12.5px', fontWeight: isActive ? 500 : 400, lineHeight: '1.4',
        color: titleColor, marginBottom: '6px',
        paddingRight: isPersonal ? '18px' : 0, // avoid ribbon overlap
      }}>
        {task.title}
      </div>

      {/* Priority badge — only for active tasks */}
      {isActive && task.priority && (
        <div style={{ marginBottom: '7px' }}>
          <PriorityBadge priority={task.priority} />
        </div>
      )}

      {/* Progress bar */}
      {isActive && (
        <div style={{ background: '#f1f5f9', height: '3px', borderRadius: '2px', overflow: 'hidden', marginBottom: '7px' }}>
          <div style={{ background: barBg, height: '100%', width: `${progress}%`, transition: 'width 0.4s' }} />
        </div>
      )}

      {/* Footer: progress % + milestones + owner full name */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: '10px', flexWrap: 'wrap', gap: '4px',
      }}>
        <span style={{ fontSize: '10.5px', color: metaColor }}>
          {progress}%{totalMilestones > 0 ? ` · ${doneMilestones}/${totalMilestones}` : ''}
        </span>
        {task.owner && (
          <span style={{ fontSize: '10.5px', color: metaColor, maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            👤 {task.owner}
          </span>
        )}
      </div>

      {/* Active progress underline */}
      {isActive && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '2px', width: '100%', background: '#f1f5f9', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: color, borderRadius: '0 2px 2px 0', transition: 'width 0.4s' }} />
        </div>
      )}
    </div>
  );
}

// ── Tree canvas ───────────────────────────────────────────────────────────────
function TreeCanvas({
  tasks,
  treeRef,
  currentUserName,
  editMode,
  dragTaskId,
  onDragStart,
  onTaskMove,
}: {
  tasks: MedicalTask[];
  treeRef: React.RefObject<HTMLDivElement | null>;
  currentUserName: string | null;
  editMode: boolean;
  dragTaskId: string | null;
  onDragStart: (taskId: string) => void;
  onTaskMove: (taskId: string, newGroupId: string, newCategory: string) => void;
}) {
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const categories = [...new Set(tasks.map(t => t.category))];
  const N = categories.length;

  // Map category name → group_id (read from any task in that category)
  const categoryGroupId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of tasks) { if (t.group_id && !map[t.category]) map[t.category] = t.group_id; }
    return map;
  }, [tasks]);

  if (N === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: colors.text.tertiary, fontFamily: typography.fontFamily }}>
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
        padding: '32px 24px 48px',
      }}
    >
      {/* ── GROW root ────────────────────────────────────────── */}
      <div style={{
        padding: '14px 48px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderTop: '4px solid #4f46e5',
        borderRadius: '12px',
        fontFamily: typography.fontFamily,
        fontSize: '17px', fontWeight: 600, color: '#1e1b4b',
        boxShadow: shadows.md,
        letterSpacing: '-0.4px',
        minWidth: '180px', textAlign: 'center',
      }}>
        GROW
      </div>

      {/* ── Bezier connectors: root → categories ─────────────── */}
      <svg
        width="100%"
        height={72}
        viewBox={`0 0 100 72`}
        preserveAspectRatio="none"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {categories.map((_c, i) => {
          const cx = ((i + 0.5) / N) * 100;
          return (
            <path
              key={i}
              d={`M 50 0 C 50 ${72 * 0.55}, ${cx} ${72 * 0.45}, ${cx} 72`}
              stroke="#cbd5e1"
              strokeWidth="0.5"
              fill="none"
            />
          );
        })}
      </svg>

      {/* ── Category columns ─────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: CARD_GAP,
        alignItems: 'flex-start',
        justifyContent: 'center',
        flexWrap: 'nowrap', // one row, no wrapping
      }}>
        {categories.map(cat => {
          const catTasks = tasks.filter(t => t.category === cat); // pre-sorted by TreeDataLoader
          const color    = catTasks[0]?.color ?? '#94a3b8';
          const avg      = catTasks.length
            ? Math.round(catTasks.reduce((s, t) => s + (t.progress ?? 0), 0) / catTasks.length)
            : 0;

          const isDropTarget = editMode && dragOverCategory === cat && dragTaskId !== null;
          const draggedTaskCat = dragTaskId ? tasks.find(t => t.id === dragTaskId)?.category : null;
          const isOwnCategory  = draggedTaskCat === cat;

          return (
            <div
              key={cat}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}
              onDragOver={editMode ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (!isOwnCategory) setDragOverCategory(cat); } : undefined}
              onDragLeave={editMode ? () => setDragOverCategory(null) : undefined}
              onDrop={editMode ? (e) => {
                e.preventDefault();
                setDragOverCategory(null);
                const tId = e.dataTransfer.getData('text/plain');
                const gId = categoryGroupId[cat];
                if (tId && gId && !isOwnCategory) onTaskMove(tId, gId, cat);
              } : undefined}
            >
              {/* Category header */}
              <div style={{
                width: CARD_W,
                padding: '10px 14px',
                background: isDropTarget ? `${color}18` : '#ffffff',
                border: isDropTarget ? `2px solid ${color}` : '1px solid #e2e8f0',
                borderTop: `4px solid ${color}`,
                borderRadius: '12px',
                textAlign: 'center',
                boxShadow: isDropTarget ? `0 0 0 3px ${color}33` : shadows.sm,
                transition: 'background 0.15s, box-shadow 0.15s, border 0.15s',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#171717', fontFamily: typography.fontFamily }}>{cat}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: typography.fontFamily, marginTop: '2px' }}>
                  {catTasks.length} משימות · {avg}%
                  {isDropTarget && <span style={{ marginRight: '6px', color, fontWeight: 700 }}> ← שחרר כאן</span>}
                </div>
              </div>

              {/* Bezier connector: category → first task */}
              <svg width="2" height="24" viewBox="0 0 2 24" style={{ overflow: 'visible' }}>
                <path d="M 1 0 C 1 12, 1 12, 1 24" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
              </svg>

              {/* Task cards column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, alignItems: 'center' }}>
                {catTasks.map((task, idx) => (
                  <div key={task.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {idx > 0 && (
                      <svg width="2" height="10" viewBox="0 0 2 10" style={{ overflow: 'visible' }}>
                        <path d="M 1 0 C 1 5, 1 5, 1 10" stroke="#e2e8f0" strokeWidth="1" fill="none" />
                      </svg>
                    )}
                    <TaskCard
                      task={task}
                      color={color}
                      currentUserName={currentUserName}
                      editMode={editMode}
                      onDragStart={onDragStart}
                      isDragging={dragTaskId === task.id}
                    />
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

// ── Fit-to-width zoom ─────────────────────────────────────────────────────────
// Scales so the full horizontal width of the tree fits in the viewport.
function doFitWidth(
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

  // Fit to width (priority), cap at 1× to avoid blurry upscale
  const scale = Math.min((ww / w) * 0.94, 1);
  const x = (ww - w * scale) / 2;
  // Center vertically if tree fits; otherwise leave some top padding
  const y = Math.max((wh - h * scale) / 2, 32);

  api.setTransform(x, y, scale, animTime);
  return true;
}

// ── Canvas wrapper ────────────────────────────────────────────────────────────
function TreeCanvas_Wrapper({
  tasks,
  treeRef,
  transformRef,
  currentUserName,
  animDone,
  editMode,
  dragTaskId,
  onDragStart,
  onTaskMove,
}: {
  tasks: MedicalTask[];
  treeRef: React.RefObject<HTMLDivElement | null>;
  transformRef: React.RefObject<ReactZoomPanPinchRef | null>;
  currentUserName: string | null;
  animDone: boolean;
  editMode: boolean;
  dragTaskId: string | null;
  onDragStart: (taskId: string) => void;
  onTaskMove: (taskId: string, newGroupId: string, newCategory: string) => void;
}) {
  const centered = useRef(false);

  const tryCenter = useCallback(() => {
    if (centered.current) return;
    if (!transformRef.current || !treeRef.current) return;
    const ok = doFitWidth(transformRef.current, treeRef.current, 0);
    if (ok) centered.current = true;
  }, [transformRef, treeRef]);

  // Only start centering after the modal open animation has finished —
  // prevents fitView from measuring a partially-sized container.
  useEffect(() => {
    if (!animDone || !tasks.length) return;
    centered.current = false;
    const t1 = setTimeout(tryCenter, 50);
    const t2 = setTimeout(tryCenter, 250);
    const t3 = setTimeout(tryCenter, 600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [tasks, tryCenter, animDone]);

  return (
    <TransformWrapper
      initialScale={1}
      minScale={0.12}
      maxScale={3}
      limitToBounds={false}
      centerZoomedOut={false}
      wheel={{ step: 0.06 }}
      panning={{ velocityDisabled: true, disabled: editMode }}
      doubleClick={{ disabled: true }}
      onInit={(ref) => {
        transformRef.current = ref;
      }}
    >
      {({ zoomIn, zoomOut }) => (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%', overflow: 'hidden', background: '#f8fafc' }}
            contentStyle={{ display: 'inline-flex' }}
          >
            <TreeCanvas
              tasks={tasks}
              treeRef={treeRef}
              currentUserName={currentUserName}
              editMode={editMode}
              dragTaskId={dragTaskId}
              onDragStart={onDragStart}
              onTaskMove={onTaskMove}
            />
          </TransformComponent>

          {/* Zoom controls — glass panel, bottom-right */}
          <div style={{
            position: 'absolute', bottom: 14, right: 14, zIndex: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '14px',
            border: '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
            padding: '6px',
          }}>
            {[
              { icon: <ZoomIn size={16} />,    fn: () => zoomIn(),                                   tip: 'הגדל' },
              { icon: <ZoomOut size={16} />,   fn: () => zoomOut(),                                  tip: 'הקטן' },
              { icon: <Maximize2 size={16} />, fn: () => { centered.current = false; tryCenter(); }, tip: 'התאם רוחב' },
            ].map(({ icon, fn, tip }) => (
              <button key={tip} onClick={fn} title={tip}
                style={{
                  width: 36, height: 36, border: 'none', borderRadius: '10px',
                  background: 'transparent', color: '#475569',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: 0, transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#1e293b'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
              >{icon}</button>
            ))}
          </div>

          {/* Legend */}
          <div style={{
            position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: '16px',
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)',
            border: '1px solid #e2e8f0', borderRadius: '8px',
            padding: '5px 14px', pointerEvents: 'none',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#64748b', fontFamily: typography.fontFamily }}>
              <span style={{ width: 10, height: 10, borderRadius: '2px', background: '#f8fafc', border: '1px dashed #cbd5e1', display: 'inline-block' }} />
              לא החל
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#64748b', fontFamily: typography.fontFamily }}>
              <span style={{ width: 10, height: 10, borderRadius: '2px', background: '#4f46e518', border: '1px solid #4f46e555', display: 'inline-block' }} />
              פעיל
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#64748b', fontFamily: typography.fontFamily }}>
              <span style={{ width: 10, height: 10, borderRadius: '2px', background: RIBBON_COLOR, display: 'inline-block' }} />
              משימות שלי
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: typography.fontFamily }}>גלול לזום · גרור לניווט</span>
          </div>
        </div>
      )}
    </TransformWrapper>
  );
}

// ── Data loader ───────────────────────────────────────────────────────────────
interface LoaderProps {
  transformRef: React.RefObject<ReactZoomPanPinchRef | null>;
  treeRef: React.RefObject<HTMLDivElement | null>;
  animDone: boolean;
  editMode: boolean;
  onDragStart: (taskId: string) => void;
  dragTaskId: string | null;
  onTaskMove: (taskId: string, newGroupId: string, newCategory: string) => void;
}

function TreeDataLoader({ transformRef, treeRef, animDone, editMode, onDragStart, dragTaskId, onTaskMove }: LoaderProps) {
  const { user, profile } = useAuth();
  const currentUserName = profile?.full_name ?? null;

  const { projects, loading: projectsLoading } = useProjects(user?.id);
  const projectId = projects[0]?.id ?? null;
  const { tasks: rawTasks, loading: tasksLoading } = useTasks(projectId);

  // Optimistic overrides: taskId → { group_id, category, color }
  const [overrides, setOverrides] = useState<Record<string, { group_id: string; category: string; color: string }>>({});

  const handleTaskMove = useCallback(async (taskId: string, newGroupId: string, newCategory: string) => {
    const newColor = rawTasks.find(t => t.category === newCategory)?.color ?? '#94a3b8';
    // Optimistic update
    setOverrides(prev => ({ ...prev, [taskId]: { group_id: newGroupId, category: newCategory, color: newColor } }));
    // Persist to DB
    const { error } = await supabase.from('tasks').update({ group_id: newGroupId }).eq('id', taskId);
    if (error) {
      console.error('[BigPicture] move failed:', error.message);
      // Rollback
      setOverrides(prev => { const n = { ...prev }; delete n[taskId]; return n; });
    }
    onTaskMove(taskId, newGroupId, newCategory);
  }, [rawTasks, onTaskMove]);

  // Sort within each category: higher activity score → top.
  const tasks = useMemo(() => {
    // Apply overrides
    const merged = rawTasks.map(t => overrides[t.id] ? { ...t, ...overrides[t.id] } : t);

    // 1. Collect unique category order from the raw array
    const categoryOrder = [...new Set(merged.map(t => t.category))];

    // 2. Bucket tasks by category
    const buckets = new Map<string, MedicalTask[]>();
    for (const t of merged) {
      if (!buckets.has(t.category)) buckets.set(t.category, []);
      buckets.get(t.category)!.push(t);
    }

    // 3. Sort each bucket independently
    for (const bucket of buckets.values()) {
      bucket.sort((a, b) => {
        const sa = Number(a.progress) * 10 + (a.assignedTo ? 1 : 0);
        const sb = Number(b.progress) * 10 + (b.assignedTo ? 1 : 0);
        return sb - sa;
      });
    }

    // 4. Flatten preserving original category order
    return categoryOrder.flatMap(cat => buckets.get(cat) ?? []);
  }, [rawTasks, overrides]);

  const isLoading = projectsLoading || (!!projectId && tasksLoading);

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.text.tertiary, fontFamily: typography.fontFamily, fontSize: '14px', gap: '10px', background: '#f8fafc' }}>
      <div style={{ width: 20, height: 20, border: '2px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '9999px', animation: 'bpSpin 0.7s linear infinite' }} />
      טוען...
    </div>
  );

  if (!projectId) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.text.tertiary, fontFamily: typography.fontFamily, fontSize: '14px', background: '#f8fafc' }}>
      לא נמצאו נתונים לפרויקט זה
    </div>
  );

  return (
    <TreeCanvas_Wrapper
      tasks={tasks}
      treeRef={treeRef}
      transformRef={transformRef}
      currentUserName={currentUserName}
      animDone={animDone}
      editMode={editMode}
      dragTaskId={dragTaskId}
      onDragStart={onDragStart}
      onTaskMove={handleTaskMove}
    />
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────────
function ModalShell({ onClose }: { onClose: () => void }) {
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const treeRef = useRef<HTMLDivElement | null>(null);
  const [animDone, setAnimDone] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (editMode) setEditMode(false); else onClose(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, editMode]);

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* Backdrop — fades in with the modal */}
      <motion.div
        key="bp-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 9000,
        }}
      />

      {/* Modal — subtle scale + fade with ease-out spring feel */}
      <motion.div
        key="bp-modal"
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        onAnimationComplete={() => setAnimDone(true)}
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '96vw', maxWidth: '1280px', height: '92vh',
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
          padding: '14px 20px',
          background: editMode ? '#faf5ff' : '#ffffff',
          borderBottom: editMode ? '1px solid #ddd6fe' : '1px solid #e2e8f0',
          flexShrink: 0,
          transition: 'background 0.2s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 4, height: 20, background: editMode ? '#7c3aed' : '#4f46e5', borderRadius: '2px' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: colors.text.primary, fontFamily: typography.fontFamily, letterSpacing: '-0.3px' }}>
              GROW — תמונה מלאה
            </span>
            {editMode && (
              <span style={{
                fontSize: '11px', fontWeight: 600, color: '#7c3aed',
                background: '#ede9fe', padding: '3px 10px', borderRadius: '20px',
                fontFamily: typography.fontFamily,
              }}>
                מצב עריכה — גרור כרטיסים בין עמודות
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Edit mode toggle */}
            <button
              onClick={() => setEditMode(m => !m)}
              title={editMode ? 'סיום עריכה' : 'מצב עריכה — גרור משימות'}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '8px', border: 'none',
                background: editMode ? '#7c3aed' : '#f1f5f9',
                color: editMode ? '#ffffff' : '#475569',
                cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                fontFamily: typography.fontFamily,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {editMode ? <Check size={14} /> : <Pencil size={14} />}
              {editMode ? 'סיום' : 'עריכה'}
            </button>
          </div>
          <button
            onClick={onClose}
            title="סגור (Esc)"
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
        <div
          style={{ flex: 1, overflow: 'hidden', position: 'relative' }}
          onDragEnd={() => setDragTaskId(null)}
        >
          <TreeDataLoader
            transformRef={transformRef}
            treeRef={treeRef}
            animDone={animDone}
            editMode={editMode}
            dragTaskId={dragTaskId}
            onDragStart={setDragTaskId}
            onTaskMove={() => setDragTaskId(null)}
          />
        </div>
      </motion.div>
    </>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────
export function BigPictureModal() {
  const bigPictureOpen  = useUIStore(s => s.bigPictureOpen);
  const closeBigPicture = useUIStore(s => s.closeBigPicture);
  useBodyScrollLock(bigPictureOpen);

  return createPortal(
    <AnimatePresence>
      {bigPictureOpen && <ModalShell key="bp-modal-shell" onClose={closeBigPicture} />}
    </AnimatePresence>,
    document.body,
  );
}
