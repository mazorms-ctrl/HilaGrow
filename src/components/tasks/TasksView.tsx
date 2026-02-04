import { useMemo, useState } from 'react';
import { useTasksWithRelations, useCreateTask, useGroups } from '@/hooks/useData';
import { useUIStore } from '@/store/uiStore';
import { TaskCard } from './TaskCard';
import { Loader2, Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';

export function TasksView() {
  const { data: tasks = [], isLoading } = useTasksWithRelations();
  const { data: groups = [] } = useGroups();
  const { searchQuery, setSearchQuery, openTaskDrawer } = useUIStore();
  const createTask = useCreateTask();
  
  // New task form state
  const [showNewTaskDrawer, setShowNewTaskDrawer] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskGroupId, setNewTaskGroupId] = useState('');
  const [newTaskOwner, setNewTaskOwner] = useState('');

  const handleCreateTask = () => {
    if (!newTaskTitle.trim() || !newTaskGroupId) return;

    createTask.mutate(
      {
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        groupId: newTaskGroupId,
        ownerName: newTaskOwner.trim() || undefined,
        progressMode: 'auto',
        order: tasks.length,
      },
      {
        onSuccess: () => {
          setNewTaskTitle('');
          setNewTaskDescription('');
          setNewTaskGroupId('');
          setNewTaskOwner('');
          setShowNewTaskDrawer(false);
        },
      }
    );
  };

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
        <Button 
          variant="primary" 
          size="md"
          onClick={() => setShowNewTaskDrawer(true)}
        >
          <Plus className="h-5 w-5 ml-1" />
          משימה חדשה
        </Button>
        <Button variant="outline" size="md">
          סינון
        </Button>
      </div>

      {/* Summary stats */}
      <div className="flex gap-4" dir="rtl">
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

      {/* New Task Drawer */}
      <Drawer
        open={showNewTaskDrawer}
        onClose={() => setShowNewTaskDrawer(false)}
        title="משימה חדשה"
      >
        <div className="space-y-4" dir="rtl">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              כותרת
            </label>
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="שם המשימה"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              תיאור
            </label>
            <textarea
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              placeholder="תיאור מפורט של המשימה..."
              rows={4}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              קטגוריה
            </label>
            <select
              value={newTaskGroupId}
              onChange={(e) => setNewTaskGroupId(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              <option value="">בחר קטגוריה...</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              אחראי
            </label>
            <Input
              value={newTaskOwner}
              onChange={(e) => setNewTaskOwner(e.target.value)}
              placeholder="שם האחראי (אופציונלי)"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleCreateTask}
              disabled={!newTaskTitle.trim() || !newTaskGroupId || createTask.isPending}
              className="flex-1"
            >
              {createTask.isPending ? 'יוצר...' : 'צור משימה'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowNewTaskDrawer(false)}
              className="flex-1"
            >
              ביטול
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
