import { Suspense, useMemo } from 'react';
import { Canvas, events as createDefaultEvents } from '@react-three/fiber';
import type { EventManager } from '@react-three/fiber';
import { useLibraryStore, useUIStore, useSettingsStore } from '../../stores';
import {
  CyberpunkEnvironment,
  NeonGrid,
  ParticleField,
  HolographicShelf,
  RotatingStars
} from '../three';
import { useTheme } from '../../hooks/useTheme';
import type { Platform, Game, Quality3D } from '../../types';

/**
 * Convert quality setting to device pixel ratio value
 * Higher DPR = sharper rendering but more GPU load
 */
function getQualityDPR(quality: Quality3D): number | [number, number] {
  const deviceDPR = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

  switch (quality) {
    case 'performance':
      return 1; // Fixed 1x - fastest, may look pixelated on high-DPI displays
    case 'balanced':
      return Math.min(deviceDPR, 1.5); // Up to 1.5x - good balance
    case 'high':
      return Math.min(deviceDPR, 2); // Up to 2x - recommended for most dedicated GPUs
    case 'ultra':
      return Math.min(deviceDPR, 3); // Up to 3x - high-end GPUs
    case 'maximum':
      return deviceDPR; // Native DPR uncapped - best quality, highest GPU load
    default:
      return 2;
  }
}

/**
 * Apply barrel distortion correction to pointer coordinates.
 * Converts screen click position to undistorted 3D space coordinates.
 */
function correctForBarrelDistortion(
  screenX: number,
  screenY: number,
  distortion: number,
  distortionScale: number
): { x: number; y: number } {
  if (distortion === 0 || distortionScale === 0) {
    return { x: screenX, y: screenY };
  }

  const r2 = screenX * screenX + screenY * screenY;
  const r4 = r2 * r2;
  const distortionAmount = 1.0 + r2 * distortion + r4 * distortion * 0.5;

  return {
    x: screenX * distortionAmount * distortionScale,
    y: screenY * distortionAmount * distortionScale
  };
}

/**
 * Creates a custom events factory that applies barrel distortion correction
 * to pointer coordinates before raycasting. Wraps R3F's default events system.
 */
function createBarrelDistortionEvents(
  distortion: number,
  distortionScale: number,
  enabled: boolean
) {
  // Return an event manager factory function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (store: any): EventManager<HTMLElement> => {
    // Get the default event manager from R3F
    const defaultEvents = createDefaultEvents(store);

    // Return a modified event manager with our custom compute function
    return {
      ...defaultEvents,
      compute: (event, state) => {
        // Get the canvas bounds
        const rect = state.gl.domElement.getBoundingClientRect();

        // Compute raw NDC coordinates (-1 to 1)
        const rawX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const rawY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Apply barrel distortion correction if enabled
        let correctedX = rawX;
        let correctedY = rawY;

        if (enabled && distortion !== 0) {
          const corrected = correctForBarrelDistortion(rawX, rawY, distortion, distortionScale);
          correctedX = corrected.x;
          correctedY = corrected.y;
        }

        // Update pointer and raycaster with corrected coordinates
        state.pointer.set(correctedX, correctedY);
        state.raycaster.setFromCamera(state.pointer, state.camera);
      }
    };
  };
}

interface PlatformShelf {
  platform: Platform;
  games: Game[];
}

/**
 * HolographicShelfView - Full 3D game browsing experience
 *
 * Renders when viewMode is '3d-shelf'. Provides an immersive 3D view
 * of the game library with holographic cards on glowing shelves.
 * Games are organized by platform, with each shelf representing one console.
 */
export function HolographicShelfView() {
  const { games, platforms } = useLibraryStore();
  const { selectedPlatformId, searchQuery, openGameDetail } = useUIStore();
  const { quality3D, theme: themeMode } = useSettingsStore();
  const theme = useTheme();

  // Calculate DPR based on quality setting
  const dpr = useMemo(() => getQualityDPR(quality3D), [quality3D]);

  // Create custom events factory with barrel distortion correction
  const customEvents = useMemo(
    () => createBarrelDistortionEvents(
      theme.scene.barrelDistortion,
      theme.scene.barrelDistortionScale,
      theme.scene.enableBarrelDistortion
    ),
    [theme.scene.barrelDistortion, theme.scene.barrelDistortionScale, theme.scene.enableBarrelDistortion]
  );

  // Apply same filters as GameGrid
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

  // Group games by platform for shelf display
  const platformShelves = useMemo((): PlatformShelf[] => {
    // Group games by platformId
    const gamesByPlatform = new Map<string, Game[]>();

    for (const game of filteredGames) {
      const existing = gamesByPlatform.get(game.platformId) || [];
      existing.push(game);
      gamesByPlatform.set(game.platformId, existing);
    }

    // Convert to PlatformShelf array, only including platforms that have games
    const shelves: PlatformShelf[] = [];

    for (const [platformId, platformGames] of gamesByPlatform) {
      const platform = platforms.find(p => p.id === platformId);
      if (platform && platformGames.length > 0) {
        shelves.push({
          platform,
          games: platformGames.sort((a, b) => a.title.localeCompare(b.title))
        });
      }
    }

    // Sort shelves by platform display name
    return shelves.sort((a, b) => a.platform.displayName.localeCompare(b.platform.displayName));
  }, [filteredGames, platforms]);

  const handleGameClick = (game: { id: string }) => {
    openGameDetail(game.id);
  };

  // Get filter name for empty state
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

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 6, 18], fov: 50 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false
        }}
        dpr={dpr}
        events={customEvents}
      >
        <Suspense fallback={null}>
          <CyberpunkEnvironment
            enableBloom={theme.scene.enableBloom}
            enableChromaticAberration={theme.scene.enableChromaticAberration}
            enableVignette={theme.scene.enableVignette}
            enableNoise={theme.scene.enableNoise}
            enableBarrelDistortion={theme.scene.enableBarrelDistortion}
            enablePhosphorGlow={theme.scene.enablePhosphorGlow}
            bloomIntensity={theme.scene.bloomIntensity}
            bloomThreshold={theme.scene.bloomThreshold}
            chromaticAberrationOffset={theme.scene.chromaticAberrationOffset}
            vignetteDarkness={theme.scene.vignetteDarkness}
            noiseOpacity={theme.scene.noiseOpacity}
            barrelDistortion={theme.scene.barrelDistortion}
            barrelDistortionScale={theme.scene.barrelDistortionScale}
            phosphorGlowColor={theme.scene.phosphorGlowColor}
            phosphorGlowIntensity={theme.scene.phosphorGlowIntensity}
            enableCRTFrame={theme.scene.enableCRTFrame}
            crtFrameRadius={theme.scene.crtFrameRadius}
            crtFrameSoftness={theme.scene.crtFrameSoftness}
            backgroundColor={theme.scene.backgroundColor}
            primaryLightColor={theme.scene.primaryLightColor}
            secondaryLightColor={theme.scene.secondaryLightColor}
            accentLightColor={theme.scene.accentLightColor}
          >
            {/* Floor grid - only show if theme enables it */}
            {theme.scene.showGrid && (
              <NeonGrid
                position={[0, -2, 0]}
                size={100}
                gridSize={2}
                fadeDistance={40}
                speed={0.2}
                glowIntensity={1.0}
                color1={theme.scene.gridColor}
                color2={theme.scene.gridSecondaryColor}
              />
            )}

            {/* Atmospheric particles - only show if theme enables it */}
            {theme.scene.showParticles && (
              <ParticleField
                count={100}
                areaSize={30}
                particleSize={0.06}
                color={theme.scene.particleColor}
                speed={0.3}
                opacity={0.5}
              />
            )}

            {/* Rotating starfield background - bigger stars for cyberpunk/minimal */}
            <RotatingStars
              count={5000}
              factor={themeMode === 'cyberpunk' || themeMode === 'minimal' ? 8 : 6}
            />

            {/* The shelves with games organized by platform */}
            <HolographicShelf
              platformShelves={platformShelves}
              onGameClick={handleGameClick}
              selectedGameId={null}
              cardSpacing={2.8}
              shelfSpacing={5}
              themeScene={theme.scene}
              resetScrollKey={selectedPlatformId}
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
