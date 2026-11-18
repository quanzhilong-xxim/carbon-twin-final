'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** One deterministic canopy, shared across four interpolated seasons. */
export default function SeasonalCanopy({ vitality, phase, paused }: { vitality: number; phase: number; paused: boolean }) {
  const leaf = useRef<THREE.InstancedMesh>(null), bloom = useRef<THREE.InstancedMesh>(null), snow = useRef<THREE.InstancedMesh>(null), material = useRef<THREE.MeshStandardMaterial>(null), progress = useRef(phase), clock = useRef(0);
  const assets = useMemo(() => {
    let seed = 3158; const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const points = Array.from({ length: 1000 }, () => { const a = rand() * Math.PI * 2, branch = Math.floor(rand() * 12), radius = Math.sqrt(rand()) * .48, h = .78 + branch * .10; return { x: Math.cos(branch * 2.3999) * (.74 - branch * .018) + Math.cos(a) * radius, y: h + .45 + (rand() - .5) * .38, z: Math.sin(branch * 2.3999) * (.74 - branch * .018) + Math.sin(a) * radius * .8, r: rand(), angle: rand() * Math.PI * 2 }; });
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -.5, -.23, .08, -.12, .23, .08, -.12, -.16, .07, .25, .16, .07, .25, 0, -.04, .55], 3)); geometry.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4]); geometry.computeVertexNormals();
    const flowerParts = Array.from({ length: 5 }, (_, i) => new THREE.SphereGeometry(1, 6, 4).scale(.018, .006, .031).translate(0, 0, .023).rotateY(i / 5 * Math.PI * 2));
    return { points, geometry, flowerParts, o: new THREE.Object3D(), c: new THREE.Color() };
  }, []);
  useEffect(() => () => { assets.geometry.dispose(); assets.flowerParts.forEach(g => g.dispose()); }, [assets]);
  useFrame((_, dt) => {
    progress.current = paused ? phase : THREE.MathUtils.damp(progress.current, phase, 3, Math.min(dt, .1)); if (!paused) clock.current += Math.min(dt, .05);
    const p = progress.current, t = clock.current, palettes = ['#b2cb84', '#4b8954', '#c08b3b', '#aab6a1'], i = Math.min(2, Math.floor(p)), mix = p - i;
    assets.c.set(palettes[i]).lerp(new THREE.Color(palettes[i + 1]), mix); material.current?.color.copy(assets.c);
    const density = THREE.MathUtils.lerp([.68, 1, .62, .008][i], [.68, 1, .62, .008][i + 1], mix) * (.35 + vitality * .65), flowers = Math.max(0, 1 - p * 1.7), flakes = Math.max(0, p - 2);
    assets.points.forEach((point, n) => { const o = assets.o; o.position.set(point.x + Math.sin(t * .7 + n) * .008, point.y, point.z); o.rotation.set(.35 * Math.sin(n), point.angle, .25 * Math.sin(n * 2)); o.scale.setScalar(point.r < density ? .12 + point.r * .08 : 0); o.updateMatrix(); leaf.current?.setMatrixAt(n, o.matrix); if (n < 300) { o.scale.setScalar(point.r < flowers ? .8 + point.r * .5 : 0); o.updateMatrix(); bloom.current?.setMatrixAt(n, o.matrix); } if (n < 80) { o.position.set(point.x * 1.1, 2.6 - ((t * .22 + point.r * 3) % 2.85), point.z); o.scale.setScalar(flakes * .012); o.updateMatrix(); snow.current?.setMatrixAt(n, o.matrix); } });
    for (const ref of [leaf, bloom, snow]) if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  });
  const petals = useMemo(() => {
    // Merge only this small shared master, then instance it, not 1500 meshes.
    const position: number[] = [], normal: number[] = [];
    for (const part of assets.flowerParts) { const g = part.toNonIndexed(); position.push(...g.attributes.position.array); normal.push(...g.attributes.normal.array); g.dispose(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3)); return g;
  }, [assets]);
  useEffect(() => () => petals.dispose(), [petals]);
  return <><instancedMesh ref={leaf} args={[assets.geometry, undefined, 1000]} frustumCulled={false}><meshStandardMaterial ref={material} color="#84a66d" side={THREE.DoubleSide} roughness={.85} /></instancedMesh><instancedMesh ref={bloom} args={[petals, undefined, 300]} frustumCulled={false}><meshStandardMaterial color="#f3ccda" roughness={.76} /></instancedMesh><instancedMesh ref={snow} args={[undefined, undefined, 80]} frustumCulled={false}><icosahedronGeometry args={[1, 0]} /><meshBasicMaterial color="#e5edf0" /></instancedMesh></>;
}
