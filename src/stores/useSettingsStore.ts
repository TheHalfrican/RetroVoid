import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode, Quality3D } from '../types';

interface SettingsState {
  theme: ThemeMode;
  enableScanlines: boolean;
  enableParticles: boolean;
  enable3DEffects: boolean;
  libraryPaths: string[];
  volume: number;
  launchInFullscreen: boolean;
  gridCardSize: number; // Min card width in pixels (120-280)
  quality3D: Quality3D; // 3D rendering quality (affects DPR and texture filtering)

  // Actions
  updateSettings: (updates: Partial<SettingsState>) => void;
  addLibraryPath: (path: string) => void;
  removeLibraryPath: (path: string) => void;
  resetSettings: () => void;
}

const defaultSettings: Omit<SettingsState, 'updateSettings' | 'addLibraryPath' | 'removeLibraryPath' | 'resetSettings'> = {
  theme: 'cyberpunk',
  enableScanlines: true,
  enableParticles: true,
  enable3DEffects: true,
  libraryPaths: [],
  volume: 80,
  launchInFullscreen: true,
  gridCardSize: 180,
  quality3D: 'high', // Default to 2x DPR - good balance for most systems
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      updateSettings: (updates) => set((state) => ({ ...state, ...updates })),

      addLibraryPath: (path) =>
        set((state) => ({
          libraryPaths: state.libraryPaths.includes(path)
            ? state.libraryPaths
            : [...state.libraryPaths, path],
        })),

      removeLibraryPath: (path) =>
        set((state) => ({
          libraryPaths: state.libraryPaths.filter((p) => p !== path),
        })),

      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'emulation-station-settings',
    }
  )
);
