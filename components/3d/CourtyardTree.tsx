'use client';
import { useGLTF } from '@/lib/three/scene-assets';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

import * as THREE from 'three';

/** Small derived asset: only the original light-court's landscape, never its tower. */
export default function CourtyardTree({ position, scale = 1, rotation = 0, paused = false }: { position: [number, number, number]; scale?: number; rotation?: number; paused?: boolean }) {
  const { scene } = useGLTF('/models/behaviour-v123/courtyard-tree.glb');
  const clone = useMemo(() => { const c = scene.clone(true); c.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } }); return c; }, [scene]);
  const root = useRef<THREE.Group>(null), time = useRef(0);
  useFrame((_, dt) => { if (paused || !root.current) return; time.current += Math.min(dt, .05); root.current.rotation.z = Math.sin(time.current * .8 + position[0]) * .007; });
  return <group ref={root} position={position} rotation={[0, rotation, 0]} scale={scale}><primitive object={clone} dispose={null} /></group>;
}
