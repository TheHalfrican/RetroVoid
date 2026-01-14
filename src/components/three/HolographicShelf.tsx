import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { GameCard3D } from './GameCard3D';
import type { Game } from '../../types';

interface HolographicShelfProps {
  games: Game[];
  onGameClick?: (game: Game) => void;
  onGameHover?: (game: Game | null) => void;
  selectedGameId?: string | null;
  cardsPerRow?: number;
  rowSpacing?: number;
  cardSpacing?: number;
  shelfColor?: string;
}

/**
 * ShelfPlatform - Glowing neon platform that holds a row of games
 */
function ShelfPlatform({
  position,
  width,
  depth = 0.5,
  color = '#00f5ff'
}: {
  position: [number, number, number];
  width: number;
  depth?: number;
  color?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle glow pulse
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group position={position}>
      {/* Main shelf surface */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color="#1a1025"
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Front edge glow */}
      <mesh position={[0, -0.02, depth / 2]}>
        <boxGeometry args={[width, 0.04, 0.05]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>

      {/* Side edges */}
      <mesh position={[-width / 2, -0.02, 0]}>
        <boxGeometry args={[0.05, 0.04, depth]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
      <mesh position={[width / 2, -0.02, 0]}>
        <boxGeometry args={[0.05, 0.04, depth]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

/**
 * HolographicShelf - Full 3D game browsing view
 *
 * Displays games as floating holographic cards arranged on glowing shelves.
 * Supports scrolling through rows of games with smooth camera movement.
 */
export function HolographicShelf({
  games,
  onGameClick,
  onGameHover,
  selectedGameId,
  cardsPerRow = 5,
  rowSpacing = 4,
  cardSpacing = 2.5,
  shelfColor: _shelfColor = '#00f5ff' // Reserved for future customization
}: HolographicShelfProps) {
  const groupRef = useRef<THREE.Group>(null);
  // TODO: Implement scroll handling with mouse wheel
  const scrollOffset = 0;

  // Arrange games into rows
  const rows = useMemo(() => {
    const result: Game[][] = [];
    for (let i = 0; i < games.length; i += cardsPerRow) {
      result.push(games.slice(i, i + cardsPerRow));
    }
    return result;
  }, [games, cardsPerRow]);

  // Calculate total height of all shelves (used for scroll indicators)
  const totalHeight = rows.length * rowSpacing;

  // Smooth camera/group movement based on scroll
  useFrame((_, delta) => {
    if (groupRef.current) {
      const targetY = scrollOffset;
      groupRef.current.position.y += (targetY - groupRef.current.position.y) * delta * 3;
    }
  });

  // Calculate shelf width based on cards per row
  const shelfWidth = cardsPerRow * cardSpacing + 1;

  // Colors for alternating shelf accents
  const shelfColors = ['#00f5ff', '#ff00ff', '#ff6b35'];

  if (games.length === 0) {
    return (
      <group position={[0, 3, 8]}>
        <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
          <mesh>
            <planeGeometry args={[6, 2]} />
            <meshStandardMaterial
              color="#1a1025"
              emissive="#00f5ff"
              emissiveIntensity={0.2}
              transparent
              opacity={0.9}
            />
          </mesh>
        </Float>
      </group>
    );
  }

  return (
    <group ref={groupRef} position={[0, 0, 10]}>
      {rows.map((row, rowIndex) => {
        const rowY = 4 - rowIndex * rowSpacing;
        const rowColor = shelfColors[rowIndex % shelfColors.length];

        return (
          <group key={rowIndex} position={[0, rowY, 0]}>
            {/* Shelf platform */}
            <ShelfPlatform
              position={[0, -1.5, -0.5]}
              width={shelfWidth}
              depth={1.5}
              color={rowColor}
            />

            {/* Game cards on this shelf */}
            {row.map((game, cardIndex) => {
              const cardX = (cardIndex - (row.length - 1) / 2) * cardSpacing;
              const isSelected = game.id === selectedGameId;

              return (
                <GameCard3D
                  key={game.id}
                  game={game}
                  position={[cardX, 0, 0]}
                  onClick={onGameClick}
                  onHover={onGameHover}
                  isSelected={isSelected}
                  glowColor={rowColor}
                  scale={0.65}
                  floatIntensity={0.5}
                />
              );
            })}
          </group>
        );
      })}

      {/* Scroll indicator - show if there are more rows */}
      {rows.length > 2 && (
        <group position={[shelfWidth / 2 + 1, 2, 0]}>
          {/* Up arrow */}
          <mesh position={[0, 1, 0]} visible={scrollOffset > 0}>
            <coneGeometry args={[0.2, 0.4, 3]} />
            <meshBasicMaterial color="#00f5ff" transparent opacity={0.6} />
          </mesh>
          {/* Down arrow */}
          <mesh position={[0, -1, 0]} rotation={[Math.PI, 0, 0]} visible={scrollOffset < totalHeight - rowSpacing}>
            <coneGeometry args={[0.2, 0.4, 3]} />
            <meshBasicMaterial color="#00f5ff" transparent opacity={0.6} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default HolographicShelf;
