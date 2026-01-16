import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ask, open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useLibraryStore, useUIStore } from '../../stores';
import { useTheme } from '../../hooks/useTheme';
import { updateGame, setCustomCoverArt, getGame } from '../../services/library';
import type { Game, Platform } from '../../types';
import { platformIconMap } from '../../utils/platformIcons';
import { MetadataEditorModal } from './MetadataEditorModal';

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

interface GameCardProps {
  game: Game;
  onPlay: () => void;
  isSelected?: boolean;
  onSelect?: (shiftKey: boolean) => void;
  selectionCount?: number;
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
}

export function GameCard({ game, onPlay, isSelected, onSelect, selectionCount }: GameCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ isOpen: false, x: 0, y: 0 });
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { platforms, toggleFavorite, deleteGame, updateGame: updateGameInStore } = useLibraryStore();
  const { openGameDetail, coverVersions, incrementCoverVersion } = useUIStore();
  const theme = useTheme();

  const platform = platforms.find(p => p.id === game.platformId);
  const isMultiSelected = selectionCount && selectionCount > 1 && isSelected;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent grid click handler from clearing selection

    // If shift key is held, do selection instead of opening detail
    if (e.shiftKey && onSelect) {
      onSelect(true);
      return;
    }

    // If there are multiple selected games, clicking a card selects only that card
    if (selectionCount && selectionCount > 0 && onSelect) {
      onSelect(false); // This will clear others and select only this one
      return;
    }

    // Normal click - open game detail
    openGameDetail(game.id);
  };

  // Reset image error when cover art path changes
  useEffect(() => {
    setImageError(false);
  }, [game.coverArtPath]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.isOpen) {
        setContextMenu({ ...contextMenu, isOpen: false });
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.isOpen]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

    // If this card is part of a multi-selection, don't show individual context menu
    // Let the parent handle bulk context menu
    if (isMultiSelected) {
      return;
    }

    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleDelete = async () => {
    setContextMenu({ ...contextMenu, isOpen: false });
    // Confirm before deleting using native dialog
    const confirmed = await ask(`Are you sure you want to remove "${game.title}" from your library?`, {
      title: 'Delete Game',
      kind: 'warning',
    });
    if (confirmed) {
      await deleteGame(game.id);
    }
  };

  const handleChangePlatform = async (newPlatformId: string) => {
    setShowPlatformPicker(false);
    if (newPlatformId !== game.platformId) {
      await updateGame(game.id, { platformId: newPlatformId });
      updateGameInStore(game.id, { platformId: newPlatformId });
    }
  };

  // Handle custom cover art upload
  const handleUploadCoverArt = async () => {
    setContextMenu({ ...contextMenu, isOpen: false });

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
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  // Handle metadata save from editor modal
  const handleSaveMetadata = async (updates: Partial<Game>) => {
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
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <>
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onContextMenu={handleContextMenu}
      className="group relative cursor-pointer select-none"
      onClick={handleClick}
    >
      {/* Card Container */}
      <div
        className="relative rounded-lg overflow-hidden border transition-all duration-300"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: isSelected
            ? theme.accentSecondary
            : isHovered
              ? theme.accent
              : 'var(--theme-border)',
          boxShadow: isSelected
            ? `0 0 10px ${theme.accentSecondary}, 0 0 20px ${theme.accentSecondary}40`
            : isHovered
              ? `0 0 10px ${theme.accent}60`
              : 'none',
        }}
      >
        {/* Cover Art */}
        <div className="aspect-[3/4] relative overflow-hidden">
          {game.coverArtPath && !imageError ? (
            <img
              src={`${convertFileSrc(game.coverArtPath)}?v=${coverVersions[game.id] || 0}`}
              alt={game.title}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <PlaceholderCover title={game.title} platform={platform} />
          )}

          {/* Holographic Overlay */}
          <motion.div
            animate={{
              opacity: isHovered ? 0.3 : 0,
              backgroundPosition: isHovered ? '200% 200%' : '0% 0%',
            }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-holo-gradient bg-[length:200%_200%] pointer-events-none"
          />

          {/* Scanline Effect */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
            }}
          />

          {/* Platform Logo Badge */}
          {platform && platformIconUrls[platform.id] && (
            <div
              className="absolute top-2 right-2 px-2 py-1.5 rounded backdrop-blur-sm flex items-center justify-center"
              style={{
                backgroundColor: '#1a1025ee',
                border: `1px solid ${platform.color}66`,
                boxShadow: `0 0 8px ${platform.color}33`,
              }}
            >
              <img
                src={platformIconUrls[platform.id]}
                alt={platform.displayName}
                className="h-4 w-auto max-w-[80px] object-contain"
              />
            </div>
          )}

          {/* Selection Checkbox */}
          {isSelected && (
            <div
              className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: theme.accentSecondary,
                boxShadow: `0 0 8px ${theme.accentSecondary}`,
              }}
            >
              <CheckIcon />
            </div>
          )}

          {/* Favorite Button - hide when selected to avoid overlap */}
          {!isSelected && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered || game.isFavorite ? 1 : 0 }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(game.id);
              }}
              className="absolute top-2 left-2 p-1.5 rounded-full backdrop-blur-sm"
              style={{
                backgroundColor: 'var(--theme-bg)',
                border: '1px solid var(--theme-border)',
              }}
            >
              <HeartIcon filled={game.isFavorite} accentColor={theme.accentSecondary} />
            </motion.button>
          )}

          {/* Quick Play Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 20 }}
            className="absolute bottom-3 left-3 right-3"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => {
                e.stopPropagation();
                onPlay();
              }}
              className="w-full py-2 rounded-lg font-display font-bold text-sm transition-colors"
              style={{
                backgroundColor: theme.accent,
                color: 'var(--theme-bg)',
                boxShadow: theme.scene.enableBloom ? `0 0 10px ${theme.accent}60` : 'none',
              }}
            >
              PLAY
            </motion.button>
          </motion.div>
        </div>

        {/* Info Section */}
        <div className="p-3">
          <h3
            className="font-body font-medium text-sm truncate mb-1"
            style={{ color: 'var(--theme-text)' }}
          >
            {game.title}
          </h3>
          <div
            className="flex items-center justify-between text-xs"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            <span className="font-body">{formatPlayTime(game.totalPlayTimeSeconds)}</span>
            {game.lastPlayed && (
              <span className="font-body">
                {new Date(game.lastPlayed).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Reflection Effect */}
      <div
        className="absolute -bottom-4 left-2 right-2 h-8 rounded-lg opacity-20 blur-sm pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, ${platform?.color || '#00f5ff'}22, transparent)`,
          transform: 'scaleY(-1)',
        }}
      />
    </motion.div>

    {/* Context Menu */}
    <AnimatePresence>
      {contextMenu.isOpen && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu({ ...contextMenu, isOpen: false })}
          items={[
            {
              label: 'Play',
              icon: <PlayIcon />,
              onClick: () => {
                setContextMenu({ ...contextMenu, isOpen: false });
                onPlay();
              },
            },
            {
              label: game.isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
              icon: <HeartIcon filled={game.isFavorite} />,
              onClick: () => {
                setContextMenu({ ...contextMenu, isOpen: false });
                toggleFavorite(game.id);
              },
            },
            {
              label: 'View Details',
              icon: <InfoIcon />,
              onClick: () => {
                setContextMenu({ ...contextMenu, isOpen: false });
                openGameDetail(game.id);
              },
            },
            { type: 'separator' },
            {
              label: 'Set Custom Cover Art...',
              icon: <ImageIcon />,
              onClick: handleUploadCoverArt,
            },
            {
              label: 'Edit Metadata...',
              icon: <EditIcon />,
              onClick: () => {
                setContextMenu({ ...contextMenu, isOpen: false });
                setShowMetadataEditor(true);
              },
            },
            {
              label: `Change Platform (${platform?.displayName || 'Unknown'})`,
              icon: <PlatformIcon />,
              onClick: () => {
                setContextMenu({ ...contextMenu, isOpen: false });
                setShowPlatformPicker(true);
              },
            },
            {
              label: 'Delete from Library',
              icon: <TrashIcon />,
              onClick: handleDelete,
              danger: true,
            },
          ]}
        />
      )}
    </AnimatePresence>

    {/* Platform Picker Modal */}
    <AnimatePresence>
      {showPlatformPicker && (
        <PlatformPicker
          currentPlatformId={game.platformId}
          platforms={platforms}
          onSelect={handleChangePlatform}
          onClose={() => setShowPlatformPicker(false)}
        />
      )}
    </AnimatePresence>

    {/* Metadata Editor Modal */}
    <MetadataEditorModal
      game={game}
      isOpen={showMetadataEditor}
      onClose={() => setShowMetadataEditor(false)}
      onSave={handleSaveMetadata}
    />
    </>
  );
}

// Placeholder cover when no image is available
function PlaceholderCover({ title, platform }: { title: string; platform?: Platform }) {
  const initials = title
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center p-4"
      style={{
        background: `linear-gradient(135deg, ${platform?.color || '#00f5ff'}22 0%, #1a102566 100%)`,
      }}
    >
      <div
        className="text-4xl font-display font-bold mb-2"
        style={{ color: platform?.color || '#00f5ff' }}
      >
        {initials}
      </div>
      <div className="text-center text-xs text-gray-500 font-body line-clamp-2">
        {title}
      </div>
    </div>
  );
}

function HeartIcon({ filled, accentColor }: { filled: boolean; accentColor?: string }) {
  if (filled) {
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" style={{ color: accentColor || '#ff00ff' }}>
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    );
  }

  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--theme-text-muted)' }}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

// Context Menu Types
type ContextMenuItem =
  | { type?: never; label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }
  | { type: 'separator' };

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  items: ContextMenuItem[];
}

function ContextMenu({ x, y, items }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className="fixed z-50 min-w-[180px] py-1 rounded-lg shadow-xl backdrop-blur-sm"
      style={{
        left: x,
        top: y,
        backgroundColor: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, index) => {
        if (item.type === 'separator') {
          return (
            <div key={index} className="my-1" style={{ borderTop: '1px solid var(--theme-border)' }} />
          );
        }

        return (
          <motion.button
            key={index}
            whileHover={{ backgroundColor: 'var(--theme-surface-hover)' }}
            onClick={item.onClick}
            className="w-full px-3 py-2 flex items-center gap-3 text-left text-sm font-body transition-colors"
            style={{
              color: item.danger ? '#f87171' : 'var(--theme-text-secondary)',
            }}
            onMouseEnter={(e) => {
              if (!item.danger) e.currentTarget.style.color = 'var(--theme-text)';
            }}
            onMouseLeave={(e) => {
              if (!item.danger) e.currentTarget.style.color = 'var(--theme-text-secondary)';
            }}
          >
            <span style={{ color: item.danger ? '#f87171' : 'var(--theme-text-muted)' }}>
              {item.icon}
            </span>
            {item.label}
          </motion.button>
        );
      })}
    </motion.div>
  );
}

function PlatformIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

interface PlatformPickerProps {
  currentPlatformId: string;
  platforms: Platform[];
  onSelect: (platformId: string) => void;
  onClose: () => void;
}

function PlatformPicker({ currentPlatformId, platforms, onSelect, onClose }: PlatformPickerProps) {
  const theme = useTheme();

  // Group platforms by manufacturer
  const groupedPlatforms = platforms.reduce((acc, platform) => {
    const group = platform.manufacturer || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(platform);
    return acc;
  }, {} as Record<string, Platform[]>);

  const manufacturerOrder = ['Nintendo', 'Sony', 'Sega', 'Microsoft', 'Atari', 'SNK', 'NEC', 'Panasonic', 'PC', 'Various', 'Other'];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 backdrop-blur-sm z-50"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-4 bottom-4 -translate-x-1/2 z-50
                   w-full max-w-md overflow-hidden flex flex-col rounded-xl shadow-2xl"
        style={{
          backgroundColor: 'var(--theme-bg-secondary)',
          border: '1px solid var(--theme-border)',
        }}
      >
        {/* Header */}
        <div
          className="p-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--theme-border)' }}
        >
          <h3 className="font-display text-lg" style={{ color: 'var(--theme-text)' }}>Change Platform</h3>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--theme-text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--theme-surface)';
              e.currentTarget.style.color = 'var(--theme-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--theme-text-muted)';
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Platform List */}
        <div className="flex-1 overflow-y-auto p-2">
          {manufacturerOrder
            .filter(m => groupedPlatforms[m])
            .map(manufacturer => (
              <div key={manufacturer} className="mb-3">
                <p
                  className="px-2 py-1 text-xs font-body uppercase tracking-wider"
                  style={{ color: 'var(--theme-text-muted)' }}
                >
                  {manufacturer}
                </p>
                <div className="space-y-1">
                  {groupedPlatforms[manufacturer].map(p => (
                    <motion.button
                      key={p.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => onSelect(p.id)}
                      className="w-full px-3 py-2 rounded-lg flex items-center gap-3 text-left transition-colors"
                      style={{
                        backgroundColor: p.id === currentPlatformId ? theme.accentMuted : 'transparent',
                        border: p.id === currentPlatformId ? `1px solid ${theme.accent}80` : '1px solid transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (p.id !== currentPlatformId) {
                          e.currentTarget.style.backgroundColor = 'var(--theme-surface)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (p.id !== currentPlatformId) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span
                        className="font-body text-sm"
                        style={{ color: p.id === currentPlatformId ? theme.accent : 'var(--theme-text-secondary)' }}
                      >
                        {p.displayName}
                      </span>
                      {p.id === currentPlatformId && (
                        <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 24 24" style={{ color: theme.accent }}>
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </motion.div>
    </>
  );
}
