import { useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { MainLayout } from './components/layout';
import { Sidebar, TopBar, GameGrid, GameDetail, SettingsPanel, FullSettingsWindow } from './components/ui';
import { useLibraryStore, useSettingsStore } from './stores';
import { CyberpunkEnvironment, NeonGrid } from './components/three';

function App() {
  const { loadLibrary } = useLibraryStore();
  const { enableParticles, enable3DEffects } = useSettingsStore();

  // Load library on mount
  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  return (
    <div className="w-full h-full relative">
      {/* Background 3D Scene */}
      {enableParticles && (
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
                <Stars
                  radius={100}
                  depth={50}
                  count={2000}
                  factor={4}
                  saturation={0.3}
                  fade
                  speed={0.3}
                />
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
          <GameGrid />
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
