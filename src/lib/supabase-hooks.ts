import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// MedicalTask interface matching the app's expectations
export interface MedicalTask {
  id: string; // UUID from Supabase — never convert to/from integer
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

// Database row types
interface TaskRow {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  owner_name: string | null;
  priority: 'P1' | 'P2' | 'P3' | null;
  progress_mode: 'auto' | 'manual';
  progress_manual: number | null;
  order: number;
  metadata: Record<string, any>;
}

interface GroupRow {
  id: string;
  name: string;
  color: string | null;
  order: number;
}

interface MilestoneRow {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  order: number;
}

// ── Project summary type (used by Sidebar) ────────────────────────────────────

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
}

// ── Convert DB rows to MedicalTask ────────────────────────────────────────────

function dbRowToMedicalTask(
  taskRow: TaskRow,
  groupRow: GroupRow,
  milestones: MilestoneRow[]
): MedicalTask {
  const metadata = taskRow.metadata || {};

  let progress = 0;
  if (taskRow.progress_mode === 'auto' && milestones.length > 0) {
    const completed = milestones.filter(m => m.done).length;
    progress = Math.round((completed / milestones.length) * 100);
  } else if (taskRow.progress_mode === 'manual') {
    progress = taskRow.progress_manual || 0;
  }

  return {
    id: taskRow.id,
    title: taskRow.title,
    description: taskRow.description || '',
    category: groupRow.name,
    color: groupRow.color || '#7dd3fc',
    owner: taskRow.owner_name || '',
    priority: taskRow.priority || 'P2',
    progress,
    department: metadata.department || '',
    processName: metadata.processName || '',
    problemStatement: metadata.problemStatement || '',
    goal: metadata.goal || '',
    kpiName: metadata.kpiName || '',
    baseline: metadata.baseline || '',
    target: metadata.target || '',
    measurementCadence: metadata.measurementCadence || '',
    startDate: metadata.startDate || '',
    dueDate: metadata.dueDate || '',
    stakeholders: metadata.stakeholders || [],
    risksBlockers: metadata.risksBlockers || '',
    dependencies: metadata.dependencies || '',
    links: metadata.links || '',
    milestones: milestones
      .sort((a, b) => a.order - b.order)
      .map(m => ({ text: m.title, done: m.done })),
  };
}

// ── useProjects ───────────────────────────────────────────────────────────────

/**
 * Fetches and real-time-syncs the current user's projects.
 */
export function useProjects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const channel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => { fetchProjects(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchProjects]);

  return { projects, loading, refetch: fetchProjects };
}

// ── createProject ─────────────────────────────────────────────────────────────

/**
 * Creates a new project owned by the current user.
 * Returns the new project's UUID.
 */
export async function createProject(name: string, description?: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('projects')
    .insert({ name, description: description || null, user_id: user.id })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

// ── useTasks ──────────────────────────────────────────────────────────────────

/**
 * Fetches and real-time-syncs tasks for a given project.
 * Pass null to skip fetching (e.g. when no project is selected).
 */
export function useTasks(projectId: string | null) {
  const [tasks, setTasks] = useState<MedicalTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!projectId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch groups (categories) for this project
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .eq('project_id', projectId)
        .order('order', { ascending: true });

      if (groupsError) throw groupsError;

      // Fetch tasks belonging to these groups
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .in('group_id', groups?.map(g => g.id) || [])
        .order('order', { ascending: true });

      if (tasksError) throw tasksError;

      // Fetch all milestones for those tasks
      const { data: milestones, error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .in('task_id', tasksData?.map(t => t.id) || [])
        .order('order', { ascending: true });

      if (milestonesError) throw milestonesError;

      // Group milestones by task_id
      const milestonesByTask = new Map<string, MilestoneRow[]>();
      milestones?.forEach(m => {
        if (!milestonesByTask.has(m.task_id)) {
          milestonesByTask.set(m.task_id, []);
        }
        milestonesByTask.get(m.task_id)!.push(m);
      });

      // Convert to MedicalTask format
      const medicalTasks: MedicalTask[] = [];
      tasksData?.forEach(task => {
        const group = groups?.find(g => g.id === task.group_id);
        if (group) {
          const taskMilestones = milestonesByTask.get(task.id) || [];
          medicalTasks.push(dbRowToMedicalTask(task, group, taskMilestones));
        }
      });

      setTasks(medicalTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Real-time subscriptions — only active when a project is selected
  useEffect(() => {
    if (!projectId) return;

    const channels: RealtimeChannel[] = [];

    const tasksChannel = supabase
      .channel(`tasks-changes-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks();
      })
      .subscribe();

    const milestonesChannel = supabase
      .channel(`milestones-changes-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones' }, () => {
        fetchTasks();
      })
      .subscribe();

    const groupsChannel = supabase
      .channel(`groups-changes-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => {
        fetchTasks();
      })
      .subscribe();

    channels.push(tasksChannel, milestonesChannel, groupsChannel);

    return () => {
      channels.forEach(channel => { supabase.removeChannel(channel); });
    };
  }, [fetchTasks, projectId]);

  return { tasks, loading, error, refetch: fetchTasks };
}

// ── updateTask ────────────────────────────────────────────────────────────────

export async function updateTask(task: MedicalTask, projectId: string): Promise<void> {
  // Find the task's group by category name within the project
  const { data: groups } = await supabase
    .from('groups')
    .select('id')
    .eq('project_id', projectId)
    .eq('name', task.category)
    .single();

  if (!groups) {
    throw new Error(`Group not found for category: ${task.category}`);
  }

  const metadata = {
    department: task.department,
    processName: task.processName,
    problemStatement: task.problemStatement,
    goal: task.goal,
    kpiName: task.kpiName,
    baseline: task.baseline,
    target: task.target,
    measurementCadence: task.measurementCadence,
    startDate: task.startDate,
    dueDate: task.dueDate,
    stakeholders: task.stakeholders,
    risksBlockers: task.risksBlockers,
    dependencies: task.dependencies,
    links: task.links,
  };

  const { data: updatedTask, error: taskError } = await supabase
    .from('tasks')
    .update({
      title: task.title,
      description: task.description,
      owner_name: task.owner,
      priority: task.priority,
      metadata,
    })
    .eq('id', task.id)
    .select('id')
    .maybeSingle();

  if (taskError) throw taskError;
  if (!updatedTask) throw new Error(`Task not found (id: ${task.id}).`);

  const confirmedUuid = updatedTask.id;

  // Only re-sync milestones if they changed
  const { data: currentMilestones } = await supabase
    .from('milestones')
    .select('title, done, order')
    .eq('task_id', confirmedUuid)
    .order('order', { ascending: true });

  const incomingKey = task.milestones
    .map((m, i) => `${i}|${m.text}|${m.done}`)
    .join('||');
  const existingKey = (currentMilestones || [])
    .map(m => `${m.order}|${m.title}|${m.done}`)
    .join('||');

  if (incomingKey === existingKey) return;

  const { error: deleteError } = await supabase
    .from('milestones')
    .delete()
    .eq('task_id', confirmedUuid);

  if (deleteError) throw deleteError;

  if (task.milestones.length > 0) {
    const { error: milestonesError } = await supabase.from('milestones').insert(
      task.milestones.map((m, idx) => ({
        task_id: confirmedUuid,
        title: m.text,
        done: m.done,
        order: idx,
      }))
    );
    if (milestonesError) throw milestonesError;
  }
}

// ── createTask ────────────────────────────────────────────────────────────────

export async function createTask(
  task: Omit<MedicalTask, 'id'>,
  projectId: string,
  createdBy?: string
): Promise<MedicalTask> {
  // Find or create the group (category) within this project
  const { data: existingGroup } = await supabase
    .from('groups')
    .select('id')
    .eq('project_id', projectId)
    .eq('name', task.category)
    .maybeSingle();

  let groupId: string;

  if (existingGroup) {
    groupId = existingGroup.id;
  } else {
    const { data: newGroup, error: groupError } = await supabase
      .from('groups')
      .insert({
        project_id: projectId,
        name: task.category,
        color: task.color,
        order: 0,
      })
      .select()
      .single();

    if (groupError) throw groupError;
    if (!newGroup) throw new Error('Failed to create group');
    groupId = newGroup.id;
  }

  const metadata = {
    department: task.department,
    processName: task.processName,
    problemStatement: task.problemStatement,
    goal: task.goal,
    kpiName: task.kpiName,
    baseline: task.baseline,
    target: task.target,
    measurementCadence: task.measurementCadence,
    startDate: task.startDate,
    dueDate: task.dueDate,
    stakeholders: task.stakeholders,
    risksBlockers: task.risksBlockers,
    dependencies: task.dependencies,
    links: task.links,
  };

  const { data: newTask, error: taskError } = await supabase
    .from('tasks')
    .insert({
      group_id: groupId,
      title: task.title,
      description: task.description,
      owner_name: task.owner,
      priority: task.priority,
      progress_mode: 'auto',
      metadata,
      ...(createdBy ? { created_by: createdBy } : {}),
    })
    .select()
    .single();

  if (taskError) throw taskError;

  if (task.milestones.length > 0) {
    const { error: milestonesError } = await supabase.from('milestones').insert(
      task.milestones.map((m, idx) => ({
        task_id: newTask.id,
        title: m.text,
        done: m.done,
        order: idx,
      }))
    );
    if (milestonesError) throw milestonesError;
  }

  const { data: groups } = await supabase
    .from('groups')
    .select('*')
    .eq('id', newTask.group_id)
    .single();

  const { data: milestones } = await supabase
    .from('milestones')
    .select('*')
    .eq('task_id', newTask.id)
    .order('order');

  return dbRowToMedicalTask(newTask, groups!, milestones || []);
}

// ── deleteTask ────────────────────────────────────────────────────────────────

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}

// ── renameCategory ────────────────────────────────────────────────────────────

export async function renameCategory(
  oldName: string,
  newName: string,
  projectId: string
): Promise<void> {
  const { error } = await supabase
    .from('groups')
    .update({ name: newName })
    .eq('project_id', projectId)
    .eq('name', oldName);

  if (error) throw error;
}

// ── updateCategoryColor ───────────────────────────────────────────────────────

export async function updateCategoryColor(
  categoryName: string,
  color: string,
  projectId: string
): Promise<void> {
  const { error } = await supabase
    .from('groups')
    .update({ color })
    .eq('project_id', projectId)
    .eq('name', categoryName);

  if (error) throw error;
}
