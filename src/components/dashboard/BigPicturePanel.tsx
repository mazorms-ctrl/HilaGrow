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

  // Use side-specific border properties to avoid React shorthand conflict warnings
  const editBorderWidth  = '2px';
  const editBorderStyle  = 'dashed';
  const editBorderColor  = `${color}88`;

  return (
    <div
      draggable={editMode}
      onDragStart={editMode ? (e) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.setData('text/x-drag-type', 'task');
        onDragStart(task.id);
      } : undefined}
      onClick={editMode ? undefined : () => { closeBigPicture(); navigate(`/task/${task.id}`); }}
      style={{
        width: CARD_W,
        minWidth: CARD_W,
        maxWidth: CARD_W,
        padding: '11px 13px 0 13px',
        background: bg,
        borderTopWidth:    '3px',
        borderTopStyle:    'solid',
        borderTopColor:    topAccent,
        borderRightWidth:  editMode ? editBorderWidth  : '1px',
        borderRightStyle:  editMode ? editBorderStyle  : (isActive ? 'solid' : 'dashed'),
        borderRightColor:  editMode ? editBorderColor  : borderTint(color),
        borderBottomWidth: editMode ? editBorderWidth  : '1px',
        borderBottomStyle: editMode ? editBorderStyle  : (isActive ? 'solid' : 'dashed'),
        borderBottomColor: editMode ? editBorderColor  : borderTint(color),
        borderLeftWidth:   editMode ? editBorderWidth  : '1px',
        borderLeftStyle:   editMode ? editBorderStyle  : (isActive ? 'solid' : 'dashed'),
        borderLeftColor:   editMode ? editBorderColor  : borderTint(color),
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

// ── Category column (renders header + tasks, used at both levels) ──────────────
function CategoryColumn({
  cat,
  catTasks,
  color,
  tasks,
  currentUserName,
  editMode,
  dragTaskId,
  dragCatName,
  isNestTarget,        // this header is highlighted as a nesting target
  isTaskDropTarget,    // this column is highlighted for task-move drop
  onTaskDragStart,
  onTaskMove,
  onCatDragStart,
  onCatNest,
  onTaskDragOver,
  onTaskDragLeave,
  isChild,             // render at sub-column scale (slightly smaller header)
}: {
  cat: string;
  catTasks: MedicalTask[];
  color: string;
  tasks: MedicalTask[];
  currentUserName: string | null;
  editMode: boolean;
  dragTaskId: string | null;
  dragCatName: string | null;
  isNestTarget: boolean;
  isTaskDropTarget: boolean;
  onTaskDragStart: (taskId: string) => void;
  onTaskMove: (taskId: string, newCategory: string) => void;
  onCatDragStart: (catName: string) => void;
  onCatNest: (childCat: string, parentCat: string) => void;
  onTaskDragOver: (cat: string) => void;
  onTaskDragLeave: () => void;
  isChild?: boolean;
}) {
  const avg = catTasks.length
    ? Math.round(catTasks.reduce((s, t) => s + (t.progress ?? 0), 0) / catTasks.length)
    : 0;

  const draggedTaskCat = dragTaskId ? tasks.find(t => t.id === dragTaskId)?.category : null;
  const isOwnCategory  = draggedTaskCat === cat;

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}
      onDragOver={editMode ? (e) => {
        e.preventDefault();
        const dtype = e.dataTransfer.types.includes('text/x-drag-type')
          ? e.dataTransfer.getData('text/x-drag-type') // only works in drop, not dragOver
          : null;
        // Heuristic: if dragCatName is set → category drag; else task drag
        if (dragCatName) {
          e.dataTransfer.dropEffect = 'move';
        } else if (!isOwnCategory) {
          e.dataTransfer.dropEffect = 'move';
          onTaskDragOver(cat);
        }
        void dtype;
      } : undefined}
      onDragLeave={editMode ? () => onTaskDragLeave() : undefined}
      onDrop={editMode ? (e) => {
        e.preventDefault();
        e.stopPropagation();
        onTaskDragLeave();
        const dragType = e.dataTransfer.getData('text/x-drag-type');
        if (dragType === 'task') {
          const tId = e.dataTransfer.getData('text/plain');
          if (tId && !isOwnCategory) onTaskMove(tId, cat);
        }
        // category drops are handled on the header directly
      } : undefined}
    >
      {/* Category header — draggable in edit mode */}
      <div
        draggable={editMode}
        onDragStart={editMode ? (e) => {
          e.stopPropagation();
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', cat);
          e.dataTransfer.setData('text/x-drag-type', 'category');
          e.dataTransfer.setData('text/x-category-name', cat);
          onCatDragStart(cat);
        } : undefined}
        onDragOver={editMode && dragCatName && dragCatName !== cat ? (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'move';
        } : undefined}
        onDrop={editMode && dragCatName && dragCatName !== cat ? (e) => {
          e.preventDefault();
          e.stopPropagation();
          const childName = e.dataTransfer.getData('text/x-category-name');
          if (childName && childName !== cat) onCatNest(childName, cat);
        } : undefined}
        style={{
          width: isChild ? CARD_W : CARD_W,
          padding: '10px 14px',
          background: isNestTarget ? '#ede9fe' : (isTaskDropTarget ? `${color}18` : '#ffffff'),
          // Side-specific border properties — avoids React shorthand conflict warnings
          borderTopWidth:    isChild ? '3px' : '4px',
          borderTopStyle:    'solid',
          borderTopColor:    isNestTarget ? '#7c3aed' : color,
          borderRightWidth:  isNestTarget ? '2px' : (isTaskDropTarget ? '2px' : '1px'),
          borderRightStyle:  'solid',
          borderRightColor:  isNestTarget ? '#7c3aed' : (isTaskDropTarget ? color : '#e2e8f0'),
          borderBottomWidth: isNestTarget ? '2px' : (isTaskDropTarget ? '2px' : '1px'),
          borderBottomStyle: 'solid',
          borderBottomColor: isNestTarget ? '#7c3aed' : (isTaskDropTarget ? color : '#e2e8f0'),
          borderLeftWidth:   isNestTarget ? '2px' : (isTaskDropTarget ? '2px' : '1px'),
          borderLeftStyle:   'solid',
          borderLeftColor:   isNestTarget ? '#7c3aed' : (isTaskDropTarget ? color : '#e2e8f0'),
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: isNestTarget
            ? '0 0 0 3px rgba(124,58,237,0.25)'
            : isTaskDropTarget
              ? `0 0 0 3px ${color}33`
              : shadows.sm,
          transition: 'background 0.15s, box-shadow 0.15s',
          cursor: editMode ? 'grab' : 'default',
        }}
      >
        <div style={{ fontSize: isChild ? '12px' : '13px', fontWeight: 600, color: isNestTarget ? '#5b21b6' : '#171717', fontFamily: typography.fontFamily }}>
          {editMode && <span style={{ marginLeft: '4px', opacity: 0.5, fontSize: '10px' }}>⠿</span>}
          {cat}
        </div>
        <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: typography.fontFamily, marginTop: '2px' }}>
          {catTasks.length} משימות · {avg}%
          {isNestTarget    && <span style={{ marginRight: '6px', color: '#7c3aed', fontWeight: 700 }}> ← קטגוריית אב</span>}
          {isTaskDropTarget && <span style={{ marginRight: '6px', color, fontWeight: 700 }}> ← שחרר כאן</span>}
        </div>
      </div>

      {/* Connector + task cards */}
      {catTasks.length > 0 && (
        <>
          <svg width="2" height="24" viewBox="0 0 2 24" style={{ overflow: 'visible' }}>
            <path d="M 1 0 C 1 12, 1 12, 1 24" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
          </svg>
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
                  onDragStart={onTaskDragStart}
                  isDragging={dragTaskId === task.id}
                />
              </div>
            ))}
          </div>
        </>
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
  dragCatName,
  categoryParents,
  onTaskDragStart,
  onTaskMove,
  onCatDragStart,
  onCatNest,
}: {
  tasks: MedicalTask[];
  treeRef: React.RefObject<HTMLDivElement | null>;
  currentUserName: string | null;
  editMode: boolean;
  dragTaskId: string | null;
  dragCatName: string | null;
  categoryParents: Record<string, string>; // child catName → parent catName
  onTaskDragStart: (taskId: string) => void;
  onTaskMove: (taskId: string, newCategory: string) => void;
  onCatDragStart: (catName: string) => void;
  onCatNest: (childCat: string, parentCat: string) => void;
}) {
  const [dragOverTaskCat, setDragOverTaskCat] = useState<string | null>(null);

  // All category names from tasks
  const allCats = useMemo(() => [...new Set(tasks.map(t => t.category))], [tasks]);

  // Root categories = those not in categoryParents (no parent)
  const rootCats = useMemo(() => allCats.filter(c => !categoryParents[c]), [allCats, categoryParents]);

  // Children grouped by parent
  const childrenOf = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const [child, parent] of Object.entries(categoryParents)) {
      if (allCats.includes(child) && allCats.includes(parent)) {
        if (!map[parent]) map[parent] = [];
        map[parent].push(child);
      }
    }
    return map;
  }, [categoryParents, allCats]);

  const N = rootCats.length;

  if (N === 0 && allCats.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: colors.text.tertiary, fontFamily: typography.fontFamily }}>
      אין נתונים להצגה
    </div>
  );

  const handleTaskDragOver = (cat: string) => setDragOverTaskCat(cat);
  const handleTaskDragLeave = () => setDragOverTaskCat(null);

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
        borderTopWidth: '4px', borderTopStyle: 'solid', borderTopColor: '#4f46e5',
        borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: '#e2e8f0',
        borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: '#e2e8f0',
        borderLeftWidth: '1px', borderLeftStyle: 'solid', borderLeftColor: '#e2e8f0',
        borderRadius: '12px',
        fontFamily: typography.fontFamily,
        fontSize: '17px', fontWeight: 600, color: '#1e1b4b',
        boxShadow: shadows.md,
        letterSpacing: '-0.4px',
        minWidth: '180px', textAlign: 'center',
      }}>
        GROW
      </div>

      {/* ── Bezier connectors: root → root categories ─────────── */}
      <svg
        width="100%"
        height={72}
        viewBox={`0 0 100 72`}
        preserveAspectRatio="none"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {rootCats.map((_c, i) => {
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

      {/* ── Root category columns ─────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: CARD_GAP * 2,
        alignItems: 'flex-start',
        justifyContent: 'center',
        flexWrap: 'nowrap',
      }}>
        {rootCats.map(cat => {
          const children      = childrenOf[cat] ?? [];
          const directTasks   = tasks.filter(t => t.category === cat);
          const color         = directTasks[0]?.color ?? (tasks.find(t => t.category === cat)?.color) ?? '#94a3b8';
          const hasChildren   = children.length > 0;

          // Total pixel width of this root column (spans child columns)
          const totalW = hasChildren
            ? children.length * CARD_W + (children.length - 1) * CARD_GAP
            : CARD_W;

          return (
            <div key={cat} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>

              {/* Root category header — spans children width */}
              <div
                draggable={editMode}
                onDragStart={editMode ? (e) => {
                  e.stopPropagation();
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', cat);
                  e.dataTransfer.setData('text/x-drag-type', 'category');
                  e.dataTransfer.setData('text/x-category-name', cat);
                  onCatDragStart(cat);
                } : undefined}
                onDragOver={editMode && dragCatName && dragCatName !== cat ? (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'move';
                } : undefined}
                onDrop={editMode && dragCatName && dragCatName !== cat ? (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const childName = e.dataTransfer.getData('text/x-category-name');
                  if (childName && childName !== cat) onCatNest(childName, cat);
                } : undefined}
                style={{
                  width: totalW,
                  padding: '10px 14px',
                  background: dragCatName && dragCatName !== cat ? '#ede9fe' : '#ffffff',
                  borderTopWidth: '4px', borderTopStyle: 'solid',
                  borderTopColor: (dragCatName && dragCatName !== cat) ? '#7c3aed' : color,
                  borderRightWidth: '1px', borderRightStyle: 'solid',
                  borderRightColor: (dragCatName && dragCatName !== cat) ? '#7c3aed' : '#e2e8f0',
                  borderBottomWidth: '1px', borderBottomStyle: 'solid',
                  borderBottomColor: (dragCatName && dragCatName !== cat) ? '#7c3aed' : '#e2e8f0',
                  borderLeftWidth: '1px', borderLeftStyle: 'solid',
                  borderLeftColor: (dragCatName && dragCatName !== cat) ? '#7c3aed' : '#e2e8f0',
                  borderRadius: '12px',
                  textAlign: 'center',
                  boxShadow: (dragCatName && dragCatName !== cat)
                    ? '0 0 0 3px rgba(124,58,237,0.25)'
                    : shadows.sm,
                  transition: 'background 0.15s, box-shadow 0.15s',
                  cursor: editMode ? 'grab' : 'default',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: (dragCatName && dragCatName !== cat) ? '#5b21b6' : '#171717', fontFamily: typography.fontFamily }}>
                  {editMode && <span style={{ marginLeft: '4px', opacity: 0.5, fontSize: '10px' }}>⠿</span>}
                  {cat}
                  {hasChildren && <span style={{ marginRight: '6px', fontSize: '11px', color: '#94a3b8', fontWeight: 400 }}> ({children.length}+)</span>}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: typography.fontFamily, marginTop: '2px' }}>
                  {directTasks.length + children.reduce((s, c) => s + tasks.filter(t => t.category === c).length, 0)} משימות
                  {dragCatName && dragCatName !== cat && <span style={{ marginRight: '6px', color: '#7c3aed', fontWeight: 700 }}> ← שחרר ליצירת תת-קטגוריה</span>}
                </div>
              </div>

              {/* Children sub-columns */}
              {hasChildren && (
                <>
                  {/* Connectors root-header → child headers */}
                  <svg width={totalW} height={40} viewBox={`0 0 ${totalW} 40`} style={{ overflow: 'visible', display: 'block' }}>
                    {children.map((_, ci) => {
                      const cx = (ci + 0.5) / children.length * totalW;
                      return (
                        <path
                          key={ci}
                          d={`M ${totalW / 2} 0 C ${totalW / 2} 22, ${cx} 18, ${cx} 40`}
                          stroke="#cbd5e1" strokeWidth="1" fill="none"
                        />
                      );
                    })}
                  </svg>

                  {/* Child category columns side-by-side */}
                  <div style={{ display: 'flex', gap: CARD_GAP, alignItems: 'flex-start' }}>
                    {children.map(childCat => {
                      const childTasks = tasks.filter(t => t.category === childCat);
                      const childColor = childTasks[0]?.color ?? '#94a3b8';
                      return (
                        <CategoryColumn
                          key={childCat}
                          cat={childCat}
                          catTasks={childTasks}
                          color={childColor}
                          tasks={tasks}
                          currentUserName={currentUserName}
                          editMode={editMode}
                          dragTaskId={dragTaskId}
                          dragCatName={dragCatName}
                          isNestTarget={false}
                          isTaskDropTarget={editMode && dragOverTaskCat === childCat && dragTaskId !== null && tasks.find(t => t.id === dragTaskId)?.category !== childCat}
                          onTaskDragStart={onTaskDragStart}
                          onTaskMove={onTaskMove}
                          onCatDragStart={onCatDragStart}
                          onCatNest={onCatNest}
                          onTaskDragOver={handleTaskDragOver}
                          onTaskDragLeave={handleTaskDragLeave}
                          isChild
                        />
                      );
                    })}
                  </div>
                </>
              )}

              {/* Direct tasks of root cat (below children, if any) */}
              {directTasks.length > 0 && (
                <>
                  <svg width="2" height="24" viewBox="0 0 2 24" style={{ overflow: 'visible' }}>
                    <path d="M 1 0 C 1 12, 1 12, 1 24" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
                  </svg>
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 0, alignItems: 'center' }}
                    onDragOver={editMode && dragTaskId ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; handleTaskDragOver(cat); } : undefined}
                    onDragLeave={editMode ? handleTaskDragLeave : undefined}
                    onDrop={editMode ? (e) => {
                      e.preventDefault();
                      handleTaskDragLeave();
                      const dragType = e.dataTransfer.getData('text/x-drag-type');
                      if (dragType === 'task') {
                        const tId = e.dataTransfer.getData('text/plain');
                        const fromCat = tasks.find(t => t.id === tId)?.category;
                        if (tId && fromCat !== cat) onTaskMove(tId, cat);
                      }
                    } : undefined}
                  >
                    {directTasks.map((task, idx) => (
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
                          onDragStart={onTaskDragStart}
                          isDragging={dragTaskId === task.id}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Fit-to-width zoom ─────────────────────────────────────────────────────────
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

  const scale = Math.min((ww / w) * 0.94, 1);
  const x = (ww - w * scale) / 2;
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
  onToggleEdit,
  dragTaskId,
  dragCatName,
  categoryParents,
  onTaskDragStart,
  onTaskMove,
  onCatDragStart,
  onCatNest,
}: {
  tasks: MedicalTask[];
  treeRef: React.RefObject<HTMLDivElement | null>;
  transformRef: React.RefObject<ReactZoomPanPinchRef | null>;
  currentUserName: string | null;
  animDone: boolean;
  editMode: boolean;
  onToggleEdit: () => void;
  dragTaskId: string | null;
  dragCatName: string | null;
  categoryParents: Record<string, string>;
  onTaskDragStart: (taskId: string) => void;
  onTaskMove: (taskId: string, newCategory: string) => void;
  onCatDragStart: (catName: string) => void;
  onCatNest: (childCat: string, parentCat: string) => void;
}) {
  const centered = useRef(false);

  const tryCenter = useCallback(() => {
    if (centered.current) return;
    if (!transformRef.current || !treeRef.current) return;
    const ok = doFitWidth(transformRef.current, treeRef.current, 0);
    if (ok) centered.current = true;
  }, [transformRef, treeRef]);

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
              dragCatName={dragCatName}
              categoryParents={categoryParents}
              onTaskDragStart={onTaskDragStart}
              onTaskMove={onTaskMove}
              onCatDragStart={onCatDragStart}
              onCatNest={onCatNest}
            />
          </TransformComponent>

          {/* Controls panel — glass pill, bottom-right */}
          <div style={{
            position: 'absolute', bottom: 14, right: 14, zIndex: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '14px',
            borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(226,232,240,0.8)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
            padding: '6px',
          }}>
            {/* Edit mode toggle */}
            <button
              onClick={onToggleEdit}
              title={editMode ? 'סיום עריכה (Esc)' : 'מצב עריכה — גרור משימות וקטגוריות'}
              style={{
                width: 36, height: 36, borderWidth: 0, borderStyle: 'solid', borderColor: 'transparent',
                borderRadius: '10px',
                background: editMode ? '#7c3aed' : 'transparent',
                color: editMode ? '#ffffff' : '#4f46e5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0,
                transition: 'background 0.15s, color 0.15s',
                boxShadow: editMode ? '0 2px 8px rgba(124,58,237,0.35)' : 'none',
              }}
              onMouseEnter={(e) => { if (!editMode) { e.currentTarget.style.background = '#f1f5f9'; } }}
              onMouseLeave={(e) => { if (!editMode) { e.currentTarget.style.background = 'transparent'; } }}
            >
              {editMode ? <Check size={16} /> : <Pencil size={16} />}
            </button>

            {/* Divider */}
            <div style={{ width: 22, height: 1, background: 'rgba(226,232,240,0.8)', margin: '2px 0' }} />

            {/* Zoom buttons */}
            {[
              { icon: <ZoomIn size={16} />,    fn: () => zoomIn(),                                   tip: 'הגדל' },
              { icon: <ZoomOut size={16} />,   fn: () => zoomOut(),                                  tip: 'הקטן' },
              { icon: <Maximize2 size={16} />, fn: () => { centered.current = false; tryCenter(); }, tip: 'התאם רוחב' },
            ].map(({ icon, fn, tip }) => (
              <button key={tip} onClick={fn} title={tip}
                style={{
                  width: 36, height: 36, borderWidth: 0, borderStyle: 'solid', borderColor: 'transparent',
                  borderRadius: '10px',
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
            borderWidth: '1px', borderStyle: 'solid', borderColor: '#e2e8f0',
            borderRadius: '8px',
            padding: '5px 14px', pointerEvents: 'none',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#64748b', fontFamily: typography.fontFamily }}>
              <span style={{ width: 10, height: 10, borderRadius: '2px', background: '#f8fafc', borderWidth: '1px', borderStyle: 'dashed', borderColor: '#cbd5e1', display: 'inline-block' }} />
              לא החל
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#64748b', fontFamily: typography.fontFamily }}>
              <span style={{ width: 10, height: 10, borderRadius: '2px', background: '#4f46e518', borderWidth: '1px', borderStyle: 'solid', borderColor: '#4f46e555', display: 'inline-block' }} />
              פעיל
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#64748b', fontFamily: typography.fontFamily }}>
              <span style={{ width: 10, height: 10, borderRadius: '2px', background: RIBBON_COLOR, display: 'inline-block' }} />
              משימות שלי
            </span>
            {editMode
              ? <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 600, fontFamily: typography.fontFamily }}>גרור משימה לעמודה · גרור קטגוריה לאב</span>
              : <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: typography.fontFamily }}>גלול לזום · גרור לניווט</span>
            }
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
}

function TreeDataLoader({ transformRef, treeRef, animDone }: LoaderProps) {
  const { user, profile } = useAuth();
  const currentUserName = profile?.full_name ?? null;

  const { projects, loading: projectsLoading } = useProjects(user?.id);
  const projectId = projects[0]?.id ?? null;
  const { tasks: rawTasks, loading: tasksLoading } = useTasks(projectId);

  // ── Edit mode + drag state ────────────────────────────────────────────────
  const [editMode,   setEditMode]   = useState(false);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragCatName, setDragCatName] = useState<string | null>(null);

  // Escape exits edit mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && editMode) setEditMode(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editMode]);

  // ── Optimistic overrides for task moves ───────────────────────────────────
  const [taskOverrides, setTaskOverrides] = useState<Record<string, { groupId: string; category: string; color: string }>>({});

  // ── Category nesting (parent assignments) ─────────────────────────────────
  const [categoryParents, setCategoryParents] = useState<Record<string, string>>({});

  // category name → groupId (camelCase from MedicalTask)
  const categoryGroupId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of rawTasks) { if (t.groupId && !map[t.category]) map[t.category] = t.groupId; }
    return map;
  }, [rawTasks]);

  // onTaskMove receives only category name; we look up group_id here
  const handleTaskMove = useCallback(async (taskId: string, newCategory: string) => {
    const newGroupId = categoryGroupId[newCategory];
    const newColor   = rawTasks.find(t => t.category === newCategory)?.color ?? '#94a3b8';
    setTaskOverrides(prev => ({ ...prev, [taskId]: { groupId: newGroupId ?? '', category: newCategory, color: newColor } }));
    setDragTaskId(null);
    if (newGroupId) {
      const { error } = await supabase.from('tasks').update({ group_id: newGroupId }).eq('id', taskId);
      if (error) {
        console.error('[BigPicture] task move failed:', error.message);
        setTaskOverrides(prev => { const n = { ...prev }; delete n[taskId]; return n; });
      }
    }
  }, [rawTasks, categoryGroupId]);

  const handleCategoryNest = useCallback(async (childCat: string, parentCat: string) => {
    // Optimistic update
    setCategoryParents(prev => ({ ...prev, [childCat]: parentCat }));
    setDragCatName(null);

    const childGroupId  = categoryGroupId[childCat];
    const parentGroupId = categoryGroupId[parentCat];

    if (childGroupId && parentGroupId) {
      const { error } = await supabase
        .from('groups')
        .update({ parent_id: parentGroupId })
        .eq('id', childGroupId);
      if (error) {
        console.error('[BigPicture] category nest failed:', error.message);
        // Rollback
        setCategoryParents(prev => { const n = { ...prev }; delete n[childCat]; return n; });
      }
    }
  }, [categoryGroupId]);

  // Sort tasks within each category by activity score
  const tasks = useMemo(() => {
    const merged = rawTasks.map(t => taskOverrides[t.id] ? { ...t, ...taskOverrides[t.id] } : t);
    const categoryOrder = [...new Set(merged.map(t => t.category))];
    const buckets = new Map<string, MedicalTask[]>();
    for (const t of merged) {
      if (!buckets.has(t.category)) buckets.set(t.category, []);
      buckets.get(t.category)!.push(t);
    }
    for (const bucket of buckets.values()) {
      bucket.sort((a, b) => {
        const sa = Number(a.progress) * 10 + (a.assignedTo ? 1 : 0);
        const sb = Number(b.progress) * 10 + (b.assignedTo ? 1 : 0);
        return sb - sa;
      });
    }
    return categoryOrder.flatMap(cat => buckets.get(cat) ?? []);
  }, [rawTasks, taskOverrides]);

  const isLoading = projectsLoading || (!!projectId && tasksLoading);

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.text.tertiary, fontFamily: typography.fontFamily, fontSize: '14px', gap: '10px', background: '#f8fafc' }}>
      <div style={{ width: 20, height: 20, borderWidth: '2px', borderStyle: 'solid', borderColor: '#e2e8f0', borderTopColor: '#4f46e5', borderRadius: '9999px', animation: 'bpSpin 0.7s linear infinite' }} />
      טוען...
    </div>
  );

  if (!projectId) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.text.tertiary, fontFamily: typography.fontFamily, fontSize: '14px', background: '#f8fafc' }}>
      לא נמצאו נתונים לפרויקט זה
    </div>
  );

  return (
    <div
      style={{ width: '100%', height: '100%' }}
      onDragEnd={() => { setDragTaskId(null); setDragCatName(null); }}
    >
      <TreeCanvas_Wrapper
        tasks={tasks}
        treeRef={treeRef}
        transformRef={transformRef}
        currentUserName={currentUserName}
        animDone={animDone}
        editMode={editMode}
        onToggleEdit={() => setEditMode(m => !m)}
        dragTaskId={dragTaskId}
        dragCatName={dragCatName}
        categoryParents={categoryParents}
        onTaskDragStart={setDragTaskId}
        onTaskMove={handleTaskMove}
        onCatDragStart={setDragCatName}
        onCatNest={handleCategoryNest}
      />
    </div>
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────────
function ModalShell({ onClose }: { onClose: () => void }) {
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const treeRef = useRef<HTMLDivElement | null>(null);
  const [animDone, setAnimDone] = useState(false);

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

      {/* Modal */}
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
          background: '#ffffff',
          borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: '#e2e8f0',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 4, height: 20, background: '#4f46e5', borderRadius: '2px' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: colors.text.primary, fontFamily: typography.fontFamily, letterSpacing: '-0.3px' }}>
              GROW — תמונה מלאה
            </span>
          </div>
          <button
            onClick={onClose}
            title="סגור (Esc)"
            style={{
              width: 32, height: 32, borderRadius: '8px',
              background: 'none',
              borderWidth: '1px', borderStyle: 'solid', borderColor: '#e2e8f0',
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
          <TreeDataLoader
            transformRef={transformRef}
            treeRef={treeRef}
            animDone={animDone}
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
