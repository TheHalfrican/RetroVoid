import { motion } from 'framer-motion';
import { useLibraryStore, useUIStore } from '../../stores';
import { useTheme } from '../../hooks/useTheme';
import type { Platform } from '../../types';

// Platform icons using emoji as placeholders (can be replaced with actual icons)
const platformIcons: Record<string, string> = {
  // Nintendo
  nes: '🎮', snes: '🎮', n64: '🎮', gamecube: '🎮', wii: '🎮', wiiu: '🎮', switch: '🎮',
  gb: '📱', gbc: '📱', gba: '📱', nds: '📱', '3ds': '📱', virtualboy: '🎮',
  // Sony
  ps1: '🎮', ps2: '🎮', ps3: '🎮', psp: '📱', vita: '📱',
  // Sega
  genesis: '🎮', sega32x: '🎮', segacd: '💿', saturn: '🎮', dreamcast: '🎮', mastersystem: '🎮', gamegear: '📱',
  // Microsoft
  xbox: '🎮', xbox360: '🎮', windows: '🖥️',
  // Panasonic
  '3do': '🎮',
  // Other
  arcade: '🕹️', dos: '💻', scummvm: '🖱️',
  atari2600: '🕹️', atari5200: '🕹️', atari7800: '🕹️', atarijaguar: '🕹️', atarijaguarcd: '💿', neogeo: '🕹️', pcengine: '🎮', pcenginecd: '💿', cdi: '💿',
};

// Group platforms by manufacturer
const manufacturerOrder = ['Nintendo', 'Sony', 'Sega', 'Microsoft', 'Atari', 'SNK', 'NEC', 'Panasonic', 'Philips', 'PC', 'Various'];

function groupPlatformsByManufacturer(platforms: Platform[]): Record<string, Platform[]> {
  const groups: Record<string, Platform[]> = {};

  for (const platform of platforms) {
    const manufacturer = platform.manufacturer;
    if (!groups[manufacturer]) {
      groups[manufacturer] = [];
    }
    groups[manufacturer].push(platform);
  }

  return groups;
}

export function Sidebar() {
  const { platforms, games } = useLibraryStore();
  const { selectedPlatformId, selectPlatform } = useUIStore();
  const theme = useTheme();

  const groupedPlatforms = groupPlatformsByManufacturer(platforms);

  // Count games per platform
  const gameCountByPlatform = games.reduce((acc, game) => {
    acc[game.platformId] = (acc[game.platformId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count favorites
  const favoriteCount = games.filter(g => g.isFavorite).length;

  // Get recently added count (games with createdAt, limited to 25)
  const recentlyAddedCount = Math.min(
    games.filter(g => g.createdAt).length,
    25
  );

  // Get recently played count
  const recentCount = games.filter(g => g.lastPlayed).length;

  return (
    <div className="h-full flex flex-col">
      {/* Logo/Title */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
        <h1
          className="font-display text-xl font-bold tracking-wider"
          style={{
            color: 'var(--theme-accent)',
            textShadow: theme.scene.enableBloom ? `0 0 10px var(--theme-accent), 0 0 20px var(--theme-accent)` : 'none'
          }}
        >
          RETRO
        </h1>
        <h1
          className="font-display text-xl font-bold tracking-wider -mt-1"
          style={{
            color: 'var(--theme-accent-secondary)',
            textShadow: theme.scene.enableBloom ? `0 0 10px var(--theme-accent-secondary)` : 'none'
          }}
        >
          VOID
        </h1>
      </div>

      {/* Quick Filters */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--theme-border)' }}>
        <SidebarItem
          label="All Games"
          count={games.length}
          isSelected={selectedPlatformId === null}
          onClick={() => selectPlatform(null)}
          color={theme.accent}
        />
        <SidebarItem
          label="Favorites"
          count={favoriteCount}
          isSelected={selectedPlatformId === 'favorites'}
          onClick={() => selectPlatform('favorites')}
          color={theme.accentSecondary}
          icon="⭐"
        />
        <SidebarItem
          label="Recently Added"
          count={recentlyAddedCount}
          isSelected={selectedPlatformId === 'recently-added'}
          onClick={() => selectPlatform('recently-added')}
          color={theme.accent}
          icon="✨"
        />
        <SidebarItem
          label="Recently Played"
          count={recentCount}
          isSelected={selectedPlatformId === 'recent'}
          onClick={() => selectPlatform('recent')}
          color={theme.accentSecondary}
          icon="🕐"
        />
      </div>

      {/* Platforms List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {manufacturerOrder.map(manufacturer => {
          const manufacturerPlatforms = groupedPlatforms[manufacturer];
          if (!manufacturerPlatforms || manufacturerPlatforms.length === 0) return null;

          return (
            <div key={manufacturer} className="py-2">
              <h3
                className="px-4 py-1 text-xs font-accent uppercase tracking-widest"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {manufacturer}
              </h3>
              {manufacturerPlatforms.map((platform, index) => (
                <motion.div
                  key={platform.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <SidebarItem
                    label={platform.displayName}
                    count={gameCountByPlatform[platform.id] || 0}
                    isSelected={selectedPlatformId === platform.id}
                    onClick={() => selectPlatform(platform.id)}
                    color={platform.color}
                    icon={platformIcons[platform.id]}
                  />
                </motion.div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--theme-border)' }}>
        <p
          className="text-xs font-body text-center"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          {games.length} games in library
        </p>
      </div>
    </div>
  );
}

interface SidebarItemProps {
  label: string;
  count?: number;
  isSelected: boolean;
  onClick: () => void;
  color: string;
  icon?: string;
}

function SidebarItem({ label, count, isSelected, onClick, color, icon }: SidebarItemProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      className="w-full px-4 py-2 flex items-center gap-3 text-left transition-all duration-200 border-l-2"
      style={{
        backgroundColor: isSelected ? 'var(--theme-surface)' : 'transparent',
        borderLeftColor: isSelected ? color : 'transparent',
        color: isSelected ? 'var(--theme-text)' : 'var(--theme-text-secondary)',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'var(--theme-surface-hover)';
          e.currentTarget.style.color = 'var(--theme-text)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--theme-text-secondary)';
        }
      }}
    >
      {icon && <span className="text-sm">{icon}</span>}
      <span className="flex-1 font-body text-sm truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className="text-xs px-2 py-0.5 rounded-full font-body"
          style={{ color, backgroundColor: 'var(--theme-surface)' }}
        >
          {count}
        </span>
      )}
    </motion.button>
  );
}
