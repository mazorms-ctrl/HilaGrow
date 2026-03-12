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
  createdBy: string | null;    // UUID of the user who created the task
  participants: string[];      // Array of profile UUIDs
  priority: 'P1' | 'P2' | 'P3';
  progress: number;
  status: 'open' | 'in_progress' | 'blocked' | 'done';
  
  // ── Foundations (יסודות) ────────────────────────────────────
  problemStatement: string;
  goal: string;
  targetAudience?: string;
  desiredImpact?: string;
  scope?: string;
  outOfScope?: string;
  successDefinition?: string;
  
  // ── Current State (מצב נוכחי) ────────────────────────────────
  currentState: string;
  painPoints?: string;
  constraints?: string;
  existingProcess?: string;
  evidence?: string;
  
  // ── Specification (אפיון) ────────────────────────────────────
  department: string;
  processName: string;
  proposedSolution?: string;
  deliverables?: string;
  assumptions?: string;
  requiredDecisions?: string;
  acceptanceCriteria?: string;
  
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
      dueDate?: string;         // ISO date string
    }>;
  }>;
  
  // ── KPI (מדדי הצלחה) ──────────────────────────────────────────
  kpiName: string;
  baseline: string;
  target: string;
  sourceOfTruth?: string;
  measurementCadence: string;
  metricOwner?: string;
  // Dynamic KPI list (replaces the flat fields above)
  kpis?: Array<{
    name: string;
    baseline: string;
    target: string;
    cadence: string;
    source: string;
    owner: string;
  }>;
  
  // ── Participants (משתתפים) ───────────────────────────────────
  stakeholders: string[];   // Array of profile names/emails
  approvers?: string[];     // Array of profile names/emails who must approve
  
  // ── Risks (סיכונים ותלויות) ──────────────────────────────────
  risksBlockers: string;
  dependencies: string;
  links: string;
  mitigationPlan?: string;
  escalationPath?: string;
  
  // ── Outcome (תוצר סופי) ───────────────────────────────────────
  finalDeliverable?: string;
  rolloutNotes?: string;
  measuredResult?: string;
  lessonsLearned?: string;
}

// ── Profile types ──────────────────────────────────────────────────────────────

export interface ProfileSummary {
  id: string;
  full_name: string | null;
  email: string;
  department: string | null;
  position: string | null;
}

// Database row types
interface TaskRow {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  owner_name: string | null;
  assigned_to: string | null;
  created_by: string | null;
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
    createdBy: taskRow.created_by || null,
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
    
    // KPI (flat legacy fields kept for compat)
    kpiName: metadata.kpiName || '',
    baseline: metadata.baseline || '',
    target: metadata.target || '',
    sourceOfTruth: metadata.sourceOfTruth || '',
    measurementCadence: metadata.measurementCadence || '',
    metricOwner: metadata.metricOwner || '',
    // Dynamic KPI list — falls back to one entry built from legacy flat fields
    kpis: Array.isArray(metadata.kpis) && metadata.kpis.length > 0
      ? metadata.kpis
      : (metadata.kpiName || metadata.baseline || metadata.target)
        ? [{ name: metadata.kpiName || '', baseline: metadata.baseline || '', target: metadata.target || '', cadence: metadata.measurementCadence || '', source: metadata.sourceOfTruth || '', owner: metadata.metricOwner || '' }]
        : [],
    
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
  const { data: profiles = [], error, status } = useQuery({
    queryKey: ['profiles'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      console.log('[useProfiles] fetching profiles from Supabase...');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, department, position')
        .order('full_name', { ascending: true });
      if (error) {
        // Fallback: columns may not exist yet (migration pending)
        console.warn('[useProfiles] full select failed, falling back:', error.message);
        const { data: fallback, error: fallbackError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .order('full_name', { ascending: true });
        if (fallbackError) throw fallbackError;
        return (fallback || []).map(p => ({ ...p, department: null, position: null })) as ProfileSummary[];
      }
      console.log('[useProfiles] result:', { count: data?.length ?? 0 });
      return (data || []) as ProfileSummary[];
    },
  });

  if (error) {
    console.error('[useProfiles] query failed (RLS / auth / network):', error);
  }
  console.log(`[useProfiles] status=${status} profiles=${profiles.length}`);

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
  const queryClient = useQueryClient();
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

  // Realtime: invalidate whenever tasks or participants change so the sidebar
  // updates immediately when someone assigns a task to the current user.
  useEffect(() => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['myTasks'] });

    const tasksChannel = supabase
      .channel('my-tasks-rt-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, invalidate)
      .subscribe();

    const participantsChannel = supabase
      .channel('my-tasks-rt-participants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_participants' }, invalidate)
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [queryClient]);

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

      // Collect assigned_to UUIDs to resolve live full_names from profiles
      const assignedIds = [...new Set(allTaskRows.map(t => t.assigned_to).filter(Boolean) as string[])];

      // Milestones + participants + profile names in parallel
      const [{ data: milestones, error: mError }, { data: participantRows }, { data: profileRows }] = await Promise.all([
        supabase.from('milestones').select('*').in('task_id', taskIds).order('order', { ascending: true }),
        supabase.from('task_participants').select('task_id, profile_id').in('task_id', taskIds),
        assignedIds.length > 0
          ? supabase.from('profiles').select('id, full_name').in('id', assignedIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string | null }[], error: null }),
      ]);

      if (mError) throw mError;

      // UUID → live full_name map
      const profileNameMap = new Map<string, string>();
      (profileRows || []).forEach(p => {
        if (p.id && p.full_name) profileNameMap.set(p.id, p.full_name);
      });

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
          // Only resolve a name when there is an active assigned_to UUID.
          // Falling back to stored owner_name when assigned_to is null would
          // show stale/ghost names on tasks that were unassigned after the fact.
          const liveOwnerName = task.assigned_to
            ? (profileNameMap.get(task.assigned_to) ?? task.owner_name)
            : null;
          return dbRowToMedicalTask({ ...task, owner_name: liveOwnerName }, group, milestonesByTask.get(task.id) || [], participantsByTask.get(task.id) || []);
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
    kpis: task.kpis || [],
    
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
      // Dashboard-critical columns — written explicitly so the Command Center
      // stays in sync without relying solely on the DB trigger.
      due_date: task.dueDate || null,
      progress_manual: task.milestones.length === 0 ? task.progress : null,
      progress_mode:   task.milestones.length  >  0 ? 'auto' : 'manual',
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
    .select('title, done, order, assigned_to')
    .eq('task_id', confirmedUuid)
    .order('order', { ascending: true });

  const incomingKey = task.milestones
    .map((m, i) => `${i}|${m.text}|${m.done}|${m.assignedTo ?? ''}`)
    .join('||');
  const existingKey = (currentMilestones || [])
    .map(m => `${m.order}|${m.title}|${m.done}|${m.assigned_to ?? ''}`)
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
        assigned_to: m.assignedTo ?? null,
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
    kpis: task.kpis || [],
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
      if (authorIds.length === 0) return (data || []).map(c => ({ ...c, author: undefined })) as TaskComment[];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', authorIds);

      const profileMap = new Map<string, ProfileSummary>();
      (profiles || []).forEach(p => profileMap.set(p.id, { ...p, department: null, position: null }));

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
  authorId: string,
  activityId?: string | null
): Promise<TaskComment> {
  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      author_id: authorId,
      content,
      ...(activityId ? { activity_id: activityId } : {}),
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

// ── Dashboard realtime sync ───────────────────────────────────────────────────
// Single subscription on the tasks table that invalidates all dashboard query
// keys whenever any task is created, updated, or deleted.
// Call once from CommandCenter so there is exactly one channel per page load.

export function useDashboardRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('dashboard_tasks_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard_kpis'] });
          queryClient.invalidateQueries({ queryKey: ['active_leaf_tasks'] });
          queryClient.invalidateQueries({ queryKey: ['idea_leaf_tasks'] });
          queryClient.invalidateQueries({ queryKey: ['group_progress_stats'] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);
}

// ── Dashboard KPIs (from dashboard_kpis view) ─────────────────────────────────

export interface DashboardKpis {
  active_tasks: number;
  overdue_tasks: number;
  days_remaining: number | null;
}

export function useDashboardKpis() {
  return useQuery({
    queryKey: ['dashboard_kpis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_kpis')
        .select('active_tasks, overdue_tasks, days_remaining')
        .single();
      if (error) throw error;
      return data as DashboardKpis;
    },
    staleTime: 30_000,
  });
}

// ── Activity Feed ─────────────────────────────────────────────────────────────

export interface ActivityFeedEntry {
  id: string;
  task_id: string;
  user_id: string;
  action_type: string;
  content: string | null;
  created_at: string;
  task_title: string | null;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
}

export function useActivityFeed(limit = 10) {
  const queryClient = useQueryClient();

  // Realtime subscription — invalidate on any change to activity_feed OR tasks.
  // Global scope: no group_id / assigned_to filter — radar for the entire system.
  // Uses the stable key ['activity_feed'] so both channels hit the same cache entry.
  useEffect(() => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['activity_feed'] });
    const channel = supabase
      .channel('activity_feed_global_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_feed' }, invalidate)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'activity_feed' }, invalidate)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, invalidate)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, invalidate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    // Stable key — does not include `limit` so invalidation always hits this entry
    queryKey: ['activity_feed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_feed')
        .select(`
          id,
          task_id,
          user_id,
          action_type,
          content,
          created_at,
          tasks ( title ),
          profiles ( full_name, avatar_url, email )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return ((data ?? []) as any[]).map((row): ActivityFeedEntry => ({
        id: row.id,
        task_id: row.task_id,
        user_id: row.user_id,
        action_type: row.action_type,
        content: row.content ?? null,
        created_at: row.created_at,
        task_title: row.tasks?.title ?? null,
        profile: {
          full_name: row.profiles?.full_name ?? null,
          avatar_url: row.profiles?.avatar_url ?? null,
          email: row.profiles?.email ?? '',
        },
      }));
    },
    staleTime: 0, // always refetch on invalidation — feed is real-time critical
  });
}

// ── Active Leaf Tasks (from active_leaf_tasks view) ───────────────────────────

export interface ActiveLeafTask {
  id: string;
  group_id: string;
  parent_id: string | null;
  title: string;
  owner_name: string | null;
  assigned_to: string | null;
  priority: 'P1' | 'P2' | 'P3' | null;
  due_date: string | null;
  status_percent: number;
  group_name: string;
  group_color: string | null;
  project_id: string;
  project_name: string;
  parent_title: string | null; // resolved client-side
}

export function useActiveLeafTasks(limit = 100) {
  return useQuery({
    queryKey: ['active_leaf_tasks', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('active_leaf_tasks')
        .select(
          'id, group_id, parent_id, title, owner_name, assigned_to, priority, due_date, status_percent, group_name, group_color, project_id, project_name'
        )
        .limit(limit);

      if (error) throw error;
      const rows = (data ?? []) as Omit<ActiveLeafTask, 'parent_title'>[];

      // Resolve parent titles in a single extra query
      const parentIds = [...new Set(rows.filter((r) => r.parent_id).map((r) => r.parent_id as string))];
      let parentMap = new Map<string, string>();
      if (parentIds.length > 0) {
        const { data: parents } = await supabase
          .from('tasks')
          .select('id, title')
          .in('id', parentIds);
        (parents ?? []).forEach((p: { id: string; title: string }) => parentMap.set(p.id, p.title));
      }

      return rows.map((r): ActiveLeafTask => ({
        ...r,
        parent_title: r.parent_id ? (parentMap.get(r.parent_id) ?? null) : null,
      }));
    },
    staleTime: 30_000,
  });
}

// ── Idea Leaf Tasks (from idea_leaf_tasks view) ───────────────────────────────
// Tasks with 0% progress, no due_date, and no activity — pure backlog ideas.

export interface IdeaLeafTask {
  id: string;
  group_id: string;
  parent_id: string | null;
  title: string;
  owner_name: string | null;
  priority: 'P1' | 'P2' | 'P3' | null;
  group_name: string;
  group_color: string | null;
  project_id: string;
  project_name: string;
  created_at: string;
}

export function useIdeaLeafTasks(limit = 100) {
  return useQuery({
    queryKey: ['idea_leaf_tasks', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('idea_leaf_tasks')
        .select('id, group_id, parent_id, title, owner_name, priority, group_name, group_color, project_id, project_name, created_at')
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as IdeaLeafTask[];
    },
    staleTime: 30_000,
  });
}

// ── Batch task participants (for dashboard table) ─────────────────────────────

export function useTasksParticipants(taskIds: string[]) {
  const key = taskIds.slice().sort().join(',');
  return useQuery({
    queryKey: ['tasks_participants', key],
    enabled: taskIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_participants')
        .select('task_id, profile_id')
        .in('task_id', taskIds);
      if (error) throw error;
      const map = new Map<string, string[]>();
      for (const row of data ?? []) {
        const arr = map.get(row.task_id) ?? [];
        arr.push(row.profile_id);
        map.set(row.task_id, arr);
      }
      return map;
    },
  });
}

// ── useMyOwnedProjects ────────────────────────────────────────────────────────

export interface OwnedProjectSummary {
  id: string;
  name: string;
  description: string | null;
  progress: number;       // 0-100 average
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  lastActivity: string | null; // ISO date string from updated_at
}

/**
 * Fetches projects where the current user is the owner.
 * Ownership is resolved in priority order:
 *   1. projects.user_id = me  (explicit owner column)
 *   2. fallback: any project where the user has at least one task assigned to them
 *      (covers projects created before the user_id column existed)
 * Results are joined with group_progress_stats for progress data.
 */
export function useMyOwnedProjects() {
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading: loading } = useQuery({
    queryKey: ['myOwnedProjects'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as OwnedProjectSummary[];

      // 1. Fetch all projects + stats in parallel
      const [{ data: allProjects }, { data: statsRows }, { data: assignedTasks }] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, description, updated_at, user_id')
          .order('updated_at', { ascending: false }),
        supabase
          .from('group_progress_stats')
          .select('project_id, leaf_task_count, completed_count, overdue_count, avg_progress'),
        // Tasks assigned to me — used as fallback ownership signal
        supabase
          .from('active_leaf_tasks')
          .select('project_id')
          .eq('assigned_to', user.id),
      ]);

      if (!allProjects || allProjects.length === 0) return [] as OwnedProjectSummary[];

      // 2. Build the set of project IDs the user owns or has assignments in
      const explicitlyOwned = new Set(
        allProjects.filter(p => p.user_id === user.id).map(p => p.id)
      );
      const hasAssignments = new Set(
        (assignedTasks ?? []).map(t => t.project_id).filter(Boolean)
      );

      // Prefer explicit ownership; fall back to assignment-based if none explicit
      const ownedIds = explicitlyOwned.size > 0
        ? explicitlyOwned
        : hasAssignments;

      const ownedRows = allProjects.filter(p => ownedIds.has(p.id));
      if (ownedRows.length === 0) return [] as OwnedProjectSummary[];

      // 3. Aggregate stats per project
      const statsByProject = new Map<string, { total: number; completed: number; overdue: number; avgProgress: number; count: number }>();
      for (const s of statsRows ?? []) {
        const cur = statsByProject.get(s.project_id) ?? { total: 0, completed: 0, overdue: 0, avgProgress: 0, count: 0 };
        statsByProject.set(s.project_id, {
          total: cur.total + (s.leaf_task_count ?? 0),
          completed: cur.completed + (s.completed_count ?? 0),
          overdue: cur.overdue + (s.overdue_count ?? 0),
          avgProgress: cur.avgProgress + (s.avg_progress ?? 0),
          count: cur.count + 1,
        });
      }

      return ownedRows.map(p => {
        const s = statsByProject.get(p.id);
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          progress: s && s.count > 0 ? Math.round(s.avgProgress / s.count) : 0,
          totalTasks: s?.total ?? 0,
          completedTasks: s?.completed ?? 0,
          overdueTasks: s?.overdue ?? 0,
          lastActivity: (p as any).updated_at ?? null,
        } as OwnedProjectSummary;
      });
    },
  });

  useEffect(() => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['myOwnedProjects'] });
    const ch = supabase
      .channel('my-owned-projects-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, invalidate)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  return { projects, loading };
}

// ── useMyAssignedLeafTasks ────────────────────────────────────────────────────

export interface AssignedLeafTask {
  id: string;
  title: string;
  priority: 'P1' | 'P2' | 'P3' | null;
  dueDate: string | null;
  progress: number;
  category: string;
  projectId: string;
  projectName: string;
  parentTitle: string | null;
}

/**
 * Fetches leaf tasks directly assigned to the current user (assigned_to = user.id).
 * "Leaf" means the task has no child tasks in the tasks table — it is an
 * actionable execution item, not a parent initiative.
 * Participants are intentionally excluded: only direct assignees appear here.
 * The Sidebar further deduplicates against useMyLeadInitiatives via initiativeIds.
 */
export function useMyAssignedLeafTasks() {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading: loading } = useQuery({
    queryKey: ['myAssignedLeafTasks'],
    staleTime: 15_000,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as AssignedLeafTask[];

      // 1. Sub-tasks directly assigned to this user (parent_id IS NOT NULL only).
      // Root-level tasks (parent_id IS NULL) are strictly handled by useMyLeadInitiatives.
      const { data: assignedRows, error: assignedErr } = await supabase
        .from('tasks')
        .select('id, title, priority, metadata, progress_mode, progress_manual, group_id, parent_id')
        .eq('assigned_to', user.id)
        .not('parent_id', 'is', null);

      if (assignedErr) console.error('[useMyAssignedLeafTasks] query error:', assignedErr);
      console.log('[useMyAssignedLeafTasks] user.id:', user.id, 'sub-tasks assigned:', assignedRows?.map(t => t.title));

      const candidates = assignedRows ?? [];
      if (candidates.length === 0) return [] as AssignedLeafTask[];

      // 2. Filter to leaf nodes — exclude tasks that have further child tasks
      const candidateIds = candidates.map(t => t.id);
      const { data: childRows } = await supabase
        .from('tasks')
        .select('parent_id')
        .in('parent_id', candidateIds);

      const tasksWithChildren = new Set((childRows ?? []).map(r => r.parent_id));
      const allRows = candidates.filter(t => !tasksWithChildren.has(t.id));

      console.log('[useMyAssignedLeafTasks] leaf sub-tasks:', allRows.map(t => t.title));

      if (allRows.length === 0) return [] as AssignedLeafTask[];

      // 2. Resolve groups → projects
      const groupIds = [...new Set(allRows.map(t => t.group_id).filter(Boolean))];
      const { data: groups } = await supabase.from('groups').select('id, name, project_id').in('id', groupIds);
      const projectIds = [...new Set((groups ?? []).map(g => g.project_id))];
      const { data: projectRows } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds);

      const groupMap  = new Map((groups      ?? []).map(g => [g.id, g]));
      const projectMap = new Map((projectRows ?? []).map(p => [p.id, p]));
      console.log('[useMyAssignedLeafTasks] groups resolved:', groups?.length ?? 0, 'projects:', projectRows?.length ?? 0);

      // 3. Compute progress from milestones for auto-mode tasks
      const autoIds = allRows.filter(t => t.progress_mode === 'auto').map(t => t.id);
      const msCountMap = new Map<string, { total: number; done: number }>();
      if (autoIds.length > 0) {
        const { data: mRows } = await supabase
          .from('milestones')
          .select('task_id, done')
          .in('task_id', autoIds);
        for (const m of mRows ?? []) {
          const cur = msCountMap.get(m.task_id) ?? { total: 0, done: 0 };
          msCountMap.set(m.task_id, { total: cur.total + 1, done: cur.done + (m.done ? 1 : 0) });
        }
      }

      // 4. Resolve parent titles for breadcrumb display
      const parentIds = [...new Set(allRows.filter(t => t.parent_id).map(t => t.parent_id as string))];
      const parentTitleMap = new Map<string, string>();
      if (parentIds.length > 0) {
        const { data: parents } = await supabase
          .from('tasks')
          .select('id, title')
          .in('id', parentIds);
        (parents ?? []).forEach((p: { id: string; title: string }) => parentTitleMap.set(p.id, p.title));
      }

      const result: AssignedLeafTask[] = [];
      for (const t of allRows) {
        const group   = groupMap.get(t.group_id);
        const project = group ? projectMap.get(group.project_id) : null;

        let progress = 0;
        if (t.progress_mode === 'auto') {
          const ms = msCountMap.get(t.id);
          progress = ms && ms.total > 0 ? Math.round((ms.done / ms.total) * 100) : 0;
        } else {
          progress = t.progress_manual ?? 0;
        }

        result.push({
          id: t.id,
          title: t.title,
          priority: t.priority ?? 'P2',
          dueDate: t.metadata?.dueDate ?? null,
          progress,
          category: group?.name ?? '',
          projectId: project?.id ?? '',
          projectName: project?.name ?? '',
          parentTitle: t.parent_id ? (parentTitleMap.get(t.parent_id) ?? null) : null,
        });
      }
      console.log('[useMyAssignedLeafTasks] final result:', result.map(t => ({ id: t.id, title: t.title })));
      return result;
    },
  });

  useEffect(() => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['myAssignedLeafTasks'] });

    const tasksCh = supabase
      .channel('my-assigned-tasks-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, invalidate)
      .subscribe();

    const participantsCh = supabase
      .channel('my-assigned-participants-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_participants' }, invalidate)
      .subscribe();

    return () => {
      supabase.removeChannel(tasksCh);
      supabase.removeChannel(participantsCh);
    };
  }, [queryClient]);

  return { tasks, loading };
}

// ── useMyAssignedMilestones ───────────────────────────────────────────────────

export interface AssignedMilestone {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null;
  taskId: string;
  taskTitle: string;
  projectName: string;
}

/**
 * Fetches milestones where assigned_to = current user and done = false.
 * Relies on the `assigned_to` column added to the milestones table.
 */
export function useMyAssignedMilestones() {
  const queryClient = useQueryClient();

  const { data: milestones = [], isLoading: loading } = useQuery({
    queryKey: ['myAssignedMilestones'],
    staleTime: 15_000,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as AssignedMilestone[];

      const { data: rows, error } = await supabase
        .from('milestones')
        .select(`
          id, title, done, order,
          task_id,
          tasks!inner ( id, title, metadata, group_id,
            groups!inner ( id, name, project_id,
              projects!inner ( id, name )
            )
          )
        `)
        .eq('assigned_to', user.id)
        .eq('done', false);

      if (error) {
        console.error('[useMyAssignedMilestones] error:', error);
        return [] as AssignedMilestone[];
      }

      return (rows ?? []).map((m: any) => {
        const task     = m.tasks;
        const group    = task?.groups;
        const project  = group?.projects;
        const extras   = (task?.metadata?.milestoneExtras ?? []) as Array<{ dueDate?: string }>;
        const dueDate  = extras[m.order]?.dueDate ?? null;

        return {
          id: m.id,
          title: m.title,
          done: m.done,
          dueDate,
          taskId: m.task_id,
          taskTitle: task?.title ?? '',
          projectName: project?.name ?? '',
        } as AssignedMilestone;
      });
    },
  });

  useEffect(() => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['myAssignedMilestones'] });

    const ch = supabase
      .channel('my-assigned-milestones-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones' }, invalidate)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  return { milestones, loading };
}

// ── useMyLeadInitiatives ──────────────────────────────────────────────────────
//
// RULE: A task assigned to the user where parent_id IS NULL is a Level-1
// initiative — the user LEADS it.  This is topology-based, not children-count-
// based, which is the reliable criterion:
//   • "הקמת חדר כושר"  → parent_id IS NULL  → initiative  ✓
//   • "השגת תקציב"    → parent_id IS NOT NULL → milestone ✓
//
// Sub-items of an initiative may live in the `milestones` table (checklist rows)
// rather than as child tasks, so we can NOT rely on checking whether any tasks
// reference this ID as parent_id — that check silently returns zero for tasks
// whose breakdown is stored as milestones, not child tasks.

export interface InitiativeSummary {
  id: string;
  title: string;
  priority: 'P1' | 'P2' | 'P3' | null;
  dueDate: string | null;
  progress: number;           // 0-100, from status_percent or milestones
  category: string;           // group name
  projectId: string;
  projectName: string;
  milestoneCount: number;     // checklist milestones total
  milestoneDone: number;      // checklist milestones completed
}

export function useMyLeadInitiatives() {
  const queryClient = useQueryClient();

  const { data: initiatives = [], isLoading: loading } = useQuery({
    queryKey: ['myLeadInitiatives'],
    staleTime: 15_000,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as InitiativeSummary[];

      // Root-level tasks directly assigned to this user — initiatives they LEAD.
      // Uses tasks table directly (not active_leaf_tasks view) so tasks with
      // children are included — a project with sub-tasks is still an initiative.
      const { data: rows, error } = await supabase
        .from('tasks')
        .select('id, title, priority, metadata, progress_mode, progress_manual, group_id')
        .eq('assigned_to', user.id)
        .is('parent_id', null);

      if (error) throw error;
      if (!rows || rows.length === 0) return [] as InitiativeSummary[];

      // Resolve groups → projects
      const groupIds = [...new Set(rows.map(r => r.group_id).filter(Boolean))];
      const { data: groups } = await supabase.from('groups').select('id, name, project_id').in('id', groupIds);
      const projectIds = [...new Set((groups ?? []).map(g => g.project_id))];
      const { data: projectRows } = await supabase.from('projects').select('id, name').in('id', projectIds);

      const groupMap   = new Map((groups      ?? []).map(g => [g.id, g]));
      const projectMap = new Map((projectRows ?? []).map(p => [p.id, p]));

      // Compute progress from milestones (auto mode) or manual value
      const autoIds = rows.filter(r => r.progress_mode === 'auto').map(r => r.id);
      const msMap = new Map<string, { total: number; done: number }>();
      if (autoIds.length > 0) {
        const { data: mRows } = await supabase.from('milestones').select('task_id, done').in('task_id', autoIds);
        for (const m of mRows ?? []) {
          const cur = msMap.get(m.task_id) ?? { total: 0, done: 0 };
          msMap.set(m.task_id, { total: cur.total + 1, done: cur.done + (m.done ? 1 : 0) });
        }
      }

      const result: InitiativeSummary[] = [];
      for (const r of rows) {
        const group   = groupMap.get(r.group_id);
        const project = group ? projectMap.get(group.project_id) : null;

        const ms = msMap.get(r.id);
        const progress = r.progress_mode === 'auto'
          ? (ms && ms.total > 0 ? Math.round((ms.done / ms.total) * 100) : 0)
          : (r.progress_manual ?? 0);

        result.push({
          id: r.id,
          title: r.title,
          priority: r.priority ?? null,
          dueDate: r.metadata?.dueDate ?? null,
          progress,
          category: group?.name ?? '',
          projectId: project?.id ?? '',
          projectName: project?.name ?? '',
          milestoneCount: ms?.total ?? 0,
          milestoneDone:  ms?.done  ?? 0,
        });
      }
      return result;
    },
  });

  useEffect(() => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['myLeadInitiatives'] });
    const ch = supabase
      .channel('my-initiatives-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones' }, invalidate)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  return { initiatives, loading };
}

// ── Group Progress Stats (from group_progress_stats view) ─────────────────────

export interface GroupProgressStat {
  group_id: string;
  project_id: string;
  group_name: string;
  group_color: string | null;
  group_order: number;
  project_name: string;
  leaf_task_count: number;
  completed_count: number;
  overdue_count: number;
  avg_progress: number;
  current_work: string | null;
}

export function useGroupProgressStats() {
  return useQuery({
    queryKey: ['group_progress_stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_progress_stats')
        .select(
          'group_id, project_id, group_name, group_color, group_order, project_name, leaf_task_count, completed_count, overdue_count, avg_progress, current_work'
        )
        .order('group_order', { ascending: true });

      if (error) throw error;
      return (data ?? []) as GroupProgressStat[];
    },
    staleTime: 30_000,
  });
}

