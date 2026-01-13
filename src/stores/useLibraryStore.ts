import { create } from 'zustand';
import * as api from '../services/library';
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

export const useLibraryStore = create<LibraryState>((set) => ({
  games: [],
  platforms: [],
  emulators: [],
  collections: [],
  isLoading: false,
  error: null,

  loadLibrary: async () => {
    set({ isLoading: true, error: null });
    try {
      // Load all data from backend in parallel
      const [games, platforms, emulators, collections] = await Promise.all([
        api.getAllGames(),
        api.getAllPlatforms(),
        api.getAllEmulators(),
        api.getAllCollections(),
      ]);

      set({
        games,
        platforms,
        emulators,
        collections,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load library:', error);
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

  deleteGame: async (id) => {
    try {
      await api.deleteGame(id);
      set((state) => ({
        games: state.games.filter((game) => game.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete game:', error);
    }
  },

  toggleFavorite: async (id) => {
    try {
      const newValue = await api.toggleFavorite(id);
      set((state) => ({
        games: state.games.map((game) =>
          game.id === id ? { ...game, isFavorite: newValue } : game
        ),
      }));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
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

  deleteEmulator: async (id) => {
    try {
      await api.deleteEmulator(id);
      set((state) => ({
        emulators: state.emulators.filter((emu) => emu.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete emulator:', error);
    }
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

  deleteCollection: async (id) => {
    try {
      await api.deleteCollection(id);
      set((state) => ({
        collections: state.collections.filter((col) => col.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete collection:', error);
    }
  },
}));
