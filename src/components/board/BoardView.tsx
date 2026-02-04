import { useMemo, useState } from 'react';
import { useTasksWithRelations } from '@/hooks/useData';
import { useUIStore } from '@/store/uiStore';
import { Loader2, Search, Eye } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export function BoardView() {
  const { data: tasks = [], isLoading } = useTasksWithRelations();
  const { searchQuery, setSearchQuery, openTaskDrawer } = useUIStore();
  const [sortBy, setSortBy] = useState<'group' | 'progress' | 'owner'>('group');

  // Filter tasks by search
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;

    const query = searchQuery.toLowerCase();
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.ownerName?.toLowerCase().includes(query) ||
        task.group?.name.toLowerCase().includes(query)
    );
  }, [tasks, searchQuery]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      if (sortBy === 'group') {
        return (a.group?.order || 0) - (b.group?.order || 0) || a.order - b.order;
      }
      if (sortBy === 'progress') {
        return b.progress.progress - a.progress.progress;
      }
      if (sortBy === 'owner') {
        return (a.ownerName || '').localeCompare(b.ownerName || '');
      }
      return 0;
    });
  }, [filteredTasks, sortBy]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
          <Input
            type="text"
            placeholder="חיפוש משימות..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={sortBy === 'group' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setSortBy('group')}
          >
            מיון לפי קטגוריה
          </Button>
          <Button
            variant={sortBy === 'progress' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setSortBy('progress')}
          >
            מיון לפי התקדמות
          </Button>
          <Button
            variant={sortBy === 'owner' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setSortBy('owner')}
          >
            מיון לפי אחראי
          </Button>
        </div>
      </div>

      {/* Table - Desktop only */}
      {sortedTasks.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 py-16 text-center">
          <p className="text-neutral-500">לא נמצאו משימות</p>
        </div>
      ) : (
        <>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-700">
                  קטגוריה
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-700">
                  משימה
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-700">
                  תיאור
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-700">
                  אחראי
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-700">
                  התקדמות
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-700">
                  מיילסטונים
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-700">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task, idx) => {
                const prevTask = idx > 0 ? sortedTasks[idx - 1] : null;
                const showGroupDivider = sortBy === 'group' && 
                  prevTask && 
                  prevTask.groupId !== task.groupId;

                return (
                  <tr
                    key={task.id}
                    className={cn(
                      "border-b border-neutral-200 transition-colors hover:bg-neutral-50",
                      showGroupDivider && "border-t-2 border-t-neutral-300"
                    )}
                  >
                    {/* Category */}
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: task.group?.color ? `${task.group.color}20` : '#f5f5f5',
                          color: task.group?.color || '#737373',
                        }}
                      >
                        {task.group?.name || 'ללא קטגוריה'}
                      </span>
                    </td>

                    {/* Task title */}
                    <td className="px-4 py-3">
                      <div className="max-w-xs">
                        <div className="font-medium text-neutral-900 line-clamp-1">
                          {task.title}
                        </div>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3">
                      <div className="max-w-md text-sm text-neutral-600 line-clamp-2">
                        {task.description || '-'}
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="px-4 py-3">
                      <div className="text-sm text-neutral-700">
                        {task.ownerName || '-'}
                      </div>
                    </td>

                    {/* Progress */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-24">
                          <Progress
                            value={task.progress.progress}
                            color={
                              task.progress.progress >= 80
                                ? 'success'
                                : task.progress.progress >= 50
                                ? 'primary'
                                : task.progress.progress >= 25
                                ? 'warning'
                                : 'danger'
                            }
                          />
                        </div>
                        <span className="text-sm font-medium text-neutral-700">
                          {task.progress.progress}%
                        </span>
                      </div>
                    </td>

                    {/* Milestones */}
                    <td className="px-4 py-3">
                      <div className="text-center text-sm text-neutral-700">
                        {task.progress.completedMilestones}/{task.progress.totalMilestones}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openTaskDrawer(task.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Cards - Mobile only */}
        <div className="md:hidden space-y-4">
          {sortedTasks.map((task) => (
            <Card
              key={task.id}
              className="cursor-pointer"
              onClick={() => openTaskDrawer(task.id)}
            >
              {/* Category color strip */}
              <div
                className="h-2 rounded-t-xl -mx-5 -mt-5 mb-3"
                style={{ backgroundColor: task.group?.color || '#e5e5e5' }}
              />

              {/* Category badge */}
              <div className="mb-3">
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: task.group?.color ? `${task.group.color}20` : '#f5f5f5',
                    color: task.group?.color || '#737373',
                  }}
                >
                  {task.group?.name || 'ללא קטגוריה'}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                {task.title}
              </h3>

              {/* Description */}
              {task.description && (
                <p className="text-sm text-neutral-600 mb-4 line-clamp-2">
                  {task.description}
                </p>
              )}

              {/* Owner */}
              {task.ownerName && (
                <div className="text-sm text-neutral-700 mb-3">
                  <span className="font-medium">אחראי:</span> {task.ownerName}
                </div>
              )}

              {/* Progress */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-neutral-600 mb-1">
                  <span>התקדמות</span>
                  <span className="font-medium">{task.progress.progress}%</span>
                </div>
                <Progress
                  value={task.progress.progress}
                  color={
                    task.progress.progress >= 80
                      ? 'success'
                      : task.progress.progress >= 50
                      ? 'primary'
                      : task.progress.progress >= 25
                      ? 'warning'
                      : 'danger'
                  }
                />
              </div>

              {/* Milestones */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">מיילסטונים:</span>
                <span className="font-medium text-neutral-900">
                  {task.progress.completedMilestones}/{task.progress.totalMilestones}
                </span>
              </div>
            </Card>
          ))}
        </div>
        </>
      )}

      {/* Summary */}
      {sortedTasks.length > 0 && (
        <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
          <div className="text-sm text-neutral-600">
            סה"כ {sortedTasks.length} משימות
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-success-600">
              ✓ {sortedTasks.filter((t) => t.progress.progress === 100).length} הושלמו
            </span>
            <span className="text-warning-600">
              ◐ {sortedTasks.filter((t) => t.progress.progress > 0 && t.progress.progress < 100).length} בתהליך
            </span>
            <span className="text-neutral-500">
              ○ {sortedTasks.filter((t) => t.progress.progress === 0).length} טרם התחילו
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
