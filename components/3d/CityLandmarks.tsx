'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

function taperedOctagon(height: number, lowerRadius: number, upperRadius: number) {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const indices: number[] = [];
  const levels = 12;
  for (let level = 0; level <= levels; level++) {
    const t = level / levels;
    const radius = THREE.MathUtils.lerp(lowerRadius, upperRadius, t);
    for (let side = 0; side < 8; side++) {
      const angle = (side / 8) * Math.PI * 2 + Math.PI / 8;
      positions.push(Math.cos(angle) * radius, t * height, Math.sin(angle) * radius);
    }
  }
  for (let level = 0; level < levels; level++) for (let side = 0; side < 8; side++) {
    const a = level * 8 + side, b = level * 8 + (side + 1) % 8;
    const c = (level + 1) * 8 + (side + 1) % 8, d = (level + 1) * 8 + side;
    indices.push(a, b, d, b, c, d);
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function barMatrix(a: THREE.Vector3, b: THREE.Vector3, thickness: number, target: THREE.Object3D) {
  target.position.copy(a).add(b).multiplyScalar(.5);
  target.scale.set(thickness, a.distanceTo(b), thickness);
  target.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  target.updateMatrix();
}

export function SpringTower({ height, opacity }: { height: number; opacity: number }) {
  const braces = useRef<THREE.InstancedMesh>(null), windows = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => taperedOctagon(height, 4.1, 2.05), [height]);
  const braceGeometry = useMemo(() => new THREE.CylinderGeometry(.055, .055, 1, 5), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const braceCount = 8 * 3 * 2;
  const windowCount = 8 * 8 * 5;
  useEffect(() => {
    let index = 0;
    for (let band = 0; band < 3; band++) for (let side = 0; side < 8; side++) {
      const y0 = height * band / 3, y1 = height * (band + 1) / 3;
      const r0 = THREE.MathUtils.lerp(4.1, 2.05, band / 3), r1 = THREE.MathUtils.lerp(4.1, 2.05, (band + 1) / 3);
      const a0 = (side / 8) * Math.PI * 2 + Math.PI / 8, a1 = ((side + 1) / 8) * Math.PI * 2 + Math.PI / 8;
      barMatrix(new THREE.Vector3(Math.cos(a0) * r0, y0, Math.sin(a0) * r0), new THREE.Vector3(Math.cos(a1) * r1, y1, Math.sin(a1) * r1), .075, dummy);
      braces.current?.setMatrixAt(index++, dummy.matrix);
      barMatrix(new THREE.Vector3(Math.cos(a1) * r0, y0, Math.sin(a1) * r0), new THREE.Vector3(Math.cos(a0) * r1, y1, Math.sin(a0) * r1), .075, dummy);
      braces.current?.setMatrixAt(index++, dummy.matrix);
    }
    index = 0;
    for (let floor = 1; floor < 9; floor++) for (let side = 0; side < 8; side++) for (let pane = 0; pane < 5; pane++) {
      const t = floor / 10, radius = THREE.MathUtils.lerp(4.1, 2.05, t), angle = ((side + (pane + .5) / 5) / 8) * Math.PI * 2 + Math.PI / 8;
      dummy.position.set(Math.cos(angle) * (radius + .018), t * height, Math.sin(angle) * (radius + .018));
      dummy.rotation.set(0, -angle, 0); dummy.scale.set(.42, Math.max(.35, height / 15), .035); dummy.updateMatrix();
      windows.current?.setMatrixAt(index++, dummy.matrix);
    }
    if (braces.current) braces.current.instanceMatrix.needsUpdate = true;
    if (windows.current) windows.current.instanceMatrix.needsUpdate = true;
  }, [height, dummy]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <group>
    <mesh geometry={geometry} position={[0, 0, 0]}><meshStandardMaterial color="#8baeb3" metalness={.48} roughness={.3} side={THREE.DoubleSide} transparent opacity={opacity}/></mesh>
    <instancedMesh ref={windows} args={[undefined, undefined, windowCount]}><planeGeometry args={[1, 1]}/><meshStandardMaterial color="#b8dfe1" metalness={.62} roughness={.16} emissive="#284e55" emissiveIntensity={.32} side={THREE.DoubleSide} transparent opacity={opacity}/></instancedMesh>
    <instancedMesh ref={braces} args={[braceGeometry, undefined, braceCount]}><meshStandardMaterial color="#c9ad7d" metalness={.78} roughness={.27} emissive="#775737" emissiveIntensity={.14} transparent opacity={opacity}/></instancedMesh>
    <mesh position={[0, height + .1, 0]}><cylinderGeometry args={[2.25, 2.65, .28, 8]}/><meshStandardMaterial color="#d9c49c" metalness={.72} roughness={.3} transparent opacity={opacity}/></mesh>
  </group>;
}

export function SpiralTower({ height, opacity }: { height: number; opacity: number }) {
  const floors = useRef<THREE.InstancedMesh>(null), dummy = useMemo(() => new THREE.Object3D(), []);
  const floorCount = 12;
  useEffect(() => {
    for (let i = 0; i < floorCount; i++) {
      const t = i / (floorCount - 1), radius = THREE.MathUtils.lerp(3.8, 2.7, t);
      dummy.position.set(0, t * height, 0); dummy.rotation.y = t * Math.PI * .32;
      dummy.scale.set(radius * 2, .12, radius * 2);
      dummy.updateMatrix(); floors.current?.setMatrixAt(i, dummy.matrix);
    }
    if (floors.current) floors.current.instanceMatrix.needsUpdate = true;
  }, [height, dummy]);
  return <group>
    <instancedMesh ref={floors} args={[undefined, undefined, floorCount]}><boxGeometry/><meshStandardMaterial color="#c1b38f" metalness={.58} roughness={.3} transparent opacity={opacity}/></instancedMesh>
    <mesh position={[0, height * .52, 0]}><cylinderGeometry args={[2.55, 3.15, height * .96, 12, 12, false]}/><meshStandardMaterial color="#6d929a" metalness={.52} roughness={.24} side={THREE.DoubleSide} transparent opacity={opacity}/></mesh>
    <mesh position={[0, height + .65, 0]}><cylinderGeometry args={[1.45, 2.35, 1.3, 10]}/><meshStandardMaterial color="#9dbab8" metalness={.6} roughness={.26} transparent opacity={opacity}/></mesh>
    <mesh position={[0, height + 1.35, 0]}><coneGeometry args={[1.45, 1.25, 10]}/><meshStandardMaterial color="#d1bd91" metalness={.68} roughness={.25} transparent opacity={opacity}/></mesh>
  </group>;
}

export function DecoTower({ height, opacity }: { height: number; opacity: number }) {
  const tiers = useRef<THREE.InstancedMesh>(null), pilasters = useRef<THREE.InstancedMesh>(null), windows = useRef<THREE.InstancedMesh>(null), dummy = useMemo(() => new THREE.Object3D(), []);
  const tierCount = 6, pilasterCount = 4 * 12, windowCount = 10 * 4;
  useEffect(() => {
    for (let i = 0; i < tierCount; i++) {
      const t = i / tierCount, fraction = 1 - t * .48;
      dummy.position.set(0, height * (t + .5 / tierCount), 0);
      dummy.scale.set(7.8 * fraction, height / tierCount * .72, 6.6 * fraction); dummy.updateMatrix(); tiers.current?.setMatrixAt(i, dummy.matrix);
    }
    for (let floor = 0; floor < 12; floor++) for (let side = 0; side < 4; side++) {
      const t = floor / 12, w = 7.8 * (1 - t * .48), d = 6.6 * (1 - t * .48);
      dummy.position.set(side < 2 ? (side === 0 ? -w / 2 : w / 2) : 0, (floor + .5) * height / 12, side < 2 ? 0 : (side === 2 ? -d / 2 : d / 2));
      dummy.scale.set(side < 2 ? .12 : w, height / 12 * .28, side < 2 ? d : .12); dummy.updateMatrix(); pilasters.current?.setMatrixAt(floor * 4 + side, dummy.matrix);
    }
    let pane = 0;
    for (let floor = 1; floor < 11; floor++) for (let col = 0; col < 4; col++) {
      const t = floor / 12, width = 7.8 * (1 - t * .48), depth = 6.6 * (1 - t * .48);
      dummy.position.set(-width * .36 + col * width * .24, floor * height / 12, depth / 2 + .015);
      dummy.scale.set(width * .12, height / 12 * .38, .025); dummy.updateMatrix(); windows.current?.setMatrixAt(pane++, dummy.matrix);
    }
    if (tiers.current) tiers.current.instanceMatrix.needsUpdate = true;
    if (pilasters.current) pilasters.current.instanceMatrix.needsUpdate = true;
    if (windows.current) windows.current.instanceMatrix.needsUpdate = true;
  }, [height, dummy]);
  return <group>
    <mesh position={[0, height * .49, 0]}><boxGeometry args={[6.6, height * .94, 5.4]}/><meshStandardMaterial color="#8e765d" roughness={.78} metalness={.08} transparent opacity={opacity}/></mesh>
    <instancedMesh ref={tiers} args={[undefined, undefined, tierCount]}><boxGeometry/><meshStandardMaterial color="#aa8d6a" roughness={.72} metalness={.08} transparent opacity={opacity}/></instancedMesh>
    <instancedMesh ref={pilasters} args={[undefined, undefined, pilasterCount]}><boxGeometry/><meshStandardMaterial color="#d4ba91" roughness={.63} metalness={.15} transparent opacity={opacity}/></instancedMesh>
    <instancedMesh ref={windows} args={[undefined, undefined, windowCount]}><planeGeometry args={[1, 1]}/><meshStandardMaterial color="#b9c8be" emissive="#5d6d66" emissiveIntensity={.18} side={THREE.DoubleSide} transparent opacity={opacity}/></instancedMesh>
    <group position={[0, 1.15, 3.33]}><mesh><boxGeometry args={[1.4, 2.3, .08]}/><meshStandardMaterial color="#253b41" metalness={.3} roughness={.35} transparent opacity={opacity}/></mesh><mesh position={[0, 1.22, .04]}><boxGeometry args={[2.1, .12, .18]}/><meshStandardMaterial color="#ddc79b" roughness={.62} transparent opacity={opacity}/></mesh></group>
    <mesh position={[0, height + .7, 0]}><coneGeometry args={[2.05, 1.4, 4]}/><meshStandardMaterial color="#d7c093" roughness={.5} metalness={.25} transparent opacity={opacity}/></mesh>
    <mesh position={[0, height + 1.65, 0]}><coneGeometry args={[1.15, .8, 4]}/><meshStandardMaterial color="#c7ab79" roughness={.45} metalness={.34} transparent opacity={opacity}/></mesh>
  </group>;
}
