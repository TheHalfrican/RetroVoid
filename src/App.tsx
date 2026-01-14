import { useEffect, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { MainLayout } from './components/layout';
import { Sidebar, TopBar, GameGrid, GameDetail, SettingsPanel, FullSettingsWindow } from './components/ui';
import { useLibraryStore, useSettingsStore } from './stores';
import { CyberpunkEnvironment, NeonGrid } from './components/three';
import * as THREE from 'three';

// Rotating starfield wrapper
function RotatingStars() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Slow rotation on Y axis
      groupRef.current.rotation.y += delta * 0.05;
      // Slight tilt rotation on X axis
      groupRef.current.rotation.x += delta * 0.01;
    }
  });

  return (
    <group ref={groupRef}>
      <Stars
        radius={100}
        depth={50}
        count={3000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />
    </group>
  );
}

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
