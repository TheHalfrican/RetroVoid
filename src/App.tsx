import { useEffect, Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { MainLayout } from './components/layout';
import { Sidebar, TopBar, GameGrid, GameDetail, SettingsPanel, FullSettingsWindow, HolographicShelfView } from './components/ui';
import { useLibraryStore, useSettingsStore, useUIStore } from './stores';
import { CyberpunkEnvironment, NeonGrid, ParticleField, RotatingStars } from './components/three';
import { getSetting, scanLibrary, type ScanPath } from './services/library';

function App() {
  const { loadLibrary } = useLibraryStore();
  const { enableParticles, enable3DEffects } = useSettingsStore();
  const { viewMode } = useUIStore();
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
            await scanLibrary(folders);
            // Reload library after scan to pick up new games
            await loadLibrary();
            console.log('Auto-scan complete');
          }
        }
      } catch (error) {
        console.error('Auto-scan failed:', error);
      }
    };

    initializeLibrary();
  }, [loadLibrary]);

  // Check if we're in 3D shelf mode
  const is3DShelfMode = viewMode === '3d-shelf';

  return (
    <div className="w-full h-full relative bg-void-black">
      {/* Background 3D Scene - only show when NOT in 3D shelf mode */}
      {enableParticles && !is3DShelfMode && (
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
                enableBloom={enable3DEffects}
                enableChromaticAberration={enable3DEffects}
                enableVignette={enable3DEffects}
                enableNoise={enable3DEffects}
                bloomIntensity={1.2}
              >
                <NeonGrid
                  position={[0, 0, 0]}
                  size={150}
                  gridSize={2}
                  fadeDistance={50}
                  speed={0.3}
                  glowIntensity={1.5}
                />
                <ParticleField
                  count={150}
                  areaSize={40}
                  particleSize={0.08}
                  color="#00f5ff"
                  secondaryColor="#ff00ff"
                  speed={0.4}
                  opacity={0.7}
                />
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
    </div>
  );
}

export default App;
