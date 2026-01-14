import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  Noise
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

interface CyberpunkEnvironmentProps {
  enableBloom?: boolean;
  enableChromaticAberration?: boolean;
  enableVignette?: boolean;
  enableNoise?: boolean;
  bloomIntensity?: number;
  bloomThreshold?: number;
  chromaticAberrationOffset?: number;
  children?: React.ReactNode;
}

/**
 * CyberpunkEnvironment - Scene wrapper with cyberpunk lighting and post-processing
 *
 * Sets up:
 * - Ambient and point lighting with neon colors
 * - Fog for depth
 * - Post-processing effects (Bloom, ChromaticAberration, Vignette, Noise)
 */
export function CyberpunkEnvironment({
  enableBloom = true,
  enableChromaticAberration = true,
  enableVignette = true,
  enableNoise = true,
  bloomIntensity = 1.5,
  bloomThreshold = 0.2,
  chromaticAberrationOffset = 0.002,
  children
}: CyberpunkEnvironmentProps) {
  const { scene } = useThree();
  const lightRef1 = useRef<THREE.PointLight>(null);
  const lightRef2 = useRef<THREE.PointLight>(null);

  // Set scene background and fog
  scene.background = new THREE.Color('#0a0a0f');
  scene.fog = new THREE.Fog('#0a0a0f', 10, 80);

  // Animate lights for subtle movement
  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (lightRef1.current) {
      lightRef1.current.position.x = Math.sin(t * 0.3) * 15;
      lightRef1.current.position.z = Math.cos(t * 0.3) * 15;
      lightRef1.current.intensity = 1.5 + Math.sin(t * 2) * 0.3;
    }

    if (lightRef2.current) {
      lightRef2.current.position.x = Math.cos(t * 0.2) * 12;
      lightRef2.current.position.z = Math.sin(t * 0.2) * 12;
      lightRef2.current.intensity = 1.2 + Math.cos(t * 1.5) * 0.2;
    }
  });

  return (
    <>
      {/* Ambient light for base illumination */}
      <ambientLight intensity={0.15} color="#1a1025" />

      {/* Main neon cyan light */}
      <pointLight
        ref={lightRef1}
        position={[10, 8, 10]}
        color="#00f5ff"
        intensity={1.5}
        distance={50}
        decay={2}
      />

      {/* Secondary neon magenta light */}
      <pointLight
        ref={lightRef2}
        position={[-10, 6, -10]}
        color="#ff00ff"
        intensity={1.2}
        distance={40}
        decay={2}
      />

      {/* Accent orange light from below */}
      <pointLight
        position={[0, -5, 0]}
        color="#ff6b35"
        intensity={0.5}
        distance={30}
        decay={2}
      />

      {/* Directional light for overall scene */}
      <directionalLight
        position={[5, 10, 5]}
        color="#4d7cff"
        intensity={0.3}
      />

      {/* Scene children */}
      {children}

      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom
          intensity={enableBloom ? bloomIntensity : 0}
          luminanceThreshold={bloomThreshold}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={enableChromaticAberration ? new THREE.Vector2(chromaticAberrationOffset, chromaticAberrationOffset) : new THREE.Vector2(0, 0)}
          radialModulation={false}
          modulationOffset={0.5}
        />
        <Vignette
          offset={0.3}
          darkness={enableVignette ? 0.7 : 0}
          blendFunction={BlendFunction.NORMAL}
        />
        <Noise
          premultiply
          blendFunction={BlendFunction.ADD}
          opacity={enableNoise ? 0.02 : 0}
        />
      </EffectComposer>
    </>
  );
}

export default CyberpunkEnvironment;
