import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { Float, Text, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { Game } from '../../types';
import { platformIconMap } from '../../utils/platformIcons';

// Import all platform icons using Vite's glob import
const platformIconModules = import.meta.glob<{ default: string }>(
  '../../assets/platforms/*.png',
  { eager: true }
);

// Create a lookup map from platform ID to icon URL
const platformIconUrls: Record<string, string> = {};
for (const [path, module] of Object.entries(platformIconModules)) {
  // Extract filename from path (e.g., '../../assets/platforms/Nintendo - NES.png' -> 'Nintendo - NES.png')
  const filename = path.split('/').pop();
  if (filename) {
    // Find the platform ID that maps to this filename
    for (const [platformId, iconFilename] of Object.entries(platformIconMap)) {
      if (iconFilename === filename) {
        platformIconUrls[platformId] = module.default;
        break;
      }
    }
  }
}

// Holographic shader material for the card
const HologramCardMaterial = shaderMaterial(
  {
    uTime: 0,
    uTexture: null,
    uHover: 0,
    uScanlineIntensity: 0.08,
    uShimmerIntensity: 0.15,
    uEdgeGlow: 0.3,
    uGlowColor: new THREE.Color('#00f5ff'),
  },
  // Vertex shader
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment shader
  `
    uniform float uTime;
    uniform sampler2D uTexture;
    uniform float uHover;
    uniform float uScanlineIntensity;
    uniform float uShimmerIntensity;
    uniform float uEdgeGlow;
    uniform vec3 uGlowColor;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      // Sample the cover texture
      vec4 texColor = texture2D(uTexture, vUv);

      // Scanlines effect
      float scanline = sin(vUv.y * 200.0 + uTime * 3.0) * 0.5 + 0.5;
      scanline = pow(scanline, 2.0) * uScanlineIntensity;

      // Holographic shimmer
      float shimmer = sin(vUv.x * 20.0 + vUv.y * 20.0 + uTime * 2.0) * 0.5 + 0.5;
      shimmer *= uShimmerIntensity * (0.5 + uHover * 0.5);

      // Fresnel edge glow
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = 1.0 - abs(dot(viewDir, vNormal));
      fresnel = pow(fresnel, 2.0) * uEdgeGlow * (1.0 + uHover);

      // Combine effects
      vec3 finalColor = texColor.rgb;

      // Add scanlines (darken)
      finalColor -= vec3(scanline);

      // Add shimmer (holographic color shift)
      vec3 shimmerColor = mix(uGlowColor, vec3(1.0, 0.0, 1.0), sin(uTime + vUv.x * 5.0) * 0.5 + 0.5);
      finalColor += shimmerColor * shimmer;

      // Add edge glow
      finalColor += uGlowColor * fresnel;

      // Hover brightening
      finalColor += vec3(0.1) * uHover;

      gl_FragColor = vec4(finalColor, texColor.a);
    }
  `
);

// Extend Three.js with our custom material
extend({ HologramCardMaterial });

// TypeScript declaration
declare module '@react-three/fiber' {
  interface ThreeElements {
    hologramCardMaterial: any;
  }
}

interface GameCard3DProps {
  game: Game;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  onClick?: (game: Game) => void;
  onHover?: (game: Game | null) => void;
  isSelected?: boolean;
  floatIntensity?: number;
  glowColor?: string;
}

/**
 * GameCard3D - Holographic floating game card with cover art
 *
 * Features:
 * - Cover art texture with holographic shader effects
 * - Scanlines and shimmer animation
 * - Fresnel edge glow
 * - Hover state with rotation toward camera
 * - Floating animation
 * - Click to select
 */
export function GameCard3D({
  game,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  onClick,
  onHover,
  isSelected = false,
  floatIntensity = 1,
  glowColor = '#00f5ff'
}: GameCard3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  const [textureError, setTextureError] = useState(false);

  // Card dimensions (standard game cover aspect ratio ~0.7)
  const cardWidth = 2 * scale;
  const cardHeight = 2.8 * scale;

  // Texture state
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  // Load cover texture in useEffect to avoid side effects during render
  useEffect(() => {
    if (!game.coverArtPath || textureError) {
      setTexture(null);
      return;
    }

    let loadedTex: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();

    // Convert file path to asset:// URL for Tauri webview
    const textureUrl = convertFileSrc(game.coverArtPath);

    loader.load(
      textureUrl,
      (tex) => {
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        loadedTex = tex;
        setTexture(tex);
      },
      undefined,
      () => {
        setTextureError(true);
        setTexture(null);
      }
    );

    return () => {
      // Cleanup texture on unmount
      if (loadedTex) {
        loadedTex.dispose();
      }
    };
  }, [game.coverArtPath, textureError]);

  // Glow color
  const glowColorObj = useMemo(() => new THREE.Color(glowColor), [glowColor]);

  // Platform icon texture
  const [platformIconTexture, setPlatformIconTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const iconUrl = platformIconUrls[game.platformId];
    if (!iconUrl) {
      setPlatformIconTexture(null);
      return;
    }

    let loadedTex: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();

    loader.load(
      iconUrl,
      (tex) => {
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        loadedTex = tex;
        setPlatformIconTexture(tex);
      },
      undefined,
      () => {
        setPlatformIconTexture(null);
      }
    );

    return () => {
      if (loadedTex) {
        loadedTex.dispose();
      }
    };
  }, [game.platformId]);

  // Animate shader uniforms and hover effects
  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;

      // Smooth hover transition
      const targetHover = hovered || isSelected ? 1 : 0;
      materialRef.current.uHover += (targetHover - materialRef.current.uHover) * delta * 5;
    }

    // Subtle rotation toward camera on hover, reset when not hovered
    if (meshRef.current) {
      const targetRotY = hovered ? Math.sin(state.clock.elapsedTime * 2) * 0.05 : 0;
      meshRef.current.rotation.y += (targetRotY - meshRef.current.rotation.y) * delta * 3;
    }
  });

  const handlePointerOver = () => {
    setHovered(true);
    document.body.style.cursor = 'pointer';
    onHover?.(game);
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = 'auto';
    onHover?.(null);
  };

  const handleClick = () => {
    onClick?.(game);
  };

  return (
    <Float
      speed={2}
      rotationIntensity={0.2 * floatIntensity}
      floatIntensity={0.5 * floatIntensity}
      floatingRange={[-0.1, 0.1]}
    >
      <group position={position} rotation={rotation as any}>
        {/* Main card mesh */}
        <mesh
          ref={meshRef}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        >
          <planeGeometry args={[cardWidth, cardHeight]} />
          {texture ? (
            <hologramCardMaterial
              ref={materialRef}
              uTexture={texture}
              uGlowColor={glowColorObj}
              transparent
              side={THREE.DoubleSide}
            />
          ) : (
            <meshStandardMaterial
              color="#1a1025"
              emissive={glowColor}
              emissiveIntensity={hovered ? 0.3 : 0.1}
              transparent
              opacity={0.9}
            />
          )}
        </mesh>

        {/* Card border/frame */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[cardWidth + 0.1, cardHeight + 0.1]} />
          <meshBasicMaterial
            color={glowColor}
            transparent
            opacity={hovered || isSelected ? 0.4 : 0.15}
          />
        </mesh>

        {/* Platform logo badge (upper-right corner) */}
        {platformIconTexture && (
          <group position={[cardWidth / 2 - 0.35 * scale, cardHeight / 2 - 0.2 * scale, 0.02]}>
            {/* Badge border glow - furthest back, larger */}
            <mesh position={[0, 0, -0.01]}>
              <planeGeometry args={[0.65 * scale, 0.35 * scale]} />
              <meshBasicMaterial
                color={glowColor}
                transparent
                opacity={hovered ? 0.5 : 0.25}
              />
            </mesh>
            {/* Badge background - middle layer, covers glow center */}
            <mesh position={[0, 0, -0.005]}>
              <planeGeometry args={[0.6 * scale, 0.3 * scale]} />
              <meshBasicMaterial
                color="#1a1025"
                transparent
                opacity={0.95}
              />
            </mesh>
            {/* Platform logo - front layer */}
            <mesh position={[0, 0, 0]}>
              <planeGeometry args={[0.55 * scale, 0.22 * scale]} />
              <meshBasicMaterial
                map={platformIconTexture}
                transparent
                opacity={hovered ? 1 : 0.9}
              />
            </mesh>
          </group>
        )}

        {/* Title text below card */}
        <Text
          position={[0, -cardHeight / 2 - 0.25, 0]}
          fontSize={0.15 * scale}
          color="white"
          anchorX="center"
          anchorY="top"
          maxWidth={cardWidth}
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          {game.title}
        </Text>

        {/* Selection glow ring */}
        {isSelected && (
          <mesh position={[0, 0, -0.02]}>
            <ringGeometry args={[cardWidth * 0.7, cardWidth * 0.75, 32]} />
            <meshBasicMaterial
              color={glowColor}
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>
    </Float>
  );
}

/**
 * GameCardPlaceholder - Simple placeholder card when no texture
 */
export function GameCardPlaceholder({
  position = [0, 0, 0],
  scale = 1,
  color = '#00f5ff'
}: {
  position?: [number, number, number];
  scale?: number;
  color?: string;
}) {
  const cardWidth = 2 * scale;
  const cardHeight = 2.8 * scale;

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <group position={position}>
        <mesh>
          <planeGeometry args={[cardWidth, cardHeight]} />
          <meshStandardMaterial
            color="#1a1025"
            emissive={color}
            emissiveIntensity={0.2}
            transparent
            opacity={0.9}
          />
        </mesh>
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[cardWidth + 0.1, cardHeight + 0.1]} />
          <meshBasicMaterial color={color} transparent opacity={0.2} />
        </mesh>
      </group>
    </Float>
  );
}

export default GameCard3D;
