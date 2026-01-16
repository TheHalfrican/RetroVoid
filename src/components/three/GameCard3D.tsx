import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useFrame, extend, useThree } from '@react-three/fiber';
import { Float, Text, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { Game } from '../../types';
import { platformIconMap } from '../../utils/platformIcons';
import { useUIStore } from '../../stores';

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
  const groupRef = useRef<THREE.Group>(null);
  const dragGroupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  const [textureError, setTextureError] = useState(false);
  const { coverVersions } = useUIStore();
  const coverVersion = coverVersions[game.id] || 0;

  // Get Three.js context for raycasting
  const { camera, size } = useThree();

  // Parallax mouse position (normalized -0.5 to 0.5)
  const mousePos = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0, y: 0 });

  // Drag and rubberband state
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const targetOffset = useRef({ x: 0, y: 0 });
  const wasClick = useRef(true);

  // Raycasting objects for exact mouse following
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const intersectPoint = useMemo(() => new THREE.Vector3(), []);

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

    // Convert file path to asset:// URL for Tauri webview, with cache buster
    const textureUrl = `${convertFileSrc(game.coverArtPath)}?v=${coverVersion}`;

    loader.load(
      textureUrl,
      (tex) => {
        // Use trilinear filtering with mipmaps for sharp textures at any distance/angle
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        // Anisotropic filtering for sharp textures when viewed at oblique angles (parallax tilt)
        tex.anisotropy = 16;
        // Correct color space for cover art
        tex.colorSpace = THREE.SRGBColorSpace;
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
  }, [game.coverArtPath, textureError, coverVersion]);

  // Glow color
  const glowColorObj = useMemo(() => new THREE.Color(glowColor), [glowColor]);

  // Platform icon texture
  const [platformIconTexture, setPlatformIconTexture] = useState<THREE.Texture | null>(null);
  const [platformIconAspect, setPlatformIconAspect] = useState(2.5); // Default aspect ratio

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
        // Use trilinear filtering with mipmaps for sharp icons at any distance/angle
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        // Anisotropic filtering for sharp textures when viewed at oblique angles
        tex.anisotropy = 16;
        // Correct color space for icons
        tex.colorSpace = THREE.SRGBColorSpace;
        loadedTex = tex;

        // Detect aspect ratio from image dimensions
        if (tex.image) {
          const imgAspect = tex.image.width / tex.image.height;
          setPlatformIconAspect(imgAspect);
        }

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

  // Animate shader uniforms, parallax effect, and rubberband
  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;

      // Smooth hover transition
      const targetHover = hovered || isSelected ? 1 : 0;
      materialRef.current.uHover += (targetHover - materialRef.current.uHover) * delta * 5;
    }

    // Parallax rotation based on mouse position (disabled while dragging)
    if (groupRef.current) {
      if (isDragging.current) {
        // Keep card flat while dragging
        targetRotation.current.x = 0;
        targetRotation.current.y = 0;
      } else if (hovered) {
        // Calculate target rotation from mouse position (intensified)
        targetRotation.current.x = -mousePos.current.y * 0.8; // Tilt up/down
        targetRotation.current.y = mousePos.current.x * 0.8;  // Tilt left/right
      } else {
        // Reset to neutral when not hovered
        targetRotation.current.x = 0;
        targetRotation.current.y = 0;
      }

      // Smooth interpolation
      groupRef.current.rotation.x += (targetRotation.current.x - groupRef.current.rotation.x) * delta * 10;
      groupRef.current.rotation.y += (targetRotation.current.y - groupRef.current.rotation.y) * delta * 10;
    }

    // Rubberband animation for drag offset
    if (dragGroupRef.current) {
      // Spring physics - snap back to origin when not dragging
      if (!isDragging.current) {
        targetOffset.current.x = 0;
        targetOffset.current.y = 0;
      }

      // Smooth spring interpolation
      const springStrength = isDragging.current ? 15 : 8; // Faster follow when dragging, springy return
      dragOffset.current.x += (targetOffset.current.x - dragOffset.current.x) * delta * springStrength;
      dragOffset.current.y += (targetOffset.current.y - dragOffset.current.y) * delta * springStrength;

      dragGroupRef.current.position.x = dragOffset.current.x;
      dragGroupRef.current.position.y = dragOffset.current.y;
    }
  });

  const handlePointerOver = () => {
    setHovered(true);
    document.body.style.cursor = 'pointer';
    onHover?.(game);
  };

  const handlePointerOut = () => {
    // Don't end drag on pointer out - only on pointer up
    // This allows dragging the card away from where the mouse started
    if (!isDragging.current) {
      setHovered(false);
      document.body.style.cursor = 'auto';
      onHover?.(null);
      mousePos.current = { x: 0, y: 0 };
    }
  };

  // Helper to convert screen coords to normalized device coords
  const screenToNDC = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX / size.width) * 2 - 1,
      y: -(screenY / size.height) * 2 + 1
    };
  }, [size]);

  // Helper to raycast from screen position to a plane at given Z
  const getWorldPosAtZ = useCallback((screenX: number, screenY: number, zDepth: number) => {
    const ndc = screenToNDC(screenX, screenY);
    raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);

    // Set plane at the card's Z depth
    dragPlane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, zDepth)
    );

    raycaster.ray.intersectPlane(dragPlane, intersectPoint);
    return intersectPoint.clone();
  }, [camera, raycaster, dragPlane, intersectPoint, screenToNDC]);

  const handlePointerDown = (e: THREE.Event) => {
    const event = e as unknown as { stopPropagation: () => void; point: THREE.Vector3; nativeEvent: PointerEvent };
    event.stopPropagation();
    isDragging.current = true;
    wasClick.current = true;
    document.body.style.cursor = 'grabbing';

    const startScreenX = event.nativeEvent.clientX;
    const startScreenY = event.nativeEvent.clientY;

    // Get the Z depth of where we clicked for consistent raycasting
    const clickZ = event.point.z;

    // Get initial mouse position in world space
    const initialMouseWorld = getWorldPosAtZ(startScreenX, startScreenY, clickZ);

    // Store the current offset so we can add to it
    const initialOffsetX = targetOffset.current.x;
    const initialOffsetY = targetOffset.current.y;

    // Add global listeners for pointer up and move
    const handleGlobalPointerUp = () => {
      if (isDragging.current && wasClick.current) {
        onClick?.(game);
      }
      isDragging.current = false;
      setHovered(false);
      document.body.style.cursor = 'auto';
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointermove', handleGlobalPointerMove);
    };

    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;

      // Check if we've moved enough to count as a drag
      const screenDeltaX = e.clientX - startScreenX;
      const screenDeltaY = e.clientY - startScreenY;
      if (Math.abs(screenDeltaX) > 5 || Math.abs(screenDeltaY) > 5) {
        wasClick.current = false;
      }

      // Get current mouse position in world space at same Z depth
      const currentMouseWorld = getWorldPosAtZ(e.clientX, e.clientY, clickZ);

      // Calculate delta from initial mouse position
      const deltaX = currentMouseWorld.x - initialMouseWorld.x;
      const deltaY = currentMouseWorld.y - initialMouseWorld.y;

      // Add delta to initial offset
      targetOffset.current.x = initialOffsetX + deltaX;
      targetOffset.current.y = initialOffsetY + deltaY;

      // Keep card flat while dragging
      mousePos.current.x = 0;
      mousePos.current.y = 0;
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointermove', handleGlobalPointerMove);
  };

  const handlePointerUp = () => {
    // Handled by global listener now
  };

  const handlePointerMove = (e: THREE.Event) => {
    // Only handle hover parallax here - drag is handled by global listener
    if (!isDragging.current && hovered) {
      const uv = (e as any).uv;
      if (uv) {
        mousePos.current.x = uv.x - 0.5;
        mousePos.current.y = uv.y - 0.5;
      }
    }
  };

  return (
    <Float
      speed={2}
      rotationIntensity={0.2 * floatIntensity}
      floatIntensity={0.5 * floatIntensity}
      floatingRange={[-0.1, 0.1]}
    >
      <group position={position} rotation={rotation as any}>
        {/* Drag offset group for rubberband effect */}
        <group ref={dragGroupRef}>
          {/* Parallax rotation group */}
          <group ref={groupRef}>
            {/* Main card mesh */}
            <mesh
              ref={meshRef}
              onPointerOver={handlePointerOver}
              onPointerOut={handlePointerOut}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerMove={handlePointerMove}
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

          {/* Subtle glow behind card (only visible on hover/select) */}
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[cardWidth + 0.2, cardHeight + 0.2]} />
            <meshBasicMaterial
              color={glowColor}
              transparent
              opacity={hovered || isSelected ? 0.2 : 0}
            />
          </mesh>

          {/* Platform logo badge (upper-right corner) */}
          {platformIconTexture && (() => {
            // Calculate badge dimensions based on actual logo aspect ratio
            const badgeHeight = 0.22 * scale;
            const badgeWidth = badgeHeight * platformIconAspect;
            const padding = 0.05 * scale;

            return (
              <group position={[cardWidth / 2 - badgeWidth / 2 - padding, cardHeight / 2 - badgeHeight / 2 - padding, 0.02]}>
                {/* Badge border glow - furthest back, larger */}
                <mesh position={[0, 0, -0.01]}>
                  <planeGeometry args={[badgeWidth + 0.1 * scale, badgeHeight + 0.13 * scale]} />
                  <meshBasicMaterial
                    color={glowColor}
                    transparent
                    opacity={hovered ? 0.5 : 0.25}
                  />
                </mesh>
                {/* Badge background - middle layer, covers glow center */}
                <mesh position={[0, 0, -0.005]}>
                  <planeGeometry args={[badgeWidth + 0.05 * scale, badgeHeight + 0.08 * scale]} />
                  <meshBasicMaterial
                    color="#1a1025"
                    transparent
                    opacity={0.95}
                  />
                </mesh>
                {/* Platform logo - front layer */}
                <mesh position={[0, 0, 0]}>
                  <planeGeometry args={[badgeWidth, badgeHeight]} />
                  <meshBasicMaterial
                    map={platformIconTexture}
                    transparent
                    opacity={hovered ? 1 : 0.9}
                  />
                </mesh>
              </group>
            );
          })()}
        </group>

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
