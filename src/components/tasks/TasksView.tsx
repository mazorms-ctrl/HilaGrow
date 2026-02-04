import { useMemo } from 'react';
import { useTasksWithRelations } from '@/hooks/useData';
import { useUIStore } from '@/store/uiStore';
import { TaskCard } from './TaskCard';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function TasksView() {
  const { data: tasks = [], isLoading } = useTasksWithRelations();
  const { searchQuery, setSearchQuery, openTaskDrawer } = useUIStore();

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

  // Group tasks by category
  const groupedTasks = useMemo(() => {
    const groups = new Map<string, typeof filteredTasks>();
    
    filteredTasks.forEach((task) => {
      const groupId = task.group?.id || 'ungrouped';
      if (!groups.has(groupId)) {
        groups.set(groupId, []);
      }
      groups.get(groupId)!.push(task);
    });

    return Array.from(groups.entries()).map(([, tasks]) => ({
      group: tasks[0]?.group,
      tasks: tasks.sort((a, b) => a.order - b.order),
    }));
  }, [filteredTasks]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="flex items-center gap-4">
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
        <Button variant="outline" size="md">
          סינון
        </Button>
      </div>

      {/* Summary stats */}
      <div className="flex gap-4">
        <div className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3">
          <div className="text-2xl font-bold text-primary-700">
            {tasks.length}
          </div>
          <div className="text-sm text-primary-600">משימות כולל</div>
        </div>
        <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3">
          <div className="text-2xl font-bold text-success-700">
            {tasks.filter((t) => t.progress.progress === 100).length}
          </div>
          <div className="text-sm text-success-600">הושלמו</div>
        </div>
        <div className="rounded-lg border border-warning-200 bg-warning-50 px-4 py-3">
          <div className="text-2xl font-bold text-warning-700">
            {tasks.filter((t) => t.progress.progress > 0 && t.progress.progress < 100).length}
          </div>
          <div className="text-sm text-warning-600">בתהליך</div>
        </div>
      </div>

      {/* Tasks grouped by category */}
      {groupedTasks.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 py-16 text-center">
          <p className="text-neutral-500">לא נמצאו משימות</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedTasks.map(({ group, tasks }) => (
            <div key={group?.id || 'ungrouped'}>
              {/* Group header */}
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="h-1 w-12 rounded-full"
                  style={{ backgroundColor: group?.color || '#e5e5e5' }}
                />
                <h2 className="text-xl font-bold text-neutral-900">
                  {group?.name || 'ללא קטגוריה'}
                </h2>
                <span className="text-sm text-neutral-500">
                  ({tasks.length})
                </span>
              </div>

              {/* Horizontal scroll of cards */}
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4">
                  {tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => openTaskDrawer(task.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
