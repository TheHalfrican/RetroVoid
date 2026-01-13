import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLibraryStore, useUIStore } from '../../stores';
import { GameCard } from './GameCard';
import { launchGame } from '../../services/emulator';
import type { Game } from '../../types';

export function GameGrid() {
  const { games, platforms } = useLibraryStore();
  const { selectedPlatformId, searchQuery, viewMode } = useUIStore();

  // Filter games based on selection and search
  const filteredGames = useMemo(() => {
    let filtered = [...games];

    // Filter by platform/category
    if (selectedPlatformId === 'favorites') {
      filtered = filtered.filter(g => g.isFavorite);
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

    // Sort alphabetically
    return filtered.sort((a, b) => a.title.localeCompare(b.title));
  }, [games, selectedPlatformId, searchQuery]);

  const handlePlay = async (game: Game) => {
    try {
      const result = await launchGame(game.id);
      if (!result.success) {
        console.error('Failed to launch game:', result.error);
        // TODO: Show error toast
      }
    } catch (error) {
      console.error('Failed to launch game:', error);
    }
  };

  // Get current filter name for header
  const getFilterName = () => {
    if (selectedPlatformId === 'favorites') return 'Favorites';
    if (selectedPlatformId === 'recent') return 'Recently Played';
    if (selectedPlatformId) {
      const platform = platforms.find(p => p.id === selectedPlatformId);
      return platform?.displayName || 'Games';
    }
    return 'All Games';
  };

  if (viewMode === 'list') {
    return <GameList games={filteredGames} onPlay={handlePlay} filterName={getFilterName()} />;
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-white mb-1">
          {getFilterName()}
        </h2>
        <p className="font-body text-sm text-gray-500">
          {filteredGames.length} {filteredGames.length === 1 ? 'game' : 'games'}
        </p>
      </div>

      {/* Grid */}
      {filteredGames.length > 0 ? (
        <motion.div
          layout
          className="grid gap-6"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
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
                <GameCard game={game} onPlay={() => handlePlay(game)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <EmptyState searchQuery={searchQuery} selectedPlatformId={selectedPlatformId} />
      )}
    </div>
  );
}

// List view variant
function GameList({ games, onPlay, filterName }: { games: Game[]; onPlay: (game: Game) => void; filterName: string }) {
  const { platforms } = useLibraryStore();
  const { toggleFavorite } = useLibraryStore();
  const { openGameDetail } = useUIStore();

  const formatPlayTime = (seconds: number) => {
    if (seconds < 60) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-white mb-1">
          {filterName}
        </h2>
        <p className="font-body text-sm text-gray-500">
          {games.length} {games.length === 1 ? 'game' : 'games'}
        </p>
      </div>

      {games.length > 0 ? (
        <div className="space-y-2">
          {/* Header Row */}
          <div className="grid grid-cols-[auto_1fr_120px_100px_100px_80px] gap-4 px-4 py-2 text-xs font-body text-gray-500 uppercase tracking-wider">
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
                  className="grid grid-cols-[auto_1fr_120px_100px_100px_80px] gap-4 px-4 py-3
                           bg-glass-white rounded-lg border border-glass-border
                           hover:border-neon-cyan/50 cursor-pointer transition-all items-center"
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
                      <span className="text-neon-magenta">★</span>
                    ) : (
                      <span className="text-gray-600 hover:text-gray-400">☆</span>
                    )}
                  </button>

                  {/* Title */}
                  <div className="font-body text-sm text-white truncate">
                    {game.title}
                  </div>

                  {/* Platform */}
                  <div
                    className="font-body text-xs px-2 py-1 rounded truncate text-center"
                    style={{
                      backgroundColor: `${platform?.color || '#666'}22`,
                      color: platform?.color || '#666',
                    }}
                  >
                    {platform?.displayName || 'Unknown'}
                  </div>

                  {/* Play Time */}
                  <div className="font-body text-sm text-gray-400">
                    {formatPlayTime(game.totalPlayTimeSeconds)}
                  </div>

                  {/* Last Played */}
                  <div className="font-body text-sm text-gray-500">
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
                    className="px-3 py-1.5 rounded bg-neon-cyan/80 text-void-black font-display text-xs font-bold
                             hover:bg-neon-cyan transition-colors"
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
          <h3 className="font-display text-xl text-gray-400 mb-2">No games found</h3>
          <p className="font-body text-sm text-gray-600">
            No games match "{searchQuery}"
          </p>
        </>
      ) : selectedPlatformId === 'favorites' ? (
        <>
          <h3 className="font-display text-xl text-gray-400 mb-2">No favorites yet</h3>
          <p className="font-body text-sm text-gray-600">
            Click the heart icon on a game to add it to favorites
          </p>
        </>
      ) : (
        <>
          <h3 className="font-display text-xl text-gray-400 mb-2">No games in library</h3>
          <p className="font-body text-sm text-gray-600">
            Open settings to scan a folder for games
          </p>
        </>
      )}
    </motion.div>
  );
}
