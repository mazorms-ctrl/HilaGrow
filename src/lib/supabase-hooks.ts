import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// MedicalTask interface matching the app's expectations
// Expanded to support full idea-to-delivery lifecycle
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
  status: 'open' | 'in_progress' | 'blocked' | 'done';
  
  // ── Foundations (יסודות) ────────────────────────────────────
  problemStatement: string;
  goal: string;
  targetAudience: string;
  desiredImpact: string;
  scope: string;
  outOfScope: string;
  successDefinition: string;
  
  // ── Current State (מצב נוכחי) ────────────────────────────────
  currentState: string;
  painPoints: string;
  constraints: string;
  existingProcess: string;
  evidence: string;
  
  // ── Specification (אפיון) ────────────────────────────────────
  department: string;
  processName: string;
  proposedSolution: string;
  deliverables: string;
  assumptions: string;
  requiredDecisions: string;
  acceptanceCriteria: string;
  
  // ── Timeline (ציר זמן) ────────────────────────────────────────
  startDate: string;
  dueDate: string;
  milestones: Array<{
    text: string;
    done: boolean;
    assignedTo?: string;        // profile ID
    dueDate?: string;           // ISO date string
    actionItems?: Array<{
      text: string;
      done: boolean;
      assignedTo?: string;      // profile ID
    }>;
  }>;
  
  // ── KPI (מדדי הצלחה) ──────────────────────────────────────────
  kpiName: string;
  baseline: string;
  target: string;
  sourceOfTruth: string;
  measurementCadence: string;
  metricOwner: string;
  
  // ── Participants (משתתפים) ───────────────────────────────────
  stakeholders: string[];   // Array of profile names/emails
  approvers: string[];      // Array of profile names/emails who must approve
  
  // ── Risks (סיכונים ותלויות) ──────────────────────────────────
  risksBlockers: string;
  dependencies: string;
  links: string;
  mitigationPlan: string;
  escalationPath: string;
  
  // ── Outcome (תוצר סופי) ───────────────────────────────────────
  finalDeliverable: string;
  rolloutNotes: string;
  measuredResult: string;
  lessonsLearned: string;
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
    status: metadata.status || 'open',
    
    // Foundations
    problemStatement: metadata.problemStatement || '',
    goal: metadata.goal || '',
    targetAudience: metadata.targetAudience || '',
    desiredImpact: metadata.desiredImpact || '',
    scope: metadata.scope || '',
    outOfScope: metadata.outOfScope || '',
    successDefinition: metadata.successDefinition || '',
    
    // Current State
    currentState: metadata.currentState || '',
    painPoints: metadata.painPoints || '',
    constraints: metadata.constraints || '',
    existingProcess: metadata.existingProcess || '',
    evidence: metadata.evidence || '',
    
    // Specification
    department: metadata.department || '',
    processName: metadata.processName || '',
    proposedSolution: metadata.proposedSolution || '',
    deliverables: metadata.deliverables || '',
    assumptions: metadata.assumptions || '',
    requiredDecisions: metadata.requiredDecisions || '',
    acceptanceCriteria: metadata.acceptanceCriteria || '',
    
    // Timeline
    startDate: metadata.startDate || '',
    dueDate: metadata.dueDate || '',
    milestones: milestones
      .sort((a, b) => a.order - b.order)
      .map((m, i) => {
        const extra = (metadata.milestoneExtras || [])[i] || {};
        return {
          text: m.title,
          done: m.done,
          assignedTo: extra.assignedTo as string | undefined,
          dueDate: extra.dueDate as string | undefined,
          actionItems: (extra.actionItems || []) as Array<{ text: string; done: boolean; assignedTo?: string }>,
        };
      }),
    
    // KPI
    kpiName: metadata.kpiName || '',
    baseline: metadata.baseline || '',
    target: metadata.target || '',
    sourceOfTruth: metadata.sourceOfTruth || '',
    measurementCadence: metadata.measurementCadence || '',
    metricOwner: metadata.metricOwner || '',
    
    // Participants
    stakeholders: metadata.stakeholders || [],
    approvers: metadata.approvers || [],
    
    // Risks
    risksBlockers: metadata.risksBlockers || '',
    dependencies: metadata.dependencies || '',
    links: metadata.links || '',
    mitigationPlan: metadata.mitigationPlan || '',
    escalationPath: metadata.escalationPath || '',
    
    // Outcome
    finalDeliverable: metadata.finalDeliverable || '',
    rolloutNotes: metadata.rolloutNotes || '',
    measuredResult: metadata.measuredResult || '',
    lessonsLearned: metadata.lessonsLearned || '',
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
    // Foundations
    problemStatement: task.problemStatement,
    goal: task.goal,
    targetAudience: task.targetAudience,
    desiredImpact: task.desiredImpact,
    scope: task.scope,
    outOfScope: task.outOfScope,
    successDefinition: task.successDefinition,
    
    // Current State
    currentState: task.currentState,
    painPoints: task.painPoints,
    constraints: task.constraints,
    existingProcess: task.existingProcess,
    evidence: task.evidence,
    
    // Specification
    department: task.department,
    processName: task.processName,
    proposedSolution: task.proposedSolution,
    deliverables: task.deliverables,
    assumptions: task.assumptions,
    requiredDecisions: task.requiredDecisions,
    acceptanceCriteria: task.acceptanceCriteria,
    
    // Timeline
    startDate: task.startDate,
    dueDate: task.dueDate,
    
    // KPI
    kpiName: task.kpiName,
    baseline: task.baseline,
    target: task.target,
    sourceOfTruth: task.sourceOfTruth,
    measurementCadence: task.measurementCadence,
    metricOwner: task.metricOwner,
    
    // Participants
    stakeholders: task.stakeholders,
    approvers: task.approvers,
    
    // Risks
    risksBlockers: task.risksBlockers,
    dependencies: task.dependencies,
    links: task.links,
    mitigationPlan: task.mitigationPlan,
    escalationPath: task.escalationPath,
    
    // Outcome
    finalDeliverable: task.finalDeliverable,
    rolloutNotes: task.rolloutNotes,
    measuredResult: task.measuredResult,
    lessonsLearned: task.lessonsLearned,
    
    // Status
    status: task.status,

    // Milestone extras (assignedTo + actionItems per milestone, indexed by order)
    milestoneExtras: task.milestones.map(m => ({
      assignedTo: m.assignedTo ?? null,
      dueDate: m.dueDate ?? null,
      actionItems: (m.actionItems || []).map(a => ({
        text: a.text,
        done: a.done,
        assignedTo: a.assignedTo ?? null,
      })),
    })),
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
    .map((m, i) => `${i}|${m.text}|${m.done}|${m.assignedTo ?? ''}`)
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

// ── Task Comments ─────────────────────────────────────────────────────────────

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: ProfileSummary;
}

// ── useTaskComments ───────────────────────────────────────────────────────────
// Fetches comments for a task with realtime subscription

export function useTaskComments(taskId: string | null) {
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          id,
          task_id,
          author_id,
          content,
          created_at,
          updated_at
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch author profiles
      const authorIds = [...new Set((data || []).map(c => c.author_id))];
      if (authorIds.length === 0) return data || [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', authorIds);

      const profileMap = new Map<string, ProfileSummary>();
      (profiles || []).forEach(p => profileMap.set(p.id, p));

      return (data || []).map(c => ({
        ...c,
        author: profileMap.get(c.author_id),
      })) as TaskComment[];
    },
    enabled: !!taskId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`task-comments-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, queryClient]);

  return { comments, loading: isLoading };
}

// ── createComment ─────────────────────────────────────────────────────────────

export async function createComment(
  taskId: string,
  content: string,
  authorId: string
): Promise<TaskComment> {
  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      author_id: authorId,
      content,
    })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create comment');

  return data as TaskComment;
}

// ── deleteComment ─────────────────────────────────────────────────────────────

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
}

