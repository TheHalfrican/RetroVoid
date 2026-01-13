import { invoke } from '@tauri-apps/api/core';
import type { Game, Emulator, Platform, Collection, PlaySession } from '../types';

// ==================== GAME OPERATIONS ====================

export async function getAllGames(): Promise<Game[]> {
  return invoke<Game[]>('get_all_games');
}

export async function getGame(id: string): Promise<Game | null> {
  return invoke<Game | null>('get_game', { id });
}

export interface CreateGameInput {
  title: string;
  romPath: string;
  platformId: string;
  coverArtPath?: string;
  description?: string;
}

export async function addGame(input: CreateGameInput): Promise<Game> {
  return invoke<Game>('add_game', { input });
}

export interface UpdateGameInput {
  title?: string;
  platformId?: string;
  coverArtPath?: string;
  backgroundPath?: string;
  description?: string;
  releaseDate?: string;
  genre?: string[];
  developer?: string;
  publisher?: string;
  isFavorite?: boolean;
  preferredEmulatorId?: string;
}

export async function updateGame(id: string, updates: UpdateGameInput): Promise<void> {
  return invoke('update_game', { id, updates });
}

export async function deleteGame(id: string): Promise<void> {
  return invoke('delete_game', { id });
}

export async function toggleFavorite(id: string): Promise<boolean> {
  return invoke<boolean>('toggle_favorite', { id });
}

// ==================== LIBRARY SCANNING ====================

export interface ScanResult {
  gamesFound: number;
  gamesAdded: number;
  gamesUpdated: number;
  errors: string[];
}

export interface ScanPath {
  path: string;
  platformId?: string;  // If specified, all games in this folder will use this platform
}

export async function scanLibrary(paths: ScanPath[]): Promise<ScanResult> {
  return invoke<ScanResult>('scan_library', { paths });
}

// ==================== EMULATOR OPERATIONS ====================

export async function getAllEmulators(): Promise<Emulator[]> {
  return invoke<Emulator[]>('get_all_emulators');
}

export async function getEmulator(id: string): Promise<Emulator | null> {
  return invoke<Emulator | null>('get_emulator', { id });
}

export interface CreateEmulatorInput {
  name: string;
  executablePath: string;
  launchArguments?: string;
  supportedPlatformIds: string[];
}

export async function addEmulator(input: CreateEmulatorInput): Promise<Emulator> {
  return invoke<Emulator>('add_emulator', { input });
}

export interface UpdateEmulatorInput {
  name?: string;
  executablePath?: string;
  launchArguments?: string;
  supportedPlatformIds?: string[];
}

export async function updateEmulator(id: string, updates: UpdateEmulatorInput): Promise<void> {
  return invoke('update_emulator', { id, updates });
}

export async function deleteEmulator(id: string): Promise<void> {
  return invoke('delete_emulator', { id });
}

// ==================== PLATFORM OPERATIONS ====================

export async function getAllPlatforms(): Promise<Platform[]> {
  return invoke<Platform[]>('get_all_platforms');
}

export async function getPlatform(id: string): Promise<Platform | null> {
  return invoke<Platform | null>('get_platform', { id });
}

export async function setDefaultEmulator(platformId: string, emulatorId: string): Promise<void> {
  return invoke('set_default_emulator', { platformId, emulatorId });
}

// ==================== COLLECTION OPERATIONS ====================

export async function getAllCollections(): Promise<Collection[]> {
  return invoke<Collection[]>('get_all_collections');
}

export interface CreateCollectionInput {
  name: string;
}

export async function addCollection(input: CreateCollectionInput): Promise<Collection> {
  return invoke<Collection>('add_collection', { input });
}

export interface UpdateCollectionInput {
  name?: string;
  gameIds?: string[];
  coverGameId?: string;
}

export async function updateCollection(id: string, updates: UpdateCollectionInput): Promise<void> {
  return invoke('update_collection', { id, updates });
}

export async function deleteCollection(id: string): Promise<void> {
  return invoke('delete_collection', { id });
}

// ==================== PLAY SESSION OPERATIONS ====================

export async function getPlaySessions(gameId: string): Promise<PlaySession[]> {
  return invoke<PlaySession[]>('get_play_sessions', { gameId });
}

// ==================== UTILITY OPERATIONS ====================

export async function getRomInfo(romPath: string): Promise<[string, string] | null> {
  return invoke<[string, string] | null>('get_rom_info', { romPath });
}

// ==================== SETTINGS ====================

export async function getSetting(key: string): Promise<string | null> {
  return invoke<string | null>('get_setting', { key });
}

export async function setSetting(key: string, value: string): Promise<void> {
  return invoke('set_setting', { key, value });
}
