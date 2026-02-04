import { useState, useEffect } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { useUIStore } from '@/store/uiStore';
import { 
  useTask, 
  useUpdateTask, 
  useUpdateMilestone, 
  useCreateMilestone, 
  useDeleteMilestone,
  usePeople,
  useCreatePerson,
  useTaskWatchers,
  useAddTaskWatcher,
  useRemoveTaskWatcher,
} from '@/hooks/useData';
import { CheckCircle2, Circle, Plus, Trash2, Loader2, Mail, UserPlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TaskDrawer() {
  const { selectedTaskId, isDrawerOpen, closeTaskDrawer } = useUIStore();
  const { data: task, isLoading } = useTask(selectedTaskId);
  const updateTask = useUpdateTask();
  const updateMilestone = useUpdateMilestone();
  const createMilestone = useCreateMilestone();
  const deleteMilestone = useDeleteMilestone();

  // People and watchers
  const { data: people = [] } = usePeople();
  const createPerson = useCreatePerson();
  const { data: watchers = [] } = useTaskWatchers(selectedTaskId);
  const addWatcher = useAddTaskWatcher();
  const removeWatcher = useRemoveTaskWatcher();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  
  // Add person modal state
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonEmail, setNewPersonEmail] = useState('');

  // Sync form with task data
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setOwnerName(task.ownerName || '');
    }
  }, [task]);

  const handleSaveBasicInfo = () => {
    if (!task) return;

    updateTask.mutate({
      id: task.id,
      updates: {
        title,
        description,
        ownerName,
      },
    });
  };

  const handleToggleMilestone = (milestoneId: string, done: boolean) => {
    updateMilestone.mutate({
      id: milestoneId,
      updates: { done: !done },
    });
  };

  const handleAddMilestone = () => {
    if (!task || !newMilestoneTitle.trim()) return;

    createMilestone.mutate(
      {
        taskId: task.id,
        title: newMilestoneTitle,
        done: false,
        order: task.milestones.length,
      },
      {
        onSuccess: () => {
          setNewMilestoneTitle('');
        },
      }
    );
  };

  const handleDeleteMilestone = (milestoneId: string) => {
    if (confirm('האם למחוק מיילסטון זה?')) {
      deleteMilestone.mutate(milestoneId);
    }
  };

  const handleAddPerson = () => {
    if (!newPersonName.trim() || !newPersonEmail.trim()) return;

    createPerson.mutate(
      {
        name: newPersonName.trim(),
        email: newPersonEmail.trim(),
      },
      {
        onSuccess: () => {
          setNewPersonName('');
          setNewPersonEmail('');
          setShowAddPerson(false);
        },
      }
    );
  };

  const handleToggleWatcher = (personId: string) => {
    if (!task) return;

    const isWatcher = watchers.some((w) => w.id === personId);

    if (isWatcher) {
      removeWatcher.mutate({ taskId: task.id, personId });
    } else {
      addWatcher.mutate({ taskId: task.id, personId });
    }
  };

  // Get progress color
  const getProgressColor = () => {
    if (!task) return 'primary';
    if (task.progress.progress >= 80) return 'success';
    if (task.progress.progress >= 50) return 'primary';
    if (task.progress.progress >= 25) return 'warning';
    return 'danger';
  };

  return (
    <Drawer
      open={isDrawerOpen}
      onClose={closeTaskDrawer}
      title={task ? 'עריכת משימה' : 'טוען...'}
    >
      {isLoading || !task ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Category badge */}
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
              style={{
                backgroundColor: task.group?.color ? `${task.group.color}20` : '#f5f5f5',
                color: task.group?.color || '#737373',
              }}
            >
              {task.group?.name || 'ללא קטגוריה'}
            </span>
          </div>

          {/* Title */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              כותרת
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="שם המשימה"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              תיאור
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תיאור מפורט של המשימה..."
              rows={4}
            />
          </div>

          {/* Owner */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              אחראי
            </label>
            <Input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="שם האחראי על המשימה"
            />
          </div>

          {/* Save button */}
          <Button
            onClick={handleSaveBasicInfo}
            disabled={updateTask.isPending}
            className="w-full"
          >
            {updateTask.isPending ? 'שומר...' : 'שמור שינויים'}
          </Button>

          {/* Progress section */}
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-neutral-900">
              התקדמות
            </h3>
            <Progress value={task.progress.progress} color={getProgressColor()} />
            <div className="mt-2 text-center text-sm text-neutral-600">
              {task.progress.completedMilestones} מתוך {task.progress.totalMilestones} מיילסטונים הושלמו
            </div>
          </div>

          {/* Email Notifications section */}
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-neutral-600" />
                <h3 className="text-sm font-semibold text-neutral-900">
                  התראות במייל
                </h3>
              </div>
              <button
                onClick={() => setShowAddPerson(!showAddPerson)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50"
              >
                <UserPlus className="h-3 w-3" />
                הוסף איש קשר
              </button>
            </div>

            <p className="mb-3 text-xs text-neutral-600">
              בעלי התפקידים הבאים יקבלו מייל כשאבן דרך מסומנת כהושלמה:
            </p>

            {/* Add person form */}
            {showAddPerson && (
              <div className="mb-3 rounded-md border border-primary-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-neutral-900">איש קשר חדש</h4>
                  <button
                    onClick={() => setShowAddPerson(false)}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="שם מלא"
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                  />
                  <Input
                    type="email"
                    placeholder="כתובת מייל"
                    value={newPersonEmail}
                    onChange={(e) => setNewPersonEmail(e.target.value)}
                  />
                  <Button
                    onClick={handleAddPerson}
                    disabled={!newPersonName.trim() || !newPersonEmail.trim() || createPerson.isPending}
                    size="sm"
                    className="w-full"
                  >
                    {createPerson.isPending ? 'שומר...' : 'הוסף'}
                  </Button>
                </div>
              </div>
            )}

            {/* Owner */}
            {task?.ownerName && (
              <div className="mb-2 flex items-center gap-2 rounded-md bg-white px-3 py-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                  👤
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-neutral-900">{task.ownerName}</div>
                  <div className="text-xs text-neutral-500">אחראי המשימה</div>
                </div>
              </div>
            )}

            {/* People list for watchers */}
            <div className="space-y-1">
              {people.length === 0 ? (
                <p className="text-center text-xs text-neutral-500 py-2">
                  אין אנשי קשר. לחץ על "הוסף איש קשר" כדי להוסיף.
                </p>
              ) : (
                people.map((person) => {
                  const isWatcher = watchers.some((w) => w.id === person.id);
                  const isOwner = task?.ownerName === person.name;

                  return (
                    <label
                      key={person.id}
                      className={cn(
                        "flex items-center gap-2 rounded-md bg-white px-3 py-2 cursor-pointer transition-colors",
                        isWatcher && "bg-primary-50 border border-primary-200",
                        isOwner && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isWatcher || isOwner}
                        onChange={() => handleToggleWatcher(person.id)}
                        disabled={isOwner || addWatcher.isPending || removeWatcher.isPending}
                        className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-neutral-900">
                          {person.name}
                          {isOwner && <span className="mr-1 text-xs text-neutral-500">(אחראי)</span>}
                        </div>
                        <div className="text-xs text-neutral-500">{person.email}</div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Milestones section */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-neutral-900">
              מיילסטונים
            </h3>

            {/* Milestones list */}
            <div className="mb-4 space-y-2">
              {task.milestones.length === 0 ? (
                <p className="text-center text-sm text-neutral-500">
                  אין מיילסטונים עדיין
                </p>
              ) : (
                task.milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3"
                  >
                    <button
                      onClick={() =>
                        handleToggleMilestone(milestone.id, milestone.done)
                      }
                      className="flex-shrink-0"
                    >
                      {milestone.done ? (
                        <CheckCircle2 className="h-5 w-5 text-success-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-neutral-300" />
                      )}
                    </button>
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        milestone.done
                          ? "text-neutral-500 line-through"
                          : "text-neutral-700"
                      )}
                    >
                      {milestone.title}
                    </span>
                    <button
                      onClick={() => handleDeleteMilestone(milestone.id)}
                      className="flex-shrink-0 text-danger-500 hover:text-danger-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add milestone */}
            <div className="flex gap-2">
              <Input
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                placeholder="מיילסטון חדש..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddMilestone();
                  }
                }}
              />
              <Button
                onClick={handleAddMilestone}
                disabled={!newMilestoneTitle.trim() || createMilestone.isPending}
                size="md"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
