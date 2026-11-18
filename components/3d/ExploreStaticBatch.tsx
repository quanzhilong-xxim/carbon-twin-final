'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Merge the static street furniture by surface; leave instancing and traffic intact. */
export default function ExploreStaticBatch({ children, revision = '' }: { children: ReactNode; revision?: string }) {
  const root = useRef<THREE.Group>(null);
  const surfaces=useRef<{source:THREE.MeshStandardMaterial;target:THREE.MeshStandardMaterial}[]>([]);
  useLayoutEffect(() => {
    if (!root.current) return;
    const group = root.current;
    group.updateWorldMatrix(true, true);
    const inverse = group.matrixWorld.clone().invert();
    const buckets = new Map<string, { material: THREE.MeshStandardMaterial; source: THREE.MeshStandardMaterial; geometry: THREE.BufferGeometry[] }>();
    const originals: THREE.Mesh[] = [];
    group.traverse(object => {
      if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh || Array.isArray(object.material)) return;
      const material = object.material;
      if (!(material instanceof THREE.MeshStandardMaterial) || material.map) return;
      const key = [material.color.getHex(), material.emissive.getHex(), material.emissiveIntensity, material.roughness, material.metalness, material.opacity, material.side].join(':');
      let bucket = buckets.get(key);
      if (!bucket) { bucket = { material: material.clone(), source:material, geometry: [] }; buckets.set(key, bucket); }
      const geometry = object.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
      // All primitive street geometries have position/normal/uv. Normalize the
      // representation so indexed and non-indexed surfaces can share one draw.
      const flat = geometry.index ? geometry.toNonIndexed() : geometry;
      if (flat !== geometry) geometry.dispose();
      for (const attribute of Object.keys(flat.attributes)) if (!['position', 'normal', 'uv'].includes(attribute)) flat.deleteAttribute(attribute);
      bucket.geometry.push(flat); originals.push(object); object.visible = false;
    });
    const owned: THREE.Mesh[] = [];
    for (const bucket of buckets.values()) {
      const merged = mergeGeometries(bucket.geometry, false);
      bucket.geometry.forEach(geometry => geometry.dispose());
      if (!merged) { bucket.material.dispose(); continue; }
      const mesh = new THREE.Mesh(merged, bucket.material); mesh.receiveShadow = true; mesh.castShadow = true;
      group.add(mesh); owned.push(mesh);
      surfaces.current.push({source:bucket.source,target:bucket.material});
    }
    return () => {
      originals.forEach(object => { object.visible = true; });
      owned.forEach(mesh => { group.remove(mesh); mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); });
      surfaces.current=[];
    };
  }, []);
  useLayoutEffect(()=>{surfaces.current.forEach(({source,target})=>{
    target.color.copy(source.color);target.emissive.copy(source.emissive);target.emissiveIntensity=source.emissiveIntensity;
    target.roughness=source.roughness;target.metalness=source.metalness;
  });},[revision]);
  return <group ref={root}>{children}</group>;
}
