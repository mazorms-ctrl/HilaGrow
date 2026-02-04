import { supabase, isBackendConfigured } from './supabase';
import {
  mockProject,
  mockGroups,
  mockTasks,
  mockMilestones,
} from './mockData';
import type { Project, Group, Task, Milestone, TaskProgress, Person, TaskWatcher } from '@/types';
import {
  saveProject,
  loadProject,
  saveGroups,
  loadGroups,
  saveTasks,
  loadTasks,
  saveMilestones,
  loadMilestones,
  savePeople,
  loadPeople,
  saveTaskWatchers,
  loadTaskWatchers,
} from './localStorage';

// Generate unique ID (compatible with older browsers)
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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
    // Load from localStorage, fallback to mock data
    return loadProject(mockProject);
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
    // Load from localStorage, fallback to mock data
    return loadGroups(mockGroups);
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
    // Load from localStorage, fallback to mock data
    return loadTasks(mockTasks);
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
    // Create task in localStorage
    const currentTasks = loadTasks(mockTasks);
    const newTask: Task = {
      id: generateId(),
      groupId: task.groupId || '',
      title: task.title || '',
      description: task.description,
      ownerName: task.ownerName,
      progressMode: task.progressMode || 'auto',
      progressManual: task.progressManual,
      order: task.order ?? currentTasks.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const updatedTasks = [...currentTasks, newTask];
    saveTasks(updatedTasks);
    return newTask;
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
    // Update task in localStorage
    const currentTasks = loadTasks(mockTasks);
    const taskIndex = currentTasks.findIndex(t => t.id === id);
    
    if (taskIndex === -1) {
      throw new Error(`Task with id ${id} not found`);
    }
    
    const updatedTask: Task = {
      ...currentTasks[taskIndex],
      ...updates,
      updatedAt: new Date(),
    };
    
    currentTasks[taskIndex] = updatedTask;
    saveTasks(currentTasks);
    return updatedTask;
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
    // Delete task from localStorage
    const currentTasks = loadTasks(mockTasks);
    const filteredTasks = currentTasks.filter(t => t.id !== id);
    saveTasks(filteredTasks);
    
    // Also delete associated milestones
    const currentMilestones = loadMilestones(mockMilestones);
    const filteredMilestones = currentMilestones.filter(m => m.taskId !== id);
    saveMilestones(filteredMilestones);
    return;
  }

  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

// --- Milestones ---
export async function fetchMilestones(): Promise<Milestone[]> {
  if (!isBackendConfigured()) {
    // Load from localStorage, fallback to mock data
    return loadMilestones(mockMilestones);
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
    // Create milestone in localStorage
    const currentMilestones = loadMilestones(mockMilestones);
    const newMilestone: Milestone = {
      id: generateId(),
      taskId: milestone.taskId || '',
      title: milestone.title || '',
      done: milestone.done || false,
      dueDate: milestone.dueDate,
      order: milestone.order ?? currentMilestones.filter(m => m.taskId === milestone.taskId).length,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const updatedMilestones = [...currentMilestones, newMilestone];
    saveMilestones(updatedMilestones);
    return newMilestone;
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
    // Update milestone in localStorage
    const currentMilestones = loadMilestones(mockMilestones);
    const milestoneIndex = currentMilestones.findIndex(m => m.id === id);
    
    if (milestoneIndex === -1) {
      throw new Error(`Milestone with id ${id} not found`);
    }
    
    const updatedMilestone: Milestone = {
      ...currentMilestones[milestoneIndex],
      ...updates,
      updatedAt: new Date(),
    };
    
    currentMilestones[milestoneIndex] = updatedMilestone;
    saveMilestones(currentMilestones);
    return updatedMilestone;
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
    // Delete milestone from localStorage
    const currentMilestones = loadMilestones(mockMilestones);
    const filteredMilestones = currentMilestones.filter(m => m.id !== id);
    saveMilestones(filteredMilestones);
    return;
  }

  const { error } = await supabase.from('milestones').delete().eq('id', id);
  if (error) throw error;
}

// --- People ---
export async function fetchPeople(): Promise<Person[]> {
  if (!isBackendConfigured()) {
    // Load from localStorage, default to empty array
    return loadPeople([]);
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
    // Create person in localStorage
    const currentPeople = loadPeople([]);
    const newPerson: Person = {
      id: generateId(),
      name: person.name || '',
      email: person.email || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const updatedPeople = [...currentPeople, newPerson];
    savePeople(updatedPeople);
    return newPerson;
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
    // Update person in localStorage
    const currentPeople = loadPeople([]);
    const personIndex = currentPeople.findIndex(p => p.id === id);
    
    if (personIndex === -1) {
      throw new Error(`Person with id ${id} not found`);
    }
    
    const updatedPerson: Person = {
      ...currentPeople[personIndex],
      ...updates,
      updatedAt: new Date(),
    };
    
    currentPeople[personIndex] = updatedPerson;
    savePeople(currentPeople);
    return updatedPerson;
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
    // Delete person from localStorage
    const currentPeople = loadPeople([]);
    const filteredPeople = currentPeople.filter(p => p.id !== id);
    savePeople(filteredPeople);
    
    // Also remove from task watchers
    const currentWatchers = loadTaskWatchers([]);
    const filteredWatchers = currentWatchers.filter(w => w.personId !== id);
    saveTaskWatchers(filteredWatchers);
    return;
  }

  const { error } = await supabase.from('people').delete().eq('id', id);
  if (error) throw error;
}

// --- Groups CRUD (for future use) ---
export async function createGroup(group: Partial<Group>): Promise<Group> {
  if (!isBackendConfigured()) {
    // Create group in localStorage
    const currentGroups = loadGroups(mockGroups);
    const newGroup: Group = {
      id: generateId(),
      projectId: group.projectId || mockProject.id,
      name: group.name || '',
      color: group.color,
      order: group.order ?? currentGroups.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const updatedGroups = [...currentGroups, newGroup];
    saveGroups(updatedGroups);
    return newGroup;
  }

  const { data, error } = await supabase
    .from('groups')
    .insert({
      project_id: group.projectId,
      name: group.name,
      color: group.color,
      order: group.order || 0,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    projectId: data.project_id,
    name: data.name,
    color: data.color,
    order: data.order,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export async function updateGroup(
  id: string,
  updates: Partial<Group>
): Promise<Group> {
  if (!isBackendConfigured()) {
    // Update group in localStorage
    const currentGroups = loadGroups(mockGroups);
    const groupIndex = currentGroups.findIndex(g => g.id === id);
    
    if (groupIndex === -1) {
      throw new Error(`Group with id ${id} not found`);
    }
    
    const updatedGroup: Group = {
      ...currentGroups[groupIndex],
      ...updates,
      updatedAt: new Date(),
    };
    
    currentGroups[groupIndex] = updatedGroup;
    saveGroups(currentGroups);
    return updatedGroup;
  }

  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.color !== undefined) payload.color = updates.color;
  if (updates.order !== undefined) payload.order = updates.order;

  const { data, error } = await supabase
    .from('groups')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    projectId: data.project_id,
    name: data.name,
    color: data.color,
    order: data.order,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export async function deleteGroup(id: string): Promise<void> {
  if (!isBackendConfigured()) {
    // Delete group from localStorage
    const currentGroups = loadGroups(mockGroups);
    const filteredGroups = currentGroups.filter(g => g.id !== id);
    saveGroups(filteredGroups);
    
    // Also delete associated tasks and their milestones
    const currentTasks = loadTasks(mockTasks);
    const tasksToDelete = currentTasks.filter(t => t.groupId === id);
    const taskIdsToDelete = tasksToDelete.map(t => t.id);
    
    const filteredTasks = currentTasks.filter(t => t.groupId !== id);
    saveTasks(filteredTasks);
    
    const currentMilestones = loadMilestones(mockMilestones);
    const filteredMilestones = currentMilestones.filter(
      m => !taskIdsToDelete.includes(m.taskId)
    );
    saveMilestones(filteredMilestones);
    return;
  }

  const { error } = await supabase.from('groups').delete().eq('id', id);
  if (error) throw error;
}

// --- Task Watchers ---
export async function fetchTaskWatchers(taskId: string): Promise<Person[]> {
  if (!isBackendConfigured()) {
    // Load from localStorage
    const currentWatchers = loadTaskWatchers([]);
    const currentPeople = loadPeople([]);
    
    const taskWatcherPersonIds = currentWatchers
      .filter(w => w.taskId === taskId)
      .map(w => w.personId);
    
    return currentPeople.filter(p => taskWatcherPersonIds.includes(p.id));
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
    // Add task watcher in localStorage
    const currentWatchers = loadTaskWatchers([]);
    
    // Check if already exists
    const exists = currentWatchers.some(
      w => w.taskId === taskId && w.personId === personId
    );
    
    if (!exists) {
      const newWatcher: TaskWatcher = {
        taskId,
        personId,
        createdAt: new Date(),
      };
      
      const updatedWatchers = [...currentWatchers, newWatcher];
      saveTaskWatchers(updatedWatchers);
    }
    return;
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
    // Remove task watcher from localStorage
    const currentWatchers = loadTaskWatchers([]);
    const filteredWatchers = currentWatchers.filter(
      w => !(w.taskId === taskId && w.personId === personId)
    );
    saveTaskWatchers(filteredWatchers);
    return;
  }

  const { error } = await supabase
    .from('task_watchers')
    .delete()
    .eq('task_id', taskId)
    .eq('person_id', personId);

  if (error) throw error;
}
