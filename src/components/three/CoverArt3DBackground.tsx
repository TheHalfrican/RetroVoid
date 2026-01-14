import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

interface FloatingParticlesProps {
  count?: number;
  color: string;
  spread?: number;
}

function FloatingParticles({ count = 50, color, spread = 3 }: FloatingParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particleData = useRef<{ positions: Float32Array; velocities: Float32Array; phases: Float32Array } | undefined>(undefined);

  // Initialize particle data
  useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;

      velocities[i * 3] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01 + 0.005; // Slight upward drift
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.005;

      phases[i] = Math.random() * Math.PI * 2;
    }

    particleData.current = { positions, velocities, phases };
  }, [count, spread]);

  const colorObj = useMemo(() => new THREE.Color(color), [color]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current || !particleData.current) return;

    const { positions, velocities, phases } = particleData.current;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      // Update positions with wave motion
      const px = positions[i * 3] + Math.sin(time * 0.5 + phases[i]) * 0.02;
      const py = positions[i * 3 + 1] + velocities[i * 3 + 1] * time * 0.5;
      const pz = positions[i * 3 + 2] + Math.cos(time * 0.3 + phases[i]) * 0.01;

      // Wrap around when particles go too high
      const wrappedY = ((py + spread) % (spread * 2)) - spread;

      dummy.position.set(px, wrappedY, pz);

      // Pulse scale
      const scale = 0.8 + Math.sin(time * 2 + phases[i]) * 0.3;
      dummy.scale.setScalar(scale);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.02, 8, 8]} />
      <meshBasicMaterial color={colorObj} transparent opacity={0.6} />
    </instancedMesh>
  );
}

interface GlowRingProps {
  color: string;
  radius?: number;
  pulseSpeed?: number;
}

function GlowRing({ color, radius = 1.5, pulseSpeed = 1 }: GlowRingProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = 0.1 + Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.05;
    meshRef.current.rotation.z = state.clock.elapsedTime * 0.1;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -0.5]}>
      <ringGeometry args={[radius * 0.8, radius, 64]} />
      <meshBasicMaterial color={colorObj} transparent opacity={0.15} side={THREE.DoubleSide} />
    </mesh>
  );
}

interface HolographicGridProps {
  color: string;
  size?: number;
}

function HolographicGrid({ color, size = 4 }: HolographicGridProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = 0.03 + Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
      <planeGeometry args={[size, size, 20, 20]} />
      <meshBasicMaterial color={colorObj} wireframe transparent opacity={0.05} />
    </mesh>
  );
}

interface FloatingShapeProps {
  color: string;
  position: [number, number, number];
  shape: 'box' | 'octahedron' | 'torus';
  size?: number;
}

function FloatingShape({ color, position, shape, size = 0.3 }: FloatingShapeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.3;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={meshRef} position={position}>
        {shape === 'box' && <boxGeometry args={[size, size, size]} />}
        {shape === 'octahedron' && <octahedronGeometry args={[size]} />}
        {shape === 'torus' && <torusGeometry args={[size, size * 0.3, 8, 16]} />}
        <meshBasicMaterial color={colorObj} wireframe transparent opacity={0.3} />
      </mesh>
    </Float>
  );
}

interface CoverArt3DBackgroundProps {
  platformColor?: string;
}

export function CoverArt3DBackground({ platformColor = '#00f5ff' }: CoverArt3DBackgroundProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 50 }}
      style={{ position: 'absolute', inset: 0 }}
      gl={{ alpha: true, antialias: true }}
    >
      {/* Ambient glow */}
      <ambientLight intensity={0.2} />
      <pointLight position={[2, 2, 2]} color={platformColor} intensity={0.5} />
      <pointLight position={[-2, -2, 1]} color="#ff00ff" intensity={0.3} />

      {/* Floating particles */}
      <FloatingParticles count={40} color={platformColor} spread={3} />
      <FloatingParticles count={20} color="#ff00ff" spread={2.5} />

      {/* Glow rings */}
      <GlowRing color={platformColor} radius={2} pulseSpeed={0.8} />
      <GlowRing color="#ff00ff" radius={1.8} pulseSpeed={1.2} />

      {/* Holographic grid floor */}
      <HolographicGrid color={platformColor} size={6} />

      {/* Floating geometric shapes */}
      <FloatingShape color={platformColor} position={[-1.5, 1, -1]} shape="octahedron" size={0.2} />
      <FloatingShape color="#ff00ff" position={[1.5, -0.5, -1]} shape="box" size={0.15} />
      <FloatingShape color={platformColor} position={[1.2, 1.2, -0.5]} shape="torus" size={0.12} />
      <FloatingShape color="#ff00ff" position={[-1.3, -1, -0.8]} shape="octahedron" size={0.18} />
    </Canvas>
  );
}

export default CoverArt3DBackground;
