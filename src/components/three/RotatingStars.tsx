import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';

interface RotatingStarsProps {
  radius?: number;
  depth?: number;
  count?: number;
  factor?: number;
  speed?: number;
  rotationSpeed?: number;
}

/**
 * RotatingStars - Slowly rotating starfield background
 *
 * Wraps drei's Stars component with rotation animation
 * since the built-in speed prop only controls twinkle/fade.
 */
export function RotatingStars({
  radius = 100,
  depth = 50,
  count = 3000,
  factor = 4,
  speed = 0.5,
  rotationSpeed = 1
}: RotatingStarsProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Slow rotation on Y axis
      groupRef.current.rotation.y += delta * 0.05 * rotationSpeed;
      // Slight tilt rotation on X axis
      groupRef.current.rotation.x += delta * 0.01 * rotationSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      <Stars
        radius={radius}
        depth={depth}
        count={count}
        factor={factor}
        saturation={0}
        fade
        speed={speed}
      />
    </group>
  );
}

export default RotatingStars;
