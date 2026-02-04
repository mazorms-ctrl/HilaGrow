import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProject,
  fetchGroups,
  fetchTasks,
  fetchMilestones,
  createTask,
  updateTask,
  deleteTask,
  createGroup,
  updateGroup,
  deleteGroup,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  calculateTaskProgress,
  fetchPeople,
  createPerson,
  updatePerson,
  deletePerson,
  fetchTaskWatchers,
  addTaskWatcher,
  removeTaskWatcher,
} from '@/lib/dataService';
import type { Task, Milestone, TaskWithRelations, Person, Group } from '@/types';
import { useMemo } from 'react';

// Query keys
export const queryKeys = {
  project: ['project'] as const,
  groups: ['groups'] as const,
  tasks: ['tasks'] as const,
  milestones: ['milestones'] as const,
  people: ['people'] as const,
  taskWatchers: (taskId: string) => ['task-watchers', taskId] as const,
};

// --- Queries ---

export function useProject() {
  return useQuery({
    queryKey: queryKeys.project,
    queryFn: fetchProject,
  });
}

export function useGroups() {
  return useQuery({
    queryKey: queryKeys.groups,
    queryFn: fetchGroups,
  });
}

export function useTasks() {
  return useQuery({
    queryKey: queryKeys.tasks,
    queryFn: fetchTasks,
  });
}

export function useMilestones() {
  return useQuery({
    queryKey: queryKeys.milestones,
    queryFn: fetchMilestones,
  });
}

// Combined query: tasks with relations
export function useTasksWithRelations() {
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: groups = [], isLoading: groupsLoading } = useGroups();
  const { data: milestones = [], isLoading: milestonesLoading } = useMilestones();

  const tasksWithRelations: TaskWithRelations[] = useMemo(() => {
    return tasks.map((task) => {
      const group = groups.find((g) => g.id === task.groupId);
      const taskMilestones = milestones.filter((m) => m.taskId === task.id);
      const progress = calculateTaskProgress(task, taskMilestones);

      return {
        ...task,
        group: group!,
        milestones: taskMilestones,
        progress,
      };
    });
  }, [tasks, groups, milestones]);

  return {
    data: tasksWithRelations,
    isLoading: tasksLoading || groupsLoading || milestonesLoading,
  };
}

// Get single task by ID
export function useTask(taskId: string | null) {
  const { data: tasksWithRelations = [], isLoading } = useTasksWithRelations();
  
  const task = useMemo(() => {
    if (!taskId) return null;
    return tasksWithRelations.find((t) => t.id === taskId) || null;
  }, [taskId, tasksWithRelations]);

  return { data: task, isLoading };
}

// --- Mutations ---

// Groups mutations
export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    },
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Group> }) =>
      updateGroup(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.milestones });
    },
  });
}

// Tasks mutations
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      updateTask(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(queryKeys.tasks);

      // Optimistically update
      queryClient.setQueryData(queryKeys.tasks, (old: Task[] = []) =>
        old.map((task) =>
          task.id === id ? { ...task, ...updates } : task
        )
      );

      return { previousTasks };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks, context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.milestones });
    },
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMilestone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.milestones });
    },
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Milestone> }) =>
      updateMilestone(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.milestones });
      const previousMilestones = queryClient.getQueryData(queryKeys.milestones);

      queryClient.setQueryData(queryKeys.milestones, (old: Milestone[] = []) =>
        old.map((milestone) =>
          milestone.id === id ? { ...milestone, ...updates } : milestone
        )
      );

      return { previousMilestones };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousMilestones) {
        queryClient.setQueryData(queryKeys.milestones, context.previousMilestones);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.milestones });
    },
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMilestone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.milestones });
    },
  });
}

// --- People hooks ---

export function usePeople() {
  return useQuery({
    queryKey: queryKeys.people,
    queryFn: fetchPeople,
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPerson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.people });
    },
  });
}

export function useUpdatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Person> }) =>
      updatePerson(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.people });
    },
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePerson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.people });
    },
  });
}

// --- Task Watchers hooks ---

export function useTaskWatchers(taskId: string | null) {
  return useQuery({
    queryKey: taskId ? queryKeys.taskWatchers(taskId) : ['task-watchers-null'],
    queryFn: () => (taskId ? fetchTaskWatchers(taskId) : Promise.resolve([])),
    enabled: !!taskId,
  });
}

export function useAddTaskWatcher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, personId }: { taskId: string; personId: string }) =>
      addTaskWatcher(taskId, personId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.taskWatchers(variables.taskId) 
      });
    },
  });
}

export function useRemoveTaskWatcher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, personId }: { taskId: string; personId: string }) =>
      removeTaskWatcher(taskId, personId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.taskWatchers(variables.taskId) 
      });
    },
  });
}
