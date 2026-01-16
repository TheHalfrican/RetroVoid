import { invoke } from '@tauri-apps/api/core';

// ==================== TYPES ====================

export interface IgdbSearchResult {
  igdbId: number;
  name: string;
  releaseDate: string | null;
  coverUrl: string | null;
  platforms: string[];
  summary: string | null;
}

export interface ScrapeResult {
  success: boolean;
  gameId: string;
  fieldsUpdated: string[];
  error: string | null;
}

export interface BatchScrapeResult {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
}

// ==================== CREDENTIAL VALIDATION ====================

/**
 * Validate IGDB API credentials
 */
export async function validateIgdbCredentials(
  clientId: string,
  clientSecret: string
): Promise<boolean> {
  return invoke<boolean>('validate_igdb_credentials', { clientId, clientSecret });
}

// ==================== SEARCH ====================

/**
 * Search IGDB for games matching the query
 * @param query - Search query string
 * @param platformId - Optional platform ID to filter results
 * @param skipPlatformFilter - If true, ignores platformId and searches all platforms
 */
export async function searchIgdb(
  query: string,
  platformId?: string,
  skipPlatformFilter?: boolean
): Promise<IgdbSearchResult[]> {
  // If skipPlatformFilter is true, don't pass platformId to search all platforms
  const effectivePlatformId = skipPlatformFilter ? undefined : platformId;
  return invoke<IgdbSearchResult[]>('search_igdb', { query, platformId: effectivePlatformId });
}

// ==================== SCRAPING ====================

/**
 * Scrape metadata for a single game
 * If igdbId is provided, uses that specific IGDB entry
 * Otherwise, auto-matches based on game title and platform
 */
export async function scrapeGameMetadata(
  gameId: string,
  igdbId?: number
): Promise<ScrapeResult> {
  // Only include igdbId in params if it's defined (avoid sending undefined/null)
  const params: { gameId: string; igdbId?: number } = { gameId };
  if (igdbId !== undefined) {
    params.igdbId = igdbId;
  }
  return invoke<ScrapeResult>('scrape_game_metadata', params);
}

/**
 * Scrape metadata for all games in the library
 * If onlyMissing is true, only scrapes games without existing metadata
 */
export async function scrapeLibraryMetadata(
  onlyMissing: boolean
): Promise<BatchScrapeResult> {
  return invoke<BatchScrapeResult>('scrape_library_metadata', { onlyMissing });
}
