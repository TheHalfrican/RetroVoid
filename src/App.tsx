import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { MainLayout } from './components/layout';
import { Sidebar, TopBar, GameGrid, GameDetail, SettingsPanel, FullSettingsWindow } from './components/ui';
import { useLibraryStore, useSettingsStore } from './stores';

function App() {
  const { loadLibrary } = useLibraryStore();
  const { enableParticles } = useSettingsStore();

  // Load library on mount
  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  return (
    <div className="w-full h-full relative">
      {/* Background 3D Scene */}
      {enableParticles && (
        <div className="absolute inset-0 pointer-events-none">
          <Canvas camera={{ position: [0, 0, 1], fov: 75 }}>
            <color attach="background" args={['#0a0a0f']} />
            <Stars
              radius={100}
              depth={50}
              count={2000}
              factor={4}
              saturation={0}
              fade
              speed={0.5}
            />
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
