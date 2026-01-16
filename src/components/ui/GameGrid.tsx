import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ask } from '@tauri-apps/plugin-dialog';
import { useLibraryStore, useUIStore, useSettingsStore } from '../../stores';
import { useTheme } from '../../hooks/useTheme';
import { GameCard } from './GameCard';
import { launchGame, launchGameWithEmulator } from '../../services/emulator';
import { scrapeGameMetadata } from '../../services/scraper';
import type { Game, Emulator } from '../../types';
import { platformIconMap } from '../../utils/platformIcons';

// Import all platform icons using Vite's glob import
const platformIconModules = import.meta.glob<{ default: string }>(
  '../../assets/platforms/*.png',
  { eager: true }
);

// Create a lookup map from platform ID to icon URL
const platformIconUrls: Record<string, string> = {};
for (const [path, module] of Object.entries(platformIconModules)) {
  const filename = path.split('/').pop();
  if (filename) {
    for (const [platformId, iconFilename] of Object.entries(platformIconMap)) {
      if (iconFilename === filename) {
        platformIconUrls[platformId] = module.default;
        break;
      }
    }
  }
}

interface LaunchError {
  game: Game;
  message: string;
  availableEmulators: Emulator[];
}

interface BulkOperationProgress {
  operation: 'delete' | 'scrape';
  current: number;
  total: number;
}

interface BulkContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
}

export function GameGrid() {
  const { games, platforms, emulators, deleteGamesBatch, loadLibrary } = useLibraryStore();
  const { selectedPlatformId, searchQuery, viewMode, setSettingsPanelOpen, selectedGameIds, selectGameForMulti, clearSelection, incrementCoverVersion } = useUIStore();
  const { gridCardSize } = useSettingsStore();
  const theme = useTheme();
  const [launchError, setLaunchError] = useState<LaunchError | null>(null);
  const [bulkProgress, setBulkProgress] = useState<BulkOperationProgress | null>(null);
  const [bulkContextMenu, setBulkContextMenu] = useState<BulkContextMenuState>({ isOpen: false, x: 0, y: 0 });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter games based on selection and search
  const filteredGames = useMemo(() => {
    let filtered = [...games];

    // Filter by platform/category
    if (selectedPlatformId === 'favorites') {
      filtered = filtered.filter(g => g.isFavorite);
    } else if (selectedPlatformId === 'recently-added') {
      filtered = filtered
        .filter(g => g.createdAt)
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
        .slice(0, 25);
    } else if (selectedPlatformId === 'recent') {
      filtered = filtered
        .filter(g => g.lastPlayed)
        .sort((a, b) => new Date(b.lastPlayed!).getTime() - new Date(a.lastPlayed!).getTime())
        .slice(0, 20);
    } else if (selectedPlatformId) {
      filtered = filtered.filter(g => g.platformId === selectedPlatformId);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(g =>
        g.title.toLowerCase().includes(query) ||
        g.developer?.toLowerCase().includes(query) ||
        g.publisher?.toLowerCase().includes(query)
      );
    }

    // Sort alphabetically (except for recently-added which is already sorted by date)
    if (selectedPlatformId !== 'recently-added' && selectedPlatformId !== 'recent') {
      return filtered.sort((a, b) => a.title.localeCompare(b.title));
    }
    return filtered;
  }, [games, selectedPlatformId, searchQuery]);

  // Create array of filtered game IDs for range selection
  const filteredGameIds = useMemo(() => filteredGames.map(g => g.id), [filteredGames]);

  // Clear selection when filter/view changes
  useEffect(() => {
    clearSelection();
  }, [selectedPlatformId, viewMode, clearSelection]);

  // Scroll to top when platform selection changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedPlatformId]);

  // Handle right-click on grid for bulk context menu
  const handleGridContextMenu = (e: React.MouseEvent) => {
    // Only show bulk menu if multiple games are selected
    if (selectedGameIds.size > 1) {
      e.preventDefault();
      setBulkContextMenu({ isOpen: true, x: e.clientX, y: e.clientY });
    }
  };

  // Handle click on grid container to clear selection
  const handleGridClick = () => {
    // Close bulk context menu if open
    if (bulkContextMenu.isOpen) {
      setBulkContextMenu({ ...bulkContextMenu, isOpen: false });
    }
    // Clear selection when clicking on empty space
    if (selectedGameIds.size > 0) {
      clearSelection();
    }
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    setBulkContextMenu({ ...bulkContextMenu, isOpen: false });

    const confirmed = await ask(
      `Are you sure you want to remove ${selectedGameIds.size} games from your library?`,
      { title: 'Delete Games', kind: 'warning' }
    );

    if (confirmed) {
      const gameIds = Array.from(selectedGameIds);
      await deleteGamesBatch(gameIds);
      clearSelection();
    }
  };

  // Bulk scrape metadata handler
  const handleBulkScrape = async () => {
    setBulkContextMenu({ ...bulkContextMenu, isOpen: false });
    setBulkProgress({ operation: 'scrape', current: 0, total: selectedGameIds.size });

    const gameIds = Array.from(selectedGameIds);

    for (let i = 0; i < gameIds.length; i++) {
      try {
        await scrapeGameMetadata(gameIds[i]);
        incrementCoverVersion(gameIds[i]); // Bust image cache for this game
      } catch (error) {
        console.error(`Failed to scrape metadata for game ${gameIds[i]}:`, error);
      }
      setBulkProgress({ operation: 'scrape', current: i + 1, total: gameIds.length });
    }

    await loadLibrary(); // Refresh to show new metadata
    setBulkProgress(null);
    clearSelection();
  };

  const handlePlay = async (game: Game) => {
    try {
      const result = await launchGame(game.id);
      if (!result.success) {
        console.error('Failed to launch game:', result.error);
        // Find available emulators for this platform
        const availableEmulators = emulators.filter(e =>
          e.supportedPlatformIds.includes(game.platformId)
        );
        setLaunchError({
          game,
          message: result.error || 'Unknown error occurred',
          availableEmulators,
        });
      }
    } catch (error) {
      console.error('Failed to launch game:', error);
      const availableEmulators = emulators.filter(e =>
        e.supportedPlatformIds.includes(game.platformId)
      );
      setLaunchError({
        game,
        message: String(error),
        availableEmulators,
      });
    }
  };

  const handleLaunchWithEmulator = async (emulatorId: string) => {
    if (!launchError) return;
    try {
      const result = await launchGameWithEmulator(launchError.game.id, emulatorId);
      if (result.success) {
        setLaunchError(null);
      } else {
        setLaunchError({
          ...launchError,
          message: result.error || 'Failed to launch with selected emulator',
        });
      }
    } catch (error) {
      setLaunchError({
        ...launchError,
        message: String(error),
      });
    }
  };

  // Get current filter name for header
  const getFilterName = () => {
    if (selectedPlatformId === 'favorites') return 'Favorites';
    if (selectedPlatformId === 'recently-added') return 'Recently Added';
    if (selectedPlatformId === 'recent') return 'Recently Played';
    if (selectedPlatformId) {
      const platform = platforms.find(p => p.id === selectedPlatformId);
      return platform?.displayName || 'Games';
    }
    return 'All Games';
  };

  if (viewMode === 'list') {
    return (
      <>
        <GameList games={filteredGames} onPlay={handlePlay} filterName={getFilterName()} selectedPlatformId={selectedPlatformId} />
        <LaunchErrorModal
          error={launchError}
          platforms={platforms}
          onClose={() => setLaunchError(null)}
          onSelectEmulator={handleLaunchWithEmulator}
          onOpenSettings={() => {
            setLaunchError(null);
            setSettingsPanelOpen(true);
          }}
        />
      </>
    );
  }

  return (
    <>
    <div
      ref={scrollContainerRef}
      className="h-full overflow-y-auto p-6"
      onClick={handleGridClick}
      onContextMenu={handleGridContextMenu}
    >
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold mb-1" style={{ color: 'var(--theme-text)' }}>
          {getFilterName()}
        </h2>
        <p className="font-body text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          {filteredGames.length} {filteredGames.length === 1 ? 'game' : 'games'}
        </p>
      </div>

      {/* Selection Header */}
      {selectedGameIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-4 p-3 rounded-lg"
          style={{
            backgroundColor: `${theme.accentSecondary}15`,
            border: `1px solid ${theme.accentSecondary}40`,
          }}
        >
          <span className="text-sm font-body" style={{ color: theme.accentSecondary }}>
            {selectedGameIds.size} game{selectedGameIds.size > 1 ? 's' : ''} selected
          </span>
          <span className="text-xs font-body" style={{ color: 'var(--theme-text-muted)' }}>
            (Right-click for bulk actions)
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearSelection();
            }}
            className="ml-auto text-xs font-body transition-colors"
            style={{ color: 'var(--theme-text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--theme-text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--theme-text-muted)'; }}
          >
            Clear selection
          </button>
        </motion.div>
      )}

      {/* Grid */}
      {filteredGames.length > 0 ? (
        <motion.div
          layout
          className="grid gap-6"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${gridCardSize}px, 1fr))`,
          }}
        >
          <AnimatePresence mode="popLayout">
            {filteredGames.map((game, index) => (
              <motion.div
                key={game.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.02 }}
              >
                <GameCard
                  game={game}
                  onPlay={() => handlePlay(game)}
                  isSelected={selectedGameIds.has(game.id)}
                  onSelect={(shiftKey) => selectGameForMulti(game.id, shiftKey, filteredGameIds)}
                  selectionCount={selectedGameIds.size}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <EmptyState searchQuery={searchQuery} selectedPlatformId={selectedPlatformId} />
      )}
    </div>

    {/* Bulk Context Menu */}
    <AnimatePresence>
      {bulkContextMenu.isOpen && (
        <BulkContextMenu
          x={bulkContextMenu.x}
          y={bulkContextMenu.y}
          selectedCount={selectedGameIds.size}
          onDelete={handleBulkDelete}
          onScrape={handleBulkScrape}
          onClose={() => setBulkContextMenu({ ...bulkContextMenu, isOpen: false })}
        />
      )}
    </AnimatePresence>

    {/* Bulk Operation Progress */}
    <AnimatePresence>
      {bulkProgress && (
        <BulkOperationProgress
          operation={bulkProgress.operation}
          current={bulkProgress.current}
          total={bulkProgress.total}
        />
      )}
    </AnimatePresence>

    <LaunchErrorModal
      error={launchError}
      platforms={platforms}
      onClose={() => setLaunchError(null)}
      onSelectEmulator={handleLaunchWithEmulator}
      onOpenSettings={() => {
        setLaunchError(null);
        setSettingsPanelOpen(true);
      }}
    />
    </>
  );
}

// List view variant
function GameList({ games, onPlay, filterName, selectedPlatformId }: { games: Game[]; onPlay: (game: Game) => void; filterName: string; selectedPlatformId: string | null }) {
  const { platforms } = useLibraryStore();
  const { toggleFavorite } = useLibraryStore();
  const { openGameDetail } = useUIStore();
  const theme = useTheme();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top when platform selection changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedPlatformId]);

  const formatPlayTime = (seconds: number) => {
    if (seconds < 60) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold mb-1" style={{ color: 'var(--theme-text)' }}>
          {filterName}
        </h2>
        <p className="font-body text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          {games.length} {games.length === 1 ? 'game' : 'games'}
        </p>
      </div>

      {games.length > 0 ? (
        <div className="space-y-2">
          {/* Header Row */}
          <div
            className="grid grid-cols-[auto_1fr_120px_100px_100px_80px] gap-4 px-4 py-2 text-xs font-body uppercase tracking-wider"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            <div className="w-10"></div>
            <div>Title</div>
            <div>Platform</div>
            <div>Play Time</div>
            <div>Last Played</div>
            <div></div>
          </div>

          {/* Game Rows */}
          <AnimatePresence>
            {games.map((game, index) => {
              const platform = platforms.find(p => p.id === game.platformId);

              return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => openGameDetail(game.id)}
                  className="grid grid-cols-[auto_1fr_120px_100px_100px_80px] gap-4 px-4 py-3 rounded-lg cursor-pointer transition-all items-center"
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    border: '1px solid var(--theme-border)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${theme.accent}80`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--theme-border)'; }}
                >
                  {/* Favorite */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(game.id);
                    }}
                    className="w-10 flex justify-center"
                  >
                    {game.isFavorite ? (
                      <span style={{ color: theme.accentSecondary }}>★</span>
                    ) : (
                      <span style={{ color: 'var(--theme-text-muted)' }}>☆</span>
                    )}
                  </button>

                  {/* Title */}
                  <div className="font-body text-sm truncate" style={{ color: 'var(--theme-text)' }}>
                    {game.title}
                  </div>

                  {/* Platform Logo */}
                  <div
                    className="flex items-center justify-center px-2 py-1 rounded"
                    style={{
                      backgroundColor: 'var(--theme-bg)',
                      border: `1px solid ${platform?.color || '#666'}44`,
                    }}
                  >
                    {platform && platformIconUrls[platform.id] ? (
                      <img
                        src={platformIconUrls[platform.id]}
                        alt={platform.displayName}
                        className="h-4 w-auto max-w-[100px] object-contain"
                      />
                    ) : (
                      <span className="font-body text-xs truncate" style={{ color: 'var(--theme-text-muted)' }}>
                        {platform?.displayName || 'Unknown'}
                      </span>
                    )}
                  </div>

                  {/* Play Time */}
                  <div className="font-body text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
                    {formatPlayTime(game.totalPlayTimeSeconds)}
                  </div>

                  {/* Last Played */}
                  <div className="font-body text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                    {game.lastPlayed
                      ? new Date(game.lastPlayed).toLocaleDateString()
                      : '-'}
                  </div>

                  {/* Play Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlay(game);
                    }}
                    className="px-3 py-1.5 rounded font-display text-xs font-bold transition-colors"
                    style={{
                      backgroundColor: theme.accent,
                      color: 'var(--theme-bg)',
                    }}
                  >
                    PLAY
                  </motion.button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState searchQuery="" selectedPlatformId={null} />
      )}
    </div>
  );
}

// Empty state component
function EmptyState({ searchQuery, selectedPlatformId }: { searchQuery: string; selectedPlatformId: string | null }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-64 text-center"
    >
      <div className="text-6xl mb-4 opacity-50">🎮</div>
      {searchQuery ? (
        <>
          <h3 className="font-display text-xl mb-2" style={{ color: 'var(--theme-text-secondary)' }}>No games found</h3>
          <p className="font-body text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            No games match "{searchQuery}"
          </p>
        </>
      ) : selectedPlatformId === 'favorites' ? (
        <>
          <h3 className="font-display text-xl mb-2" style={{ color: 'var(--theme-text-secondary)' }}>No favorites yet</h3>
          <p className="font-body text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Click the heart icon on a game to add it to favorites
          </p>
        </>
      ) : (
        <>
          <h3 className="font-display text-xl mb-2" style={{ color: 'var(--theme-text-secondary)' }}>No games in library</h3>
          <p className="font-body text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Open settings to scan a folder for games
          </p>
        </>
      )}
    </motion.div>
  );
}

// Launch Error Modal
interface LaunchErrorModalProps {
  error: LaunchError | null;
  platforms: { id: string; displayName: string; color: string }[];
  onClose: () => void;
  onSelectEmulator: (emulatorId: string) => void;
  onOpenSettings: () => void;
}

function LaunchErrorModal({ error, platforms, onClose, onSelectEmulator, onOpenSettings }: LaunchErrorModalProps) {
  if (!error) return null;

  const platform = platforms.find(p => p.id === error.game.platformId);
  const isNoEmulatorError = error.message.toLowerCase().includes('no emulator configured');

  return (
    <AnimatePresence>
      {error && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-void-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                       w-full max-w-md bg-deep-purple border border-glass-border rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-glass-border flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <WarningIcon className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg text-white">Cannot Launch Game</h3>
                <p className="font-body text-xs text-gray-500">{error.game.title}</p>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-glass-white text-gray-400 hover:text-white transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Error Message */}
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="font-body text-sm text-red-300">{error.message}</p>
              </div>

              {/* Help Text */}
              {isNoEmulatorError && (
                <p className="font-body text-sm text-gray-400">
                  {error.availableEmulators.length > 0
                    ? `Select an emulator below to launch this ${platform?.displayName || 'game'}, or configure a default emulator in Settings.`
                    : `No emulators are configured for ${platform?.displayName || 'this platform'}. Add an emulator in Settings to play this game.`
                  }
                </p>
              )}

              {/* Available Emulators */}
              {error.availableEmulators.length > 0 && (
                <div>
                  <p className="font-body text-xs text-gray-500 uppercase tracking-wider mb-2">
                    Available Emulators
                  </p>
                  <div className="space-y-2">
                    {error.availableEmulators.map(emulator => (
                      <motion.button
                        key={emulator.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => onSelectEmulator(emulator.id)}
                        className="w-full p-3 bg-glass-white border border-glass-border rounded-lg
                                 hover:border-neon-cyan/50 hover:bg-glass-white/80 transition-all
                                 text-left flex items-center gap-3"
                      >
                        <GamepadIcon className="w-5 h-5 text-neon-cyan flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-sm text-white">{emulator.name}</p>
                          <p className="font-body text-xs text-gray-500 truncate">{emulator.executablePath}</p>
                        </div>
                        <span className="text-xs font-body text-neon-cyan">Launch</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-glass-border bg-void-black/30 flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onOpenSettings}
                className="flex-1 py-2.5 rounded-lg bg-neon-cyan text-void-black font-display font-bold
                         hover:bg-neon-cyan/90 transition-colors flex items-center justify-center gap-2"
              >
                <SettingsIcon />
                {error.availableEmulators.length > 0 ? 'Configure Emulators' : 'Add Emulator'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg bg-glass-white text-gray-300 font-body
                         hover:text-white hover:bg-glass-border transition-colors"
              >
                Close
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Icons
function WarningIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function GamepadIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// Bulk Context Menu
interface BulkContextMenuProps {
  x: number;
  y: number;
  selectedCount: number;
  onDelete: () => void;
  onScrape: () => void;
  onClose: () => void;
}

function BulkContextMenu({ x, y, selectedCount, onDelete, onScrape, onClose }: BulkContextMenuProps) {
  const theme = useTheme();

  // Adjust position to stay within viewport
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 120);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40"
      />

      {/* Menu */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className="fixed z-50 min-w-[200px] py-1 rounded-lg shadow-xl backdrop-blur-sm"
        style={{
          left: adjustedX,
          top: adjustedY,
          backgroundColor: 'var(--theme-bg-secondary)',
          border: '1px solid var(--theme-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.button
          whileHover={{ backgroundColor: 'var(--theme-surface-hover)' }}
          onClick={onScrape}
          className="w-full px-3 py-2 flex items-center gap-3 text-left text-sm font-body transition-colors"
          style={{ color: 'var(--theme-text-secondary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--theme-text)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--theme-text-secondary)'; }}
        >
          <DownloadIcon className="w-4 h-4" style={{ color: theme.accent }} />
          Fetch Metadata ({selectedCount} games)
        </motion.button>

        <div className="my-1" style={{ borderTop: '1px solid var(--theme-border)' }} />

        <motion.button
          whileHover={{ backgroundColor: 'var(--theme-surface-hover)' }}
          onClick={onDelete}
          className="w-full px-3 py-2 flex items-center gap-3 text-left text-sm font-body transition-colors"
          style={{ color: '#f87171' }}
        >
          <TrashIcon className="w-4 h-4" />
          Delete {selectedCount} Games
        </motion.button>
      </motion.div>
    </>
  );
}

// Bulk Operation Progress
interface BulkOperationProgressProps {
  operation: 'delete' | 'scrape';
  current: number;
  total: number;
}

function BulkOperationProgress({ operation, current, total }: BulkOperationProgressProps) {
  const theme = useTheme();
  const percentage = Math.round((current / total) * 100);
  const operationName = operation === 'delete' ? 'Deleting' : 'Fetching metadata for';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="rounded-xl p-6 w-80"
        style={{
          backgroundColor: 'var(--theme-bg-secondary)',
          border: '1px solid var(--theme-border)',
        }}
      >
        <h3 className="font-display text-lg mb-4" style={{ color: 'var(--theme-text)' }}>
          {operationName} games...
        </h3>
        <div
          className="w-full h-2 rounded-full overflow-hidden mb-2"
          style={{ backgroundColor: 'var(--theme-surface)' }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className="h-full"
            style={{ backgroundColor: theme.accent }}
          />
        </div>
        <p className="text-sm text-center font-body" style={{ color: 'var(--theme-text-secondary)' }}>
          {current} / {total} ({percentage}%)
        </p>
      </motion.div>
    </motion.div>
  );
}

function DownloadIcon({ className = 'w-4 h-4', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function TrashIcon({ className = 'w-4 h-4', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
