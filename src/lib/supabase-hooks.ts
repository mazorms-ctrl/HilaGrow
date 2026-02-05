import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// MedicalTask interface matching the app's expectations
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

// Database row type
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

// Default project ID (from seed.sql)
const DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Convert database rows to MedicalTask format
 */
function dbRowToMedicalTask(
  taskRow: TaskRow,
  groupRow: GroupRow,
  milestones: MilestoneRow[]
): MedicalTask {
  const metadata = taskRow.metadata || {};
  
  // Calculate progress from milestones if auto mode
  let progress = 0;
  if (taskRow.progress_mode === 'auto' && milestones.length > 0) {
    const completed = milestones.filter(m => m.done).length;
    progress = Math.round((completed / milestones.length) * 100);
  } else if (taskRow.progress_mode === 'manual') {
    progress = taskRow.progress_manual || 0;
  }

  return {
    id: parseInt(taskRow.id.replace(/-/g, '').slice(0, 8), 16), // Simple numeric ID from UUID
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

/**
 * Hook to fetch and sync tasks from Supabase
 */
export function useTasks() {
  const [tasks, setTasks] = useState<MedicalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tasks from database
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch groups (categories)
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .eq('project_id', DEFAULT_PROJECT_ID)
        .order('order', { ascending: true });

      if (groupsError) throw groupsError;

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .in('group_id', groups?.map(g => g.id) || [])
        .order('order', { ascending: true });

      if (tasksError) throw tasksError;

      // Fetch all milestones
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
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Set up real-time subscriptions
  useEffect(() => {
    const channels: RealtimeChannel[] = [];

    // Subscribe to tasks changes
    const tasksChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          console.log('Tasks changed, refetching...');
          fetchTasks();
        }
      )
      .subscribe();

    // Subscribe to milestones changes
    const milestonesChannel = supabase
      .channel('milestones-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'milestones' },
        () => {
          console.log('Milestones changed, refetching...');
          fetchTasks();
        }
      )
      .subscribe();

    // Subscribe to groups changes
    const groupsChannel = supabase
      .channel('groups-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'groups' },
        () => {
          console.log('Groups changed, refetching...');
          fetchTasks();
        }
      )
      .subscribe();

    channels.push(tasksChannel, milestonesChannel, groupsChannel);

    // Cleanup subscriptions
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [fetchTasks]);

  return { tasks, loading, error, refetch: fetchTasks };
}

/**
 * Function to update a task in Supabase
 */
export async function updateTask(task: MedicalTask): Promise<void> {
  // Find the task's group by category name
  const { data: groups } = await supabase
    .from('groups')
    .select('id')
    .eq('project_id', DEFAULT_PROJECT_ID)
    .eq('name', task.category)
    .single();

  if (!groups) {
    throw new Error(`Group not found for category: ${task.category}`);
  }

  // Convert numeric ID back to UUID format (simplified)
  const taskId = task.id.toString(16).padStart(8, '0');
  const taskUuid = `20000000-0000-0000-0000-0000${taskId}`;

  // Prepare metadata
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

  // Update task
  const { error: taskError } = await supabase
    .from('tasks')
    .update({
      title: task.title,
      description: task.description,
      owner_name: task.owner,
      priority: task.priority,
      metadata,
    })
    .eq('id', taskUuid);

  if (taskError) throw taskError;

  // Update milestones
  // First, get existing milestones
  const { data: existingMilestones } = await supabase
    .from('milestones')
    .select('id, title, done, order')
    .eq('task_id', taskUuid);

  // Update or create milestones
  for (let i = 0; i < task.milestones.length; i++) {
    const milestone = task.milestones[i];
    const existing = existingMilestones?.find((_m, idx) => idx === i);

    if (existing) {
      // Update existing milestone
      await supabase
        .from('milestones')
        .update({
          title: milestone.text,
          done: milestone.done,
          order: i,
        })
        .eq('id', existing.id);
    } else {
      // Create new milestone
      await supabase.from('milestones').insert({
        task_id: taskUuid,
        title: milestone.text,
        done: milestone.done,
        order: i,
      });
    }
  }

  // Delete extra milestones if task has fewer milestones now
  if (existingMilestones && existingMilestones.length > task.milestones.length) {
    const toDelete = existingMilestones.slice(task.milestones.length);
    await supabase
      .from('milestones')
      .delete()
      .in('id', toDelete.map(m => m.id));
  }
}

/**
 * Function to create a new task in Supabase
 */
export async function createTask(task: Omit<MedicalTask, 'id'>): Promise<MedicalTask> {
  // Find or create the group (category)
  const { data: existingGroup } = await supabase
    .from('groups')
    .select('id')
    .eq('project_id', DEFAULT_PROJECT_ID)
    .eq('name', task.category)
    .single();

  let groupId: string;

  if (existingGroup) {
    groupId = existingGroup.id;
  } else {
    // Create new group
    const { data: newGroup, error: groupError } = await supabase
      .from('groups')
      .insert({
        project_id: DEFAULT_PROJECT_ID,
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

  // Prepare metadata
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

  // Create task
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
    })
    .select()
    .single();

  if (taskError) throw taskError;

  // Create milestones
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

  // Fetch and return the created task
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

/**
 * Function to delete a task from Supabase
 */
export async function deleteTask(taskId: number): Promise<void> {
  // Convert numeric ID to UUID format
  const taskIdHex = taskId.toString(16).padStart(8, '0');
  const taskUuid = `20000000-0000-0000-0000-0000${taskIdHex}`;

  const { error } = await supabase.from('tasks').delete().eq('id', taskUuid);

  if (error) throw error;
}
