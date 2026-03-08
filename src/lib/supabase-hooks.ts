import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  assignedTo: string | null;   // UUID of assigned profile
  participants: string[];      // Array of profile UUIDs
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
  status: 'open' | 'in_progress' | 'blocked' | 'done';
  currentState: string;  // נקודת האפס — stored in metadata JSON
}

// ── Profile types ──────────────────────────────────────────────────────────────

export interface ProfileSummary {
  id: string;
  full_name: string | null;
  email: string;
}

// Database row types
interface TaskRow {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  owner_name: string | null;
  assigned_to: string | null;
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
  milestones: MilestoneRow[],
  participantIds: string[] = []
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
    assignedTo: taskRow.assigned_to || null,
    participants: participantIds,
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
    status: metadata.status || 'open',
    currentState: metadata.currentState || '',
    milestones: milestones
      .sort((a, b) => a.order - b.order)
      .map(m => ({ text: m.title, done: m.done })),
  };
}

// ── useTaskById ───────────────────────────────────────────────────────────────

/**
 * Fetches a single task by ID, resolving its group + project context.
 * Cached by React Query — navigating back is instant.
 * 2 sequential round-trips: (task+group joined) → parallel(milestones, participants).
 */
export function useTaskById(taskId: string | null) {
  const queryClient = useQueryClient();

  const { data, isLoading: loading } = useQuery({
    queryKey: ['task', taskId],
    enabled: !!taskId,
    staleTime: 15_000,
    queryFn: async () => {
      // task + group in one query via foreign key join
      const { data: taskRow, error } = await supabase
        .from('tasks')
        .select('*, group:groups!inner(id, name, color, order, project_id)')
        .eq('id', taskId!)
        .single();

      if (error || !taskRow) throw error ?? new Error('Task not found');

      const group = taskRow.group as GroupRow & { project_id: string };

      // milestones + participants in parallel
      const [{ data: milestones }, { data: participantRows }] = await Promise.all([
        supabase.from('milestones').select('*').eq('task_id', taskId!).order('order'),
        supabase.from('task_participants').select('profile_id').eq('task_id', taskId!),
      ]);

      const participants = (participantRows || []).map((p: { profile_id: string }) => p.profile_id);
      return {
        task: dbRowToMedicalTask(taskRow as unknown as TaskRow, group, milestones || [], participants),
        projectId: group.project_id,
      };
    },
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['task', taskId] });

  return {
    task: data?.task ?? null,
    projectId: data?.projectId ?? null,
    loading,
    refetch,
  };
}

// ── useProjects ───────────────────────────────────────────────────────────────

/**
 * Fetches and real-time-syncs the current user's projects (cached by React Query).
 */
export function useProjects(userId?: string) {
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading: loading } = useQuery({
    queryKey: ['projects', userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as ProjectSummary[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('projects-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return { projects, loading };
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

// ── useProfiles ───────────────────────────────────────────────────────────────

/**
 * Fetches all user profiles (for dropdowns/selects). Cached for 5 min.
 */
export function useProfiles() {
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return (data || []) as ProfileSummary[];
    },
  });

  return { profiles };
}

// ── useMyTasks ────────────────────────────────────────────────────────────────

export interface MyTaskSummary {
  id: string;
  title: string;
  priority: 'P1' | 'P2' | 'P3';
  projectId: string;
  projectName: string;
  category: string;
  dueDate: string;
  progress: number;
}

/**
 * Fetches tasks where the current user is either assigned_to or a participant.
 * Cached by React Query — sidebar re-renders are instant on section switches.
 */
export function useMyTasks() {
  const { data: myTasks = [], isLoading: loading } = useQuery({
    queryKey: ['myTasks'],
    staleTime: 15_000,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as MyTaskSummary[];

      // assigned tasks + participant links in parallel
      const [{ data: assignedRows }, { data: participantLinks }] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, priority, metadata, progress_mode, progress_manual, group_id')
          .eq('assigned_to', user.id),
        supabase
          .from('task_participants')
          .select('task_id')
          .eq('profile_id', user.id),
      ]);

      const assignedIds = new Set((assignedRows || []).map(t => t.id));
      const extraIds = (participantLinks || [])
        .map(p => p.task_id)
        .filter(id => !assignedIds.has(id));

      let allTaskRows = [...(assignedRows || [])];

      if (extraIds.length > 0) {
        const { data: extraRows } = await supabase
          .from('tasks')
          .select('id, title, priority, metadata, progress_mode, progress_manual, group_id')
          .in('id', extraIds);
        allTaskRows = [...allTaskRows, ...(extraRows || [])];
      }

      if (allTaskRows.length === 0) return [] as MyTaskSummary[];

      const groupIds = [...new Set(allTaskRows.map(t => t.group_id))];
      const autoIds = allTaskRows.filter(t => t.progress_mode === 'auto').map(t => t.id);

      // groups + milestones in parallel
      const [{ data: groups }, { data: milestones }] = await Promise.all([
        supabase.from('groups').select('id, name, project_id').in('id', groupIds),
        autoIds.length > 0
          ? supabase.from('milestones').select('task_id, done').in('task_id', autoIds)
          : Promise.resolve({ data: [] }),
      ]);

      const projectIds = [...new Set((groups || []).map(g => g.project_id))];
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds);

      const groupMap = new Map((groups || []).map(g => [g.id, g]));
      const projectMap = new Map((projects || []).map(p => [p.id, p]));

      const milestoneCountByTask = new Map<string, { total: number; done: number }>();
      (milestones || []).forEach(m => {
        const cur = milestoneCountByTask.get(m.task_id) || { total: 0, done: 0 };
        milestoneCountByTask.set(m.task_id, { total: cur.total + 1, done: cur.done + (m.done ? 1 : 0) });
      });

      const result: MyTaskSummary[] = [];
      for (const task of allTaskRows) {
        const group = groupMap.get(task.group_id);
        const project = group ? projectMap.get(group.project_id) : null;
        if (!group || !project) continue;

        let progress = 0;
        if (task.progress_mode === 'auto') {
          const counts = milestoneCountByTask.get(task.id);
          progress = counts && counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
        } else {
          progress = task.progress_manual || 0;
        }

        result.push({
          id: task.id,
          title: task.title,
          priority: task.priority || 'P2',
          projectId: project.id,
          projectName: project.name,
          category: group.name,
          dueDate: task.metadata?.dueDate || '',
          progress,
        });
      }

      return result;
    },
  });

  return { myTasks, loading };
}

// ── useTasks ──────────────────────────────────────────────────────────────────

/**
 * Fetches and real-time-syncs tasks for a given project.
 * Pass null to skip fetching (e.g. when no project is selected).
 */
export function useTasks(projectId: string | null) {
  const queryClient = useQueryClient();

  const {
    data: tasks = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['tasks', projectId],
    enabled: !!projectId,
    staleTime: 10_000,
    queryFn: async () => {
      // Groups + tasks in a single nested Supabase query (saves 1 sequential round-trip)
      const { data: groupsWithTasks, error: gError } = await supabase
        .from('groups')
        .select('*, tasks(*)')
        .eq('project_id', projectId!)
        .order('order', { ascending: true });

      if (gError) throw gError;

      // Flatten and build a group lookup map
      type GroupWithTasks = GroupRow & { tasks: TaskRow[] };
      const allTaskRows: TaskRow[] = [];
      const groupMap = new Map<string, GroupRow>();

      (groupsWithTasks as GroupWithTasks[] || []).forEach(g => {
        const { tasks: groupTasks, ...groupRow } = g;
        groupMap.set(g.id, groupRow as GroupRow);
        (groupTasks || []).forEach(t => allTaskRows.push(t));
      });

      const taskIds = allTaskRows.map(t => t.id);
      if (taskIds.length === 0) return [] as MedicalTask[];

      // Milestones + participants in parallel
      const [{ data: milestones, error: mError }, { data: participantRows }] = await Promise.all([
        supabase.from('milestones').select('*').in('task_id', taskIds).order('order', { ascending: true }),
        supabase.from('task_participants').select('task_id, profile_id').in('task_id', taskIds),
      ]);

      if (mError) throw mError;

      const milestonesByTask = new Map<string, MilestoneRow[]>();
      (milestones || []).forEach(m => {
        if (!milestonesByTask.has(m.task_id)) milestonesByTask.set(m.task_id, []);
        milestonesByTask.get(m.task_id)!.push(m);
      });

      const participantsByTask = new Map<string, string[]>();
      (participantRows || []).forEach(p => {
        if (!participantsByTask.has(p.task_id)) participantsByTask.set(p.task_id, []);
        participantsByTask.get(p.task_id)!.push(p.profile_id);
      });

      return allTaskRows
        .map(task => {
          const group = groupMap.get(task.group_id);
          if (!group) return null;
          return dbRowToMedicalTask(task, group, milestonesByTask.get(task.id) || [], participantsByTask.get(task.id) || []);
        })
        .filter(Boolean) as MedicalTask[];
    },
  });

  // Real-time: invalidate cache instead of manually re-fetching
  useEffect(() => {
    if (!projectId) return;

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    const channels: RealtimeChannel[] = [];

    const tasksChannel = supabase
      .channel(`tasks-rt-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, invalidate)
      .subscribe();

    const milestonesChannel = supabase
      .channel(`milestones-rt-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones' }, invalidate)
      .subscribe();

    const groupsChannel = supabase
      .channel(`groups-rt-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => {
        invalidate();
      })
      .subscribe();

    channels.push(tasksChannel, milestonesChannel, groupsChannel);

    return () => {
      channels.forEach(channel => { supabase.removeChannel(channel); });
    };
  }, [projectId, queryClient]);

  const error = queryError instanceof Error ? queryError.message : null;
  const refetch = () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });

  return { tasks, loading, error, refetch };
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
    status: task.status,
    currentState: task.currentState,
  };

  const { data: updatedTask, error: taskError } = await supabase
    .from('tasks')
    .update({
      title: task.title,
      description: task.description,
      owner_name: task.owner,
      assigned_to: task.assignedTo || null,
      priority: task.priority,
      metadata,
    })
    .eq('id', task.id)
    .select('id')
    .maybeSingle();

  if (taskError) throw taskError;
  if (!updatedTask) throw new Error(`Task not found (id: ${task.id}).`);

  const confirmedUuid = updatedTask.id;

  // Sync task_participants (delete all, re-insert)
  await supabase.from('task_participants').delete().eq('task_id', confirmedUuid);
  if (task.participants.length > 0) {
    const { error: participantsError } = await supabase.from('task_participants').insert(
      task.participants.map(profileId => ({ task_id: confirmedUuid, profile_id: profileId }))
    );
    if (participantsError) throw participantsError;
  }

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
    status: task.status,
    currentState: task.currentState,
  };

  const { data: newTask, error: taskError } = await supabase
    .from('tasks')
    .insert({
      group_id: groupId,
      title: task.title,
      description: task.description,
      owner_name: task.owner,
      assigned_to: task.assignedTo || null,
      priority: task.priority,
      progress_mode: 'auto',
      metadata,
      ...(createdBy ? { created_by: createdBy } : {}),
    })
    .select()
    .single();

  if (taskError) throw taskError;

  if (task.participants.length > 0) {
    const { error: participantsError } = await supabase.from('task_participants').insert(
      task.participants.map(profileId => ({ task_id: newTask.id, profile_id: profileId }))
    );
    if (participantsError) throw participantsError;
  }

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

  return dbRowToMedicalTask(newTask, groups!, milestones || [], task.participants);
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
