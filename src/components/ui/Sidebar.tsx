import { motion } from 'framer-motion';
import { useLibraryStore, useUIStore } from '../../stores';
import type { Platform } from '../../types';

// Platform icons using emoji as placeholders (can be replaced with actual icons)
const platformIcons: Record<string, string> = {
  // Nintendo
  nes: '🎮', snes: '🎮', n64: '🎮', gamecube: '🎮', wii: '🎮', switch: '🎮',
  gb: '📱', gbc: '📱', gba: '📱', nds: '📱', '3ds': '📱',
  // Sony
  ps1: '🎮', ps2: '🎮', ps3: '🎮', psp: '📱', vita: '📱',
  // Sega
  genesis: '🎮', saturn: '🎮', dreamcast: '🎮', mastersystem: '🎮', gamegear: '📱',
  // Microsoft
  xbox: '🎮', xbox360: '🎮',
  // Other
  arcade: '🕹️', dos: '💻', scummvm: '🖱️',
  atari2600: '🕹️', atari7800: '🕹️', neogeo: '🕹️', pcengine: '🎮',
};

// Group platforms by manufacturer
const manufacturerOrder = ['Nintendo', 'Sony', 'Sega', 'Microsoft', 'Atari', 'SNK', 'NEC', 'PC', 'Various'];

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

  const groupedPlatforms = groupPlatformsByManufacturer(platforms);

  // Count games per platform
  const gameCountByPlatform = games.reduce((acc, game) => {
    acc[game.platformId] = (acc[game.platformId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count favorites
  const favoriteCount = games.filter(g => g.isFavorite).length;

  // Get recently played (last 10)
  const recentCount = games.filter(g => g.lastPlayed).length;

  return (
    <div className="h-full flex flex-col">
      {/* Logo/Title */}
      <div className="p-4 border-b border-glass-border">
        <h1 className="font-display text-lg font-bold text-neon-cyan text-glow-cyan tracking-wider">
          EMULATION
        </h1>
        <h1 className="font-display text-lg font-bold text-neon-magenta tracking-wider -mt-1">
          STATION
        </h1>
      </div>

      {/* Quick Filters */}
      <div className="p-3 border-b border-glass-border">
        <SidebarItem
          label="All Games"
          count={games.length}
          isSelected={selectedPlatformId === null}
          onClick={() => selectPlatform(null)}
          color="#00f5ff"
        />
        <SidebarItem
          label="Favorites"
          count={favoriteCount}
          isSelected={selectedPlatformId === 'favorites'}
          onClick={() => selectPlatform('favorites')}
          color="#ff00ff"
          icon="⭐"
        />
        <SidebarItem
          label="Recently Played"
          count={recentCount}
          isSelected={selectedPlatformId === 'recent'}
          onClick={() => selectPlatform('recent')}
          color="#ff6b35"
          icon="🕐"
        />
      </div>

      {/* Platforms List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {manufacturerOrder.map(manufacturer => {
          const manufacturerPlatforms = groupedPlatforms[manufacturer];
          if (!manufacturerPlatforms || manufacturerPlatforms.length === 0) return null;

          // Only show manufacturers that have games
          const hasGames = manufacturerPlatforms.some(p => gameCountByPlatform[p.id] > 0);

          return (
            <div key={manufacturer} className="py-2">
              <h3 className="px-4 py-1 text-xs font-accent uppercase tracking-widest text-gray-500">
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
      <div className="p-3 border-t border-glass-border">
        <p className="text-xs text-gray-600 font-body text-center">
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
      className={`
        w-full px-4 py-2 flex items-center gap-3 text-left transition-all duration-200
        ${isSelected
          ? 'bg-glass-white border-l-2 text-white'
          : 'text-gray-400 hover:text-white hover:bg-glass-white/50 border-l-2 border-transparent'
        }
      `}
      style={{ borderLeftColor: isSelected ? color : 'transparent' }}
    >
      {icon && <span className="text-sm">{icon}</span>}
      <span className="flex-1 font-body text-sm truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className="text-xs px-2 py-0.5 rounded-full bg-glass-white font-body"
          style={{ color }}
        >
          {count}
        </span>
      )}
    </motion.button>
  );
}
