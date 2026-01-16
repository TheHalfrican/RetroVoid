import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { GameCard3D } from './GameCard3D';
import { platformIconMap } from '../../utils/platformIcons';
import type { Game, Platform } from '../../types';
import type { ThemeConfig } from '../../config/themes';
import { useBarrelDistortionCorrection } from '../../hooks/useBarrelDistortionCorrection';
export { BarrelDistortionPointerCorrection } from './BarrelDistortionPointerCorrection';

// Import all platform icons using Vite's glob import
const platformIconModules = import.meta.glob<{ default: string }>(
  '../../assets/platforms/*.png',
  { eager: true }
);

// Create a lookup map from platform ID to icon URL
const platformIconUrls: Record<string, string> = {};
for (const [path, module] of Object.entries(platformIconModules)) {
  const filename = path.split('/').pop();
  if (filename) {
    for (const [platformId, iconFilename] of Object.entries(platformIconMap)) {
      if (iconFilename === filename) {
        platformIconUrls[platformId] = module.default;
        break;
      }
    }
  }
}

interface PlatformShelf {
  platform: Platform;
  games: Game[];
}

interface HolographicShelfProps {
  platformShelves: PlatformShelf[];
  onGameClick?: (game: Game) => void;
  onGameHover?: (game: Game | null) => void;
  selectedGameId?: string | null;
  cardSpacing?: number;
  shelfSpacing?: number;
  themeScene?: ThemeConfig['scene'];
}

/**
 * PlatformLogo3D - Floating platform logo with parallax effect
 */
function PlatformLogo3D({
  platformId,
  position,
  color,
  scale = 1,
  maxHeight = 1.0
}: {
  platformId: string;
  position: [number, number, number];
  color: string;
  scale?: number;
  maxHeight?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const dragGroupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [aspectRatio, setAspectRatio] = useState(2.5); // Default aspect ratio
  const [hovered, setHovered] = useState(false);

  // Get Three.js context for raycasting
  const { camera, size } = useThree();

  // Barrel distortion correction for accurate mouse interaction
  const correctCoordinates = useBarrelDistortionCorrection();

  // Parallax mouse position
  const mousePos = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0, y: 0 });

  // Drag and rubberband state
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const targetOffset = useRef({ x: 0, y: 0 });

  // Raycasting objects for exact mouse following
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const intersectPoint = useMemo(() => new THREE.Vector3(), []);

  // Load platform icon texture and detect aspect ratio
  useEffect(() => {
    const iconUrl = platformIconUrls[platformId];
    if (!iconUrl) {
      setTexture(null);
      return;
    }

    let loadedTex: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();

    loader.load(
      iconUrl,
      (tex) => {
        // Use trilinear filtering with mipmaps for sharp logos at any distance/angle
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        // Anisotropic filtering for sharp textures when viewed at oblique angles
        tex.anisotropy = 16;
        // Correct color space for logos
        tex.colorSpace = THREE.SRGBColorSpace;
        loadedTex = tex;

        // Get actual image dimensions for aspect ratio
        if (tex.image) {
          const imgAspect = tex.image.width / tex.image.height;
          setAspectRatio(imgAspect);
        }

        setTexture(tex);
      },
      undefined,
      () => setTexture(null)
    );

    return () => {
      if (loadedTex) loadedTex.dispose();
    };
  }, [platformId]);

  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  // Animate parallax effect and rubberband
  useFrame((_, delta) => {
    if (groupRef.current) {
      if (isDragging.current) {
        // Keep logo flat while dragging
        targetRotation.current.x = 0;
        targetRotation.current.y = 0;
      } else if (hovered) {
        targetRotation.current.x = -mousePos.current.y * 0.6;
        targetRotation.current.y = mousePos.current.x * 0.6;
      } else {
        targetRotation.current.x = 0;
        targetRotation.current.y = 0;
      }

      groupRef.current.rotation.x += (targetRotation.current.x - groupRef.current.rotation.x) * delta * 10;
      groupRef.current.rotation.y += (targetRotation.current.y - groupRef.current.rotation.y) * delta * 10;
    }

    // Rubberband animation for drag offset
    if (dragGroupRef.current) {
      if (!isDragging.current) {
        targetOffset.current.x = 0;
        targetOffset.current.y = 0;
      }

      const springStrength = isDragging.current ? 15 : 8;
      dragOffset.current.x += (targetOffset.current.x - dragOffset.current.x) * delta * springStrength;
      dragOffset.current.y += (targetOffset.current.y - dragOffset.current.y) * delta * springStrength;

      dragGroupRef.current.position.x = dragOffset.current.x;
      dragGroupRef.current.position.y = dragOffset.current.y;
    }
  });

  // Helper to convert screen coords to normalized device coords with barrel distortion correction
  const screenToNDC = useCallback((screenX: number, screenY: number) => {
    const rawNdc = {
      x: (screenX / size.width) * 2 - 1,
      y: -(screenY / size.height) * 2 + 1
    };
    // Apply inverse barrel distortion to correct for visual warping
    return correctCoordinates(rawNdc.x, rawNdc.y);
  }, [size, correctCoordinates]);

  // Helper to raycast from screen position to a plane at given Z
  const getWorldPosAtZ = useCallback((screenX: number, screenY: number, zDepth: number) => {
    const ndc = screenToNDC(screenX, screenY);
    raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);

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
      isDragging.current = false;
      setHovered(false);
      document.body.style.cursor = 'auto';
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointermove', handleGlobalPointerMove);
    };

    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;

      // Get current mouse position in world space at same Z depth
      const currentMouseWorld = getWorldPosAtZ(e.clientX, e.clientY, clickZ);

      // Calculate delta from initial mouse position
      const deltaX = currentMouseWorld.x - initialMouseWorld.x;
      const deltaY = currentMouseWorld.y - initialMouseWorld.y;

      // Add delta to initial offset
      targetOffset.current.x = initialOffsetX + deltaX;
      targetOffset.current.y = initialOffsetY + deltaY;

      // Keep logo flat while dragging
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
    // Only handle hover parallax here, drag is handled globally
    if (!isDragging.current && hovered) {
      const uv = (e as any).uv;
      if (uv) {
        mousePos.current.x = uv.x - 0.5;
        mousePos.current.y = uv.y - 0.5;
      }
    }
  };

  const handlePointerOver = () => {
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    // Don't end drag on pointer out - only on pointer up
    if (!isDragging.current) {
      setHovered(false);
      document.body.style.cursor = 'auto';
      mousePos.current = { x: 0, y: 0 };
    }
  };

  if (!texture) return null;

  // Calculate dimensions preserving aspect ratio
  const logoHeight = maxHeight * scale;
  const logoWidth = logoHeight * aspectRatio;

  return (
    <Float
      speed={1.5}
      rotationIntensity={0.1}
      floatIntensity={0.3}
      floatingRange={[-0.05, 0.05]}
    >
      <group position={position}>
        {/* Drag offset group for rubberband effect */}
        <group ref={dragGroupRef}>
          <group ref={groupRef}>
            {/* Glow backdrop */}
            <mesh position={[0, 0, -0.02]}>
              <planeGeometry args={[logoWidth + 0.3, logoHeight + 0.2]} />
              <meshBasicMaterial
                color={colorObj}
                transparent
                opacity={hovered ? 0.25 : 0.15}
              />
            </mesh>

            {/* Dark background */}
            <mesh position={[0, 0, -0.01]}>
              <planeGeometry args={[logoWidth + 0.1, logoHeight + 0.05]} />
              <meshBasicMaterial
                color="#1a1025"
                transparent
                opacity={0.9}
              />
            </mesh>

            {/* Platform logo */}
            <mesh
              ref={meshRef}
              onPointerOver={handlePointerOver}
              onPointerOut={handlePointerOut}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerMove={handlePointerMove}
            >
              <planeGeometry args={[logoWidth, logoHeight]} />
              <meshBasicMaterial
                map={texture}
                transparent
                opacity={hovered ? 1 : 0.9}
              />
            </mesh>
          </group>
        </group>
      </group>
    </Float>
  );
}

/**
 * ShelfPlatform - Glowing platform that holds a row of games
 */
function ShelfPlatform({
  position,
  width,
  depth = 0.5,
  color = '#00f5ff',
  emissiveIntensity = 0.3
}: {
  position: [number, number, number];
  width: number;
  depth?: number;
  color?: string;
  emissiveIntensity?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseEmissive = emissiveIntensity;

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      // Only pulse if emissive intensity is significant
      if (baseEmissive > 0.1) {
        material.emissiveIntensity = baseEmissive + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      } else {
        material.emissiveIntensity = baseEmissive;
      }
    }
  });

  // Calculate edge opacity based on emissive intensity
  const edgeOpacity = Math.min(0.8, emissiveIntensity * 2.5 + 0.1);

  return (
    <group position={position}>
      {/* Main shelf surface */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color="#1a1025"
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Front edge glow */}
      <mesh position={[0, -0.02, depth / 2]}>
        <boxGeometry args={[width, 0.04, 0.05]} />
        <meshBasicMaterial color={color} transparent opacity={edgeOpacity} />
      </mesh>

      {/* Side edges */}
      <mesh position={[-width / 2, -0.02, 0]}>
        <boxGeometry args={[0.05, 0.04, depth]} />
        <meshBasicMaterial color={color} transparent opacity={edgeOpacity * 0.75} />
      </mesh>
      <mesh position={[width / 2, -0.02, 0]}>
        <boxGeometry args={[0.05, 0.04, depth]} />
        <meshBasicMaterial color={color} transparent opacity={edgeOpacity * 0.75} />
      </mesh>
    </group>
  );
}

/**
 * GameShelfRow - A single shelf row with horizontal drag scrolling
 */
function GameShelfRow({
  shelf,
  shelfY,
  shelfWidth,
  cardSpacing,
  onGameClick,
  onGameHover,
  selectedGameId,
  themeScene
}: {
  shelf: PlatformShelf;
  shelfY: number;
  shelfWidth: number;
  cardSpacing: number;
  onGameClick?: (game: Game) => void;
  onGameHover?: (game: Game | null) => void;
  selectedGameId?: string | null;
  themeScene?: ThemeConfig['scene'];
}) {
  // Use theme shelf color if available, otherwise use platform color
  const shelfColor = themeScene?.shelfColor || shelf.platform.color || '#00f5ff';
  const shelfEmissiveIntensity = themeScene?.shelfEmissiveIntensity ?? 0.3;
  const gamesGroupRef = useRef<THREE.Group>(null);

  // Horizontal scroll state
  const [horizontalOffset, setHorizontalOffset] = useState(0);
  const targetHorizontalOffset = useRef(0);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartOffset = useRef(0);
  const velocity = useRef(0);
  const lastDragX = useRef(0);
  const lastDragTime = useRef(0);

  // Calculate scroll limits
  const totalGamesWidth = (shelf.games.length - 1) * cardSpacing;
  const visibleWidth = shelfWidth - 2; // Account for padding
  const maxScroll = Math.max(0, (totalGamesWidth - visibleWidth) / 2 + cardSpacing);

  // Smooth horizontal scroll animation with momentum
  useFrame((_, delta) => {
    if (gamesGroupRef.current) {
      if (!isDragging.current) {
        // Apply momentum/friction when not dragging
        if (Math.abs(velocity.current) > 0.01) {
          targetHorizontalOffset.current += velocity.current * delta * 60;
          velocity.current *= 0.95; // Friction

          // Clamp to bounds
          targetHorizontalOffset.current = Math.max(-maxScroll, Math.min(maxScroll, targetHorizontalOffset.current));
          setHorizontalOffset(targetHorizontalOffset.current);
        }
      }

      // Smooth interpolation
      gamesGroupRef.current.position.x += (horizontalOffset - gamesGroupRef.current.position.x) * delta * 12;
    }
  });

  // Handle pointer events for horizontal dragging
  const handlePointerDown = (e: THREE.Event) => {
    const event = e as unknown as { stopPropagation: () => void; point: THREE.Vector3 };
    event.stopPropagation();
    isDragging.current = true;
    dragStartX.current = event.point.x;
    dragStartOffset.current = targetHorizontalOffset.current;
    velocity.current = 0;
    lastDragX.current = event.point.x;
    lastDragTime.current = performance.now();
  };

  const handlePointerMove = (e: THREE.Event) => {
    if (!isDragging.current) return;
    const event = e as unknown as { point: THREE.Vector3 };

    const currentX = event.point.x;
    const deltaX = currentX - dragStartX.current;

    // Calculate velocity for momentum
    const currentTime = performance.now();
    const timeDelta = currentTime - lastDragTime.current;
    if (timeDelta > 0) {
      velocity.current = (currentX - lastDragX.current) / timeDelta * 16;
    }
    lastDragX.current = currentX;
    lastDragTime.current = currentTime;

    // Update offset with bounds
    const newOffset = dragStartOffset.current + deltaX * 2;
    targetHorizontalOffset.current = Math.max(-maxScroll, Math.min(maxScroll, newOffset));
    setHorizontalOffset(targetHorizontalOffset.current);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  return (
    <group position={[0, shelfY, 0]}>
      {/* Floating platform logo above the shelf */}
      <PlatformLogo3D
        platformId={shelf.platform.id}
        position={[0, 1.9, 0.5]}
        color={shelfColor}
        scale={0.8}
      />

      {/* Shelf platform */}
      <ShelfPlatform
        position={[0, -1.5, -0.5]}
        width={shelfWidth}
        depth={1.5}
        color={shelfColor}
        emissiveIntensity={shelfEmissiveIntensity}
      />

      {/* Invisible drag plane for horizontal scrolling - behind the cards */}
      <mesh
        position={[0, 0, -0.5]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <planeGeometry args={[shelfWidth, 4]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Game cards container with horizontal offset */}
      <group ref={gamesGroupRef}>
        {shelf.games.map((game, cardIndex) => {
          // Center games around 0, then offset by scroll
          const cardX = (cardIndex - (shelf.games.length - 1) / 2) * cardSpacing;

          // Horizontal culling: only render cards within visible area + buffer
          // The card's screen position = cardX + horizontalOffset
          // Visible range is roughly -shelfWidth/2 to +shelfWidth/2
          const cardScreenX = cardX + horizontalOffset;
          const cullBuffer = cardSpacing * 2; // Render 2 extra cards on each side for smooth scrolling
          const halfVisibleWidth = shelfWidth / 2 + cullBuffer;

          // Skip rendering cards that are off-screen horizontally
          if (cardScreenX < -halfVisibleWidth || cardScreenX > halfVisibleWidth) {
            return null;
          }

          const isSelected = game.id === selectedGameId;

          return (
            <GameCard3D
              key={game.id}
              game={game}
              position={[cardX, 0, 0]}
              onClick={onGameClick}
              onHover={onGameHover}
              isSelected={isSelected}
              glowColor={themeScene?.cardGlowColor || shelfColor}
              scale={0.65}
              floatIntensity={0.5}
              enableHolographicShader={themeScene?.enableHolographicShader ?? true}
              scanlineIntensity={themeScene?.cardScanlineIntensity}
              shimmerIntensity={themeScene?.cardShimmerIntensity}
              edgeGlow={themeScene?.cardEdgeGlow}
            />
          );
        })}
      </group>

      {/* Scroll hint arrows when there are more games */}
      {maxScroll > 0 && (
        <>
          {/* Left arrow - show when scrolled right */}
          {horizontalOffset < maxScroll - 0.5 && (
            <mesh position={[-shelfWidth / 2 - 0.5, 0, 0.5]}>
              <planeGeometry args={[0.3, 0.5]} />
              <meshBasicMaterial color={shelfColor} transparent opacity={0.6} />
            </mesh>
          )}
          {/* Right arrow - show when scrolled left */}
          {horizontalOffset > -maxScroll + 0.5 && (
            <mesh position={[shelfWidth / 2 + 0.5, 0, 0.5]}>
              <planeGeometry args={[0.3, 0.5]} />
              <meshBasicMaterial color={shelfColor} transparent opacity={0.6} />
            </mesh>
          )}
        </>
      )}
    </group>
  );
}

/**
 * HolographicShelf - Full 3D game browsing view organized by platform
 *
 * Performance optimizations:
 * - Vertical culling: Only renders shelves within viewport + buffer
 * - Horizontal culling: Only renders cards within visible shelf area + buffer
 */
export function HolographicShelf({
  platformShelves,
  onGameClick,
  onGameHover,
  selectedGameId,
  cardSpacing = 2.8,
  shelfSpacing = 5,
  themeScene
}: HolographicShelfProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { gl } = useThree();

  // Vertical scroll state
  const [scrollOffset, setScrollOffset] = useState(0);
  const targetScroll = useRef(0);

  // Calculate total scrollable height
  const totalHeight = useMemo(() => {
    return Math.max(0, (platformShelves.length - 1) * shelfSpacing);
  }, [platformShelves.length, shelfSpacing]);

  // Handle wheel events for vertical scrolling
  useEffect(() => {
    const canvas = gl.domElement;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Normalize scroll delta for trackpad vs mouse wheel
      const delta = e.deltaY * 0.01;

      targetScroll.current = Math.max(0, Math.min(totalHeight, targetScroll.current + delta));
      setScrollOffset(targetScroll.current);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [gl, totalHeight]);

  // Smooth vertical scroll animation
  useFrame((_, delta) => {
    if (groupRef.current) {
      const targetY = scrollOffset;
      groupRef.current.position.y += (targetY - groupRef.current.position.y) * delta * 5;
    }
  });

  // Calculate shelf width based on visible area
  const shelfWidth = 18; // Fixed visible width

  // Vertical culling: determine which shelves are visible
  // Camera is at y=6, shelves start at y=4 and go down by shelfSpacing
  // With scrollOffset, the visible range shifts
  // Render shelves within ~2 shelf heights of the viewport for smooth scrolling
  const visibleShelves = useMemo(() => {
    const cullBuffer = 2; // Number of extra shelves to render above/below viewport
    const visibleRange = shelfSpacing * (2 + cullBuffer); // Visible vertical range

    return platformShelves.map((shelf, shelfIndex) => {
      const shelfY = 4 - shelfIndex * shelfSpacing;
      // Shelf Y position relative to current scroll (group moves up by scrollOffset)
      const relativeY = shelfY + scrollOffset;

      // Check if shelf is within visible range (roughly -8 to +8 from center with buffer)
      const isVisible = relativeY > -visibleRange && relativeY < visibleRange + 4;

      return { shelf, shelfIndex, shelfY, isVisible };
    });
  }, [platformShelves, scrollOffset, shelfSpacing]);

  if (platformShelves.length === 0) {
    return null;
  }

  return (
    <group ref={groupRef} position={[0, 0, 10]}>
      {visibleShelves.map(({ shelf, shelfY, isVisible }) => {
        // Skip rendering shelves that are off-screen
        if (!isVisible) return null;

        return (
          <GameShelfRow
            key={shelf.platform.id}
            shelf={shelf}
            shelfY={shelfY}
            shelfWidth={shelfWidth}
            cardSpacing={cardSpacing}
            onGameClick={onGameClick}
            onGameHover={onGameHover}
            selectedGameId={selectedGameId}
            themeScene={themeScene}
          />
        );
      })}

      {/* Vertical scroll indicators */}
      {totalHeight > 0 && (
        <group position={[shelfWidth / 2 + 2, 2, 0]}>
          {/* Scroll track */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.1, 4, 0.1]} />
            <meshBasicMaterial color="#1a1025" transparent opacity={0.5} />
          </mesh>

          {/* Scroll thumb */}
          <mesh position={[0, 2 - (scrollOffset / Math.max(1, totalHeight)) * 4, 0.05]}>
            <boxGeometry args={[0.15, 0.5, 0.1]} />
            <meshBasicMaterial color={themeScene?.cardGlowColor || '#00f5ff'} transparent opacity={0.8} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default HolographicShelf;
