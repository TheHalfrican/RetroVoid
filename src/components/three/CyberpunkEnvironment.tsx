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
  vignetteDarkness?: number;
  noiseOpacity?: number;
  // Theme-aware colors
  backgroundColor?: string;
  primaryLightColor?: string;
  secondaryLightColor?: string;
  accentLightColor?: string;
  children?: React.ReactNode;
}

/**
 * CyberpunkEnvironment - Scene wrapper with lighting and post-processing
 *
 * Sets up:
 * - Ambient and point lighting (colors depend on theme)
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
  vignetteDarkness = 0.7,
  noiseOpacity = 0.02,
  backgroundColor = '#0a0a0f',
  primaryLightColor = '#00f5ff',
  secondaryLightColor = '#ff00ff',
  accentLightColor = '#ff6b35',
  children
}: CyberpunkEnvironmentProps) {
  const { scene } = useThree();
  const lightRef1 = useRef<THREE.PointLight>(null);
  const lightRef2 = useRef<THREE.PointLight>(null);

  // Set scene background and fog
  scene.background = new THREE.Color(backgroundColor);
  scene.fog = new THREE.Fog(backgroundColor, 10, 80);

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
      <ambientLight intensity={0.2} color={backgroundColor} />

      {/* Main primary light */}
      <pointLight
        ref={lightRef1}
        position={[10, 8, 10]}
        color={primaryLightColor}
        intensity={1.5}
        distance={50}
        decay={2}
      />

      {/* Secondary light */}
      <pointLight
        ref={lightRef2}
        position={[-10, 6, -10]}
        color={secondaryLightColor}
        intensity={1.2}
        distance={40}
        decay={2}
      />

      {/* Accent light from below */}
      <pointLight
        position={[0, -5, 0]}
        color={accentLightColor}
        intensity={0.5}
        distance={30}
        decay={2}
      />

      {/* Directional light for overall scene illumination */}
      <directionalLight
        position={[5, 10, 5]}
        color="#ffffff"
        intensity={0.4}
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
          darkness={enableVignette ? vignetteDarkness : 0}
          blendFunction={BlendFunction.NORMAL}
        />
        <Noise
          premultiply
          blendFunction={BlendFunction.ADD}
          opacity={enableNoise ? noiseOpacity : 0}
        />
      </EffectComposer>
    </>
  );
}

export default CyberpunkEnvironment;
