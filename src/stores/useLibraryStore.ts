import { create } from 'zustand';
import type { Game, Platform, Emulator, Collection } from '../types';

interface LibraryState {
  games: Game[];
  platforms: Platform[];
  emulators: Emulator[];
  collections: Collection[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadLibrary: () => Promise<void>;
  addGame: (game: Game) => void;
  updateGame: (id: string, updates: Partial<Game>) => void;
  deleteGame: (id: string) => void;
  toggleFavorite: (id: string) => void;
  addEmulator: (emulator: Emulator) => void;
  updateEmulator: (id: string, updates: Partial<Emulator>) => void;
  deleteEmulator: (id: string) => void;
  addCollection: (collection: Collection) => void;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;
}

// Default platforms based on CLAUDE.md spec
const defaultPlatforms: Platform[] = [
  { id: 'nes', displayName: 'NES', manufacturer: 'Nintendo', fileExtensions: ['.nes', '.unf'], color: '#e60012' },
  { id: 'snes', displayName: 'SNES', manufacturer: 'Nintendo', fileExtensions: ['.sfc', '.smc'], color: '#7b5aa6' },
  { id: 'n64', displayName: 'Nintendo 64', manufacturer: 'Nintendo', fileExtensions: ['.n64', '.z64', '.v64'], color: '#009e60' },
  { id: 'gamecube', displayName: 'GameCube', manufacturer: 'Nintendo', fileExtensions: ['.iso', '.gcz', '.rvz'], color: '#6a5acd' },
  { id: 'wii', displayName: 'Wii', manufacturer: 'Nintendo', fileExtensions: ['.iso', '.wbfs', '.rvz'], color: '#00a0dc' },
  { id: 'switch', displayName: 'Nintendo Switch', manufacturer: 'Nintendo', fileExtensions: ['.nsp', '.xci'], color: '#e60012' },
  { id: 'gb', displayName: 'Game Boy', manufacturer: 'Nintendo', fileExtensions: ['.gb'], color: '#8b956d' },
  { id: 'gbc', displayName: 'Game Boy Color', manufacturer: 'Nintendo', fileExtensions: ['.gbc'], color: '#6b5b95' },
  { id: 'gba', displayName: 'Game Boy Advance', manufacturer: 'Nintendo', fileExtensions: ['.gba'], color: '#5b5ea6' },
  { id: 'nds', displayName: 'Nintendo DS', manufacturer: 'Nintendo', fileExtensions: ['.nds'], color: '#c0c0c0' },
  { id: '3ds', displayName: 'Nintendo 3DS', manufacturer: 'Nintendo', fileExtensions: ['.3ds', '.cia'], color: '#ce1141' },
  { id: 'ps1', displayName: 'PlayStation', manufacturer: 'Sony', fileExtensions: ['.bin', '.cue', '.chd'], color: '#003087' },
  { id: 'ps2', displayName: 'PlayStation 2', manufacturer: 'Sony', fileExtensions: ['.iso', '.chd'], color: '#003087' },
  { id: 'ps3', displayName: 'PlayStation 3', manufacturer: 'Sony', fileExtensions: ['.pkg'], color: '#003087' },
  { id: 'psp', displayName: 'PlayStation Portable', manufacturer: 'Sony', fileExtensions: ['.iso', '.cso'], color: '#003087' },
  { id: 'vita', displayName: 'PlayStation Vita', manufacturer: 'Sony', fileExtensions: ['.vpk'], color: '#003087' },
  { id: 'genesis', displayName: 'Sega Genesis', manufacturer: 'Sega', fileExtensions: ['.md', '.gen', '.bin'], color: '#0060a8' },
  { id: 'saturn', displayName: 'Sega Saturn', manufacturer: 'Sega', fileExtensions: ['.iso', '.cue', '.chd'], color: '#0060a8' },
  { id: 'dreamcast', displayName: 'Dreamcast', manufacturer: 'Sega', fileExtensions: ['.gdi', '.cdi', '.chd'], color: '#ff6600' },
  { id: 'xbox', displayName: 'Xbox', manufacturer: 'Microsoft', fileExtensions: ['.iso'], color: '#107c10' },
  { id: 'xbox360', displayName: 'Xbox 360', manufacturer: 'Microsoft', fileExtensions: ['.iso'], color: '#107c10' },
  { id: 'arcade', displayName: 'Arcade', manufacturer: 'Various', fileExtensions: ['.zip'], color: '#ff00ff' },
  { id: 'dos', displayName: 'DOS', manufacturer: 'PC', fileExtensions: [], color: '#00ff00' },
  { id: 'scummvm', displayName: 'ScummVM', manufacturer: 'PC', fileExtensions: [], color: '#8b4513' },
];

export const useLibraryStore = create<LibraryState>((set, get) => ({
  games: [],
  platforms: defaultPlatforms,
  emulators: [],
  collections: [],
  isLoading: false,
  error: null,

  loadLibrary: async () => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Load from Tauri SQLite backend
      // const games = await invoke<Game[]>('get_all_games');
      // const emulators = await invoke<Emulator[]>('get_all_emulators');
      // const collections = await invoke<Collection[]>('get_all_collections');
      // set({ games, emulators, collections, isLoading: false });
      set({ isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  addGame: (game) => {
    set((state) => ({ games: [...state.games, game] }));
  },

  updateGame: (id, updates) => {
    set((state) => ({
      games: state.games.map((game) =>
        game.id === id ? { ...game, ...updates } : game
      ),
    }));
  },

  deleteGame: (id) => {
    set((state) => ({
      games: state.games.filter((game) => game.id !== id),
    }));
  },

  toggleFavorite: (id) => {
    set((state) => ({
      games: state.games.map((game) =>
        game.id === id ? { ...game, isFavorite: !game.isFavorite } : game
      ),
    }));
  },

  addEmulator: (emulator) => {
    set((state) => ({ emulators: [...state.emulators, emulator] }));
  },

  updateEmulator: (id, updates) => {
    set((state) => ({
      emulators: state.emulators.map((emu) =>
        emu.id === id ? { ...emu, ...updates } : emu
      ),
    }));
  },

  deleteEmulator: (id) => {
    set((state) => ({
      emulators: state.emulators.filter((emu) => emu.id !== id),
    }));
  },

  addCollection: (collection) => {
    set((state) => ({ collections: [...state.collections, collection] }));
  },

  updateCollection: (id, updates) => {
    set((state) => ({
      collections: state.collections.map((col) =>
        col.id === id ? { ...col, ...updates } : col
      ),
    }));
  },

  deleteCollection: (id) => {
    set((state) => ({
      collections: state.collections.filter((col) => col.id !== id),
    }));
  },
}));
