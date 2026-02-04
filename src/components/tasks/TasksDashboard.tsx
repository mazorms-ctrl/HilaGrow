import { WorkItemRow } from '@/components/ui/WorkItemRow';
import { Drawer } from '@/components/ui/Drawer';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';

// Type definition for medical task from App.tsx
export interface MedicalTask {
  id: number;
  title: string;
  description: string;
  category: string;
  color: string;
  owner: string;
  priority: 'P1' | 'P2' | 'P3';
  progress: number;
  department: string;
  processName: string;
  problemStatement: string;
  goal: string;
  kpiName: string;
  baseline: string;
  target: string;
  measurementCadence: string;
  startDate: string;
  dueDate: string;
  stakeholders: string[];
  risksBlockers: string;
  dependencies: string;
  links: string;
  milestones: Array<{ text: string; done: boolean }>;
}

interface TasksDashboardProps {
  tasks: MedicalTask[];
  onSelectTask: (task: MedicalTask) => void;
  onRenameCategory?: (oldName: string, newName: string) => void;
  onAddCategory?: (name: string, color: string) => void;
  onUpdateCategoryColor?: (category: string, newColor: string) => void;
  onRequestAddTask?: () => void;
  owners?: string[];
  onAddOwner?: (name: string) => void;
  onRenameOwner?: (oldName: string, newName: string) => void;
}

export function TasksDashboard({
  tasks,
  onSelectTask,
  onRenameCategory,
  onAddCategory,
  onUpdateCategoryColor,
  onRequestAddTask,
  owners: ownersProp,
  onAddOwner,
  onRenameOwner,
}: TasksDashboardProps) {
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'P1' | 'P2' | 'P3'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryDraft, setEditingCategoryDraft] = useState<string>('');
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#7dd3fc');
  const [isOwnersManagerOpen, setIsOwnersManagerOpen] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [editingOwner, setEditingOwner] = useState<string | null>(null);
  const [editingOwnerDraft, setEditingOwnerDraft] = useState<string>('');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const getCategoryVariant = (color: string): 'purple' | 'blue' | 'green' => {
    if (color.includes('fc')) return 'purple';
    if (color.includes('7dd')) return 'blue';
    return 'green';
  };

  const hexToRgba = (hex: string, alpha: number) => {
    const normalized = hex.trim();
    const match = /^#?([a-fA-F0-9]{6})$/.exec(normalized);
    if (!match) return `rgba(0,0,0,${alpha})`;
    const value = match[1];
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'he'));
  }, [tasks]);

  const owners = useMemo(() => {
    if (ownersProp && ownersProp.length > 0) {
      return ownersProp
        .map((o) => (typeof o === 'string' ? o.trim() : ''))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'he'));
    }
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.owner) set.add(t.owner);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'he'));
  }, [tasks, ownersProp]);

  const visibleTasks = useMemo(() => {
    const priorityRank = { P1: 0, P2: 1, P3: 2 } as const;

    return tasks
      .filter((t) => (priorityFilter === 'all' ? true : t.priority === priorityFilter))
      .filter((t) => (categoryFilter === 'all' ? true : t.category === categoryFilter))
      .filter((t) => (ownerFilter === 'all' ? true : t.owner === ownerFilter))
      .slice()
      .sort((a, b) => {
        const byPriority = priorityRank[a.priority] - priorityRank[b.priority];
        if (byPriority !== 0) return byPriority;
        return a.title.localeCompare(b.title, 'he');
      });
  }, [tasks, priorityFilter, categoryFilter, ownerFilter]);

  const groupedVisibleTasks = useMemo(() => {
    const map = new Map<string, MedicalTask[]>();

    visibleTasks.forEach((t) => {
      const key = t.category?.trim() || 'ללא קטגוריה';
      const list = map.get(key);
      if (list) list.push(t);
      else map.set(key, [t]);
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'he'))
      .map(([category, items]) => ({
        category,
        items,
        color: items[0]?.color || '#94A3B8',
      }));
  }, [visibleTasks]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const startEditCategory = (category: string) => {
    setEditingCategory(category);
    setEditingCategoryDraft(category);
  };

  const cancelEditCategory = () => {
    setEditingCategory(null);
    setEditingCategoryDraft('');
  };

  const saveEditCategory = (oldName: string) => {
    const newName = editingCategoryDraft.trim();
    if (!newName) return;

    onRenameCategory?.(oldName, newName);
    setExpandedCategories((prev) => prev.map((c) => (c === oldName ? newName : c)));

    // If filters point to old name, update locally too
    setCategoryFilter((prev) => (prev === oldName ? newName : prev));

    cancelEditCategory();
  };

  const startEditOwner = (owner: string) => {
    setEditingOwner(owner);
    setEditingOwnerDraft(owner);
  };

  const cancelEditOwner = () => {
    setEditingOwner(null);
    setEditingOwnerDraft('');
  };

  const saveEditOwner = (oldName: string) => {
    const newName = editingOwnerDraft.trim();
    if (!newName) return;
    if (!onRenameOwner) return;

    onRenameOwner(oldName, newName);
    setOwnerFilter((prev) => (prev === oldName ? newName : prev));
    cancelEditOwner();
  };

  const addOwner = () => {
    const name = newOwnerName.trim();
    if (!name) return;
    if (!onAddOwner) return;
    onAddOwner(name);
    setNewOwnerName('');
  };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (priorityFilter !== 'all') count++;
    if (categoryFilter !== 'all') count++;
    if (ownerFilter !== 'all') count++;
    return count;
  }, [priorityFilter, categoryFilter, ownerFilter]);

  // Get active filters summary
  const activeFiltersSummary = useMemo(() => {
    const filters: string[] = [];
    if (priorityFilter !== 'all') filters.push(priorityFilter);
    if (categoryFilter !== 'all') filters.push(categoryFilter);
    if (ownerFilter !== 'all') filters.push(ownerFilter);
    return filters.join(', ');
  }, [priorityFilter, categoryFilter, ownerFilter]);

  // Filters content (used in both desktop and mobile drawer)
  const filtersContent = (
    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3" dir="rtl">
      <select
        className="flex h-9 w-full sm:w-auto sm:min-w-[160px] rounded-[10px] border border-neutral-900/10 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition-colors hover:border-neutral-900/16 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
        value={priorityFilter}
        onChange={(e) => setPriorityFilter(e.target.value as 'all' | 'P1' | 'P2' | 'P3')}
      >
        <option value="all">כל הדחיפויות</option>
        <option value="P1">P1 - דחוף</option>
        <option value="P2">P2 - בינוני</option>
        <option value="P3">P3 - נמוך</option>
      </select>

      <select
        className="flex h-9 w-full sm:w-auto sm:min-w-[160px] rounded-[10px] border border-neutral-900/10 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition-colors hover:border-neutral-900/16 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
      >
        <option value="all">כל הקטגוריות</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        className="flex h-9 w-full sm:w-auto sm:min-w-[160px] rounded-[10px] border border-neutral-900/10 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition-colors hover:border-neutral-900/16 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
        value={ownerFilter}
        onChange={(e) => setOwnerFilter(e.target.value)}
      >
        <option value="all">כל האחראים</option>
        {owners.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="h-9 w-full sm:w-auto rounded-[10px] border border-neutral-900/10 bg-neutral-50 px-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 min-h-[44px] sm:min-h-0"
        onClick={() => {
          setPriorityFilter('all');
          setCategoryFilter('all');
          setOwnerFilter('all');
        }}
      >
        נקה סינון
      </button>

      {onRequestAddTask && (
        <button
          type="button"
          className="h-9 rounded-[10px] bg-blue-50 px-3 text-sm font-bold text-blue-500 transition-colors hover:bg-blue-100"
          onClick={onRequestAddTask}
        >
          ➕ משימה
        </button>
      )}

      {(onAddOwner || onRenameOwner) && (
        <button
          type="button"
          className="h-9 rounded-[10px] border border-neutral-900/10 bg-white px-3 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50"
          onClick={() => setIsOwnersManagerOpen((v) => !v)}
        >
          👥 אחראים
        </button>
      )}

      {onAddCategory && (
        <button
          type="button"
          className="h-9 rounded-[10px] border border-blue-500/25 bg-blue-50 px-3 text-sm font-rubik font-semibold text-blue-700 transition-colors hover:bg-blue-100"
          onClick={() => setIsAddCategoryOpen((v) => !v)}
        >
          ➕ קטגוריה
        </button>
      )}
    </div>
  );

  return (
    <div className="no-main-padding min-h-screen bg-white p-0">
      {/* Mobile: Compact Filter Button */}
      <div className="mb-3 sm:hidden" dir="rtl">
        <button
          type="button"
          className="flex h-11 w-full items-center justify-between rounded-[10px] border border-neutral-900/10 bg-white px-4 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-50"
          onClick={() => setIsMobileFiltersOpen(true)}
        >
          <span className="flex items-center gap-2">
            🔍 סינון
            {activeFiltersCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500 px-1.5 text-xs font-bold text-white">
                {activeFiltersCount}
              </span>
            )}
          </span>
          {activeFiltersCount > 0 && (
            <span className="truncate text-xs text-neutral-600 mr-2">
              {activeFiltersSummary}
            </span>
          )}
        </button>
      </div>

      {/* Desktop: Full Filters */}
      <div className="mb-3 hidden sm:flex flex-wrap items-center gap-3 rounded-md border border-neutral-900/10 bg-white p-3">
        {filtersContent}
      </div>

      {/* Mobile Filters Drawer */}
      <Drawer
        open={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        title="סינון משימות"
      >
        <div className="space-y-4">
          {filtersContent}
        </div>
      </Drawer>

      {(onAddOwner || onRenameOwner) && isOwnersManagerOpen && (
        <div className="mb-3 rounded-md border border-neutral-900/10 bg-white p-3" dir="rtl">
          <div className="flex flex-wrap items-end gap-3">
            <div className="text-sm font-bold text-neutral-800">ניהול אחראים</div>

            {onAddOwner && (
              <>
                <input
                  className="h-9 w-[260px] rounded-[10px] border border-neutral-900/10 bg-white px-3 text-sm font-semibold text-neutral-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  placeholder="שם אחראי חדש…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addOwner();
                    if (e.key === 'Escape') setIsOwnersManagerOpen(false);
                  }}
                />
                <button
                  type="button"
                  className="h-9 rounded-[10px] bg-blue-600 px-3 text-sm font-extrabold text-white transition-colors hover:bg-blue-700"
                  onClick={addOwner}
                >
                  הוסף
                </button>
              </>
            )}

            <button
              type="button"
              className="h-9 rounded-[10px] border border-neutral-900/10 bg-neutral-50 px-3 text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-100"
              onClick={() => setIsOwnersManagerOpen(false)}
            >
              סגור
            </button>
          </div>

          <div className="mt-3 grid gap-2">
            {owners.map((o) => {
              const isEditing = editingOwner === o;
              return (
                <div
                  key={o}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-neutral-900/10 bg-white px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    {!isEditing ? (
                      <div className="truncate text-sm font-semibold text-neutral-900">{o}</div>
                    ) : (
                      <input
                        className="h-8 w-full rounded-[8px] border border-neutral-900/10 bg-white px-2 text-sm font-semibold text-neutral-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                        value={editingOwnerDraft}
                        onChange={(e) => setEditingOwnerDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditOwner(o);
                          if (e.key === 'Escape') cancelEditOwner();
                        }}
                        autoFocus
                      />
                    )}
                  </div>

                  {onRenameOwner && !isEditing && (
                    <button
                      type="button"
                      className="h-7 rounded-[8px] border border-neutral-900/10 bg-white px-2 text-xs font-rubik font-semibold text-neutral-700 hover:bg-neutral-50"
                      onClick={() => startEditOwner(o)}
                    >
                      ערוך
                    </button>
                  )}

                  {onRenameOwner && isEditing && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="h-7 rounded-[8px] bg-blue-600 px-2 text-xs font-extrabold text-white hover:bg-blue-700"
                        onClick={() => saveEditOwner(o)}
                      >
                        שמור
                      </button>
                      <button
                        type="button"
                        className="h-7 rounded-[8px] border border-neutral-900/10 bg-white px-2 text-xs font-rubik font-semibold text-neutral-700 hover:bg-neutral-50"
                        onClick={cancelEditOwner}
                      >
                        בטל
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {onAddCategory && isAddCategoryOpen && (
        <div className="mb-3 rounded-md border border-neutral-900/10 bg-white p-3" dir="rtl">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm font-bold text-neutral-800">קטגוריה חדשה</div>
            <input
              className="h-9 w-[260px] rounded-[10px] border border-neutral-900/10 bg-white px-3 text-sm font-semibold text-neutral-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="שם קטגוריה…"
            />
            <input
              className="h-9 w-12 cursor-pointer rounded-[10px] border border-neutral-900/10 bg-white p-1"
              type="color"
              value={newCategoryColor}
              onChange={(e) => setNewCategoryColor(e.target.value)}
              aria-label="בחר צבע קטגוריה"
            />
            <button
              type="button"
              className="h-9 rounded-[10px] bg-blue-600 px-3 text-sm font-extrabold text-white transition-colors hover:bg-blue-700"
              onClick={() => {
                const name = newCategoryName.trim();
                if (!name) return;
                onAddCategory(name, newCategoryColor);
                setExpandedCategories((prev) => [...new Set([...prev, name])]);
                setNewCategoryName('');
                setIsAddCategoryOpen(false);
              }}
            >
              הוסף
            </button>
            <button
              type="button"
              className="h-9 rounded-[10px] border border-neutral-900/10 bg-neutral-50 px-3 text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-100"
              onClick={() => setIsAddCategoryOpen(false)}
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Work Items List */}
      <div className="space-y-2.5 rounded-[3px] text-center" data-cursor-element-id="cursor-el-637">
        {groupedVisibleTasks.map(({ category, items, color: categoryColor }) => (
          <div key={category} className="space-y-2.5">
            {(() => {
              const isOpen = expandedCategories.includes(category);
              const isEditing = editingCategory === category;

              return (
                <div className="w-full" dir="rtl">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={cn(
                      'w-full rounded-md border px-3 py-2 text-right transition-colors',
                      'hover:bg-neutral-50/80'
                    )}
                    style={{
                      backgroundColor: hexToRgba(categoryColor, 0.08),
                      borderColor: hexToRgba(categoryColor, 0.28),
                      borderRightWidth: '4px',
                      borderRightStyle: 'solid',
                      borderRightColor: categoryColor,
                    }}
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {!isEditing ? (
                          <div className="truncate text-sm font-bold text-neutral-900">{category}</div>
                        ) : (
                          <input
                            className="h-8 w-full rounded-[8px] border border-neutral-900/10 bg-white px-2 text-sm font-bold text-neutral-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                            value={editingCategoryDraft}
                            onChange={(e) => setEditingCategoryDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditCategory(category);
                              if (e.key === 'Escape') cancelEditCategory();
                            }}
                            autoFocus
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {onUpdateCategoryColor && (
                          <input
                            type="color"
                            value={categoryColor}
                            className="h-7 w-10 cursor-pointer rounded-[8px] border border-neutral-900/10 bg-white p-1"
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              onUpdateCategoryColor(category, e.target.value);
                            }}
                            aria-label="שנה צבע קטגוריה"
                          />
                        )}

                        {onRenameCategory && !isEditing && (
                          <button
                            type="button"
                            className="h-7 rounded-[8px] border border-neutral-900/10 bg-white px-2 text-xs font-rubik font-semibold text-neutral-700 hover:bg-neutral-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditCategory(category);
                            }}
                          >
                            ערוך
                          </button>
                        )}

                        {onRenameCategory && isEditing && (
                          <>
                            <button
                              type="button"
                              className="h-7 rounded-[8px] bg-blue-600 px-2 text-xs font-extrabold text-white hover:bg-blue-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                saveEditCategory(category);
                              }}
                            >
                              שמור
                            </button>
                            <button
                              type="button"
                              className="h-7 rounded-[8px] border border-neutral-900/10 bg-white px-2 text-xs font-rubik font-semibold text-neutral-700 hover:bg-neutral-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelEditCategory();
                              }}
                            >
                              בטל
                            </button>
                          </>
                        )}

                        <div className="text-xs font-semibold tabular-nums text-neutral-700">
                          {items.length}
                        </div>
                        <div
                          className={cn(
                            'text-neutral-700 transition-transform duration-200',
                            isOpen ? 'rotate-180' : 'rotate-0'
                          )}
                          aria-hidden="true"
                        >
                          ▾
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })()}

            {expandedCategories.includes(category) && items.map((task) => {
              // Calculate progress stats from milestones
              const completedMilestones = task.milestones.filter((m) => m.done).length;
              const totalMilestones = task.milestones.length;
              const openCount = totalMilestones - completedMilestones;

              return (
                <WorkItemRow
                  key={task.id}
                  title={task.title}
                  priority={task.priority}
                  category={{ label: task.category, variant: getCategoryVariant(categoryColor) }}
                  accentColor={categoryColor}
                  owner={task.owner}
                  progress={{
                    current: completedMilestones,
                    total: totalMilestones,
                    openCount: openCount > 0 ? openCount : undefined,
                  }}
                  nextStep={task.goal || undefined}
                  milestones={task.milestones}
                  onClick={() => onSelectTask(task)}
                  onEdit={() => onSelectTask(task)}
                  description={task.description}
                  department={task.department}
                  processName={task.processName}
                  problemStatement={task.problemStatement}
                  goal={task.goal}
                  kpiName={task.kpiName}
                  baseline={task.baseline}
                  target={task.target}
                  measurementCadence={task.measurementCadence}
                  startDate={task.startDate}
                  dueDate={task.dueDate}
                  stakeholders={task.stakeholders}
                  risksBlockers={task.risksBlockers}
                  dependencies={task.dependencies}
                  links={task.links}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="mt-8 flex gap-4 rounded-md border border-neutral-200 bg-neutral-50 p-4">
        <div className="flex-1 text-center">
          <div className="text-2xl font-bold text-neutral-900">{tasks.length}</div>
          <div className="text-sm text-neutral-600">סה״כ משימות</div>
        </div>
        <div className="flex-1 text-center">
          <div className="text-2xl font-bold text-[#DC2626]">
            {tasks.filter(t => t.milestones.some(m => !m.done)).length}
          </div>
          <div className="text-sm text-neutral-600">פתוחות</div>
        </div>
        <div className="flex-1 text-center">
          <div className="text-2xl font-bold text-[#22C55E]">
            {tasks.filter(t => t.milestones.every(m => m.done)).length}
          </div>
          <div className="text-sm text-neutral-600">הושלמו</div>
        </div>
      </div>
    </div>
  );
}
