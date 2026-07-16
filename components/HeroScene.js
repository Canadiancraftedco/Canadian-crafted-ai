'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

function Terrain() {
  const meshRef = useRef();

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(46, 46, 90, 90);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const ridge = Math.sin(x * 0.18) * Math.cos(y * 0.15) * 2.2;
      const detail = Math.sin(x * 0.6 + y * 0.4) * 0.35;
      pos.setZ(i, ridge + detail);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      meshRef.current.rotation.z = Math.sin(t * 0.04) * 0.04;
      meshRef.current.position.y = -3 + Math.sin(t * 0.15) * 0.15;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2.3, 0, 0]} position={[0, -3, -4]}>
      <meshBasicMaterial color="#3E8E8E" wireframe transparent opacity={0.3} />
    </mesh>
  );
}

function Particles() {
  const pointsRef = useRef();
  const count = 500;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 34;
      arr[i * 3 + 1] = Math.random() * 16 - 3;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 30 - 4;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.getElapsedTime() * 0.015;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#D3762B" size={0.045} transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

function NeonParticles() {
  const pointsRef = useRef();
  const count = 220;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 22;
      arr[i * 3 + 1] = Math.random() * 10 - 1;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 18 - 2;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      const t = clock.getElapsedTime();
      pointsRef.current.rotation.y = -t * 0.03;
      pointsRef.current.position.y = Math.sin(t * 0.2) * 0.4;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#4FE8D8" size={0.06} transparent opacity={0.75} sizeAttenuation />
    </points>
  );
}

function HoloRing() {
  const ringRef = useRef();

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const t = clock.getElapsedTime();
      ringRef.current.rotation.x = Math.PI / 2.4 + Math.sin(t * 0.1) * 0.15;
      ringRef.current.rotation.z = t * 0.06;
    }
  });

  return (
    <mesh ref={ringRef} position={[4, 1.5, -6]}>
      <torusGeometry args={[2.4, 0.01, 8, 90]} />
      <meshBasicMaterial color="#B98CFF" transparent opacity={0.4} />
    </mesh>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 2.5, 13], fov: 48 }}
      style={{ position: 'absolute', inset: 0 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.75]}
    >
      <ambientLight intensity={0.6} />
      <fog attach="fog" args={['#0c1310', 9, 30]} />
      <Terrain />
      <Particles />
      <NeonParticles />
      <HoloRing />
    </Canvas>
  );
}
