// Game Library Types

export interface Game {
  id: string;                    // UUID
  title: string;
  romPath: string;
  platformId: string;
  coverArtPath?: string;
  backgroundPath?: string;
  screenshots?: string[];
  description?: string;
  releaseDate?: string;          // ISO date
  genre?: string[];
  developer?: string;
  publisher?: string;
  totalPlayTimeSeconds: number;
  lastPlayed?: string;           // ISO datetime
  isFavorite: boolean;
  preferredEmulatorId?: string;
  collectionIds: string[];
  createdAt?: string;            // ISO datetime - when game was added to library
}

export interface Emulator {
  id: string;
  name: string;
  executablePath: string;
  launchArguments: string;       // e.g., "--fullscreen {rom}"
  supportedPlatformIds: string[];
}

export interface Platform {
  id: string;                    // e.g., "nes", "ps1"
  displayName: string;
  manufacturer: string;          // "Nintendo", "Sony", etc.
  fileExtensions: string[];
  iconPath?: string;
  defaultEmulatorId?: string;
  color: string;                 // Accent color for UI theming
}

export interface Collection {
  id: string;
  name: string;
  gameIds: string[];
  coverGameId?: string;          // Game whose art represents collection
}

export interface PlaySession {
  id: string;
  gameId: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
}

// UI Types
export type ViewMode = 'grid' | 'list' | '3d-shelf';

export type ThemeMode = 'cyberpunk' | 'minimal' | 'retro-crt' | 'retro-terminal';

// 3D Quality Settings
export type Quality3D = 'performance' | 'balanced' | 'high' | 'ultra' | 'maximum';

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
