import { useEffect, useState, useRef, Suspense } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ask, open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useLibraryStore, useUIStore } from '../../stores';
import { launchGame, launchGameWithEmulator } from '../../services/emulator';
import { getGame, setCustomCoverArt, updateGame } from '../../services/library';
import {
  searchIgdb,
  scrapeGameMetadata,
  type IgdbSearchResult,
  type ScrapeResult,
} from '../../services/scraper';
import type { Emulator, Game } from '../../types';
import { CoverArt3DBackground } from '../three/CoverArt3DBackground';
import { MetadataEditorModal } from './MetadataEditorModal';

interface LaunchError {
  message: string;
  availableEmulators: Emulator[];
}

export function GameDetail() {
  const { selectedGameId, gameDetailOpen, closeGameDetail, setSettingsPanelOpen, coverVersions, incrementCoverVersion } = useUIStore();
  const { games, platforms, emulators, toggleFavorite, deleteGame, updateGame: updateGameInStore } = useLibraryStore();
  const [imageError, setImageError] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<LaunchError | null>(null);

  // Scraping state
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeSuccess, setScrapeSuccess] = useState<ScrapeResult | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchResults, setSearchResults] = useState<IgdbSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Custom cover upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Metadata editor state
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);

  // Custom search prompt state (when no results found)
  const [showCustomSearchPrompt, setShowCustomSearchPrompt] = useState(false);
  const [customSearchQuery, setCustomSearchQuery] = useState('');

  const game = games.find(g => g.id === selectedGameId);
  const platform = game ? platforms.find(p => p.id === game.platformId) : null;

  // Get available emulators for this platform
  const availableEmulators = emulators.filter(e =>
    e.supportedPlatformIds.includes(game?.platformId || '')
  );

  // Mouse parallax effect for cover art
  const coverContainerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Drag state for rubberband effect (using ref to avoid stale closures)
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const currentOffset = useRef({ x: 0, y: 0 });
  const dragOffsetX = useMotionValue(0);
  const dragOffsetY = useMotionValue(0);

  // Spring config for parallax (snappy)
  const springConfig = { damping: 20, stiffness: 200 };
  // Spring config for rubberband (bouncy return)
  const rubberbandConfig = { damping: 15, stiffness: 300, mass: 0.5 };

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [20, -20]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-20, 20]), springConfig);
  const translateZ = useSpring(useTransform(mouseX, [-0.5, 0, 0.5], [0, 50, 0]), springConfig);

  // Spring only used for rubberband return, not during drag
  const springX = useSpring(dragOffsetX, rubberbandConfig);
  const springY = useSpring(dragOffsetY, rubberbandConfig);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only start drag on primary pointer button
    if (e.button !== 0) return;
    // Prevent browser's default behavior
    e.preventDefault();
    // Capture pointer to ensure we get pointerup even outside element
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setIsDragging(true);
    isDraggingRef.current = true;

    // Store the current position and start point
    currentOffset.current = { x: springX.get(), y: springY.get() };
    dragStartPos.current = { x: e.clientX, y: e.clientY };

    // Immediately set to current position (no spring lag)
    dragOffsetX.jump(currentOffset.current.x);
    dragOffsetY.jump(currentOffset.current.y);

    // Keep card flat while dragging (no parallax)
    mouseX.set(0);
    mouseY.set(0);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    // Release pointer capture
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (isDraggingRef.current) {
      setIsDragging(false);
      isDraggingRef.current = false;
      // Rubberband back to center (spring will animate this)
      dragOffsetX.set(0);
      dragOffsetY.set(0);
      // Reset rotation
      mouseX.set(0);
      mouseY.set(0);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!coverContainerRef.current) return;
    const rect = coverContainerRef.current.getBoundingClientRect();

    if (isDraggingRef.current) {
      // Calculate delta from drag start - exact 1:1 mouse following
      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;

      // Add delta to initial offset position
      const newOffsetX = currentOffset.current.x + deltaX;
      const newOffsetY = currentOffset.current.y + deltaY;

      // Use jump() to set immediately without spring smoothing
      dragOffsetX.jump(newOffsetX);
      dragOffsetY.jump(newOffsetY);

      // Keep card flat while dragging (no parallax tilt)
      mouseX.set(0);
      mouseY.set(0);
    } else {
      // Normal parallax
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX.set(x);
      mouseY.set(y);
    }
  };

  const handleMouseLeave = () => {
    // Just reset parallax if not dragging
    if (!isDraggingRef.current) {
      mouseX.set(0);
      mouseY.set(0);
    }
  };

  // Reset state when game changes or modal opens/closes
  useEffect(() => {
    setImageError(false);
    setLaunchError(null);
    setScrapeError(null);
    setScrapeSuccess(null);
    setShowSearchModal(false);
    setSearchResults([]);
    setUploadSuccess(false);
    setShowCustomSearchPrompt(false);
    setCustomSearchQuery('');
    // Reset drag state
    setIsDragging(false);
    isDraggingRef.current = false;
    dragOffsetX.set(0);
    dragOffsetY.set(0);
    mouseX.set(0);
    mouseY.set(0);
  }, [selectedGameId, gameDetailOpen, dragOffsetX, dragOffsetY, mouseX, mouseY]);

  const handleLaunch = async (emulatorId?: string) => {
    if (!game) return;

    setIsLaunching(true);
    setLaunchError(null);
    try {
      const result = emulatorId
        ? await launchGameWithEmulator(game.id, emulatorId)
        : await launchGame(game.id);

      if (!result.success) {
        console.error('Failed to launch:', result.error);
        setLaunchError({
          message: result.error || 'Unknown error occurred',
          availableEmulators,
        });
      }
    } catch (error) {
      console.error('Launch error:', error);
      setLaunchError({
        message: String(error),
        availableEmulators,
      });
    } finally {
      setIsLaunching(false);
    }
  };

  const handleDelete = async () => {
    if (!game) return;
    const confirmed = await ask(`Are you sure you want to remove "${game.title}" from your library?`, {
      title: 'Delete Game',
      kind: 'warning',
    });
    if (confirmed) {
      await deleteGame(game.id);
      closeGameDetail();
    }
  };

  const handleOpenSettings = () => {
    setLaunchError(null);
    closeGameDetail();
    setSettingsPanelOpen(true);
  };

  const handleScrapeMetadata = async () => {
    if (!game) return;

    setIsScraping(true);
    setScrapeError(null);
    setScrapeSuccess(null);

    try {
      console.log('Starting scrape for:', game.title);
      const result = await scrapeGameMetadata(game.id);
      console.log('Scrape result:', result);

      if (result.success) {
        console.log('Setting success state');
        setScrapeSuccess(result);
        setImageError(false);
        incrementCoverVersion(game.id); // Bust image cache globally
        // Fetch updated game data and update store
        const updatedGame = await getGame(game.id);
        if (updatedGame) {
          updateGameInStore(game.id, updatedGame);
        }
        console.log('Success state set');
      } else {
        console.log('No match, showing search modal');
        // No automatic match found, show search modal
        setIsSearching(true);
        const results = await searchIgdb(game.title, game.platformId);
        setSearchResults(results);
        setIsSearching(false);

        if (results.length > 0) {
          setShowSearchModal(true);
        } else {
          // Show custom search prompt instead of just an error
          setCustomSearchQuery(game.title);
          setShowCustomSearchPrompt(true);
        }
      }
    } catch (error) {
      console.error('Scrape error:', error);
      setScrapeError(String(error));
    } finally {
      console.log('Setting isScraping to false');
      setIsScraping(false);
      console.log('Done');
    }
  };

  const handleSelectIgdbGame = async (igdbId: number) => {
    if (!game) return;

    setShowSearchModal(false);
    setIsScraping(true);
    setScrapeError(null);

    try {
      const result = await scrapeGameMetadata(game.id, igdbId);

      if (result.success) {
        setScrapeSuccess(result);
        setImageError(false);
        incrementCoverVersion(game.id); // Bust image cache globally
        // Fetch updated game data and update store
        const updatedGame = await getGame(game.id);
        if (updatedGame) {
          updateGameInStore(game.id, updatedGame);
        }
      } else {
        setScrapeError(result.error || 'Failed to fetch metadata');
      }
    } catch (error) {
      console.error('Scrape error:', error);
      setScrapeError(String(error));
    } finally {
      setIsScraping(false);
    }
  };

  // Manual search - always opens the search modal
  const handleManualSearch = async () => {
    if (!game) return;

    setScrapeError(null);
    setScrapeSuccess(null);
    setIsSearching(true);

    try {
      const results = await searchIgdb(game.title, game.platformId);
      setSearchResults(results);

      if (results.length > 0) {
        setShowSearchModal(true);
      } else {
        // Show custom search prompt instead of just an error
        setCustomSearchQuery(game.title);
        setShowCustomSearchPrompt(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      setScrapeError(String(error));
    } finally {
      setIsSearching(false);
    }
  };

  // Custom search with user-provided query
  const handleCustomSearch = async () => {
    if (!game || !customSearchQuery.trim()) return;

    setShowCustomSearchPrompt(false);
    setScrapeError(null);
    setIsSearching(true);

    try {
      const results = await searchIgdb(customSearchQuery.trim(), game.platformId);
      setSearchResults(results);

      if (results.length > 0) {
        setShowSearchModal(true);
      } else {
        // Show prompt again with the same query
        setShowCustomSearchPrompt(true);
        setScrapeError('No matches found. Try a different search term.');
      }
    } catch (error) {
      console.error('Custom search error:', error);
      setScrapeError(String(error));
      setShowCustomSearchPrompt(true); // Show prompt again on error
    } finally {
      setIsSearching(false);
    }
  };

  // Handle custom cover art upload
  const handleUploadCoverArt = async () => {
    if (!game) return;

    try {
      // Open file picker for images
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Images',
          extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif']
        }]
      });

      if (!selected) return; // User cancelled

      setIsUploading(true);
      setScrapeError(null);
      setScrapeSuccess(null);
      setUploadSuccess(false);

      // Copy the image to app data
      await setCustomCoverArt(game.id, selected as string);

      // Bust image cache and update store
      setImageError(false);
      incrementCoverVersion(game.id);

      // Fetch updated game data and update store
      const updatedGame = await getGame(game.id);
      if (updatedGame) {
        updateGameInStore(game.id, updatedGame);
      }

      setUploadSuccess(true);
    } catch (error) {
      console.error('Upload error:', error);
      setScrapeError(String(error));
    } finally {
      setIsUploading(false);
    }
  };

  // Handle metadata save from editor modal
  const handleSaveMetadata = async (updates: Partial<Game>) => {
    if (!game) return;

    await updateGame(game.id, updates);

    // Fetch updated game data and update store
    const updatedGame = await getGame(game.id);
    if (updatedGame) {
      updateGameInStore(game.id, updatedGame);
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
              {/* Left: Cover Art Section with 3D Background */}
              <div
                ref={coverContainerRef}
                className="w-full md:w-1/3 lg:w-2/5 relative flex-shrink-0 overflow-hidden"
                onPointerMove={handlePointerMove}
                onPointerLeave={handleMouseLeave}
              >
                {/* 3D Animated Background */}
                <div className="absolute inset-0">
                  <Suspense fallback={
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${platform?.color || '#00f5ff'}22 0%, #0a0a0f 100%)`,
                      }}
                    />
                  }>
                    <CoverArt3DBackground platformColor={platform?.color || '#00f5ff'} />
                  </Suspense>
                </div>

                {/* Dark overlay for better contrast */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse at center, transparent 0%, rgba(10, 10, 15, 0.4) 100%)',
                  }}
                />

                {/* Cover Image with Parallax and Drag */}
                <div className="relative h-full flex items-center justify-center p-4" style={{ perspective: 1000 }}>
                  {game.coverArtPath && !imageError ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 * 1.5 }}
                      animate={{ opacity: 1, scale: 1.5 }}
                      style={{
                        x: springX,
                        y: springY,
                        rotateX,
                        rotateY,
                        translateZ,
                        transformStyle: 'preserve-3d',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        touchAction: 'none',
                      }}
                      onPointerDown={handlePointerDown}
                      onPointerUp={handlePointerUp}
                      className="relative select-none"
                    >
                      {/* Glow behind image */}
                      <div
                        className="absolute -inset-4 rounded-xl blur-2xl opacity-50"
                        style={{
                          background: `radial-gradient(ellipse at center, ${platform?.color || '#00f5ff'}66 0%, transparent 70%)`,
                        }}
                      />
                      <img
                        src={`${convertFileSrc(game.coverArtPath)}?v=${coverVersions[game.id] || 0}`}
                        alt={game.title}
                        draggable={false}
                        onError={() => setImageError(true)}
                        className="relative rounded-lg shadow-2xl object-contain pointer-events-none"
                        style={{
                          maxHeight: '45vh',
                          maxWidth: '280px',
                          boxShadow: `0 0 60px ${platform?.color || '#00f5ff'}44, 0 25px 50px -12px rgba(0, 0, 0, 0.5)`,
                        }}
                      />
                      {/* Reflection */}
                      <div
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3/4 h-8 rounded-full blur-xl"
                        style={{
                          background: `linear-gradient(to top, ${platform?.color || '#00f5ff'}33, transparent)`,
                        }}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 * 1.5 }}
                      animate={{ opacity: 1, scale: 1.5 }}
                      style={{
                        x: springX,
                        y: springY,
                        rotateX,
                        rotateY,
                        translateZ,
                        transformStyle: 'preserve-3d',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        touchAction: 'none',
                      }}
                      onPointerDown={handlePointerDown}
                      onPointerUp={handlePointerUp}
                      className="w-56 h-72 rounded-lg flex items-center justify-center relative select-none"
                    >
                      {/* Glow behind placeholder */}
                      <div
                        className="absolute -inset-4 rounded-xl blur-2xl opacity-40"
                        style={{
                          background: `radial-gradient(ellipse at center, ${platform?.color || '#00f5ff'}66 0%, transparent 70%)`,
                        }}
                      />
                      <div
                        className="w-full h-full rounded-lg flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${platform?.color || '#00f5ff'}33 0%, #1a102588 100%)`,
                          boxShadow: `0 0 60px ${platform?.color || '#00f5ff'}33, 0 25px 50px -12px rgba(0, 0, 0, 0.5)`,
                        }}
                      >
                        <span className="text-6xl font-display font-bold" style={{ color: platform?.color }}>
                          {game.title.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Scanline overlay */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-5"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.5) 2px, rgba(0,0,0,0.5) 4px)',
                  }}
                />

                {/* Vignette */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    boxShadow: 'inset 0 0 100px rgba(0, 0, 0, 0.5)',
                  }}
                />
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

                  {/* Launch Error */}
                  <AnimatePresence>
                    {launchError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-3"
                      >
                        {/* Error Message */}
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <div className="flex items-start gap-2">
                            <WarningIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-body text-sm text-red-300">{launchError.message}</p>
                              {launchError.message.toLowerCase().includes('no emulator') && (
                                <p className="font-body text-xs text-gray-500 mt-1">
                                  {launchError.availableEmulators.length > 0
                                    ? 'Select an emulator below or configure a default in Settings.'
                                    : 'No emulators configured for this platform. Add one in Settings.'}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Available Emulators */}
                        {launchError.availableEmulators.length > 0 && (
                          <div>
                            <p className="font-body text-xs text-gray-500 uppercase tracking-wider mb-2">
                              Launch with Emulator
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {launchError.availableEmulators.map(emulator => (
                                <motion.button
                                  key={emulator.id}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => handleLaunch(emulator.id)}
                                  disabled={isLaunching}
                                  className="px-3 py-2 bg-glass-white border border-glass-border rounded-lg
                                           hover:border-neon-cyan/50 transition-all flex items-center gap-2
                                           disabled:opacity-50"
                                >
                                  <GamepadIcon className="w-4 h-4 text-neon-cyan" />
                                  <span className="font-body text-sm text-white">{emulator.name}</span>
                                </motion.button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Open Settings Button */}
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={handleOpenSettings}
                          className="w-full py-2 rounded-lg bg-glass-white border border-glass-border
                                   text-gray-300 font-body text-sm hover:text-white hover:border-gray-500 transition-colors
                                   flex items-center justify-center gap-2"
                        >
                          <SettingsIcon />
                          {launchError.availableEmulators.length > 0 ? 'Configure Emulators' : 'Add Emulator'}
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-glass-border bg-void-black/50">
                  {/* Scrape/Upload Status */}
                  <AnimatePresence>
                    {(scrapeError || scrapeSuccess || uploadSuccess || showCustomSearchPrompt) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4"
                      >
                        {showCustomSearchPrompt && (
                          <div className="p-3 bg-electric-blue/10 border border-electric-blue/30 rounded-lg">
                            <p className="text-sm text-electric-blue mb-3">
                              No matches found on IGDB. Try searching with a different name:
                            </p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={customSearchQuery}
                                onChange={(e) => setCustomSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
                                placeholder="Enter game name to search..."
                                className="flex-1 px-3 py-2 bg-void-black/50 border border-glass-border rounded-lg text-white text-sm font-body placeholder-gray-500 focus:outline-none focus:border-electric-blue"
                                autoFocus
                              />
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleCustomSearch}
                                disabled={isSearching || !customSearchQuery.trim()}
                                className="px-4 py-2 bg-electric-blue text-void-black font-display font-bold text-sm rounded-lg hover:bg-electric-blue/90 transition-colors disabled:opacity-50"
                              >
                                {isSearching ? <LoadingSpinner /> : 'Search'}
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  setShowCustomSearchPrompt(false);
                                  setScrapeError(null);
                                }}
                                className="px-3 py-2 bg-glass-white border border-glass-border rounded-lg text-gray-400 hover:text-white transition-colors"
                              >
                                Cancel
                              </motion.button>
                            </div>
                            {scrapeError && (
                              <p className="text-xs text-red-400 mt-2">{scrapeError}</p>
                            )}
                          </div>
                        )}
                        {!showCustomSearchPrompt && scrapeError && (
                          <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300 flex items-center gap-2">
                            <WarningIcon className="w-4 h-4 flex-shrink-0" />
                            {scrapeError}
                          </div>
                        )}
                        {scrapeSuccess && (
                          <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-300 flex items-center gap-2">
                            <CheckIcon className="w-4 h-4 flex-shrink-0" />
                            Metadata updated{scrapeSuccess.fieldsUpdated?.length ? `: ${scrapeSuccess.fieldsUpdated.join(', ')}` : ' successfully'}
                          </div>
                        )}
                        {uploadSuccess && !scrapeSuccess && (
                          <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-300 flex items-center gap-2">
                            <CheckIcon className="w-4 h-4 flex-shrink-0" />
                            Custom cover art uploaded successfully
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

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
                        title="Toggle Favorite"
                      >
                        <HeartIcon filled={game.isFavorite} />
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleUploadCoverArt}
                        disabled={isUploading}
                        className="p-2 rounded-lg bg-glass-white border border-glass-border text-gray-400 hover:text-neon-cyan hover:border-neon-cyan transition-colors disabled:opacity-50"
                        title="Upload Custom Cover Art"
                      >
                        {isUploading ? <LoadingSpinner /> : <ImageUploadIcon />}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowMetadataEditor(true)}
                        className="p-2 rounded-lg bg-glass-white border border-glass-border text-gray-400 hover:text-neon-magenta hover:border-neon-magenta transition-colors"
                        title="Edit Metadata"
                      >
                        <EditIcon />
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleScrapeMetadata}
                        disabled={isScraping || isSearching}
                        className="p-2 rounded-lg bg-glass-white border border-glass-border text-gray-400 hover:text-neon-orange hover:border-neon-orange transition-colors disabled:opacity-50"
                        title="Auto-fetch Metadata from IGDB"
                      >
                        {isScraping ? <LoadingSpinner /> : <DownloadIcon />}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleManualSearch}
                        disabled={isScraping || isSearching}
                        className="p-2 rounded-lg bg-glass-white border border-glass-border text-gray-400 hover:text-electric-blue hover:border-electric-blue transition-colors disabled:opacity-50"
                        title="Search IGDB (pick manually)"
                      >
                        {isSearching ? <LoadingSpinner /> : <SearchIcon />}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleDelete}
                        className="p-2 rounded-lg bg-glass-white border border-glass-border text-gray-400 hover:text-red-400 hover:border-red-400 transition-colors"
                        title="Remove from Library"
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

                {/* IGDB Search Modal */}
                <AnimatePresence>
                  {showSearchModal && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowSearchModal(false)}
                        className="absolute inset-0 bg-void-black/80 z-10"
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-8 bg-deep-purple rounded-xl border border-glass-border z-20 flex flex-col overflow-hidden"
                      >
                        <div className="p-4 border-b border-glass-border flex items-center justify-between">
                          <div>
                            <h3 className="font-display text-lg text-white">Select Game</h3>
                            <p className="text-xs text-gray-500">Choose the correct match from IGDB</p>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setShowSearchModal(false)}
                            className="p-2 rounded-lg bg-glass-white hover:bg-glass-border text-gray-400 hover:text-white transition-colors"
                          >
                            <CloseIcon />
                          </motion.button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                          {isSearching ? (
                            <div className="flex items-center justify-center h-full">
                              <LoadingSpinner />
                              <span className="ml-2 text-gray-400">Searching IGDB...</span>
                            </div>
                          ) : searchResults.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-500">
                              No results found
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {searchResults.map((result) => (
                                <motion.button
                                  key={result.igdbId}
                                  whileHover={{ scale: 1.01 }}
                                  whileTap={{ scale: 0.99 }}
                                  onClick={() => handleSelectIgdbGame(result.igdbId)}
                                  className="w-full p-3 bg-glass-white border border-glass-border rounded-lg
                                           hover:border-neon-cyan/50 transition-colors text-left flex gap-4"
                                >
                                  {result.coverUrl ? (
                                    <img
                                      src={result.coverUrl}
                                      alt={result.name}
                                      className="w-16 h-20 object-cover rounded"
                                    />
                                  ) : (
                                    <div className="w-16 h-20 bg-glass-white rounded flex items-center justify-center text-gray-600">
                                      ?
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-display text-white truncate">{result.name}</h4>
                                    <p className="text-xs text-gray-500">
                                      {result.releaseDate || 'Unknown release date'}
                                    </p>
                                    {result.platforms.length > 0 && (
                                      <p className="text-xs text-gray-600 mt-1 truncate">
                                        {result.platforms.join(', ')}
                                      </p>
                                    )}
                                    {result.summary && (
                                      <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                                        {result.summary}
                                      </p>
                                    )}
                                  </div>
                                </motion.button>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Metadata Editor Modal */}
          {game && (
            <MetadataEditorModal
              game={game}
              isOpen={showMetadataEditor}
              onClose={() => setShowMetadataEditor(false)}
              onSave={handleSaveMetadata}
            />
          )}
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

function WarningIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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

function CheckIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function ImageUploadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}
