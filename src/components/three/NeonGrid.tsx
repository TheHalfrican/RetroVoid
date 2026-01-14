import { useRef, useMemo } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';

// Custom shader material for the neon grid
const NeonGridMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uColor1: new THREE.Color('#00f5ff'),
    uColor2: new THREE.Color('#ff00ff'),
    uGridSize: 2.0,
    uLineWidth: 0.03,
    uFadeDistance: 40.0,
    uSpeed: 0.5,
    uGlowIntensity: 1.5,
  },
  // Vertex shader
  `
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  // Fragment shader
  `
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform float uGridSize;
    uniform float uLineWidth;
    uniform float uFadeDistance;
    uniform float uSpeed;
    uniform float uGlowIntensity;

    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      // Calculate grid lines
      vec2 worldUv = vWorldPosition.xz;

      // Animate grid movement
      worldUv.y += uTime * uSpeed;

      // Grid pattern
      vec2 grid = abs(fract(worldUv / uGridSize - 0.5) - 0.5) / fwidth(worldUv / uGridSize);
      float line = min(grid.x, grid.y);

      // Create line with glow
      float lineIntensity = 1.0 - min(line, 1.0);
      lineIntensity = pow(lineIntensity, 1.5) * uGlowIntensity;

      // Add thicker lines every 5 units
      vec2 majorGrid = abs(fract(worldUv / (uGridSize * 5.0) - 0.5) - 0.5) / fwidth(worldUv / (uGridSize * 5.0));
      float majorLine = min(majorGrid.x, majorGrid.y);
      float majorLineIntensity = 1.0 - min(majorLine, 1.0);
      majorLineIntensity = pow(majorLineIntensity, 1.2) * uGlowIntensity * 1.5;

      // Combine lines
      lineIntensity = max(lineIntensity, majorLineIntensity);

      // Distance fade
      float dist = length(vWorldPosition.xz);
      float fade = 1.0 - smoothstep(0.0, uFadeDistance, dist);

      // Color gradient based on distance
      float colorMix = sin(dist * 0.1 + uTime * 0.5) * 0.5 + 0.5;
      vec3 color = mix(uColor1, uColor2, colorMix);

      // Pulse effect on major lines
      float pulse = sin(uTime * 2.0 - dist * 0.2) * 0.3 + 0.7;

      // Final color with fade and pulse
      vec3 finalColor = color * lineIntensity * fade * pulse;

      // Add subtle glow around lines
      float glow = lineIntensity * 0.5 * fade;
      finalColor += color * glow * 0.3;

      gl_FragColor = vec4(finalColor, lineIntensity * fade * 0.9);
    }
  `
);

// Extend Three.js with our custom material
extend({ NeonGridMaterial: NeonGridMaterialImpl });

// TypeScript declaration for the custom material instance
type NeonGridMaterialType = THREE.ShaderMaterial & {
  uTime: number;
  uColor1: THREE.Color;
  uColor2: THREE.Color;
  uGridSize: number;
  uLineWidth: number;
  uFadeDistance: number;
  uSpeed: number;
  uGlowIntensity: number;
};

// Augment ThreeElements to include our custom material
declare module '@react-three/fiber' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ThreeElements {
    // Custom shader materials require any type due to dynamic props
    neonGridMaterial: any;
  }
}

interface NeonGridProps {
  size?: number;
  gridSize?: number;
  color1?: string;
  color2?: string;
  fadeDistance?: number;
  speed?: number;
  glowIntensity?: number;
  position?: [number, number, number];
}

/**
 * NeonGrid - Infinite cyberpunk grid floor with animated neon lines
 *
 * Features:
 * - Animated scrolling grid effect
 * - Dual-color gradient
 * - Distance-based fade
 * - Major/minor grid lines
 * - Pulsing glow effect
 */
export function NeonGrid({
  size = 100,
  gridSize = 2.0,
  color1 = '#00f5ff',
  color2 = '#ff00ff',
  fadeDistance = 40,
  speed = 0.5,
  glowIntensity = 1.5,
  position = [0, 0, 0]
}: NeonGridProps) {
  const materialRef = useRef<NeonGridMaterialType>(null);

  // Memoize colors to prevent recreation
  const colors = useMemo(() => ({
    color1: new THREE.Color(color1),
    color2: new THREE.Color(color2)
  }), [color1, color2]);

  // Animate the grid
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
  });

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={position}
    >
      <planeGeometry args={[size, size, 1, 1]} />
      <neonGridMaterial
        ref={materialRef}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        uColor1={colors.color1}
        uColor2={colors.color2}
        uGridSize={gridSize}
        uFadeDistance={fadeDistance}
        uSpeed={speed}
        uGlowIntensity={glowIntensity}
      />
    </mesh>
  );
}

/**
 * NeonGridReflection - Optional reflection plane below the grid
 * Creates a mirror effect for objects above the grid
 */
export function NeonGridReflection({
  position = [0, -0.01, 0],
  opacity = 0.1
}: {
  position?: [number, number, number];
  opacity?: number;
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position}>
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial
        color="#0a0a0f"
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default NeonGrid;
