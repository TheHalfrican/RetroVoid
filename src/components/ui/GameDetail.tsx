import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLibraryStore, useUIStore } from '../../stores';
import { launchGame, launchGameWithEmulator } from '../../services/emulator';
import type { Game, Emulator } from '../../types';

export function GameDetail() {
  const { selectedGameId, gameDetailOpen, closeGameDetail } = useUIStore();
  const { games, platforms, emulators, toggleFavorite, deleteGame } = useLibraryStore();
  const [imageError, setImageError] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  const game = games.find(g => g.id === selectedGameId);
  const platform = game ? platforms.find(p => p.id === game.platformId) : null;

  // Get available emulators for this platform
  const availableEmulators = emulators.filter(e =>
    e.supportedPlatformIds.includes(game?.platformId || '')
  );

  // Reset image error when game changes
  useEffect(() => {
    setImageError(false);
  }, [selectedGameId]);

  const handleLaunch = async (emulatorId?: string) => {
    if (!game) return;

    setIsLaunching(true);
    try {
      const result = emulatorId
        ? await launchGameWithEmulator(game.id, emulatorId)
        : await launchGame(game.id);

      if (!result.success) {
        console.error('Failed to launch:', result.error);
        // TODO: Show error notification
      }
    } catch (error) {
      console.error('Launch error:', error);
    } finally {
      setIsLaunching(false);
    }
  };

  const handleDelete = async () => {
    if (!game) return;
    if (confirm(`Are you sure you want to remove "${game.title}" from your library?`)) {
      deleteGame(game.id);
      closeGameDetail();
    }
  };

  const formatPlayTime = (seconds: number) => {
    if (seconds < 60) return 'Never played';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours} hours ${minutes} minutes`;
    return `${minutes} minutes`;
  };

  return (
    <AnimatePresence>
      {gameDetailOpen && game && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeGameDetail}
            className="fixed inset-0 bg-void-black/80 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-10 lg:inset-20 z-50 flex"
          >
            <div className="w-full h-full bg-deep-purple rounded-xl border border-glass-border overflow-hidden flex flex-col md:flex-row">
              {/* Left: Cover Art Section */}
              <div className="w-full md:w-1/3 lg:w-2/5 relative flex-shrink-0">
                {/* Background gradient based on platform color */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${platform?.color || '#00f5ff'}22 0%, #0a0a0f 100%)`,
                  }}
                />

                {/* Cover Image */}
                <div className="relative h-full flex items-center justify-center p-8">
                  {game.coverArtPath && !imageError ? (
                    <motion.img
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      src={`file://${game.coverArtPath}`}
                      alt={game.title}
                      onError={() => setImageError(true)}
                      className="max-h-full max-w-full rounded-lg shadow-2xl"
                      style={{
                        boxShadow: `0 0 60px ${platform?.color || '#00f5ff'}33`,
                      }}
                    />
                  ) : (
                    <div
                      className="w-48 h-64 rounded-lg flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${platform?.color || '#00f5ff'}33 0%, #1a102566 100%)`,
                        boxShadow: `0 0 60px ${platform?.color || '#00f5ff'}22`,
                      }}
                    >
                      <span className="text-6xl font-display font-bold" style={{ color: platform?.color }}>
                        {game.title.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Scanline overlay */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-10"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.5) 2px, rgba(0,0,0,0.5) 4px)',
                    }}
                  />
                </div>
              </div>

              {/* Right: Info Section */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-glass-border">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h1 className="font-display text-2xl md:text-3xl font-bold text-white mb-2 truncate">
                        {game.title}
                      </h1>
                      <div className="flex items-center gap-3 flex-wrap">
                        {platform && (
                          <span
                            className="px-3 py-1 rounded-full text-sm font-body"
                            style={{
                              backgroundColor: `${platform.color}22`,
                              color: platform.color,
                              border: `1px solid ${platform.color}44`,
                            }}
                          >
                            {platform.displayName}
                          </span>
                        )}
                        {game.genre && game.genre.length > 0 && (
                          <span className="text-sm text-gray-500 font-body">
                            {game.genre.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Close Button */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={closeGameDetail}
                      className="p-2 rounded-lg bg-glass-white hover:bg-glass-border text-gray-400 hover:text-white transition-colors flex-shrink-0"
                    >
                      <CloseIcon />
                    </motion.button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Description */}
                  {game.description && (
                    <div>
                      <h3 className="font-display text-sm text-gray-400 uppercase tracking-wider mb-2">
                        Description
                      </h3>
                      <p className="font-body text-sm text-gray-300 leading-relaxed">
                        {game.description}
                      </p>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Play Time" value={formatPlayTime(game.totalPlayTimeSeconds)} />
                    <StatCard
                      label="Last Played"
                      value={game.lastPlayed ? new Date(game.lastPlayed).toLocaleDateString() : 'Never'}
                    />
                    {game.releaseDate && (
                      <StatCard label="Release Date" value={game.releaseDate} />
                    )}
                    {game.developer && (
                      <StatCard label="Developer" value={game.developer} />
                    )}
                  </div>

                  {/* File Path */}
                  <div>
                    <h3 className="font-display text-sm text-gray-400 uppercase tracking-wider mb-2">
                      File Location
                    </h3>
                    <p className="font-body text-xs text-gray-500 break-all bg-glass-white rounded p-2">
                      {game.romPath}
                    </p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-glass-border bg-void-black/50">
                  <div className="flex items-center justify-between gap-4">
                    {/* Secondary Actions */}
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleFavorite(game.id)}
                        className={`p-2 rounded-lg border transition-colors ${
                          game.isFavorite
                            ? 'bg-neon-magenta/20 border-neon-magenta text-neon-magenta'
                            : 'bg-glass-white border-glass-border text-gray-400 hover:text-white'
                        }`}
                      >
                        <HeartIcon filled={game.isFavorite} />
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleDelete}
                        className="p-2 rounded-lg bg-glass-white border border-glass-border text-gray-400 hover:text-red-400 hover:border-red-400 transition-colors"
                      >
                        <TrashIcon />
                      </motion.button>
                    </div>

                    {/* Launch Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleLaunch()}
                      disabled={isLaunching}
                      className="px-8 py-3 rounded-lg bg-neon-cyan text-void-black font-display font-bold text-lg
                               hover:bg-neon-cyan/90 transition-colors shadow-neon-cyan disabled:opacity-50"
                    >
                      {isLaunching ? (
                        <span className="flex items-center gap-2">
                          <LoadingSpinner />
                          LAUNCHING...
                        </span>
                      ) : (
                        'LAUNCH GAME'
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-glass-white rounded-lg p-3 border border-glass-border">
      <p className="font-body text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="font-body text-sm text-white truncate">{value}</p>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
