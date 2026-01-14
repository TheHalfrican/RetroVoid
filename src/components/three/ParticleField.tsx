import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  scale: number;
  opacity: number;
}

interface ParticleFieldProps {
  count?: number;
  areaSize?: number;
  particleSize?: number;
  color?: string;
  secondaryColor?: string;
  speed?: number;
  opacity?: number;
}

/**
 * ParticleField - Floating digital dust particles for cyberpunk atmosphere
 *
 * Creates a field of small glowing particles that drift slowly through the scene,
 * adding depth and atmosphere. Particles respawn when they drift too far.
 */
export function ParticleField({
  count = 200,
  areaSize = 30,
  particleSize = 0.05,
  color = '#00f5ff',
  secondaryColor: _secondaryColor = '#ff00ff', // Reserved for future gradient effect
  speed = 0.3,
  opacity = 0.6
}: ParticleFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Initialize particles with random positions and velocities
  const particles = useMemo<Particle[]>(() => {
    const temp: Particle[] = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * areaSize,
          Math.random() * areaSize * 0.5 + 1, // Keep above ground
          (Math.random() - 0.5) * areaSize
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * speed,
          (Math.random() - 0.5) * speed * 0.5,
          (Math.random() - 0.5) * speed
        ),
        scale: Math.random() * 0.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.5
      });
    }
    return temp;
  }, [count, areaSize, speed]);

  // Animate particles
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const time = state.clock.elapsedTime;
    const halfArea = areaSize / 2;

    particles.forEach((particle, i) => {
      // Add some waviness to movement
      const waveX = Math.sin(time * 0.5 + i * 0.1) * 0.02;
      const waveY = Math.cos(time * 0.3 + i * 0.15) * 0.01;
      const waveZ = Math.sin(time * 0.4 + i * 0.12) * 0.02;

      // Update position
      particle.position.x += (particle.velocity.x + waveX) * delta;
      particle.position.y += (particle.velocity.y + waveY) * delta;
      particle.position.z += (particle.velocity.z + waveZ) * delta;

      // Wrap around when particles go out of bounds
      if (particle.position.x > halfArea) particle.position.x = -halfArea;
      if (particle.position.x < -halfArea) particle.position.x = halfArea;
      if (particle.position.y > areaSize * 0.6) particle.position.y = 1;
      if (particle.position.y < 0.5) particle.position.y = areaSize * 0.5;
      if (particle.position.z > halfArea) particle.position.z = -halfArea;
      if (particle.position.z < -halfArea) particle.position.z = halfArea;

      // Subtle scale pulsing
      const pulseScale = 1 + Math.sin(time * 2 + i) * 0.2;
      const finalScale = particle.scale * pulseScale * particleSize;

      // Update instance matrix
      dummy.position.copy(particle.position);
      dummy.scale.setScalar(finalScale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

/**
 * DataParticles - Variation with more "digital" look using small boxes
 */
export function DataParticles({
  count = 100,
  areaSize = 25,
  particleSize = 0.03,
  color = '#00f5ff',
  speed = 0.2,
  opacity = 0.5
}: Omit<ParticleFieldProps, 'secondaryColor'>) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Initialize particles
  const particles = useMemo<Particle[]>(() => {
    const temp: Particle[] = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * areaSize,
          Math.random() * areaSize * 0.4 + 2,
          (Math.random() - 0.5) * areaSize
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * speed,
          (Math.random() - 0.3) * speed * 0.3, // Slight upward bias
          (Math.random() - 0.5) * speed
        ),
        scale: Math.random() * 0.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.5
      });
    }
    return temp;
  }, [count, areaSize, speed]);

  // Animate particles with rotation
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const time = state.clock.elapsedTime;
    const halfArea = areaSize / 2;

    particles.forEach((particle, i) => {
      // Update position
      particle.position.x += particle.velocity.x * delta;
      particle.position.y += particle.velocity.y * delta;
      particle.position.z += particle.velocity.z * delta;

      // Wrap around
      if (particle.position.x > halfArea) particle.position.x = -halfArea;
      if (particle.position.x < -halfArea) particle.position.x = halfArea;
      if (particle.position.y > areaSize * 0.5) particle.position.y = 2;
      if (particle.position.y < 1) particle.position.y = areaSize * 0.4;
      if (particle.position.z > halfArea) particle.position.z = -halfArea;
      if (particle.position.z < -halfArea) particle.position.z = halfArea;

      // Update instance
      dummy.position.copy(particle.position);
      dummy.rotation.x = time * 0.5 + i;
      dummy.rotation.y = time * 0.3 + i * 0.5;
      dummy.scale.setScalar(particle.scale * particleSize);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

export default ParticleField;
