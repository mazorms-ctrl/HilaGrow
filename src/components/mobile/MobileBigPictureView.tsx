/**
 * MobileBigPictureView — Radial Mindmap
 * Pannable canvas with circular nodes, SVG connectors, quick-look popup.
 * Layout: GROW root → categories (ring) → tasks (outer ring per category)
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronDown } from 'lucide-react';
import { useTasks, useProjects, type MedicalTask } from '@/lib/supabase-hooks';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography } from '@/styles/tokens';

// ── Layout constants ──────────────────────────────────────────────────────────
const R_ROOT  = 44;   // root node radius
const R_CAT   = 34;   // category node radius
const R_TASK  = 26;   // task node radius
const D_CAT   = 195;  // distance root → category center
const D_TASK  = 165;  // distance category → task center

// ── Node color by status ──────────────────────────────────────────────────────
function nodeColor(task: MedicalTask, catColor: string) {
  if (task.status === 'done' || task.progress >= 100) return '#10b981';
  if (task.status === 'blocked')                      return '#ef4444';
  if (task.progress > 0)                              return catColor;
  return '#cbd5e1';
}

// ── Radial layout calculation ─────────────────────────────────────────────────
interface NodeDef {
  id:     string;
  x:      number;
  y:      number;
  r:      number;
  label:  string;
  color:  string;
  fill:   string;
  type:   'root' | 'cat' | 'task';
  task?:  MedicalTask;
  catColor?: string;
}

interface EdgeDef { x1: number; y1: number; x2: number; y2: number; color: string; }

function buildLayout(tasks: MedicalTask[]) {
  const catMap = new Map<string, MedicalTask[]>();
  for (const t of tasks) {
    if (!catMap.has(t.category)) catMap.set(t.category, []);
    catMap.get(t.category)!.push(t);
  }
  const categories = [...catMap.entries()];
  const N = categories.length;

  // canvas is large enough for any layout
  const cx = 550;
  const cy = 550;

  const nodes: NodeDef[] = [];
  const edges: EdgeDef[] = [];

  // Root
  nodes.push({ id: 'root', x: cx, y: cy, r: R_ROOT, label: 'GROW', color: '#fff', fill: '#4f46e5', type: 'root' });

  categories.forEach(([cat, catTasks], ci) => {
    // Spread categories evenly around a full circle, starting top
    const catAngle = (ci / N) * 2 * Math.PI - Math.PI / 2;
    const catX = cx + D_CAT * Math.cos(catAngle);
    const catY = cy + D_CAT * Math.sin(catAngle);
    const catColor = catTasks[0]?.color ?? '#4f46e5';
    const catId = `cat-${ci}`;

    nodes.push({
      id: catId, x: catX, y: catY, r: R_CAT,
      label: cat, color: '#fff', fill: catColor, type: 'cat',
    });
    edges.push({ x1: cx, y1: cy, x2: catX, y2: catY, color: catColor + '80' });

    // Spread tasks in a fan around the category, pointing away from root
    const M = catTasks.length;
    const fanSpread = Math.min(Math.PI * 0.7, (M - 1) * 0.55);
    const baseAngle = catAngle; // tasks fan out in same direction as cat from root

    catTasks.forEach((task, ti) => {
      const taskAngle = M === 1
        ? baseAngle
        : baseAngle - fanSpread / 2 + (ti / (M - 1)) * fanSpread;
      const taskX = catX + D_TASK * Math.cos(taskAngle);
      const taskY = catY + D_TASK * Math.sin(taskAngle);
      const fill = nodeColor(task, catColor);

      nodes.push({
        id: task.id, x: taskX, y: taskY, r: R_TASK,
        label: task.title, color: '#fff', fill, type: 'task', task, catColor,
      });
      edges.push({ x1: catX, y1: catY, x2: taskX, y2: taskY, color: fill + '70' });
    });
  });

  // Canvas bounding box (with padding)
  const pad = 100;
  const allX = nodes.map(n => n.x);
  const allY = nodes.map(n => n.y);
  const minX = Math.min(...allX) - pad;
  const minY = Math.min(...allY) - pad;
  const maxX = Math.max(...allX) + pad;
  const maxY = Math.max(...allY) + pad;
  const canvasW = maxX - minX;
  const canvasH = maxY - minY;

  // Shift all nodes so minX/minY = 0
  const shifted = nodes.map(n => ({ ...n, x: n.x - minX, y: n.y - minY }));
  const shiftedEdges = edges.map(e => ({ ...e, x1: e.x1 - minX, y1: e.y1 - minY, x2: e.x2 - minX, y2: e.y2 - minY }));
  const rootShifted = { x: cx - minX, y: cy - minY };

  return { nodes: shifted, edges: shiftedEdges, canvasW, canvasH, rootCenter: rootShifted };
}

// ── Quick-look popup ──────────────────────────────────────────────────────────
function QuickLook({ node, onClose }: { node: NodeDef; onClose: () => void }) {
  const navigate = useNavigate();
  const task = node.task!;
  const doneMilestones  = task.milestones?.filter(m => m.done).length ?? 0;
  const totalMilestones = task.milestones?.length ?? 0;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,23,42,0.25)' }}
      />

      {/* Bottom sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
        background: '#fff',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px calc(env(safe-area-inset-bottom, 0px) + 90px)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        direction: 'rtl',
        fontFamily: typography.fontFamily,
        animation: 'qlSlideUp 0.22s ease',
        maxHeight: '65vh',
        overflowY: 'auto',
      }}>
        <style>{`@keyframes qlSlideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

        {/* Drag handle */}
        <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '-8px auto 16px' }} />

        {/* Status strip */}
        <div style={{ height: 3, borderRadius: 2, background: node.fill, marginBottom: 14 }} />

        {/* Title + meta */}
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{task.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
            background: node.fill + '20', color: node.fill,
          }}>
            {task.progress}%
          </span>
          {task.priority && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
              background: task.priority === 'P1' ? '#fee2e2' : task.priority === 'P2' ? '#fed7aa' : '#e0e7ff',
              color: task.priority === 'P1' ? '#dc2626' : task.priority === 'P2' ? '#ea580c' : '#4f46e5',
            }}>
              {task.priority}
            </span>
          )}
          {task.owner && (
            <span style={{ fontSize: 11, color: '#64748b' }}>👤 {task.owner}</span>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, borderRadius: 3, background: '#f1f5f9', marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${task.progress}%`, background: node.fill, borderRadius: 3, transition: 'width 0.4s' }} />
        </div>

        {/* Milestones */}
        {totalMilestones > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8, letterSpacing: '0.3px' }}>
              אבני דרך — {doneMilestones}/{totalMilestones}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {task.milestones.map((m, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '8px 10px',
                  background: m.done ? '#f0fdf4' : '#f8fafc',
                  borderRadius: 10,
                }}>
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                    background: m.done ? '#10b981' : 'transparent',
                    border: m.done ? 'none' : '1.5px solid #cbd5e1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {m.done && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5l2.5 2.5L8 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span style={{
                    fontSize: 13, color: m.done ? '#64748b' : '#334155',
                    lineHeight: 1.5,
                    textDecoration: m.done ? 'line-through' : 'none',
                    textDecorationColor: '#94a3b8',
                  }}>
                    {m.text}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Open full details */}
        <button
          onClick={() => { onClose(); navigate(`/task/${task.id}`); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            width: '100%', marginTop: 18, padding: '12px',
            background: colors.brand.primary, color: '#fff',
            borderRadius: 12, border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          פתח פרטים מלאים
        </button>
      </div>
    </>
  );
}

// ── Circular node ─────────────────────────────────────────────────────────────
function MapNode({
  node,
  onTap,
}: {
  node: NodeDef;
  onTap: (n: NodeDef) => void;
}) {
  // Truncate label to fit inside circle
  const maxChars = node.type === 'root' ? 8 : node.type === 'cat' ? 6 : 5;
  const label = node.label.length > maxChars ? node.label.slice(0, maxChars - 1) + '…' : node.label;

  const handleTouch = useCallback((e: React.TouchEvent) => {
    e.stopPropagation(); // prevent panning when tapping a node
    onTap(node);
  }, [node, onTap]);

  return (
    <g
      transform={`translate(${node.x},${node.y})`}
      style={{ cursor: 'pointer' }}
      onTouchStart={handleTouch}
      onClick={() => onTap(node)} // fallback for desktop testing
    >
      {/* Outer glow ring for active tasks */}
      {node.type === 'task' && node.task && node.task.progress > 0 && node.task.progress < 100 && (
        <circle r={node.r + 5} fill={node.fill + '20'} />
      )}

      {/* Main circle */}
      <circle
        r={node.r}
        fill={node.fill}
        stroke={node.type === 'root' ? '#3730a3' : node.fill === '#cbd5e1' ? '#94a3b8' : node.fill}
        strokeWidth={node.type === 'root' ? 3 : 1.5}
        opacity={node.fill === '#cbd5e1' ? 0.6 : 1}
      />

      {/* Progress arc for task nodes */}
      {node.type === 'task' && node.task && node.task.progress > 0 && node.task.progress < 100 && (() => {
        const progress = node.task!.progress / 100;
        const r = node.r - 4;
        const circumference = 2 * Math.PI * r;
        const dashOffset = circumference * (1 - progress);
        return (
          <circle
            r={r}
            fill="none"
            stroke="#fff"
            strokeWidth={3}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90)"
            opacity={0.5}
          />
        );
      })()}

      {/* Label text */}
      <text
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontSize: node.type === 'root' ? 13 : node.type === 'cat' ? 10 : 9,
          fontWeight: node.type === 'root' ? 800 : 600,
          fill: node.type === 'task' && node.fill === '#cbd5e1' ? '#64748b' : '#fff',
          fontFamily: typography.fontFamily,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {/* Split long label across two lines */}
        {label.length > 4 && node.type !== 'root' ? (
          <>
            <tspan x="0" dy="-0.6em">{label.slice(0, Math.ceil(label.length / 2))}</tspan>
            <tspan x="0" dy="1.2em">{label.slice(Math.ceil(label.length / 2))}</tspan>
          </>
        ) : (
          label
        )}
      </text>
    </g>
  );
}

// ── Mindmap canvas ────────────────────────────────────────────────────────────
function MindmapCanvas({ tasks }: { tasks: MedicalTask[] }) {
  const { nodes, edges, canvasW, canvasH, rootCenter } = buildLayout(tasks);
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<NodeDef | null>(null);

  // Touch-pan tracking
  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const didPan = useRef(false);

  // Center on root on first mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    setOffset({
      x: vw / 2 - rootCenter.x,
      y: vh / 2 - rootCenter.y,
    });
  }, [rootCenter.x, rootCenter.y]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    didPan.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!lastTouch.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - lastTouch.current.x;
    const dy = e.touches[0].clientY - lastTouch.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didPan.current = true;
    setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
    lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    e.preventDefault();
  };

  const onTouchEnd = () => { lastTouch.current = null; };

  const handleNodeTap = useCallback((node: NodeDef) => {
    if (didPan.current) return; // ignore tap if user was panning
    if (node.type === 'task') setSelectedNode(node);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, overflow: 'hidden', position: 'relative', touchAction: 'none' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Hint */}
      <div style={{
        position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
        fontSize: 11, color: '#94a3b8', background: 'rgba(255,255,255,0.85)',
        padding: '3px 10px', borderRadius: 20, zIndex: 10,
        pointerEvents: 'none', whiteSpace: 'nowrap',
        backdropFilter: 'blur(4px)',
      }}>
        גרור לניווט · לחץ על פרויקט לפרטים
      </div>

      {/* SVG canvas */}
      <svg
        width={canvasW}
        height={canvasH}
        style={{
          position: 'absolute',
          top: offset.y,
          left: offset.x,
          overflow: 'visible',
        }}
      >
        <defs>
          <style>{`
            @keyframes bpDash {
              from { stroke-dashoffset: 12; }
              to   { stroke-dashoffset: 0; }
            }
          `}</style>
        </defs>

        {/* Edges */}
        {edges.map((e, i) => (
          <line
            key={i}
            x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke={e.color}
            strokeWidth={2}
            strokeDasharray="6 4"
            style={{ animation: 'bpDash 1.2s linear infinite' }}
          />
        ))}

        {/* Nodes */}
        {nodes.map(node => (
          <MapNode key={node.id} node={node} onTap={handleNodeTap} />
        ))}
      </svg>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)',
        border: '1px solid #e2e8f0', borderRadius: 10,
        padding: '5px 12px', fontSize: 10.5, color: '#64748b',
        fontFamily: typography.fontFamily, whiteSpace: 'nowrap', zIndex: 5,
      }}>
        {[
          { bg: colors.brand.primary, label: 'פעיל' },
          { bg: '#10b981',            label: 'הושלם' },
          { bg: '#ef4444',            label: 'תקוע' },
          { bg: '#cbd5e1',            label: 'טרם החל' },
        ].map(({ bg, label }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: bg, display: 'inline-block' }} />
            {label}
          </span>
        ))}
      </div>

      {/* Quick-look popup */}
      {selectedNode && (
        <QuickLook node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}
    </div>
  );
}

// ── Data wrapper ──────────────────────────────────────────────────────────────
function MapContent() {
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
          width: 20, height: 20, border: '2px solid #e2e8f0',
          borderTopColor: colors.brand.primary, borderRadius: '50%',
          animation: 'bpSpin 0.7s linear infinite',
        }} />
        טוען מפה...
        <style>{`@keyframes bpSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!tasks.length) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>
        אין נתונים להצגה
      </div>
    );
  }

  return <MindmapCanvas tasks={tasks} />;
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

      <MapContent />
    </div>
  );
}
