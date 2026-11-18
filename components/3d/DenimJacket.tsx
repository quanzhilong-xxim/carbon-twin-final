'use client';
import { useGLTF } from '@/lib/three/scene-assets';

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';

export const DENIM_JACKET_ASSET = 'denim_jacket';

/** This loader owns jacket materials only; the original three garment loaders stay intact. */
export function DenimJacket({ onReady, small = false, fromCollection = false }: { onReady: (asset: string) => void; small?: boolean; fromCollection?: boolean }) {
  const { scene } = useGLTF('/models/denim_jacket.glb', '/models/draco/');
  const group = useRef<THREE.Group>(null);
  const focusedScale = useMemo(() => new THREE.Vector3().setScalar(small ? 1 : 1.2), [small]);
  const model = useMemo(() => {
    const root = scene.clone(true);
    const materials: THREE.Material[] = [];
    root.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      node.castShadow = node.receiveShadow = true;
      const prepare = (source: THREE.MeshStandardMaterial) => {
        const material = source.clone();
        material.color.set('#1A2A42');
        material.map = null;
        material.roughness = .9;
        material.metalness = 0;
        material.normalScale.set(1.5, 1.5);
        material.side = THREE.DoubleSide;
        materials.push(material);
        return material;
      };
      node.material = Array.isArray(node.material)
        ? node.material.map(material => prepare(material as THREE.MeshStandardMaterial))
        : prepare(node.material as THREE.MeshStandardMaterial);
    });
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 2.25 / Math.max(size.x, size.y);
    root.scale.setScalar(scale);
    root.position.set(-center.x * scale, -.4 - bounds.min.y * scale, -center.z * scale);
    return { root, materials };
  }, [scene]);
  useEffect(() => { onReady(DENIM_JACKET_ASSET); }, [onReady]);
  useEffect(() => () => { model.materials.forEach(material => material.dispose()); }, [model]);
  useFrame((_, dt) => {
    if (!group.current || small) return;
    const damping = 1 - Math.exp(-5 * dt);
    group.current.scale.lerp(focusedScale, damping);
    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, 0, 5, dt);
  });
  return <group ref={group} name="denim-jacket-model" position={[0, fromCollection ? -.45 : 0, 0]} scale={small ? 1 : fromCollection ? .72 : 1.2}><primitive object={model.root} dispose={null} /></group>;
}

export function DenimJacketLights() {
  return <group name="denim-jacket-lighting">
    <spotLight castShadow position={[0, 5, 1.5]} intensity={1.4} angle={.55} penumbra={.85} decay={0} shadow-mapSize={[2048, 2048]} shadow-bias={-.00015} shadow-normalBias={.015} />
    <spotLight position={[-3, 2.5, -2]} intensity={.28} color="#b8d0ee" angle={.7} penumbra={1} decay={0} />
  </group>;
}

/** Separate damping path, enabled only while the jacket is the selected single object. */
export function DenimJacketCamera({ angle, fromCollection }: { angle: number; fromCollection: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size, gl } = useThree();
  const moving = useRef(true);
  const destination = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(0, .55, 0), []);
  const reduced = useRef(false);
  const initialFromCollection = useRef(fromCollection);
  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (controls.current) controls.current.target.set(0, initialFromCollection.current ? 1.3 : .8, 0);
  }, []);
  useEffect(() => {
    const distance = Math.max(4.4, 3.6 / (2 * Math.tan(THREE.MathUtils.degToRad(19)) * (size.width / size.height)));
    destination.set(Math.sin(angle) * distance, 1.05, Math.cos(angle) * distance);
    moving.current = true;
  }, [angle, size.width, size.height, destination]);
  useFrame((_, dt) => {
    const orbit = controls.current;
    if (!orbit || !moving.current) return;
    const damping = reduced.current ? 1 : 1 - Math.exp(-5 * dt);
    orbit.maxDistance = 14;
    camera.position.lerp(destination, damping);
    orbit.target.lerp(target, damping);
    orbit.update();
    const distance = camera.position.distanceTo(destination);
    gl.domElement.dataset.jacketCameraDistance = camera.position.distanceTo(orbit.target).toFixed(3);
    gl.domElement.dataset.jacketCameraMoving = String(distance >= .008);
    if (distance < .008 && orbit.target.distanceTo(target) < .008) {
      moving.current = false;
      orbit.maxDistance = 8;
    }
  });
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.05} enablePan={false} minDistance={2.2} maxDistance={14} minPolarAngle={.25} maxPolarAngle={Math.PI - .25} onStart={() => { moving.current = false; }} />;
}

/** Wrappers move the collection away without editing the other models or their materials. */
export function JacketDeparture({ position, children }: { position: [number, number, number]; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const destination = useMemo(() => new THREE.Vector3(position[0] <= 0 ? -9 : 9, position[1] - 1, -2), [position]);
  const reducedScale = useMemo(() => new THREE.Vector3(.25, .25, .25), []);
  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.position.lerp(destination, 1 - Math.exp(-5 * dt));
    group.current.scale.lerp(reducedScale, 1 - Math.exp(-5 * dt));
  });
  return <group ref={group} position={position} scale={.72}>{children}</group>;
}
