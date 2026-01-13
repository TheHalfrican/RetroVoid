import { invoke } from '@tauri-apps/api/core';
import type { Game, Emulator, Collection, PlaySession } from '../types';

// Game operations
export async function getAllGames(): Promise<Game[]> {
  return invoke<Game[]>('get_all_games');
}

export async function getGame(id: string): Promise<Game | null> {
  return invoke<Game | null>('get_game', { id });
}

export async function addGame(game: Omit<Game, 'id'>): Promise<Game> {
  return invoke<Game>('add_game', { game });
}

export async function updateGame(id: string, updates: Partial<Game>): Promise<Game> {
  return invoke<Game>('update_game', { id, updates });
}

export async function deleteGame(id: string): Promise<void> {
  return invoke('delete_game', { id });
}

// Library scanning
export async function scanLibrary(paths: string[]): Promise<Game[]> {
  return invoke<Game[]>('scan_library', { paths });
}

// Emulator operations
export async function getAllEmulators(): Promise<Emulator[]> {
  return invoke<Emulator[]>('get_all_emulators');
}

export async function addEmulator(emulator: Omit<Emulator, 'id'>): Promise<Emulator> {
  return invoke<Emulator>('add_emulator', { emulator });
}

export async function updateEmulator(id: string, updates: Partial<Emulator>): Promise<Emulator> {
  return invoke<Emulator>('update_emulator', { id, updates });
}

export async function deleteEmulator(id: string): Promise<void> {
  return invoke('delete_emulator', { id });
}

// Collection operations
export async function getAllCollections(): Promise<Collection[]> {
  return invoke<Collection[]>('get_all_collections');
}

export async function addCollection(collection: Omit<Collection, 'id'>): Promise<Collection> {
  return invoke<Collection>('add_collection', { collection });
}

export async function updateCollection(id: string, updates: Partial<Collection>): Promise<Collection> {
  return invoke<Collection>('update_collection', { id, updates });
}

export async function deleteCollection(id: string): Promise<void> {
  return invoke('delete_collection', { id });
}

// Play session tracking
export async function getPlaySessions(gameId: string): Promise<PlaySession[]> {
  return invoke<PlaySession[]>('get_play_sessions', { gameId });
}
