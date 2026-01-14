import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useLibraryStore, useUIStore } from '../../stores';
import {
  CyberpunkEnvironment,
  NeonGrid,
  ParticleField,
  HolographicShelf,
  RotatingStars
} from '../three';

/**
 * HolographicShelfView - Full 3D game browsing experience
 *
 * Renders when viewMode is '3d-shelf'. Provides an immersive 3D view
 * of the game library with holographic cards on glowing shelves.
 */
export function HolographicShelfView() {
  const { games, platforms } = useLibraryStore();
  const { selectedPlatformId, searchQuery, openGameDetail } = useUIStore();

  // Apply same filters as GameGrid
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

  const handleGameClick = (game: { id: string }) => {
    openGameDetail(game.id);
  };

  // Get filter name for empty state
  const getFilterName = () => {
    if (selectedPlatformId === 'favorites') return 'Favorites';
    if (selectedPlatformId === 'recent') return 'Recently Played';
    if (selectedPlatformId) {
      const platform = platforms.find(p => p.id === selectedPlatformId);
      return platform?.displayName || 'Games';
    }
    return 'All Games';
  };

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 5, 18], fov: 50 }}
        gl={{
          antialias: true,
          powerPreference: 'default',
          failIfMajorPerformanceCaveat: false
        }}
        dpr={1}
      >
        <Suspense fallback={null}>
          <CyberpunkEnvironment
            enableBloom={true}
            enableChromaticAberration={true}
            enableVignette={true}
            enableNoise={true}
            bloomIntensity={0.6}
            bloomThreshold={0.7}
            chromaticAberrationOffset={0.0005}
          >
            {/* Floor grid */}
            <NeonGrid
              position={[0, -2, 0]}
              size={100}
              gridSize={2}
              fadeDistance={40}
              speed={0.2}
              glowIntensity={1.0}
            />

            {/* Atmospheric particles */}
            <ParticleField
              count={100}
              areaSize={30}
              particleSize={0.06}
              color="#00f5ff"
              speed={0.3}
              opacity={0.5}
            />

            {/* Rotating starfield background */}
            <RotatingStars />

            {/* The shelf with games */}
            <HolographicShelf
              games={filteredGames}
              onGameClick={handleGameClick}
              selectedGameId={null}
              cardsPerRow={5}
              rowSpacing={4.5}
              cardSpacing={2.8}
            />
          </CyberpunkEnvironment>
        </Suspense>
      </Canvas>

      {/* Overlay UI for empty state */}
      {filteredGames.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-void-black/80 backdrop-blur-md border border-glass-border rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="font-display text-xl text-white mb-2">No Games Found</h3>
            <p className="text-gray-400 font-body">
              {searchQuery
                ? `No results for "${searchQuery}" in ${getFilterName()}`
                : `No games in ${getFilterName()}`}
            </p>
          </div>
        </div>
      )}

      {/* Instructions overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="bg-void-black/60 backdrop-blur-sm border border-glass-border rounded-full px-4 py-2 text-sm text-gray-400 font-body">
          Click a game to view details • Scroll to browse
        </div>
      </div>
    </div>
  );
}

export default HolographicShelfView;
