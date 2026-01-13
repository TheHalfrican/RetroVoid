import { create } from 'zustand';
import type { ViewMode } from '../types';

interface UIState {
  selectedGameId: string | null;
  selectedPlatformId: string | null;
  viewMode: ViewMode;
  searchQuery: string;
  sidebarCollapsed: boolean;
  settingsPanelOpen: boolean;
  gameDetailOpen: boolean;

  // Actions
  selectGame: (id: string | null) => void;
  selectPlatform: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSettingsPanel: () => void;
  setSettingsPanelOpen: (open: boolean) => void;
  openGameDetail: (gameId: string) => void;
  closeGameDetail: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedGameId: null,
  selectedPlatformId: null,
  viewMode: 'grid',
  searchQuery: '',
  sidebarCollapsed: false,
  settingsPanelOpen: false,
  gameDetailOpen: false,

  selectGame: (id) => set({ selectedGameId: id }),

  selectPlatform: (id) => set({ selectedPlatformId: id }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  toggleSettingsPanel: () => set((state) => ({ settingsPanelOpen: !state.settingsPanelOpen })),

  setSettingsPanelOpen: (open) => set({ settingsPanelOpen: open }),

  openGameDetail: (gameId) => set({ selectedGameId: gameId, gameDetailOpen: true }),

  closeGameDetail: () => set({ gameDetailOpen: false }),
}));
