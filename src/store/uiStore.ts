import { create } from 'zustand';
import type { ViewMode } from '@/types';

interface UIStore {
  // View mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Task drawer
  selectedTaskId: string | null;
  isDrawerOpen: boolean;
  openTaskDrawer: (taskId: string) => void;
  closeTaskDrawer: () => void;

  // Search/Filter
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedGroupIds: string[];
  setSelectedGroupIds: (groupIds: string[]) => void;

  // Big Picture modal
  bigPictureOpen: boolean;
  openBigPicture: () => void;
  closeBigPicture: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // View mode
  viewMode: 'cards',
  setViewMode: (mode) => set({ viewMode: mode }),

  // Task drawer
  selectedTaskId: null,
  isDrawerOpen: false,
  openTaskDrawer: (taskId) => set({ selectedTaskId: taskId, isDrawerOpen: true }),
  closeTaskDrawer: () => set({ selectedTaskId: null, isDrawerOpen: false }),

  // Search/Filter
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectedGroupIds: [],
  setSelectedGroupIds: (groupIds) => set({ selectedGroupIds: groupIds }),

  // Big Picture modal
  bigPictureOpen: false,
  openBigPicture: () => set({ bigPictureOpen: true }),
  closeBigPicture: () => set({ bigPictureOpen: false }),
}));
