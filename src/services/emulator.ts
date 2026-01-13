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

// End tracking a game session
export async function endGameSession(gameId: string): Promise<void> {
  return invoke('end_game_session', { gameId });
}

// Validate that an emulator executable exists
export async function validateEmulatorPath(path: string): Promise<boolean> {
  return invoke<boolean>('validate_emulator_path', { path });
}
