import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Float } from '@react-three/drei';
import * as THREE from 'three';

const WavyGrid = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    const positions = meshRef.current.geometry.attributes.position;
    
    // Animate vertices for a dynamic wavy universe platform
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        
        // Gentle undulating wave moving forward
        const wave = Math.sin(x * 0.2 + time) * Math.cos(y * 0.2 + time) * 1.5;
        // Secondary complexity wave
        const wave2 = Math.sin((x * y) * 0.01 - time * 0.5) * 0.5;
        
        positions.setZ(i, wave + wave2);
    }
    positions.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2.1, 0, 0]} position={[0, -4, -15]}>
      {/* A large plane with high vertex count to support smooth waves */}
      <planeGeometry args={[100, 100, 80, 80]} />
      <meshStandardMaterial 
        color="#3b82f6" 
        wireframe={true} 
        emissive="#8b5cf6"
        emissiveIntensity={1.2}
        transparent={true}
        opacity={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export const ThreeBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 bg-[#0a0a0c] overflow-hidden pointer-events-none">
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }} gl={{ alpha: false, antialias: true }}>
        {/* Fog creates the infinite horizon fade-out effect */}
        <fog attach="fog" args={['#0a0a0c', 10, 40]} />
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 10, 0]} intensity={5} color="#10b981" />
        
        {/* The moving wavy grid platform */}
        <WavyGrid />
        
        {/* Animated starfield */}
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={1} fade speed={2} />
        
        {/* Distant floating aesthetic orbs */}
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={1}>
           <mesh position={[-15, 6, -20]}>
             <sphereGeometry args={[2, 32, 32]} />
             <meshStandardMaterial emissive="#ec4899" emissiveIntensity={2} color="#ec4899" transparent opacity={0.6} />
           </mesh>
           <mesh position={[15, 8, -25]}>
             <sphereGeometry args={[1.5, 32, 32]} />
             <meshStandardMaterial emissive="#10b981" emissiveIntensity={2} color="#10b981" transparent opacity={0.6} />
           </mesh>
           <mesh position={[0, 12, -30]}>
             <sphereGeometry args={[3, 32, 32]} />
             <meshStandardMaterial emissive="#6366f1" emissiveIntensity={1} color="#6366f1" transparent opacity={0.4} />
           </mesh>
        </Float>
      </Canvas>
    </div>
  );
};
