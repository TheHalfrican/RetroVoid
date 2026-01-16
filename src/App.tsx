import { useEffect, Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { MainLayout } from './components/layout';
import { Sidebar, TopBar, GameGrid, GameDetail, SettingsPanel, FullSettingsWindow, HolographicShelfView, ToastContainer } from './components/ui';
import { ThemeProvider } from './components/ThemeProvider';
import { useLibraryStore, useSettingsStore, useUIStore } from './stores';
import { CyberpunkEnvironment, NeonGrid, ParticleField, RotatingStars } from './components/three';
import { useTheme } from './hooks/useTheme';
import { getSetting, scanLibrary, getAllGames, type ScanPath } from './services/library';

function AppContent() {
  const { loadLibrary } = useLibraryStore();
  const { enableParticles } = useSettingsStore();
  const { viewMode, showToast } = useUIStore();
  const theme = useTheme();
  const hasAutoScanned = useRef(false);

  // Load library and auto-scan on mount
  useEffect(() => {
    const initializeLibrary = async () => {
      // First load the existing library
      await loadLibrary();

      // Only auto-scan once per session
      if (hasAutoScanned.current) return;
      hasAutoScanned.current = true;

      // Check for saved folders and auto-scan
      try {
        const savedFolders = await getSetting('library_folders');
        if (savedFolders) {
          const folders: ScanPath[] = JSON.parse(savedFolders);
          if (folders.length > 0) {
            console.log('Auto-scanning library folders...');

            // Get games before scan to track what's new
            const gamesBefore = await getAllGames();
            const gameIdsBefore = new Set(gamesBefore.map(g => g.id));

            const result = await scanLibrary(folders);

            // Reload library after scan to pick up new games
            await loadLibrary();

            // If new games were added, show a toast notification
            if (result.gamesAdded > 0) {
              // Get all games after scan to find new ones
              const gamesAfter = await getAllGames();
              const newGames = gamesAfter.filter(g => !gameIdsBefore.has(g.id));

              // Group new games by platform
              const platformCounts: Record<string, number> = {};
              for (const game of newGames) {
                platformCounts[game.platformId] = (platformCounts[game.platformId] || 0) + 1;
              }

              // Build platform breakdown string using platform display names
              const platformStore = useLibraryStore.getState();
              const platformDetails = Object.entries(platformCounts)
                .map(([platformId, count]) => {
                  const platform = platformStore.platforms.find(p => p.id === platformId);
                  const name = platform?.displayName || platformId;
                  return `${name} (${count})`;
                })
                .join(', ');

              showToast({
                message: `${result.gamesAdded} new game${result.gamesAdded !== 1 ? 's' : ''} added`,
                details: platformDetails,
                type: 'success',
                duration: 6000,
              });
            }

            console.log('Auto-scan complete');
          }
        }
      } catch (error) {
        console.error('Auto-scan failed:', error);
      }
    };

    initializeLibrary();
  }, [loadLibrary, showToast]);

  // Check if we're in 3D shelf mode
  const is3DShelfMode = viewMode === '3d-shelf';

  // Should we show the background 3D scene?
  const showBackground3D = enableParticles && !is3DShelfMode && theme.scene.showGrid;

  return (
    <div className="w-full h-full relative" style={{ backgroundColor: 'var(--theme-bg)' }}>
      {/* Background 3D Scene - only show when NOT in 3D shelf mode and theme enables it */}
      {showBackground3D && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <Canvas
            camera={{ position: [0, 8, 20], fov: 60 }}
            gl={{
              antialias: true,
              powerPreference: 'default',
              failIfMajorPerformanceCaveat: false
            }}
            dpr={1}
          >
            <Suspense fallback={null}>
              <CyberpunkEnvironment
                // Bloom disabled for Grid/List views to prevent flickering on high-res displays
                enableBloom={false}
                enableChromaticAberration={theme.scene.enableChromaticAberration}
                enableVignette={false}  // CRT effects only in 3D shelf view
                enableNoise={theme.scene.enableNoise}
                enableBarrelDistortion={false}  // CRT effects only in 3D shelf view
                enablePhosphorGlow={false}  // CRT effects only in 3D shelf view
                enableCRTFrame={false}  // CRT effects only in 3D shelf view
                bloomIntensity={0}
                bloomThreshold={1}
                chromaticAberrationOffset={theme.scene.chromaticAberrationOffset}
                vignetteDarkness={theme.scene.vignetteDarkness}
                noiseOpacity={theme.scene.noiseOpacity}
                barrelDistortion={theme.scene.barrelDistortion}
                barrelDistortionScale={theme.scene.barrelDistortionScale}
                phosphorGlowColor={theme.scene.phosphorGlowColor}
                phosphorGlowIntensity={theme.scene.phosphorGlowIntensity}
                crtFrameRadius={theme.scene.crtFrameRadius}
                crtFrameSoftness={theme.scene.crtFrameSoftness}
                backgroundColor={theme.scene.backgroundColor}
                primaryLightColor={theme.scene.primaryLightColor}
                secondaryLightColor={theme.scene.secondaryLightColor}
                accentLightColor={theme.scene.accentLightColor}
              >
                <NeonGrid
                  position={[0, 0, 0]}
                  size={150}
                  gridSize={2}
                  fadeDistance={50}
                  speed={0.3}
                  glowIntensity={1.5}
                  color1={theme.scene.gridColor}
                  color2={theme.scene.gridSecondaryColor}
                />
                {theme.scene.showParticles && (
                  <ParticleField
                    count={150}
                    areaSize={40}
                    particleSize={0.08}
                    color={theme.scene.particleColor}
                    secondaryColor={theme.scene.gridSecondaryColor}
                    speed={0.4}
                    opacity={0.7}
                  />
                )}
                <RotatingStars />
              </CyberpunkEnvironment>
            </Suspense>
          </Canvas>
        </div>
      )}

      {/* Main UI */}
      <div className="relative z-10 w-full h-full">
        <MainLayout
          sidebar={<Sidebar />}
          topBar={<TopBar />}
        >
          {is3DShelfMode ? <HolographicShelfView /> : <GameGrid />}
        </MainLayout>
      </div>

      {/* Modals and Overlays */}
      <GameDetail />
      <SettingsPanel />
      <FullSettingsWindow />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

/**
 * App - Root component with ThemeProvider wrapper
 */
function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
