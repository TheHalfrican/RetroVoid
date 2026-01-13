import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { motion } from 'framer-motion';

function App() {
  return (
    <div className="w-full h-full bg-void-black relative overflow-hidden">
      {/* 3D Background */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
          <color attach="background" args={['#0a0a0f']} />
          <ambientLight intensity={0.2} />
          <pointLight position={[10, 10, 10]} color="#00f5ff" intensity={1} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          {/* Title */}
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-wider mb-4 text-glow-cyan text-neon-cyan">
            THE EMULATION STATION
          </h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="font-body text-lg text-gray-400 mb-8"
          >
            Premium Emulator Launcher
          </motion.p>

          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="glass neon-border-cyan rounded-lg p-6 max-w-md mx-auto"
          >
            <h2 className="font-display text-xl text-neon-cyan mb-4">System Status</h2>
            <div className="space-y-2 text-left font-body text-sm">
              <StatusItem label="Tauri Backend" status="online" />
              <StatusItem label="React Frontend" status="online" />
              <StatusItem label="Three.js Renderer" status="online" />
              <StatusItem label="Database" status="pending" />
              <StatusItem label="Library Scanner" status="pending" />
            </div>
          </motion.div>

          {/* Version */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="font-body text-xs text-gray-600 mt-8"
          >
            v0.1.0 - Development Build
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}

function StatusItem({ label, status }: { label: string; status: 'online' | 'offline' | 'pending' }) {
  const statusColors = {
    online: 'bg-neon-cyan',
    offline: 'bg-red-500',
    pending: 'bg-neon-orange',
  };

  const statusText = {
    online: 'Online',
    offline: 'Offline',
    pending: 'Pending',
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-300">{label}</span>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${statusColors[status]} animate-pulse`} />
        <span className="text-gray-400">{statusText[status]}</span>
      </div>
    </div>
  );
}

export default App;
