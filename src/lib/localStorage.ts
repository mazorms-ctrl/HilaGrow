import type { Project, Group, Task, Milestone, Person, TaskWatcher } from '@/types';

// Storage keys
const STORAGE_KEYS = {
  PROJECT: 'grow.project',
  GROUPS: 'grow.groups',
  TASKS: 'grow.tasks',
  MILESTONES: 'grow.milestones',
  PEOPLE: 'grow.people',
  TASK_WATCHERS: 'grow.taskWatchers',
} as const;

// Generic localStorage helpers
function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to save to localStorage: ${key}`, error);
  }
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    return JSON.parse(stored, (key, value) => {
      // Revive Date objects
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
        return new Date(value);
      }
      return value;
    });
  } catch (error) {
    console.error(`Failed to load from localStorage: ${key}`, error);
    return defaultValue;
  }
}

// Project
export function saveProject(project: Project): void {
  saveToStorage(STORAGE_KEYS.PROJECT, project);
}

export function loadProject(defaultValue: Project): Project {
  return loadFromStorage(STORAGE_KEYS.PROJECT, defaultValue);
}

// Groups
export function saveGroups(groups: Group[]): void {
  saveToStorage(STORAGE_KEYS.GROUPS, groups);
}

export function loadGroups(defaultValue: Group[]): Group[] {
  return loadFromStorage(STORAGE_KEYS.GROUPS, defaultValue);
}

// Tasks
export function saveTasks(tasks: Task[]): void {
  saveToStorage(STORAGE_KEYS.TASKS, tasks);
}

export function loadTasks(defaultValue: Task[]): Task[] {
  return loadFromStorage(STORAGE_KEYS.TASKS, defaultValue);
}

// Milestones
export function saveMilestones(milestones: Milestone[]): void {
  saveToStorage(STORAGE_KEYS.MILESTONES, milestones);
}

export function loadMilestones(defaultValue: Milestone[]): Milestone[] {
  return loadFromStorage(STORAGE_KEYS.MILESTONES, defaultValue);
}

// People
export function savePeople(people: Person[]): void {
  saveToStorage(STORAGE_KEYS.PEOPLE, people);
}

export function loadPeople(defaultValue: Person[]): Person[] {
  return loadFromStorage(STORAGE_KEYS.PEOPLE, defaultValue);
}

// Task Watchers
export function saveTaskWatchers(watchers: TaskWatcher[]): void {
  saveToStorage(STORAGE_KEYS.TASK_WATCHERS, watchers);
}

export function loadTaskWatchers(defaultValue: TaskWatcher[]): TaskWatcher[] {
  return loadFromStorage(STORAGE_KEYS.TASK_WATCHERS, defaultValue);
}

// Clear all stored data (for reset/debugging)
export function clearAllStorage(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}
