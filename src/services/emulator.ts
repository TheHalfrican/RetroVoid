import { invoke } from '@tauri-apps/api/core';

export interface LaunchResult {
  success: boolean;
  pid?: number;
  error?: string;
}

// Launch a game with its configured or default emulator
export async function launchGame(gameId: string): Promise<LaunchResult> {
  return invoke<LaunchResult>('launch_game', { gameId });
}

// Launch a game with a specific emulator (override)
export async function launchGameWithEmulator(
  gameId: string,
  emulatorId: string
): Promise<LaunchResult> {
  return invoke<LaunchResult>('launch_game_with_emulator', { gameId, emulatorId });
}

// Stop tracking a game session (called when emulator exits)
export async function endGameSession(gameId: string): Promise<void> {
  return invoke('end_game_session', { gameId });
}

// Detect installed emulators on the system
export async function detectEmulators(): Promise<string[]> {
  return invoke<string[]>('detect_emulators');
}

// Validate that an emulator executable exists
export async function validateEmulatorPath(path: string): Promise<boolean> {
  return invoke<boolean>('validate_emulator_path', { path });
}

// Get the default emulator for a platform
export async function getDefaultEmulator(platformId: string): Promise<string | null> {
  return invoke<string | null>('get_default_emulator', { platformId });
}

// Set the default emulator for a platform
export async function setDefaultEmulator(
  platformId: string,
  emulatorId: string
): Promise<void> {
  return invoke('set_default_emulator', { platformId, emulatorId });
}
