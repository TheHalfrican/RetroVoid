import { create } from 'zustand';
import type { ViewMode, Game } from '../types';
import { scrapeGameMetadata, type BatchScrapeResult } from '../services/scraper';

type SettingsTab = 'library' | 'manual-import' | 'emulators' | 'retroarch' | 'platforms' | 'metadata' | 'appearance';

// Batch scraping log entry
export interface ScrapeLogEntry {
  gameId: string;
  title: string;
  status: 'pending' | 'scraping' | 'success' | 'failed';
  error?: string;
}

// Track if scraping should be cancelled (outside store for direct access in async loop)
let scrapeAbortFlag = false;

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
  coverVersions: Record<string, number>;  // Track cover art updates for cache busting

  // Multi-select state
  selectedGameIds: Set<string>;
  lastSelectedGameId: string | null;

  // Batch scraping state
  batchScraping: boolean;
  batchScrapeLog: ScrapeLogEntry[];
  batchScrapeResult: BatchScrapeResult | null;

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
  incrementCoverVersion: (gameId: string) => void;

  // Multi-select actions
  selectGameForMulti: (gameId: string, shiftKey: boolean, filteredGameIds: string[]) => void;
  clearSelection: () => void;

  // Batch scraping actions
  startBatchScrape: (gamesToScrape: Game[], loadLibrary: () => Promise<void>) => Promise<void>;
  cancelBatchScrape: () => void;
  clearBatchScrapeResult: () => void;
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
  coverVersions: {},

  // Multi-select state
  selectedGameIds: new Set<string>(),
  lastSelectedGameId: null,

  // Batch scraping state
  batchScraping: false,
  batchScrapeLog: [],
  batchScrapeResult: null,

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

  incrementCoverVersion: (gameId) => set((state) => ({
    coverVersions: {
      ...state.coverVersions,
      [gameId]: (state.coverVersions[gameId] || 0) + 1,
    },
  })),

  // Multi-select actions
  selectGameForMulti: (gameId, shiftKey, filteredGameIds) => set((state) => {
    if (shiftKey && state.lastSelectedGameId) {
      // Range selection: select all games between lastSelectedGameId and gameId
      const newSelectedIds = new Set(state.selectedGameIds);
      const lastIndex = filteredGameIds.indexOf(state.lastSelectedGameId);
      const currentIndex = filteredGameIds.indexOf(gameId);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);

        for (let i = start; i <= end; i++) {
          newSelectedIds.add(filteredGameIds[i]);
        }
      } else {
        // Fallback: just add the clicked game
        newSelectedIds.add(gameId);
      }

      return {
        selectedGameIds: newSelectedIds,
        lastSelectedGameId: gameId,
      };
    } else if (shiftKey) {
      // Shift held but no previous selection - start fresh selection
      const newSelectedIds = new Set<string>();
      newSelectedIds.add(gameId);
      return {
        selectedGameIds: newSelectedIds,
        lastSelectedGameId: gameId,
      };
    } else {
      // Non-shift click: clear all and select only this one
      const newSelectedIds = new Set<string>();
      newSelectedIds.add(gameId);
      return {
        selectedGameIds: newSelectedIds,
        lastSelectedGameId: gameId,
      };
    }
  }),

  clearSelection: () => set({
    selectedGameIds: new Set<string>(),
    lastSelectedGameId: null,
  }),

  // Batch scraping actions
  startBatchScrape: async (gamesToScrape, loadLibrary) => {
    // Reset abort flag
    scrapeAbortFlag = false;

    if (gamesToScrape.length === 0) {
      set({
        batchScraping: false,
        batchScrapeResult: { total: 0, successful: 0, failed: 0, errors: [] },
        batchScrapeLog: [],
      });
      return;
    }

    // Initialize log entries
    const initialLog: ScrapeLogEntry[] = gamesToScrape.map(g => ({
      gameId: g.id,
      title: g.title,
      status: 'pending',
    }));

    set({
      batchScraping: true,
      batchScrapeResult: null,
      batchScrapeLog: initialLog,
    });

    const results = { total: gamesToScrape.length, successful: 0, failed: 0, errors: [] as string[] };

    // Process each game
    for (let i = 0; i < gamesToScrape.length; i++) {
      // Check if cancelled
      if (scrapeAbortFlag) {
        break;
      }

      const game = gamesToScrape[i];

      // Update log to show current game is being scraped
      set((state) => ({
        batchScrapeLog: state.batchScrapeLog.map((entry, idx) =>
          idx === i ? { ...entry, status: 'scraping' } : entry
        ),
      }));

      try {
        await scrapeGameMetadata(game.id);
        results.successful++;

        // Update log entry to success
        set((state) => ({
          batchScrapeLog: state.batchScrapeLog.map((entry, idx) =>
            idx === i ? { ...entry, status: 'success' } : entry
          ),
        }));
      } catch (error) {
        results.failed++;
        const errorMsg = `${game.title}: ${String(error)}`;
        results.errors.push(errorMsg);

        // Update log entry to failed
        set((state) => ({
          batchScrapeLog: state.batchScrapeLog.map((entry, idx) =>
            idx === i ? { ...entry, status: 'failed', error: String(error) } : entry
          ),
        }));
      }
    }

    // Reload library to pick up new metadata
    await loadLibrary();

    // Mark as complete
    set({
      batchScraping: false,
      batchScrapeResult: results,
      batchScrapeLog: [], // Clear log when showing results
    });
  },

  cancelBatchScrape: () => {
    scrapeAbortFlag = true;
  },

  clearBatchScrapeResult: () => set({
    batchScrapeResult: null,
    batchScrapeLog: [],
  }),
}));
