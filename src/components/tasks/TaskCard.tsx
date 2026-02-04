import type { TaskWithRelations } from '@/types';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { CheckCircle2, Circle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: TaskWithRelations;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { group, milestones, progress } = task;
  
  // Show only first 3 milestones
  const displayedMilestones = milestones.slice(0, 3);
  const remainingCount = Math.max(0, milestones.length - 3);

  // Determine progress color
  const getProgressColor = () => {
    if (progress.progress >= 80) return 'success';
    if (progress.progress >= 50) return 'primary';
    if (progress.progress >= 25) return 'warning';
    return 'danger';
  };

  return (
    <Card
      className={cn(
        "group w-full sm:w-80 flex-shrink-0 cursor-pointer transition-all hover:shadow-soft-lg",
        "hover:-translate-y-1"
      )}
      onClick={onClick}
    >
      {/* Header with category */}
      <div
        className="h-2 rounded-t-xl"
        style={{ backgroundColor: group?.color || '#e5e5e5' }}
      />

      <div className="p-5">
        {/* Category badge */}
        <div className="mb-3 flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: group?.color ? `${group.color}20` : '#f5f5f5',
              color: group?.color || '#737373',
            }}
          >
            {group?.name || 'ללא קטגוריה'}
          </span>
        </div>

        {/* Task title */}
        <h3 className="mb-2 text-lg font-semibold text-neutral-900 line-clamp-2">
          {task.title}
        </h3>

        {/* Description */}
        {task.description && (
          <p className="mb-4 text-sm text-neutral-600 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Owner */}
        {task.ownerName && (
          <div className="mb-4 flex items-center gap-2 text-sm text-neutral-700">
            <User className="h-4 w-4" />
            <span>{task.ownerName}</span>
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-xs text-neutral-600">
            <span>התקדמות</span>
            <span className="font-medium">{progress.progress}%</span>
          </div>
          <Progress value={progress.progress} color={getProgressColor()} />
        </div>

        {/* Milestones preview */}
        {milestones.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-700">
              <span>מיילסטונים</span>
              <span>
                {progress.completedMilestones}/{progress.totalMilestones}
              </span>
            </div>
            <div className="space-y-1">
              {displayedMilestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="flex items-center gap-2 text-sm"
                >
                  {milestone.done ? (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success-500" />
                  ) : (
                    <Circle className="h-4 w-4 flex-shrink-0 text-neutral-300" />
                  )}
                  <span
                    className={cn(
                      "truncate",
                      milestone.done
                        ? "text-neutral-500 line-through"
                        : "text-neutral-700"
                    )}
                  >
                    {milestone.title}
                  </span>
                </div>
              ))}
              {remainingCount > 0 && (
                <div className="text-xs text-neutral-500">
                  +{remainingCount} נוספים...
                </div>
              )}
            </div>
          </div>
        )}

        {milestones.length === 0 && (
          <div className="text-center text-sm text-neutral-400">
            אין מיילסטונים
          </div>
        )}
      </div>
    </Card>
  );
}
