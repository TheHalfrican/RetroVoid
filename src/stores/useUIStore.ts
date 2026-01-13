import { create } from 'zustand';
import type { ViewMode } from '../types';

type SettingsTab = 'library' | 'emulators' | 'retroarch' | 'platforms' | 'metadata' | 'appearance';

interface UIState {
  selectedGameId: string | null;
  selectedPlatformId: string | null;
  viewMode: ViewMode;
  searchQuery: string;
  sidebarCollapsed: boolean;
  settingsPanelOpen: boolean;  // Quick settings sidebar
  fullSettingsOpen: boolean;   // Full settings window
  settingsTab: SettingsTab;    // Current tab in full settings
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
  openFullSettings: (tab?: SettingsTab) => void;
  closeFullSettings: () => void;
  setSettingsTab: (tab: SettingsTab) => void;
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
  fullSettingsOpen: false,
  settingsTab: 'library',
  gameDetailOpen: false,

  selectGame: (id) => set({ selectedGameId: id }),

  selectPlatform: (id) => set({ selectedPlatformId: id }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  toggleSettingsPanel: () => set((state) => ({ settingsPanelOpen: !state.settingsPanelOpen })),

  setSettingsPanelOpen: (open) => set({ settingsPanelOpen: open }),

  openFullSettings: (tab) => set({
    fullSettingsOpen: true,
    settingsPanelOpen: false,  // Close quick settings when opening full
    settingsTab: tab || 'library'
  }),

  closeFullSettings: () => set({ fullSettingsOpen: false }),

  setSettingsTab: (tab) => set({ settingsTab: tab }),

  openGameDetail: (gameId) => set({ selectedGameId: gameId, gameDetailOpen: true }),

  closeGameDetail: () => set({ gameDetailOpen: false }),
}));
