export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: string;
  projectId: string;
  name: string;
  color?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  groupId: string;
  title: string;
  description?: string;
  ownerName?: string;
  progressMode: 'auto' | 'manual';
  progressManual?: number; // 0-100
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
  dueDate?: Date;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Person {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskWatcher {
  taskId: string;
  personId: string;
  createdAt: Date;
}

// Computed progress for a task
export interface TaskProgress {
  taskId: string;
  progress: number; // 0-100
  completedMilestones: number;
  totalMilestones: number;
}

// View types
export type ViewMode = 'cards' | 'board' | 'tree';

// Extended task with relations
export interface TaskWithRelations extends Task {
  group: Group;
  milestones: Milestone[];
  progress: TaskProgress;
  watchers?: Person[];
}
