import { supabase, isBackendConfigured } from './supabase';
import {
  mockProject,
  mockGroups,
  mockTasks,
  mockMilestones,
} from './mockData';
import type { Project, Group, Task, Milestone, TaskProgress, Person } from '@/types';

// Helper to calculate task progress
export function calculateTaskProgress(
  task: Task,
  milestones: Milestone[]
): TaskProgress {
  const taskMilestones = milestones.filter((m) => m.taskId === task.id);
  const completedCount = taskMilestones.filter((m) => m.done).length;
  const totalCount = taskMilestones.length;

  let progress = 0;
  if (task.progressMode === 'manual' && task.progressManual !== undefined) {
    progress = task.progressManual;
  } else if (totalCount > 0) {
    progress = Math.round((completedCount / totalCount) * 100);
  }

  return {
    taskId: task.id,
    progress,
    completedMilestones: completedCount,
    totalMilestones: totalCount,
  };
}

// --- Projects ---
export async function fetchProject(): Promise<Project> {
  if (!isBackendConfigured()) {
    return mockProject;
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .single();

  if (error) throw error;
  
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

// --- Groups ---
export async function fetchGroups(): Promise<Group[]> {
  if (!isBackendConfigured()) {
    return mockGroups;
  }

  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('order', { ascending: true });

  if (error) throw error;

  return data.map((g) => ({
    id: g.id,
    projectId: g.project_id,
    name: g.name,
    color: g.color,
    order: g.order,
    createdAt: new Date(g.created_at),
    updatedAt: new Date(g.updated_at),
  }));
}

// --- Tasks ---
export async function fetchTasks(): Promise<Task[]> {
  if (!isBackendConfigured()) {
    return mockTasks;
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('order', { ascending: true });

  if (error) throw error;

  return data.map((t) => ({
    id: t.id,
    groupId: t.group_id,
    title: t.title,
    description: t.description,
    ownerName: t.owner_name,
    progressMode: t.progress_mode as 'auto' | 'manual',
    progressManual: t.progress_manual,
    order: t.order,
    createdAt: new Date(t.created_at),
    updatedAt: new Date(t.updated_at),
  }));
}

export async function createTask(task: Partial<Task>): Promise<Task> {
  if (!isBackendConfigured()) {
    throw new Error('Backend not configured');
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      group_id: task.groupId,
      title: task.title,
      description: task.description,
      owner_name: task.ownerName,
      progress_mode: task.progressMode || 'auto',
      progress_manual: task.progressManual,
      order: task.order || 0,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    groupId: data.group_id,
    title: data.title,
    description: data.description,
    ownerName: data.owner_name,
    progressMode: data.progress_mode,
    progressManual: data.progress_manual,
    order: data.order,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export async function updateTask(
  id: string,
  updates: Partial<Task>
): Promise<Task> {
  if (!isBackendConfigured()) {
    throw new Error('Backend not configured');
  }

  const payload: any = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.ownerName !== undefined) payload.owner_name = updates.ownerName;
  if (updates.groupId !== undefined) payload.group_id = updates.groupId;
  if (updates.progressMode !== undefined) payload.progress_mode = updates.progressMode;
  if (updates.progressManual !== undefined) payload.progress_manual = updates.progressManual;
  if (updates.order !== undefined) payload.order = updates.order;

  const { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    groupId: data.group_id,
    title: data.title,
    description: data.description,
    ownerName: data.owner_name,
    progressMode: data.progress_mode,
    progressManual: data.progress_manual,
    order: data.order,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export async function deleteTask(id: string): Promise<void> {
  if (!isBackendConfigured()) {
    throw new Error('Backend not configured');
  }

  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

// --- Milestones ---
export async function fetchMilestones(): Promise<Milestone[]> {
  if (!isBackendConfigured()) {
    return mockMilestones;
  }

  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .order('order', { ascending: true });

  if (error) throw error;

  return data.map((m) => ({
    id: m.id,
    taskId: m.task_id,
    title: m.title,
    done: m.done,
    dueDate: m.due_date ? new Date(m.due_date) : undefined,
    order: m.order,
    createdAt: new Date(m.created_at),
    updatedAt: new Date(m.updated_at),
  }));
}

export async function createMilestone(
  milestone: Partial<Milestone>
): Promise<Milestone> {
  if (!isBackendConfigured()) {
    throw new Error('Backend not configured');
  }

  const { data, error } = await supabase
    .from('milestones')
    .insert({
      task_id: milestone.taskId,
      title: milestone.title,
      done: milestone.done || false,
      due_date: milestone.dueDate?.toISOString(),
      order: milestone.order || 0,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    taskId: data.task_id,
    title: data.title,
    done: data.done,
    dueDate: data.due_date ? new Date(data.due_date) : undefined,
    order: data.order,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export async function updateMilestone(
  id: string,
  updates: Partial<Milestone>
): Promise<Milestone> {
  if (!isBackendConfigured()) {
    throw new Error('Backend not configured');
  }

  const payload: any = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.done !== undefined) payload.done = updates.done;
  if (updates.dueDate !== undefined) payload.due_date = updates.dueDate?.toISOString();
  if (updates.order !== undefined) payload.order = updates.order;

  const { data, error } = await supabase
    .from('milestones')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    taskId: data.task_id,
    title: data.title,
    done: data.done,
    dueDate: data.due_date ? new Date(data.due_date) : undefined,
    order: data.order,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export async function deleteMilestone(id: string): Promise<void> {
  if (!isBackendConfigured()) {
    throw new Error('Backend not configured');
  }

  const { error } = await supabase.from('milestones').delete().eq('id', id);
  if (error) throw error;
}

// --- People ---
export async function fetchPeople(): Promise<Person[]> {
  if (!isBackendConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('people')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;

  return data.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    createdAt: new Date(p.created_at),
    updatedAt: new Date(p.updated_at),
  }));
}

export async function createPerson(person: Partial<Person>): Promise<Person> {
  if (!isBackendConfigured()) {
    throw new Error('Backend not configured');
  }

  const { data, error } = await supabase
    .from('people')
    .insert({
      name: person.name,
      email: person.email,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export async function updatePerson(
  id: string,
  updates: Partial<Person>
): Promise<Person> {
  if (!isBackendConfigured()) {
    throw new Error('Backend not configured');
  }

  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.email !== undefined) payload.email = updates.email;

  const { data, error } = await supabase
    .from('people')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export async function deletePerson(id: string): Promise<void> {
  if (!isBackendConfigured()) {
    throw new Error('Backend not configured');
  }

  const { error } = await supabase.from('people').delete().eq('id', id);
  if (error) throw error;
}

// --- Task Watchers ---
export async function fetchTaskWatchers(taskId: string): Promise<Person[]> {
  if (!isBackendConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('task_watchers')
    .select('person_id, people(*)')
    .eq('task_id', taskId);

  if (error) throw error;

  return data.map((tw: any) => ({
    id: tw.people.id,
    name: tw.people.name,
    email: tw.people.email,
    createdAt: new Date(tw.people.created_at),
    updatedAt: new Date(tw.people.updated_at),
  }));
}

export async function addTaskWatcher(
  taskId: string,
  personId: string
): Promise<void> {
  if (!isBackendConfigured()) {
    throw new Error('Backend not configured');
  }

  const { error } = await supabase
    .from('task_watchers')
    .insert({
      task_id: taskId,
      person_id: personId,
    });

  if (error) throw error;
}

export async function removeTaskWatcher(
  taskId: string,
  personId: string
): Promise<void> {
  if (!isBackendConfigured()) {
    throw new Error('Backend not configured');
  }

  const { error } = await supabase
    .from('task_watchers')
    .delete()
    .eq('task_id', taskId)
    .eq('person_id', personId);

  if (error) throw error;
}
